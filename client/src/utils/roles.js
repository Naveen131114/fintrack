export const BUSINESS_ROLES = ['business_owner', 'business_staff'];

export function getStoredUser() {
    try {
        return JSON.parse(localStorage.getItem('fintrack_user') || 'null');
    } catch {
        return null;
    }
}

export function isBusinessRole(role) {
    return BUSINESS_ROLES.includes(role);
}

export function isBusinessUser(user) {
    return isBusinessRole(user?.role);
}

export function isBusinessOwner(user) {
    return user?.role === 'business_owner';
}

export function isBusinessStaff(user) {
    return user?.role === 'business_staff';
}

export function isSuperAdmin(user) {
    return user?.role === 'super_admin';
}

export function roleLabel(role) {
    switch (role) {
        case 'super_admin':
            return 'Super admin';
        case 'business_owner':
            return 'Business owner';
        case 'business_staff':
            return 'Business staff';
        default:
            return 'Personal account';
    }
}
