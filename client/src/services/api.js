const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getStoredToken() {
    return localStorage.getItem('fintrack_access_token');
}

function getAuthHeaders() {
    const token = getStoredToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(), ...options.headers },
        ...options
    });

    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || 'Request failed');
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
                localStorage.removeItem('fintrack_access_token');
                localStorage.removeItem('fintrack_refresh_token');
                localStorage.removeItem('fintrack_user');
            }
        },
        me: () => request('/auth/me')
    },
    transactions: { list: () => request('/transactions'), create: (data) => request('/transactions', { method: 'POST', body: JSON.stringify(data) }), update: (id, data) => request(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }), remove: (id) => request(`/transactions/${id}`, { method: 'DELETE' }) },
    types: { list: () => request('/masters/types'), create: (data) => request('/masters/types', { method: 'POST', body: JSON.stringify(data) }), update: (id, data) => request(`/masters/types/${id}`, { method: 'PUT', body: JSON.stringify(data) }), remove: (id) => request(`/masters/types/${id}`, { method: 'DELETE' }) },
    categories: { list: (type) => request(`/masters/categories${type ? `?type=${encodeURIComponent(type)}` : ''}`), create: (data) => request('/masters/categories', { method: 'POST', body: JSON.stringify(data) }), update: (id, data) => request(`/masters/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }), remove: (id) => request(`/masters/categories/${id}`, { method: 'DELETE' }) },
    budgets: { list: () => request('/budgets'), create: (data) => request('/budgets', { method: 'POST', body: JSON.stringify(data) }), getByMonth: (month) => request(`/budgets/${month}`), update: (id, data) => request(`/budgets/${id}`, { method: 'PUT', body: JSON.stringify(data) }), remove: (id) => request(`/budgets/${id}`, { method: 'DELETE' }) },
    targets: { list: () => request('/targets'), create: (data) => request('/targets', { method: 'POST', body: JSON.stringify(data) }), getByMonth: (month) => request(`/targets/${month}`), update: (id, data) => request(`/targets/${id}`, { method: 'PUT', body: JSON.stringify(data) }), remove: (id) => request(`/targets/${id}`, { method: 'DELETE' }) },
    users: { list: () => request('/users'), create: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }), update: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }), remove: (id) => request(`/users/${id}`, { method: 'DELETE' }) },
    subscriptions: { list: () => request('/subscriptions'), create: (data) => request('/subscriptions', { method: 'POST', body: JSON.stringify(data) }), update: (id, data) => request(`/subscriptions/${id}`, { method: 'PUT', body: JSON.stringify(data) }), remove: (id) => request(`/subscriptions/${id}`, { method: 'DELETE' }) },
    public: {
        plans: () => request('/public/plans'),
        requestSubscription: (data) => request('/public/subscription-requests', { method: 'POST', body: JSON.stringify(data) }),
        approveSubscription: (id, data) => request(`/public/subscription-requests/${id}/approve`, { method: 'PUT', body: JSON.stringify(data) })
    }
};
