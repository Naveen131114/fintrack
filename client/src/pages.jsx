import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from './services/api';
import DataTable from './components/DataTable';
import ResourcePage from './components/ResourcePage';
import AlertDialog from './components/AlertDialog';

export function UsersPage() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', userName: '', emailId: '', phoneNumber: '', password: '', subscriptionPlan: '' });
    const [deleteAlert, setDeleteAlert] = useState(null);

    const load = async () => {
        try {
            const users = await api.users.list();
            setRows(users.filter((user) => user.role !== 'super_admin'));
        } catch (error) {
            setMessage(error.message);
        }
    };

    useEffect(() => { load(); }, []);

    const approve = async (user, approved = true) => {
        try {
            setLoading(true);
            await api.public.approveSubscription(user._id, {
                approved,
                subscriptionStartDate: new Date().toISOString(),
                subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            });
            setMessage(approved ? `Approved ${user.name || user.userName}` : `Rejected ${user.name || user.userName}`);
            await load();
        } catch (error) {
            setMessage(error.message);
        } finally {
            setLoading(false);
        }
    };

    const saveUser = async (event) => {
        event.preventDefault();
        try {
            setLoading(true);
            if (editing) {
                await api.users.update(editing._id, form);
                setMessage(`Updated ${form.name || form.userName}`);
            } else {
                await api.users.create(form);
                setMessage(`Added ${form.name || form.userName}`);
            }
            setOpen(false);
            setEditing(null);
            setForm({ name: '', userName: '', emailId: '', phoneNumber: '', password: '', subscriptionPlan: '' });
            await load();
        } catch (error) {
            setMessage(error.message);
        } finally {
            setLoading(false);
        }
    };

    const deleteUser = async (user) => {
        if (deleteAlert?._id === user._id) {
            try {
                setLoading(true);
                await api.users.remove(user._id);
                setMessage(`Deleted ${user.name || user.userName}`);
                setTimeout(() => setMessage(''), 3000);
                await load();
            } catch (error) {
                setMessage(error.message);
            } finally {
                setLoading(false);
                setDeleteAlert(null);
            }
        }
    };

    const editUser = (user) => {
        setEditing(user);
        setForm({ name: user.name, userName: user.userName, emailId: user.emailId, phoneNumber: user.phoneNumber, subscriptionPlan: user.subscriptionPlan });
        setOpen(true);
    };

    const pending = rows.filter((row) => row.approvalStatus === 'pending');
    const approved = rows.filter((row) => row.approvalStatus === 'approved');

    const columns = [
        { key: 'name', label: 'Name' },
        { key: 'userName', label: 'Username' },
        { key: 'emailId', label: 'Email' },
        { key: 'phoneNumber', label: 'Phone' },
        { key: 'subscriptionPlan', label: 'Plan' },
        { key: 'approvalStatus', label: 'Status' }
    ];

    return <div className="resource-page"><div className="resource-heading"><div><p className="eyebrow">Access management</p><h1>Users</h1><p className="subheading">Manage users, approve subscriptions, and control access.</p></div><button className="primary-button" onClick={() => { setEditing(null); setForm({ name: '', userName: '', emailId: '', phoneNumber: '', password: '', subscriptionPlan: '' }); setOpen(true); }}><Plus size={18} />Add user</button></div>{message && <div className="success-banner">{message}</div>}<section className="panel resource-panel"><h2>Pending approval</h2>{pending.length === 0 ? <p className="subheading">No pending subscription requests.</p> : <div className="approval-list">{pending.map((user) => <div key={user._id} className="approval-card"><div><strong>{user.name}</strong><p>{user.emailId}</p><p>{user.phoneNumber}</p><p>Plan: {user.subscriptionPlan || 'N/A'}</p><p>Status: {user.approvalStatus}</p></div><div className="approval-actions"><button className="primary-button" disabled={loading} onClick={() => approve(user, true)}>Approve</button><button className="icon-button" disabled={loading} onClick={() => approve(user, false)}>Reject</button></div></div>)}</div>}</section><section className="panel resource-panel"><h2>All users</h2><DataTable columns={columns} rows={approved} onEdit={editUser} onDelete={(row) => setDeleteAlert(row)} /></section>{deleteAlert && <AlertDialog open={true} title="Delete user?" message={`This will permanently delete ${deleteAlert.name || deleteAlert.userName}`} confirmText="Delete" cancelText="Cancel" variant="destructive" onConfirm={() => deleteUser(deleteAlert)} onCancel={() => setDeleteAlert(null)} />}{open && <div className="modal-backdrop"><div className="modal"><div className="modal-heading"><div><p className="eyebrow">User management</p><h2>{editing ? 'Edit user' : 'Add user'}</h2></div><button className="icon-button" onClick={() => setOpen(false)}>×</button></div><form onSubmit={saveUser}><label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label><label>Username<input value={form.userName} onChange={(event) => setForm({ ...form, userName: event.target.value })} required /></label><label>Email<input type="email" value={form.emailId} onChange={(event) => setForm({ ...form, emailId: event.target.value })} required /></label><label>Phone<input value={form.phoneNumber} onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })} required /></label>{!editing && <label>Password<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></label>}<label>Subscription Plan<input value={form.subscriptionPlan} onChange={(event) => setForm({ ...form, subscriptionPlan: event.target.value })} /></label><button className="primary-button modal-submit" disabled={loading}>{loading ? 'Saving...' : 'Save user'}</button></form></div></div>}</div>;
}
export function TransactionsPage() {
    const [rows, setRows] = useState([]);
    const [types, setTypes] = useState([]);
    const [categories, setCategories] = useState([]);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ type: '', category: '', date: '', amount: '', description: '' });
    const [message, setMessage] = useState('');
    const [deleteAlert, setDeleteAlert] = useState(null);

    const load = () => api.transactions.list().then(setRows);
    useEffect(() => { load(); api.types.list().then(setTypes); }, []);
    useEffect(() => { if (form.type) api.categories.list(form.type).then(setCategories); }, [form.type]);

    const save = async (event) => {
        event.preventDefault();
        const data = { ...form, title: form.description.trim() || `Transaction ${new Date().getTime()}`, amount: Number(form.amount), date: new Date(form.date).toISOString() };
        if (!form.type || !form.amount || !form.category || !form.date) return;
        try {
            if (editing) await api.transactions.update(editing._id, data);
            else await api.transactions.create(data);
            setMessage(editing ? 'Transaction updated' : 'Transaction added');
            setTimeout(() => setMessage(''), 3000);
            setOpen(false);
            setEditing(null);
            setForm({ type: '', category: '', date: '', amount: '', description: '' });
            load();
        } catch (error) {
            setMessage(error.message);
        }
    };

    const remove = async (row) => {
        if (deleteAlert?._id === row._id) {
            try {
                await api.transactions.remove(row._id);
                setMessage('Transaction deleted');
                setTimeout(() => setMessage(''), 3000);
                load();
            } catch (error) {
                setMessage(error.message);
            }
            setDeleteAlert(null);
        }
    };

    const columns = [{ key: 'type', label: 'Type' }, { key: 'category', label: 'Category' }, { key: 'date', label: 'Date & time', render: (row) => new Date(row.date).toLocaleString() }, { key: 'amount', label: 'Amount', render: (row) => `₹${Number(row.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` }, { key: 'description', label: 'Description' }];

    return <div className="resource-page"><div className="resource-heading"><div><p className="eyebrow">Ledger</p><h1>Transactions</h1><p className="subheading">Every income and expense, in descending order.</p></div><button className="primary-button" onClick={() => setOpen(true)}><Plus size={18} />Add transaction</button></div>{message && <div className="success-banner">{message}</div>}<section className="panel resource-panel"><DataTable columns={columns} rows={rows} onEdit={(row) => { setEditing(row); setForm({ ...row, date: new Date(row.date).toISOString().slice(0, 16) }); setOpen(true); }} onDelete={(row) => setDeleteAlert(row)} /></section>{open && <div className="modal-backdrop"><div className="modal"><div className="modal-heading"><div><p className="eyebrow">Ledger entry</p><h2>{editing ? 'Edit transaction' : 'Add transaction'}</h2></div><button className="icon-button" onClick={() => setOpen(false)}>×</button></div><form onSubmit={save}><label>Type <span className="required-asterisk">*</span><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value, category: '' })} required><option value="">Select type</option>{(types.length ? types.map((item) => item.name) : ['Income', 'Expense', 'Others']).map((item) => <option key={item}>{item}</option>)}</select></label><label>Category <span className="required-asterisk">*</span><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} required><option value="">Select category</option>{categories.map((item) => <option key={item._id}>{item.name}</option>)}</select></label><label>Date and time <span className="required-asterisk">*</span><input type="datetime-local" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required /></label><label>Amount <span className="required-asterisk">*</span><input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required /></label><label>Description<input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Optional" /></label><button className="primary-button modal-submit">Save transaction</button></form></div></div>}{deleteAlert && <AlertDialog open={true} title="Delete transaction?" message="This action cannot be undone." confirmText="Delete" cancelText="Cancel" variant="destructive" onConfirm={() => remove(deleteAlert)} onCancel={() => setDeleteAlert(null)} />}</div>;
}

