import { api } from '../services/api';
import { getStoredUser, isBusinessStaff, isBusinessUser, setStoredUser } from './roles';

// Client-side mirror of server/src/models/User.js + businessAccess.js.
// The server is the authority - every route re-checks - but the UI has to know
// the same rules so it can hide what a user may not do, and offer the
// "request approval" route for the rest.
export const PERMISSION_ACTIONS = ['view', 'create', 'edit', 'delete'];
// The per-module checkboxes the staff form draws, in the order it draws them.
// Adding transactions is deliberately NOT one of them: every staff member may do
// that (see OPEN_CREATE_MODULES), so the "Add new records" box governs the other
// modules - types, categories, budgets, targets and reports.
export const PERMISSION_FLAG_LABELS = [
    { key: 'canView', label: 'View records' },
    { key: 'canCreate', label: 'Add new records', hint: 'All staff can add transactions; this switch covers the other modules' },
    { key: 'canEdit', label: 'Edit records' },
    { key: 'canDelete', label: 'Delete records' },
    { key: 'canManageBusiness', label: 'Manage branches & accounts', hint: 'Branches, bank accounts and UPI accounts' }
];
// Modules whose CHANGES additionally need "manage business" (reading them stays
// open to anyone who can view, because the transaction form needs the pickers).
export const MANAGE_BUSINESS_MODULES = ['branches', 'bankAccounts', 'upiAccounts'];
// How long an approved request unlocks a module - kept in step with the server.
export const GRANT_HOURS = 24;
// 403 code that means "you may ask for this" rather than "never".
export const PERMISSION_REQUEST_CODE = 'PERMISSION_REQUEST_REQUIRED';

export const MODULE_LABELS = {
    transactions: 'transactions',
    types: 'types',
    categories: 'categories',
    budgets: 'budgets',
    targets: 'targets',
    monthlyReports: 'monthly reports',
    branches: 'branches',
    bankAccounts: 'bank accounts',
    upiAccounts: 'UPI accounts',
    staff: 'staff accounts',
    activityLogs: 'activity logs',
    businessProfile: 'business profile'
};

export function moduleLabel(module) {
    return MODULE_LABELS[module] || String(module || 'records');
}

export function actionPhrase(action, module) {
    const noun = moduleLabel(module);
    if (action === 'view') return `view ${noun}`;
    if (action === 'create') return `add new ${noun}`;
    if (action === 'delete') return `delete ${noun}`;
    return `edit ${noun}`;
}

// Legacy preset translation - identical to permissionsForLevel() on the server,
// so a staff account created before the granular checkboxes behaves the same.
export function permissionsForLevel(level) {
    const canEdit = level === 'edit' || level === 'full';
    return {
        view: level === 'view' || canEdit,
        create: canEdit,
        edit: canEdit,
        delete: level === 'full',
        manageBusiness: level === 'full'
    };
}

function activeGrants(source, now = Date.now()) {
    return (source || [])
        .filter((grant) => grant && grant.module && grant.expiresAt && new Date(grant.expiresAt).getTime() > now);
}

// The effective rights of a stored user object (as kept in localStorage).
// Prefers the server-resolved `permissions`, falls back to the granular flags,
// and finally to the legacy permissionLevel.
export function effectivePermissions(user, now = Date.now()) {
    const open = { view: true, create: true, edit: true, delete: true, manageBusiness: true, grants: [] };
    if (!isBusinessUser(user)) return open;
    if (user?.role === 'business_owner') return open;
    const grants = activeGrants(user?.permissions?.grants?.length ? user.permissions.grants : user?.permissionsGrant, now);
    const fromServer = user?.permissions;
    if (fromServer && typeof fromServer === 'object' && !Array.isArray(fromServer)) {
        return {
            view: fromServer.view === true,
            create: fromServer.create === true,
            edit: fromServer.edit === true,
            delete: fromServer.delete === true,
            manageBusiness: fromServer.manageBusiness === true,
            grants
        };
    }
    const base = user?.permissionsConfigured
        ? {
            view: user.canView === true,
            create: user.canCreate === true,
            edit: user.canEdit === true,
            delete: user.canDelete === true,
            manageBusiness: user.canManageBusiness === true
        }
        : permissionsForLevel(user?.permissionLevel || 'view');
    return { ...base, grants };
}

// Modules where ADDING a record is open to every staff member, exactly as the
// server does it (see businessAccess.canPerform): transaction entry is personal
// data capture, so it never needs a request. Editing and deleting stay gated.
export const OPEN_CREATE_MODULES = ['transactions'];

// Same decision the server makes: an open module, a flag OR a live approval
// grant, and for business-level records the extra "manage business" requirement.
// `recordId` (optional) pins the question to ONE record - see grantMatches.
export function canPerform(user, action, module, recordId = null) {
    if (!isBusinessStaff(user)) return true;
    if (action === 'create' && OPEN_CREATE_MODULES.includes(module)) return true;
    const permissions = effectivePermissions(user);
    if (permissions.grants.some((grant) => grantMatches(grant, module, action, recordId))) return true;
    if (permissions[action] !== true) return false;
    if (action !== 'view' && MANAGE_BUSINESS_MODULES.includes(module)) return permissions.manageBusiness === true;
    return true;
}

// One approval grant = one module + action, optionally pinned to the single
// record the request named - approving row A must never unlock row B (mirrors
// grantMatches in server/src/middleware/businessAccess.js). A caller that does
// not name a record asks the module-wide question, which any matching grant
// answers, so page-level checks keep working.
export function grantMatches(grant, module, action, recordId = null) {
    if (!grant || grant.module !== module || grant.action !== action) return false;
    if (!grant.recordId || !recordId) return true;
    return String(grant.recordId) === String(recordId);
}

