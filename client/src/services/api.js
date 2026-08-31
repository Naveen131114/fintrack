const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const role = import.meta.env.VITE_USER_ROLE || 'user';

async function request(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, { headers: { 'Content-Type': 'application/json', 'x-user-role': role, ...options.headers }, ...options });
    if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.message || 'Request failed'); }
    return response.status === 204 ? null : response.json();
}
export const api = {
    transactions: { list: () => request('/transactions'), create: (data) => request('/transactions', { method: 'POST', body: JSON.stringify(data) }), update: (id, data) => request(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }), remove: (id) => request(`/transactions/${id}`, { method: 'DELETE' }) },
    types: { list: () => request('/masters/types'), create: (data) => request('/masters/types', { method: 'POST', body: JSON.stringify(data) }), update: (id, data) => request(`/masters/types/${id}`, { method: 'PUT', body: JSON.stringify(data) }), remove: (id) => request(`/masters/types/${id}`, { method: 'DELETE' }) },
    categories: { list: (type) => request(`/masters/categories${type ? `?type=${encodeURIComponent(type)}` : ''}`), create: (data) => request('/masters/categories', { method: 'POST', body: JSON.stringify(data) }), update: (id, data) => request(`/masters/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }), remove: (id) => request(`/masters/categories/${id}`, { method: 'DELETE' }) },
    users: { list: () => request('/users'), create: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }), update: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }), remove: (id) => request(`/users/${id}`, { method: 'DELETE' }) },
    subscriptions: { list: () => request('/subscriptions'), create: (data) => request('/subscriptions', { method: 'POST', body: JSON.stringify(data) }), update: (id, data) => request(`/subscriptions/${id}`, { method: 'PUT', body: JSON.stringify(data) }), remove: (id) => request(`/subscriptions/${id}`, { method: 'DELETE' }) },
    public: { plans: () => request('/public/plans'), requestSubscription: (data) => request('/public/subscription-requests', { method: 'POST', body: JSON.stringify(data) }) }
};
