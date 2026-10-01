import mongoose from 'mongoose';
// Granular staff permissions.
// ---------------------------------------------------------------------------
// `permissionLevel` ('view' | 'edit' | 'full') is the LEGACY switch and stays
// for backward compatibility: every stored staff record keeps it, and one that
// never received explicit flags still resolves to the old view/edit/full
// behaviour (see resolvePermissions below).
//
// The granular flags are the source of truth from now on:
//   canView           - read the business data
//   canCreate         - add new records
//   canEdit           - change existing records
//   canDelete         - remove existing records
//   canManageBusiness - work on business-level records (branches, bank and UPI
//                       accounts) - the old levels only allowed that through
//                       "full"
//
// `permissionsGrant` holds short-lived, module scoped rights handed out when an
// owner APPROVES a "request approval" change request.
export const PERMISSION_ACTIONS = ['view', 'create', 'edit', 'delete'];
// Business-level modules are guarded by canManageBusiness rather than the
// per-record flags, exactly like before this change.
export const MANAGE_BUSINESS_MODULES = ['branches', 'bankAccounts', 'upiAccounts'];
// How long an approved request keeps a staff member unlocked for a module.
export const GRANT_HOURS = 24;

// Legacy level -> the granular flags it used to imply.
export function permissionsForLevel(level) {
    const canEdit = level === 'edit' || level === 'full';
    const canDelete = level === 'full';
    return {
        view: level === 'view' || canEdit,
        create: canEdit,
        edit: canEdit,
        delete: canDelete,
        manageBusiness: canDelete
    };
}



// One approved "request approval" change request unlocks a single module for a
// single staff member for a limited time. Expired grants are ignored by
// resolvePermissions and pruned at sign-in (a TTL index cannot expire entries
// inside an array).
const permissionGrantSchema = new mongoose.Schema({
    module: { type: String, required: true },
    action: { type: String, enum: ['create', 'edit', 'delete'], required: true },
    recordId: { type: mongoose.Schema.Types.ObjectId },
    changeRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChangeRequest' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    expiresAt: { type: Date, required: true }
}, { _id: false, timestamps: { createdAt: true, updatedAt: false } });


const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    phoneNumber: String,
    emailId: { type: String, required: true, lowercase: true, trim: true },
    userName: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'super_admin', 'business_owner', 'business_staff'], default: 'user' },
    // Existing "user" records remain personal accounts. Business relationships are optional.
    businessOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    permissionLevel: { type: String, enum: ['view', 'edit', 'full'] },
    // Granular staff permissions - see the notes above the schema.
    canView: { type: Boolean, default: false },
    canCreate: { type: Boolean, default: false },
    canEdit: { type: Boolean, default: false },
    canDelete: { type: Boolean, default: false },
    canManageBusiness: { type: Boolean, default: false },
    // Set once the owner has explicitly configured this staff member's rights.
    // Until then the legacy `permissionLevel` decides, so records created before
    // the flags existed keep behaving exactly as before - including a staff
    // member deliberately left with nothing.
    permissionsConfigured: { type: Boolean, default: false },
    permissionsGrant: { type: [permissionGrantSchema], default: [] },
    allowedBranches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }],
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    subscriptionPlan: String,
    subscriptionStartDate: Date,
    subscriptionEndDate: Date,
    approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    paymentReference: String,
    paymentScreenshotUrl: String,
    // Business PDF-template branding (managed by the business_owner, applied to
    // owner + staff transaction PDF exports). Logo stored as a JPEG data URL.
    businessName: { type: String, trim: true, maxlength: 120 },
    businessAddress: { type: String, trim: true, maxlength: 600 },
    businessLogo: { type: String, default: null },
    // Logo width on exported PDFs, expressed as a percentage of the PDF page
    // width (US Letter = 612pt). Validated to 1-25% in businessController.
    businessLogoWidthPercent: { type: Number, default: 8 },
    refreshToken: { type: String, default: null, select: false },
    lastLoginAt: Date
}, { timestamps: true });

// Only business_staff carry granular flags; every other role bypasses them.
function isStaff(subject) {
    return subject?.role === 'business_staff';
}

const flagFor = (action) => `can${action[0].toUpperCase()}${action.slice(1)}`;

// True when explicit flags were ever saved. A legacy record has all of them
// false, so its effective rights keep coming from `permissionLevel`.
function hasExplicitFlags(subject) {
    return subject?.permissionsConfigured === true;
}

