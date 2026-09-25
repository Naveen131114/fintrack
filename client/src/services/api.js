const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getStoredToken() {
    return localStorage.getItem('fintrack_access_token');
}

function getAuthHeaders() {
    const token = getStoredToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

function clearAuthStorage() {
    localStorage.removeItem('fintrack_access_token');
    localStorage.removeItem('fintrack_refresh_token');
    localStorage.removeItem('fintrack_user');
}

function isAuthEndpoint(path) {
    return path.startsWith('/auth/login') || path.startsWith('/auth/refresh-token');
}

let redirectingToLogin = false;

export function forceLogoutToLogin() {
    clearAuthStorage();
    window.dispatchEvent(new CustomEvent('fintrack:unauthorized'));
    if (typeof window === 'undefined') return;
    const onLoginPage = window.location.pathname === '/login';
    if (onLoginPage || redirectingToLogin) return;
    redirectingToLogin = true;
    // Use assign so browser history does not keep protected pages behind.
    window.location.assign('/login');
    // Safety: allow future redirects (e.g. after a new login + expiry).
    setTimeout(() => { redirectingToLogin = false; }, 2000);
}

async function tryRefreshAndRetry() {
    const storedRefreshToken = localStorage.getItem('fintrack_refresh_token');
    if (!storedRefreshToken) return false;
    try {
        // Direct fetch to avoid recursion through request().
        const refreshResponse = await fetch(`${API_URL}/auth/refresh-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: storedRefreshToken })
        });
        if (!refreshResponse.ok) return false;
        const refreshed = await refreshResponse.json().catch(() => null);
        if (!refreshed?.accessToken) return false;
        localStorage.setItem('fintrack_access_token', refreshed.accessToken);
        if (refreshed.refreshToken) {
            localStorage.setItem('fintrack_refresh_token', refreshed.refreshToken);
        }
        return true;
    } catch {
        return false;
    }
}

async function request(path, options = {}) {
    const { _retry, ...fetchOptions } = options;
    const response = await fetch(`${API_URL}${path}`, {
        ...fetchOptions,
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(), ...fetchOptions.headers }
    });

    if (response.status === 401 && !isAuthEndpoint(path) && !_retry) {
        const refreshed = await tryRefreshAndRetry();
        if (refreshed) {
            const retryResponse = await fetch(`${API_URL}${path}`, {
                ...fetchOptions,
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders(), ...fetchOptions.headers }
            });
            if (retryResponse.status === 401) {
                forceLogoutToLogin();
                const body = await retryResponse.json().catch(() => ({}));
                const error = new Error(body.message || 'Session expired. Please log in again.');
                error.status = 401;
                throw error;
            }
            if (!retryResponse.ok) {
                const body = await retryResponse.json().catch(() => ({}));
                const error = new Error(body.message || 'Request failed');
                error.status = retryResponse.status;
                throw error;
            }
            return retryResponse.status === 204 ? null : retryResponse.json();
        }

        // No refresh possible (or refresh failed) -> session is dead: clear + go to login.
        forceLogoutToLogin();
        const body = await response.json().catch(() => ({}));
        const error = new Error(body.message || 'Session expired. Please log in again.');
        error.status = 401;
        throw error;
    }

    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const error = new Error(body.message || 'Request failed');
        error.status = response.status;
        throw error;
    }

    return response.status === 204 ? null : response.json();
}

export const api = {
    auth: {
        login: async (data) => {
            const result = await request('/auth/login', { method: 'POST', body: JSON.stringify(data) });
            localStorage.setItem('fintrack_access_token', result.accessToken);
            localStorage.setItem('fintrack_refresh_token', result.refreshToken);
            localStorage.setItem('fintrack_user', JSON.stringify(result.user));
            return result;
        },
        refreshToken: async (refreshToken) => {
            const result = await request('/auth/refresh-token', { method: 'POST', body: JSON.stringify({ refreshToken }) });
            localStorage.setItem('fintrack_access_token', result.accessToken);
            localStorage.setItem('fintrack_refresh_token', result.refreshToken);
            return result;
        },
        logout: async () => {
            try {
                await request('/auth/logout', { method: 'POST' });
            } finally {
                clearAuthStorage();
            }
        },
        me: () => request('/auth/me')
    },
    transactions: { list: (branchId) => request(`/transactions${branchId ? `?branchId=${encodeURIComponent(branchId)}` : ''}`), create: (data) => request('/transactions', { method: 'POST', body: JSON.stringify(data) }), update: (id, data) => request(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }), remove: (id) => request(`/transactions/${id}`, { method: 'DELETE' }) },
    business: {
        branches: { list: () => request('/business/branches'), create: (data) => request('/business/branches', { method: 'POST', body: JSON.stringify(data) }), update: (id, data) => request(`/business/branches/${id}`, { method: 'PUT', body: JSON.stringify(data) }), remove: (id) => request(`/business/branches/${id}`, { method: 'DELETE' }) },
        bankAccounts: { list: () => request('/business/bankAccounts'), create: (data) => request('/business/bankAccounts', { method: 'POST', body: JSON.stringify(data) }), update: (id, data) => request(`/business/bankAccounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }), remove: (id) => request(`/business/bankAccounts/${id}`, { method: 'DELETE' }) },
        upiAccounts: { list: () => request('/business/upiAccounts'), create: (data) => request('/business/upiAccounts', { method: 'POST', body: JSON.stringify(data) }), update: (id, data) => request(`/business/upiAccounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }), remove: (id) => request(`/business/upiAccounts/${id}`, { method: 'DELETE' }) },
                staff: { list: () => request('/business/staff'), create: (data) => request('/business/staff', { method: 'POST', body: JSON.stringify(data) }), update: (id, data) => request(`/business/staff/${id}`, { method: 'PUT', body: JSON.stringify(data) }), remove: (id) => request(`/business/staff/${id}`, { method: 'DELETE' }) },
        activityLogs: () => request('/business/activity-logs'),
        profile: { get: () => request('/business/profile'), update: (data) => request('/business/profile', { method: 'PUT', body: JSON.stringify(data) }) }
    },
    types: { list: () => request('/masters/types'), create: (data) => request('/masters/types', { method: 'POST', body: JSON.stringify(data) }), update: (id, data) => request(`/masters/types/${id}`, { method: 'PUT', body: JSON.stringify(data) }), remove: (id) => request(`/masters/types/${id}`, { method: 'DELETE' }) },
    categories: { list: (type) => request(`/masters/categories${type ? `?type=${encodeURIComponent(type)}` : ''}`), create: (data) => request('/masters/categories', { method: 'POST', body: JSON.stringify(data) }), update: (id, data) => request(`/masters/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }), remove: (id) => request(`/masters/categories/${id}`, { method: 'DELETE' }) },
    budgets: { list: () => request('/budgets'), create: (data) => request('/budgets', { method: 'POST', body: JSON.stringify(data) }), getByMonth: (month) => request(`/budgets/${month}`), update: (id, data) => request(`/budgets/${id}`, { method: 'PUT', body: JSON.stringify(data) }), remove: (id) => request(`/budgets/${id}`, { method: 'DELETE' }) },
    targets: { list: () => request('/targets'), create: (data) => request('/targets', { method: 'POST', body: JSON.stringify(data) }), getByMonth: (month) => request(`/targets/${month}`), update: (id, data) => request(`/targets/${id}`, { method: 'PUT', body: JSON.stringify(data) }), remove: (id) => request(`/targets/${id}`, { method: 'DELETE' }) },
    // Personal "Keep Notes" scratchpad: one note per signed-in user, kept until cleared.
    notes: { get: () => request('/notes'), save: (content) => request('/notes', { method: 'PUT', body: JSON.stringify({ content }) }), clear: () => request('/notes', { method: 'DELETE' }) },
    // Overall monthly report (Analytics page, business plan logins).
    reports: { list: (branchId) => request(`/reports${branchId ? `?branchId=${encodeURIComponent(branchId)}` : ''}`), create: (data) => request('/reports', { method: 'POST', body: JSON.stringify(data) }), remove: (id) => request(`/reports/${id}`, { method: 'DELETE' }) },
    users: { list: () => request('/users'), create: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }), update: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }), remove: (id) => request(`/users/${id}`, { method: 'DELETE' }) },
    subscriptions: { list: () => request('/subscriptions'), create: (data) => request('/subscriptions', { method: 'POST', body: JSON.stringify(data) }), update: (id, data) => request(`/subscriptions/${id}`, { method: 'PUT', body: JSON.stringify(data) }), remove: (id) => request(`/subscriptions/${id}`, { method: 'DELETE' }) },
    public: {
        plans: () => request('/public/plans'),
        requestSubscription: (data) => request('/public/subscription-requests', { method: 'POST', body: JSON.stringify(data) }),
        approveSubscription: (id, data) => request(`/public/subscription-requests/${id}/approve`, { method: 'PUT', body: JSON.stringify(data) })
    }
};
