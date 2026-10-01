import { useEffect, useState } from 'react';

export const BUSINESS_ROLES = ['business_owner', 'business_staff'];
// Fired whenever the cached profile is replaced: sign-in, a permission refresh
// (see refreshPermissions in utils/permissions) or a profile edit.
export const USER_CHANGED_EVENT = 'fintrack:user-changed';

export function getStoredUser() {
    try {
        return JSON.parse(localStorage.getItem('fintrack_user') || 'null');
    } catch {
        return null;
    }
}

// Replace the cached profile. The event is what makes an approval - or any other
// change somebody else made - take effect in an open tab instead of at the next
// sign-in, because the pages render their buttons from these stored rights.
export function setStoredUser(user) {
    if (!user) return null;
    try {
        localStorage.setItem('fintrack_user', JSON.stringify(user));
    } catch {
        return null;
    }
    window.dispatchEvent(new CustomEvent(USER_CHANGED_EVENT));
    return user;
}

// The stored profile, re-read whenever it changes. Pages that gate their buttons
// on permissions use this instead of getStoredUser() so a grant that arrives
// while the page is open unlocks them in place.
export function useStoredUser() {
    const [user, setUser] = useState(getStoredUser);
    useEffect(() => {
        const sync = () => setUser(getStoredUser());
        window.addEventListener(USER_CHANGED_EVENT, sync);
        // Another tab signing in or out writes the same key.
        window.addEventListener('storage', sync);
        return () => {
            window.removeEventListener(USER_CHANGED_EVENT, sync);
            window.removeEventListener('storage', sync);
        };
    }, []);
    return user;
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