export const canView = (user, module, recordId = null) => canPerform(user, 'view', module, recordId);
export const canCreate = (user, module, recordId = null) => canPerform(user, 'create', module, recordId);
export const canEdit = (user, module, recordId = null) => canPerform(user, 'edit', module, recordId);
export const canDelete = (user, module, recordId = null) => canPerform(user, 'delete', module, recordId);

// What a table needs to decide which row buttons to draw. Pass the row's id so
// an approval for one record only unlocks that row - DataTable accepts the
// result either as this object or as a function of the row returning it.
export function tablePermissions(user, module, recordId = null) {
    return { canEdit: canEdit(user, module, recordId), canDelete: canDelete(user, module, recordId) };
}

// A staff member may only ask for changes to records they are allowed to see -
// exactly the rule the create-change-request endpoint applies. `recordId`
// narrows it to one row, so "may I ask?" is answered per record.
export function canRequest(user, module, action = 'edit', recordId = null) {
    return isBusinessStaff(user) && canView(user, module) && !canPerform(user, action, module, recordId);
}

// A 403 that came back from a permission guard: the action is requestable.
export function isPermissionDenied(error) {
    return error?.status === 403 && error?.code === PERMISSION_REQUEST_CODE;
}

// When the unlock from an approved request runs out (null when there is none).
export function grantExpiresAt(user, module, action, recordId = null) {
    const grant = effectivePermissions(user).grants.find((item) => grantMatches(item, module, action, recordId));
    return grant ? new Date(grant.expiresAt) : null;
}

// Short human summary for the staff list, e.g. "View · Create · Business".
export function permissionSummary(user) {
    if (!isBusinessStaff(user)) return 'Full access';
    const permissions = effectivePermissions(user);
    const names = { view: 'View', create: 'Create', edit: 'Edit', delete: 'Delete' };
    const list = PERMISSION_ACTIONS.filter((action) => permissions[action]).map((action) => names[action]);
    if (permissions.manageBusiness) list.push('Business');
    const granted = permissions.grants.map((grant) => `Approved: ${grant.action} ${moduleLabel(grant.module)}${grant.recordId ? ' (one record)' : ''}`);
    if (!list.length && !granted.length) return 'No access';
    return [...list, ...granted].join(' · ');
}

// The checkbox names the staff form uses for one permission set.
export function flagsFromPermissions(permissions) {
    return {
        canView: permissions.view === true,
        canCreate: permissions.create === true,
        canEdit: permissions.edit === true,
        canDelete: permissions.delete === true,
        canManageBusiness: permissions.manageBusiness === true
    };
}

// Ticks for the staff form: what a saved account currently means in checkboxes.
export function permissionFlagsForForm(user) {
    return flagsFromPermissions(effectivePermissions(user));
}

// The same ticks for a legacy preset, so picking a level fills the boxes in -
// the level and the checkboxes describe one thing (see permissionsPayload).
export function flagsForLevel(level) {
    return flagsFromPermissions(permissionsForLevel(level));
}

// Reverse of the legacy preset: when the owner ticks boxes by hand, the level
// field is derived so anything still reading it stays sensible.
export function levelForFlags(flags) {
    if (flags.canDelete) return 'full';
    if (flags.canCreate || flags.canEdit) return 'edit';
    return 'view';
}

// Body for the staff create/update endpoints. The server reads the nested
// `permissions` object (see permissionsFromBody) and keeps permissionLevel in
// sync itself, but the derived level is posted too for clarity.
export function permissionsPayload(flags) {
    return {
        permissionLevel: levelForFlags(flags),
        permissions: {
            view: !!flags.canView,
            create: !!flags.canCreate,
            edit: !!flags.canEdit,
            delete: !!flags.canDelete,
            manageBusiness: !!flags.canManageBusiness
        }
    };
}

// Everything the UI switches on, flattened into one string: comparing two
// signatures tells "the same rights" apart from "something actually changed"
// (see refreshPermissions). Grants are included, so an approval landing - and a
// grant running out after GRANT_HOURS - both count as a change.
export function permissionSignature(user) {
    if (!user) return '';
    const permissions = effectivePermissions(user);
    return [
        user.role || '',
        user.permissionLevel || '',
        user.permissionsConfigured === true ? 1 : 0,
        permissions.view ? 1 : 0,
        permissions.create ? 1 : 0,
        permissions.edit ? 1 : 0,
        permissions.delete ? 1 : 0,
        permissions.manageBusiness ? 1 : 0,
        // recordId is part of a grant's identity: a second approval for ANOTHER
        // row has to count as a change, or refreshPermissions would compare equal
        // and skip the update - leaving that row locked in an open tab.
        permissions.grants.map((grant) => `${grant.module}:${grant.action}:${grant.recordId || '*'}`).sort().join(',')
    ].join('|');
}

// Re-read the signed-in profile from the server.
//
// An approval is handed to SOMEBODY ELSE's account - the staff member waiting on
// the Requests page - so their tab has to notice the grant on its own; the client
// otherwise keeps the rights it captured at sign-in and stays locked (that is the
// "approved but still cannot edit" case). The stored profile is only rewritten
// when the rights really differ, so polling this stays quiet.
export async function refreshPermissions() {
    const current = getStoredUser();
    if (!current) return null;
    try {
        const result = await api.auth.me();
        const fresh = result?.user || result;
        if (!fresh || !fresh.role) return current;
        if (permissionSignature(fresh) === permissionSignature(current)) return current;
        // setStoredUser fires fintrack:user-changed, which re-renders every page
        // holding a useStoredUser() value - the locked buttons unlock in place.
        return setStoredUser(fresh);
    } catch {
        // Offline, or a dead session that api.js is already handling: keep what
        // the tab already has rather than blanking the UI.
        return current;
    }
}