export function MastersPage() { const [tab, setTab] = useState('types'); const [rows, setRows] = useState([]); const [types, setTypes] = useState([]); const [name, setName] = useState(''); const [type, setType] = useState(''); const [editing, setEditing] = useState(null); const load = () => (tab === 'types' ? api.types.list() : api.categories.list()).then(setRows); useEffect(() => { api.types.list().then(setTypes); }, []); useEffect(() => { load(); }, [tab]); const add = async (event) => { event.preventDefault(); const data = { name, ...(tab === 'categories' ? { type } : {}) }; if (editing) await (tab === 'types' ? api.types.update(editing._id, data) : api.categories.update(editing._id, data)); else await (tab === 'types' ? api.types.create(data) : api.categories.create(data)); setName(''); setType(''); setEditing(null); load(); }; const remove = async (row) => { if (window.confirm('Delete this master record?')) { await (tab === 'types' ? api.types.remove(row._id) : api.categories.remove(row._id)); load(); } }; return <div className="resource-page"><div className="resource-heading"><div><p className="eyebrow">Configuration</p><h1>Masters</h1><p className="subheading">Define transaction types and type-specific categories.</p></div></div><div className="master-tabs"><button className={tab === 'types' ? 'selected' : ''} onClick={() => { setTab('types'); setEditing(null); }}>Types</button><button className={tab === 'categories' ? 'selected' : ''} onClick={() => { setTab('categories'); setEditing(null); }}>Categories</button></div><section className="panel resource-panel"><form className="inline-form" onSubmit={add}><input placeholder={tab === 'types' ? 'New type name' : 'New category name'} value={name} onChange={(event) => setName(event.target.value)} required />{tab === 'categories' && <select value={type} onChange={(event) => setType(event.target.value)} required><option value="">Select type</option>{types.map((item) => <option key={item._id}>{item.name}</option>)}</select>}<button className="primary-button"><Plus size={16} />{editing ? 'Update' : 'Add'}</button></form><DataTable columns={tab === 'types' ? [{ key: 'name', label: 'Type name' }] : [{ key: 'name', label: 'Category name' }, { key: 'type', label: 'Transaction type' }]} rows={rows} onEdit={(row) => { setEditing(row); setName(row.name); setType(row.type || ''); }} onDelete={remove} /></section></div>; }

export const SubscriptionsPage = () => <ResourcePage title="Subscriptions" description="Manage plans and billing periods." resource={api.subscriptions} columns={[{ key: 'planName', label: 'Plan name' }, { key: 'period', label: 'Period' }, { key: 'amount', label: 'Amount', render: (row) => `₹${Number(row.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` }]} fields={[{ key: 'planName', label: 'Plan name' }, { key: 'period', label: 'Period', options: ['1 month', '3 months', '6 months', '1 year'] }, { key: 'amount', label: 'Amount', type: 'number' }]} />;
