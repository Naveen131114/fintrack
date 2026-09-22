import { useEffect, useMemo, useRef, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from './services/api';
import DataTable from './components/DataTable';
import ResourcePage from './components/ResourcePage';
import StaffPage from './components/StaffPage';
import AlertDialog from './components/AlertDialog';
import { getStoredUser, isBusinessStaff, isBusinessUser } from './utils/roles';

// TopNavbar stores the selected branch id in fintrack_selected_branch ('ALL' means no specific branch).
const defaultBranchId = () => {
    const value = localStorage.getItem('fintrack_selected_branch');
    return value && value !== 'ALL' ? value : '';
};

const emptyTransactionForm = () => ({ type: '', category: '', date: '', amount: '', description: '', branchId: defaultBranchId(), paymentType: 'Cash', bankAccountId: '', upiAccountId: '', transactionNumber: '' });

export function UsersPage() {
    const [rows, setRows] = useState([]);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', userName: '', emailId: '', phoneNumber: '', password: '', subscriptionPlan: '', role: 'user', approvalStatus: 'approved' });
    const [deleteAlert, setDeleteAlert] = useState(null);

    const load = async () => {
        try {
            const [users, subPlans] = await Promise.all([
                api.users.list(),
                api.subscriptions.list().catch(() => [])
            ]);
            setPlans(Array.isArray(subPlans) ? subPlans : []);
            setRows((users || []).filter((user) => user.role !== 'super_admin'));
        } catch (error) {
            setMessage(error.message);
        }
    };

    useEffect(() => { load(); }, []);

    const approve = async (user, approved = true, role) => {
        try {
            setLoading(true);
            await api.public.approveSubscription(user._id, {
                approved,
                subscriptionStartDate: new Date().toISOString(),
                subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                ...(role ? { role } : {})
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
            setForm({ name: '', userName: '', emailId: '', phoneNumber: '', password: '', subscriptionPlan: '', role: 'user', approvalStatus: 'approved' });
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
        setForm({ name: user.name, userName: user.userName, emailId: user.emailId, phoneNumber: user.phoneNumber, subscriptionPlan: user.subscriptionPlan, role: user.role || 'user', approvalStatus: user.approvalStatus || 'approved' });
        setOpen(true);
    };

    const pending = rows.filter((row) => row.approvalStatus === 'pending');
    const approved = rows.filter((row) => row.approvalStatus !== 'pending');

    const columns = [
        { key: 'name', label: 'Name' },
        { key: 'userName', label: 'Username' },
        { key: 'emailId', label: 'Email' },
        { key: 'phoneNumber', label: 'Phone' },
        { key: 'subscriptionPlan', label: 'Plan' },
        { key: 'role', label: 'Role' },
        { key: 'approvalStatus', label: 'Status' }
    ];

    return <div className="resource-page"><div className="resource-heading"><div><p className="eyebrow">Access management</p><h1>Users</h1><p className="subheading">Manage users, approve subscriptions, and control access.</p></div><button className="primary-button" onClick={() => { setEditing(null); setForm({ name: '', userName: '', emailId: '', phoneNumber: '', password: '', subscriptionPlan: '', role: 'user', approvalStatus: 'approved' }); setOpen(true); }}><Plus size={18} />Add user</button></div>{message && <div className="success-banner">{message}</div>}<section className="panel resource-panel"><h2>Pending approval</h2>{pending.length === 0 ? <p className="subheading">No pending subscription requests.</p> : <div className="approval-list">{pending.map((user) => <div key={user._id} className="approval-card"><div><strong>{user.name}</strong><p>{user.emailId}</p><p>{user.phoneNumber}</p><p>Plan: {user.subscriptionPlan || 'N/A'}</p><p>Role: {user.role || 'user'}</p><p>Status: {user.approvalStatus}</p></div><div className="approval-actions"><button className="primary-button" disabled={loading} onClick={() => approve(user, true)}>Approve</button><button className="primary-button" disabled={loading} onClick={() => approve(user, true, 'business_owner')}>Approve as business</button><button className="icon-button" disabled={loading} onClick={() => approve(user, false)}>Reject</button></div></div>)}</div>}</section><section className="panel resource-panel"><h2>All users</h2><DataTable columns={columns} rows={approved} onEdit={editUser} onDelete={(row) => setDeleteAlert(row)} /></section>{deleteAlert && <AlertDialog open={true} title="Delete user?" message={`This will permanently delete ${deleteAlert.name || deleteAlert.userName}`} confirmText="Delete" cancelText="Cancel" variant="destructive" onConfirm={() => deleteUser(deleteAlert)} onCancel={() => setDeleteAlert(null)} />}{open && <div className="modal-backdrop"><div className="modal"><div className="modal-heading"><div><p className="eyebrow">User management</p><h2>{editing ? 'Edit user' : 'Add user'}</h2></div><button className="icon-button" onClick={() => setOpen(false)}>×</button></div><form onSubmit={saveUser}><label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label><label>Username<input value={form.userName} onChange={(event) => setForm({ ...form, userName: event.target.value })} required /></label><label>Email<input type="email" value={form.emailId} onChange={(event) => setForm({ ...form, emailId: event.target.value })} required /></label><label>Phone<input value={form.phoneNumber} onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })} required /></label>{!editing && <label>Password<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></label>}<label>Subscription Plan<select value={form.subscriptionPlan} onChange={(event) => setForm({ ...form, subscriptionPlan: event.target.value })}><option value="">No plan</option>{plans.map((plan) => <option key={plan._id} value={plan.planName}>{plan.planName} ({plan.planType}) - ₹{Number(plan.amount || 0).toLocaleString('en-IN')}/{plan.period}</option>)}</select></label><label>Role<select value={form.role || 'user'} onChange={(event) => setForm({ ...form, role: event.target.value })} required><option value="user">Personal account</option><option value="business_owner">Business owner</option></select></label><button className="primary-button modal-submit" disabled={loading}>{loading ? 'Saving...' : 'Save user'}</button></form></div></div>}</div>;
}
export function TransactionsPage() {
    const [rows, setRows] = useState([]);
    const [types, setTypes] = useState([]);
    const [categories, setCategories] = useState([]);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyTransactionForm);
    const [message, setMessage] = useState('');
    const [deleteAlert, setDeleteAlert] = useState(null);
    const [dateFilter, setDateFilter] = useState('this-month');
    const [typeFilter, setTypeFilter] = useState('All');
    const business = isBusinessUser(getStoredUser());
    const [branches, setBranches] = useState([]);
    const [banks, setBanks] = useState([]);
    const [upis, setUpis] = useState([]);

    const dateOptions = [
        ['today', 'Today'],
        ['this-week', 'This week'],
        ['this-month', 'This month'],
        ['last-month', 'Last month'],
        ['last-3-months', 'Last 3 months'],
        ['all', 'All dates']
    ];

    const getDateRange = (filter) => {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        if (filter === 'today') return [new Date(year, month, today.getDate()), new Date(year, month, today.getDate() + 1)];
        if (filter === 'this-week') { const start = new Date(year, month, today.getDate() - today.getDay()); const end = new Date(start); end.setDate(end.getDate() + 7); return [start, end]; }
        if (filter === 'this-month') return [new Date(year, month, 1), new Date(year, month + 1, 1)];
        if (filter === 'last-month') return [new Date(year, month - 1, 1), new Date(year, month, 1)];
        if (filter === 'last-3-months') return [new Date(year, month - 3, 1), new Date(year, month + 1, 1)];
        return [null, null];
    };

    const filteredRows = useMemo(() => {
        const [start, end] = getDateRange(dateFilter);
        return rows.filter((row) => {
            const date = new Date(row.date);
            return (typeFilter === 'All' || row.type === typeFilter) && (!start || (date >= start && date < end));
        });
    }, [rows, dateFilter, typeFilter]);

    const exportRows = (format) => {
        const text = filteredRows.map((row) => `${row.type} | ${row.category} | ${new Date(row.date).toLocaleDateString()} | ₹${row.amount} | ${row.description || row.title || ''}`).join('\n') || 'No transactions found';
        const blob = format === 'xl'
            ? new Blob([['Type', 'Category', 'Date', 'Description', 'Amount'].join(',') + '\n' + filteredRows.map((row) => [row.type, row.category, new Date(row.date).toLocaleDateString(), row.description || row.title || '', row.amount].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' })
            : new Blob([format === 'word' ? `<html><body><pre>${text}</pre></body></html>` : text], { type: format === 'word' ? 'application/msword' : 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `transactions.${format === 'xl' ? 'csv' : format === 'word' ? 'doc' : 'pdf'}`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const load = () => api.transactions.list().then(setRows);
    useEffect(() => { load(); api.types.list().then(setTypes); }, []);
    useEffect(() => { if (business) { api.business.branches.list().then(setBranches).catch(() => { }); api.business.bankAccounts.list().then(setBanks).catch(() => { }); api.business.upiAccounts.list().then(setUpis).catch(() => { }); } }, []);
    useEffect(() => { if (form.type) api.categories.list(form.type).then(setCategories); }, [form.type]);

    const save = async (event) => {
        event.preventDefault();
        if (!form.type || !form.amount || !form.category || !form.date) return;
        if (business && !form.branchId) return;
        if (business && form.paymentType === 'Bank' && !form.bankAccountId) return;
        if (business && form.paymentType === 'UPI' && (!form.upiAccountId || !form.transactionNumber.trim())) return;
        const data = { title: form.description.trim() || `Transaction ${new Date().getTime()}`, amount: Number(form.amount), date: new Date(form.date).toISOString(), type: form.type, category: form.category, description: form.description };
        if (business) Object.assign(data, { branchId: form.branchId, paymentType: form.paymentType, ...(form.paymentType === 'Bank' ? { bankAccountId: form.bankAccountId } : {}), ...(form.paymentType === 'UPI' ? { upiAccountId: form.upiAccountId, transactionNumber: form.transactionNumber } : {}) });
        try {
            if (editing) await api.transactions.update(editing._id, data);
            else await api.transactions.create(data);
            setMessage(editing ? 'Transaction updated' : 'Transaction added');
            setTimeout(() => setMessage(''), 3000);
            setOpen(false);
            setEditing(null);
            setForm(emptyTransactionForm());
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

    const columns = [{ key: 'type', label: 'Type' }, { key: 'category', label: 'Category' }, { key: 'date', label: 'Date & time', render: (row) => new Date(row.date).toLocaleString() }, { key: 'description', label: 'Description' }, { key: 'amount', label: 'Amount', render: (row) => { const isExpense = row.type === 'Expense' || row.type === 'expense'; return `${isExpense ? '-' : '+'}₹${Number(row.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`; } }];

    const exportRef = useRef(null);
    const exportFile = (format) => exportRef.current?.(format);
    return <div className="resource-page">
        <div className="resource-heading">
            <div>
                <p className="eyebrow">Ledger</p>
                <h1>Transactions</h1>
                <p className="subheading">Every income and expense, in descending order.</p>
            </div>
            <div className="txn-table-tools">
                <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} aria-label="Filter by date"><option value="today">Today</option><option value="this-week">This week</option><option value="this-month">This month</option><option value="last-month">Last month</option><option value="last-3-months">Last 3 months</option><option value="all">All dates</option></select>
                <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filter by type"><option>All</option><option>Income</option><option>Expense</option></select>
                <span className="export-label">Export as</span>{['xl', 'word', 'pdf'].map((format) => <button type="button" key={format} onClick={() => exportFile(format)}>{format === 'xl' ? 'XL' : format[0].toUpperCase() + format.slice(1)}</button>)}
            </div>
            <button className="primary-button" onClick={() => { setEditing(null); setForm(emptyTransactionForm()); setOpen(true); }}><Plus size={18} />Add transaction</button>
        </div>
        {message && <div className="success-banner">{message}</div>}
        <section className="panel resource-panel">
            <DataTable columns={columns} rows={rows} dateFilter={dateFilter} typeFilter={typeFilter} onExportReady={exportRef} showTotal onEdit={(row) => { setEditing(row); setForm({ ...emptyTransactionForm(), ...row, amount: String(row.amount ?? ''), date: new Date(row.date).toISOString().slice(0, 16) }); setOpen(true); }} onDelete={(row) => setDeleteAlert(row)} />
        </section>{open && <div className="modal-backdrop"><div className="modal modal-two-column"><div className="modal-heading"><div><p className="eyebrow">Ledger entry</p><h2>{editing ? 'Edit transaction' : 'Add transaction'}</h2></div><button className="icon-button" onClick={() => setOpen(false)}>×</button></div><form className="modal-form-two-column" onSubmit={save}><label>Type <span className="required-asterisk">*</span><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value, category: '' })} required><option value="">Select type</option>{(types.length ? types.map((item) => item.name) : ['Income', 'Expense', 'Others']).map((item) => <option key={item}>{item}</option>)}</select></label><label>Category <span className="required-asterisk">*</span><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} required><option value="">Select category</option>{categories.map((item) => <option key={item._id}>{item.name}</option>)}</select></label><label>Date and time <span className="required-asterisk">*</span><input type="datetime-local" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required /></label><label>Amount <span className="required-asterisk">*</span><input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required /></label><label className="full-width">Description<input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Optional" /></label>{business && <><label className="full-width">Branch <span className="required-asterisk">*</span><select value={form.branchId} onChange={(event) => setForm({ ...form, branchId: event.target.value })} required><option value="">Select branch</option>{branches.filter((b) => b.status === 'active').map((b) => <option key={b._id} value={b._id}>{b.branchName}</option>)}</select></label><label>Payment type<select value={form.paymentType} onChange={(event) => setForm({ ...form, paymentType: event.target.value })}><option>Cash</option><option>Bank</option><option>UPI</option></select></label>{form.paymentType === 'Bank' && <label>Bank account <span className="required-asterisk">*</span><select value={form.bankAccountId} onChange={(event) => setForm({ ...form, bankAccountId: event.target.value })} required><option value="">Select bank account</option>{banks.filter((b) => b.status === 'active').map((b) => <option key={b._id} value={b._id}>{b.bankName} ({b.ifscCode})</option>)}</select></label>}{form.paymentType === 'UPI' && <><label>UPI account <span className="required-asterisk">*</span><select value={form.upiAccountId} onChange={(event) => setForm({ ...form, upiAccountId: event.target.value })} required><option value="">Select UPI account</option>{upis.filter((u) => u.status === 'active').map((u) => <option key={u._id} value={u._id}>{u.upiId}</option>)}</select></label><label>Transaction number <span className="required-asterisk">*</span><input value={form.transactionNumber} onChange={(event) => setForm({ ...form, transactionNumber: event.target.value })} required /></label></>}</>}<button className="primary-button modal-submit full-width">Save transaction</button></form></div></div>}{deleteAlert && <AlertDialog open={true} title="Delete transaction?" message="This action cannot be undone." confirmText="Delete" cancelText="Cancel" variant="destructive" onConfirm={() => remove(deleteAlert)} onCancel={() => setDeleteAlert(null)} />}</div>;
}

export function MastersPage() { const [tab, setTab] = useState('types'); const [rows, setRows] = useState([]); const [types, setTypes] = useState([]); const [name, setName] = useState(''); const [type, setType] = useState(''); const [editing, setEditing] = useState(null); const load = () => (tab === 'types' ? api.types.list() : api.categories.list()).then(setRows); useEffect(() => { api.types.list().then(setTypes); }, []); useEffect(() => { load(); }, [tab]); const add = async (event) => { event.preventDefault(); const data = { name, ...(tab === 'categories' ? { type } : {}) }; if (editing) await (tab === 'types' ? api.types.update(editing._id, data) : api.categories.update(editing._id, data)); else await (tab === 'types' ? api.types.create(data) : api.categories.create(data)); setName(''); setType(''); setEditing(null); load(); }; const remove = async (row) => { if (window.confirm('Delete this master record?')) { await (tab === 'types' ? api.types.remove(row._id) : api.categories.remove(row._id)); load(); } }; return <div className="resource-page"><div className="resource-heading"><div><p className="eyebrow">Configuration</p><h1>Masters</h1><p className="subheading">Define transaction types and type-specific categories.</p></div></div><div className="master-tabs"><button className={tab === 'types' ? 'selected' : ''} onClick={() => { setTab('types'); setEditing(null); }}>Types</button><button className={tab === 'categories' ? 'selected' : ''} onClick={() => { setTab('categories'); setEditing(null); }}>Categories</button></div><section className="panel resource-panel"><form className="inline-form" onSubmit={add}><input placeholder={tab === 'types' ? 'New type name' : 'New category name'} value={name} onChange={(event) => setName(event.target.value)} required />{tab === 'categories' && <select value={type} onChange={(event) => setType(event.target.value)} required><option value="">Select type</option>{types.map((item) => <option key={item._id}>{item.name}</option>)}</select>}<button className="primary-button"><Plus size={16} />{editing ? 'Update' : 'Add'}</button></form><DataTable columns={tab === 'types' ? [{ key: 'name', label: 'Type name' }] : [{ key: 'name', label: 'Category name' }, { key: 'type', label: 'Transaction type' }]} rows={rows} onEdit={(row) => { setEditing(row); setName(row.name); setType(row.type || ''); }} onDelete={remove} /></section></div>; }

export const SubscriptionsPage = () => <ResourcePage title="Subscriptions" description="Personal-use plans stay simple. Business-use plans carry branch and staff login limits in counts." resource={api.subscriptions} formDefaults={{ planType: 'personal' }} columns={[{ key: 'planName', label: 'Plan name' }, { key: 'planType', label: 'Use' }, { key: 'period', label: 'Period' }, { key: 'amount', label: 'Amount', render: (row) => `₹${Number(row.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` }, { key: 'maxBranches', label: 'Branch limit' }, { key: 'maxStaff', label: 'Staff limit' }]} fields={[{ key: 'planName', label: 'Plan name' }, { key: 'planType', label: 'Subscription plan use', options: ['personal', 'business'] }, { key: 'period', label: 'Period', options: ['1 month', '3 months', '6 months', '1 year'] }, { key: 'amount', label: 'Amount', type: 'number' }, { key: 'maxBranches', label: 'Branch limit (counts)', hint: 'Business use only', type: 'number', min: 0, required: false, showWhen: (form) => form.planType === 'business' }, { key: 'maxStaff', label: 'Staff login limit (counts)', hint: 'Business use only', type: 'number', min: 0, required: false, showWhen: (form) => form.planType === 'business' }, { key: 'status', label: 'Status', options: ['active', 'inactive'] }]} />;
export const BranchesPage = () => <ResourcePage title="Branches" description="Create and manage your business locations." resource={api.business.branches} columns={[{ key: 'branchName', label: 'Branch name' }, { key: 'status', label: 'Status' }]} fields={[{ key: 'branchName', label: 'Branch name' }, { key: 'status', label: 'Status', options: ['active', 'inactive'] }]} />;
export const BankAccountsPage = () => <ResourcePage title="Bank Accounts" description="Manage accounts available for bank payments." resource={api.business.bankAccounts} columns={[{ key: 'bankName', label: 'Bank' }, { key: 'ifscCode', label: 'IFSC' }, { key: 'branch', label: 'Branch' }, { key: 'status', label: 'Status' }]} fields={[{ key: 'bankName', label: 'Bank name' }, { key: 'accountNumber', label: 'Account number' }, { key: 'ifscCode', label: 'IFSC code' }, { key: 'branch', label: 'Bank branch', required: false }, { key: 'status', label: 'Status', options: ['active', 'inactive'] }]} />;
export const UpiAccountsPage = () => <ResourcePage title="UPI Accounts" description="Manage UPI IDs and QR-code URLs." resource={api.business.upiAccounts} columns={[{ key: 'upiId', label: 'UPI ID' }, { key: 'upiPhoneNumber', label: 'Phone' }, { key: 'status', label: 'Status' }]} fields={[{ key: 'upiId', label: 'UPI ID' }, { key: 'upiPhoneNumber', label: 'Phone number', required: false }, { key: 'qrCode', label: 'QR code URL', required: false }, { key: 'status', label: 'Status', options: ['active', 'inactive'] }]} />;
export function ActivityLogsPage() { const [rows, setRows] = useState([]); const [error, setError] = useState(''); useEffect(() => { if (!isBusinessUser(getStoredUser())) { setError('Business account access required'); return; } api.business.activityLogs().then(setRows).catch((err) => setError(err.message)); }, []); return <div className="resource-page"><div className="resource-heading"><div><p className="eyebrow">Audit trail</p><h1>Activity Logs</h1><p className="subheading">Important actions performed by your staff.</p></div></div>{error && <div className="error-banner">{error}</div>}<section className="panel resource-panel"><DataTable columns={[{ key: 'createdAt', label: 'Time', render: (row) => new Date(row.createdAt).toLocaleString() }, { key: 'staffUserId', label: 'Staff', render: (row) => row.staffUserId?.name || row.staffUserId?.userName || 'Staff' }, { key: 'action', label: 'Action' }, { key: 'module', label: 'Module' }, { key: 'description', label: 'Details' }]} rows={rows} /></section></div>; }

export { StaffPage };