// Effective permissions of a JWT payload (or a hydrated User document) at a
// given moment. `subject.permissions` is already resolved - it comes straight
// from a signed token - so it is returned as-is after dropping the grants that
// expired since the token was issued.
export function resolvePermissions(subject, at = new Date()) {
    const empty = { view: false, create: false, edit: false, delete: false, manageBusiness: false, grants: [] };
    if (!subject) return empty;
    const activeGrants = (list) => (list || [])
        .filter((grant) => grant && grant.expiresAt && new Date(grant.expiresAt) > at)
        // `expiresAt` must survive serialization: the client re-checks the window
        // against its own clock (and shows when an unlock runs out), so a grant
        // without it is discarded there - an approval would never unlock the page.
        .map((grant) => ({ module: grant.module, action: grant.action, recordId: String(grant.recordId || ''), expiresAt: grant.expiresAt }));

    // Personal users, business owners and the super admin are unrestricted on
    // their own data - the granular flags only ever describe business staff.
    if (!isStaff(subject)) return { ...empty, view: true, create: true, edit: true, delete: true, manageBusiness: true };

    if (subject.permissions && typeof subject.permissions === 'object') {
        const base = subject.permissions;
        return {
            view: base.view === true,
            create: base.create === true,
            edit: base.edit === true,
            delete: base.delete === true,
            manageBusiness: base.manageBusiness === true,
            grants: activeGrants(base.grants)
        };
    }

    const legacy = permissionsForLevel(subject.permissionLevel || 'view');
    const flags = hasExplicitFlags(subject)
        ? {
            view: subject.canView === true,
            create: subject.canCreate === true,
            edit: subject.canEdit === true,
            delete: subject.canDelete === true,
            manageBusiness: subject.canManageBusiness === true
        }
        : legacy;
    return { ...flags, grants: activeGrants(subject.permissionsGrant) };
}

// Keeping the two switches in sync: `permissionLevel` is the legacy preset and
// the granular flags are what the endpoints read. Saving a level therefore
// rewrites the flags (a staff record created before the flags existed, or one
// updated through a form that only knows the preset, still gets sane rights).
// An explicit flags payload from the staff form wins - see setGranularPermissions.
userSchema.pre('save', function syncGranularPermissions(next) {
    if (!isStaff(this)) {
        ['canView', 'canCreate', 'canEdit', 'canDelete', 'canManageBusiness', 'permissionsConfigured'].forEach((flag) => { this[flag] = false; });
        return next();
    }
    if (this.isModified('permissionLevel') && !this.$__explicitGranularPermissions) {
        const derived = permissionsForLevel(this.permissionLevel || 'view');
        this.canView = derived.view;
        this.canCreate = derived.create;
        this.canEdit = derived.edit;
        this.canDelete = derived.delete;
        this.canManageBusiness = derived.manageBusiness;
        this.permissionsConfigured = true;
    }
    next();
});

// Called by the staff endpoints when the request carried explicit checkboxes.
userSchema.methods.setGranularPermissions = function setGranularPermissions(flags = {}) {
    PERMISSION_ACTIONS.forEach((action) => {
        if (flags[action] !== undefined) this[flagFor(action)] = flags[action] === true;
    });
    if (flags.manageBusiness !== undefined) this.canManageBusiness = flags.manageBusiness === true;
    this.permissionsConfigured = true;
    this.$__explicitGranularPermissions = true;
    PERMISSION_ACTIONS.forEach((action) => this.markModified(flagFor(action)));
    if (flags.manageBusiness !== undefined) this.markModified('canManageBusiness');
    this.markModified('permissionsConfigured');
    return this;
};

// Safe representation for login/me responses: never leaks the password or the
// refresh token and carries the effective permissions the UI switches on.
userSchema.methods.toAuthJSON = function toAuthJSON() {
    return {
        id: String(this._id),
        name: this.name,
        userName: this.userName,
        emailId: this.emailId,
        phoneNumber: this.phoneNumber,
        role: this.role,
        permissionLevel: this.permissionLevel,
        canView: this.canView === true,
        canCreate: this.canCreate === true,
        canEdit: this.canEdit === true,
        canDelete: this.canDelete === true,
        canManageBusiness: this.canManageBusiness === true,
        permissions: resolvePermissions(this),
        businessOwnerId: this.businessOwnerId || undefined,
        allowedBranches: this.allowedBranches || [],
        subscriptionPlan: this.subscriptionPlan,
        subscriptionStartDate: this.subscriptionStartDate,
        subscriptionEndDate: this.subscriptionEndDate,
        businessName: this.businessName,
        businessAddress: this.businessAddress,
        businessLogo: this.businessLogo,
        businessLogoWidthPercent: this.businessLogoWidthPercent
    };
};

// Payload signed into the access token - the exact shape the middleware reads
// back, so no database round trip is needed on every request.
userSchema.methods.toTokenPayload = function toTokenPayload() {
    return {
        sub: String(this._id),
        role: this.role,
        userName: this.userName,
        businessOwnerId: this.businessOwnerId || undefined,
        permissionLevel: this.permissionLevel,
        permissions: resolvePermissions(this)
    };
};


export default mongoose.model('User', userSchema);
