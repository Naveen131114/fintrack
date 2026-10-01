import Branch from '../models/Branch.js';
import Subscription from '../models/Subscription.js';
import User, { MANAGE_BUSINESS_MODULES, resolvePermissions } from '../models/User.js';

export function isBusinessUser(user) {
    return !!user && ['business_owner', 'business_staff'].includes(user.role);
}

export function ownerIdFor(user) {
    return user?.role === 'business_staff' ? user.businessOwnerId : user?.id;
}

export function requireBusinessUser(req, res, next) {
    if (!isBusinessUser(req.user)) return res.status(403).json({ message: 'Business account access required' });
    next();
}

export function requireBusinessOwner(req, res, next) {
    if (!isBusinessUser(req.user)) return res.status(403).json({ message: 'Business account access required' });
    if (req.user.role !== 'business_owner') return res.status(403).json({ message: 'Only a business owner can manage staff and business settings' });
    next();
}

// Business-plan-only features (e.g. the Analytics overall report) need an
// ACTIVE business subscription on the owner's account - a business role alone
// is not enough, so expired/personal plans are rejected here.
export async function requireBusinessPlan(req, res, next) {
    try {
        if (!isBusinessUser(req.user)) return res.status(403).json({ message: 'Business account access required' });
        const owner = await User.findById(ownerIdFor(req.user)).select('subscriptionPlan');
        const plan = owner?.subscriptionPlan
            ? await Subscription.findOne({ planName: owner.subscriptionPlan, planType: 'business', status: 'active' })
            : null;
        if (!plan) return res.status(403).json({ message: 'An active business subscription plan is required for this feature' });
        next();
    } catch (error) {
        next(error);
    }
}

// Granular permission guards.
// ---------------------------------------------------------------------------
// resolvePermissions() understands both a hydrated User document and a plain
// object, so it works with whatever authenticateToken puts on req.user - and a
// record that only has the legacy permissionLevel still resolves correctly.
export function permissionsFor(user) {
    return resolvePermissions(user);
}

// Modules where ADDING a record is open to every staff member: recording a
// transaction is personal data entry, so it never needs a flag or a request.
// The client mirrors this - see OPEN_CREATE_MODULES in utils/permissions.
export const OPEN_CREATE_MODULES = ['transactions'];

// Body of every permission check: owners and personal accounts manage their own
// data, staff need the matching flag - or an approval grant for this module.
// `recordId` (optional) pins the question to ONE record - see grantMatches.
export function canPerform(user, action, module, recordId = null) {
    if (!isBusinessUser(user)) return true;
    if (user.role === 'business_owner') return true;
    // Open module (see above): no flag and no grant needed to add a record there.
    if (action === 'create' && OPEN_CREATE_MODULES.includes(module)) return true;
    const permissions = resolvePermissions(user);
    // An approved request unlocks exactly this module + action, whatever else
    // the profile says - and, when the request named a record, only that record.
    if (permissions.grants.some((grant) => grantMatches(grant, module, action, recordId))) return true;
    if (permissions[action] !== true) return false;
    // Business-level records (branches, bank and UPI accounts) additionally need
    // "manage business" to be CHANGED. Reading them stays open to any staff
    // member who can view, because the branch picker needs them.
    if (action !== 'view' && MANAGE_BUSINESS_MODULES.includes(module)) return permissions.manageBusiness === true;
    return true;
}

// One approval grant = one module + action, optionally pinned to the single
// record the request was filed against (a request for row A must never unlock
// row B). A grant without a recordId is module-wide; a caller that does not
// pass a recordId asks the module-wide question, which a record-scoped grant
// still answers - so page-level checks keep working.
export function grantMatches(grant, module, action, recordId = null) {
    if (!grant || grant.module !== module || grant.action !== action) return false;
    if (!grant.recordId || !recordId) return true;
    return String(grant.recordId) === String(recordId);
}

// 403 payload the client recognises to offer the "Request approval" dialog
// instead of a dead-end error.
export const PERMISSION_REQUEST_CODE = 'PERMISSION_REQUEST_REQUIRED';
export function permissionDenied(res, action, module) {
    return res.status(403).json({
        message: `Your profile does not allow you to ${action} these records. Send a request and the owner can approve it.`,
        code: PERMISSION_REQUEST_CODE,
        permission: { action, module: module || null }
    });
}

// Express guard for a single granular action. `module` is optional: it is
// required for business-level records and is what an approved request unlocks.
// It may also be a function of the request, for routes whose module lives in the
// URL (/:resource...). `recordId` - a value or a function of the request - pins
// the guard to ONE row, so an approval for one transaction never authorises a
// change to another.
export function requirePermission(action, module, recordId = null) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ message: 'Authentication required' });
        const target = typeof module === 'function' ? module(req) : module;
        const record = typeof recordId === 'function' ? recordId(req) : recordId;
        if (!canPerform(req.user, action, target, record || null)) return permissionDenied(res, action, target);
        next();
    };
}

// Shared user-scoped data (masters, budgets, targets) belongs to the business
// owner's account: a business_owner manages it directly and business_staff
// must be able to READ the owner's masters when entering transactions.
export function dataOwnerIdFor(user) {
    return isBusinessUser(user) ? ownerIdFor(user) : user?.id;
}

// Business-level records are owner territory unless the owner explicitly granted
// canManageBusiness - see requirePermission, which applies that rule through
// canPerform for every module in MANAGE_BUSINESS_MODULES.

export async function assertBranchAccess(user, branchId) {
    if (!branchId) throw Object.assign(new Error('Branch is required for business records'), { status: 400 });
    const ownerId = ownerIdFor(user);
    const branch = await Branch.findOne({ _id: branchId, businessOwnerId: ownerId, status: 'active' });
    if (!branch || (user.role === 'business_staff' && !(user.allowedBranches || []).some((id) => String(id) === String(branchId)))) {
        throw Object.assign(new Error('You cannot access this branch'), { status: 403 });
    }
    return branch;
}

export function branchFilter(user, branchId) {
    const filter = { businessOwnerId: ownerIdFor(user) };
    if (user.role === 'business_staff') {
        const allowed = user.allowedBranches || [];
        if (branchId && branchId !== 'ALL') {
            // Respect the selected branch, but only if the staff member is
            // actually allowed to access it; otherwise return no results.
            if (allowed.some((id) => String(id) === String(branchId))) {
                filter.branchId = branchId;
            } else {
                filter.branchId = { $in: [] };
            }
        } else {
            // "ALL" or no branch → show only the staff's assigned branches
            filter.branchId = { $in: allowed };
        }
    } else {
        // business_owner: honour the requested branch (or all when "ALL"/empty)
        if (branchId && branchId !== 'ALL') filter.branchId = branchId;
    }
    return filter;
}

