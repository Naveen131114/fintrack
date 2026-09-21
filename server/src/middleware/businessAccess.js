import Branch from '../models/Branch.js';

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

// Transactions are a core personal feature as well: personal users and super
// admins manage their own records (the controller scopes every query by
// userId), so they must not be rejected here. Business users still pass the
// permission-rank check, and branch/business validation happens in the
// controller via assertBranchAccess/branchFilter — this does NOT weaken
// business authorization.
export function requireTransactionAccess(level) {
    const ranks = { view: 1, edit: 2, full: 3 };
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ message: 'Authentication required' });
        if (!isBusinessUser(req.user)) return next();
        if (req.user.role === 'business_owner') return next();
        if (req.user.role !== 'business_staff' || ranks[req.user.permissionLevel] < ranks[level]) return res.status(403).json({ message: 'You do not have permission for this action' });
        next();
    };
}

// Shared user-scoped data (masters, budgets, targets) belongs to the business
// owner's account: a business_owner manages it directly and business_staff
// must be able to READ the owner's masters when entering transactions.
export function dataOwnerIdFor(user) {
    return isBusinessUser(user) ? ownerIdFor(user) : user?.id;
}

// Staff can view the owner's shared data but never modify it. Business owners
// and personal users (for their own data) keep full control.
export function requireDataWrite(req, res, next) {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    if (req.user.role === 'business_staff') return res.status(403).json({ message: 'You do not have permission for this action' });
    next();
}

export function requirePermission(level) {
    const ranks = { view: 1, edit: 2, full: 3 };
    return (req, res, next) => {
        if (!isBusinessUser(req.user)) return res.status(403).json({ message: 'Business account access required' });
        if (req.user.role === 'business_owner') return next();
        if (req.user.role !== 'business_staff' || ranks[req.user.permissionLevel] < ranks[level]) return res.status(403).json({ message: 'You do not have permission for this action' });
        next();
    };
}

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
    if (branchId && branchId !== 'ALL') filter.branchId = branchId;
    if (user.role === 'business_staff') filter.branchId = { $in: user.allowedBranches || [] };
    return filter;
}

