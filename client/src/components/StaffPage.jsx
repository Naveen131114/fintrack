import { useEffect, useState } from 'react';
import { api } from '../services/api';
import DataTable from './DataTable';
import { getStoredUser } from '../utils/roles';

const EMPTY = {
    name: '',
    userName: '',
    emailId: '',
    password: '',
    phoneNumber: '',
    permissionLevel: 'view',
    branchIds: []
};
const OBJECT_ID = /^[a-fA-F0-9]{24}$/;

export default function StaffPage() {
    const [rows, setRows] = useState([]);
    const [branches, setBranches] = useState([]);
    const [form, setForm] = useState(EMPTY);
    const [editing, setEditing] = useState(null);
    const [open, setOpen] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [branchError, setBranchError] = useState('');
    const [branchLoading, setBranchLoading] = useState(false);

    const loadBranches = async () => {
        setBranchLoading(true);
        setBranchError('');
        const branchList = await api.business.branches.list().catch((err) => { setBranchError(err.message); return null; });
        if (branchList !== null) setBranches(Array.isArray(branchList) ? branchList : []);
        setBranchLoading(false);
    };

    const load = async () => {
        setError('');
        const staff = await api.business.staff.list().catch((err) => { setError(err.message); return null; });
        if (staff !== null) setRows(Array.isArray(staff) ? staff : []);
        await loadBranches();
    };

    const toggleBranch = (id) => setForm((p) => ({ ...p, branchIds: p.branchIds.includes(id) ? p.branchIds.filter((b) => b !== id) : [...p.branchIds, id] }));
    const startAdd = () => { setEditing(null); setForm(EMPTY); setOpen(true); loadBranches(); };
    const startEdit = (row) => {
        setEditing(row);
        setForm({
            name: row.name || '',
            userName: row.userName || '',
            emailId: row.emailId || '',
            password: '',
            phoneNumber: row.phoneNumber || '',
            permissionLevel: row.permissionLevel || 'view',
            branchIds: (row.allowedBranches || []).map((branch) => String(branch?._id ?? branch))
        });
        setOpen(true); loadBranches();
    };

    const submit = async (e) => {
        e.preventDefault();
        setError(''); setMessage('');
        const branchIds = form.branchIds.filter((id) => OBJECT_ID.test(id));
        if (!branchIds.length) { setError('Select at least one branch from the list (staff login requires branch access)'); return; }
        try {
            // Subscription dates are NOT entered by the user — the server inherits them
            // automatically from the business owner's subscription plan.
            const payload = {
                name: form.name.trim(),
                userName: form.userName.trim(),
                emailId: form.emailId.trim(),
                phoneNumber: form.phoneNumber.trim(),
                permissionLevel: form.permissionLevel,
                allowedBranches: branchIds
            };
            if (!editing || form.password) payload.password = form.password;
            if (editing) await api.business.staff.update(editing._id, payload); else await api.business.staff.create(payload);
            setMessage(editing ? 'Updated staff' : 'Added staff');
            setOpen(false); setEditing(null); await load();
        } catch (err) { setError(err.message); }
    };

    useEffect(() => { load(); }, []);

    const owner = getStoredUser();
    const ownerStartDate = owner?.subscriptionStartDate;
    const ownerEndDate = owner?.subscriptionEndDate;

    const ownerPlanName = owner?.subscriptionPlan;

    const columns = [
        { key: 'name', label: 'Name' },
        { key: 'userName', label: 'Username' },
        { key: 'emailId', label: 'Email' },
        { key: 'phoneNumber', label: 'Phone' },
        { key: 'permissionLevel', label: 'Permission' },
        { key: 'allowedBranches', label: 'Branches', render: (row) => (row.allowedBranches || []).map((b) => b?.branchName || b).filter(Boolean).join(', ') || '-' },
        // Subscription details are inherited from owner's plan by the server,
        // but show them here with fallback to owner dates.
        // { key: 'subscriptionPlan', label: 'Plan', render: (row) => row.subscriptionPlan || owner?.subscriptionPlan || "Owner's plan" },
        // { key: 'subscriptionStartDate', label: 'Sub. start', render: (row) => (row.subscriptionStartDate || ownerStartDate) ? new Date(row.subscriptionStartDate || ownerStartDate).toLocaleDateString('en-IN') : '-' },
        // { key: 'subscriptionEndDate', label: 'Sub. end', render: (row) => (row.subscriptionEndDate || ownerEndDate) ? new Date(row.subscriptionEndDate || ownerEndDate).toLocaleDateString('en-IN') : '-' },
        { key: 'status', label: 'Status' }
    ];

    return <div className="resource-page">
        <div className="resource-heading">
            <div><p className="eyebrow">Team access</p><h1>Staff</h1><p className="subheading">Invite staff logins and limit them to selected branches.</p></div>
            <button className="primary-button" onClick={startAdd}>+ Add staff</button>
        </div>
        {message && <div className="success-banner">{message}</div>}
        {error && <div className="error-banner">{error}</div>}
        {branchError && <div className="error-banner">Branches: {branchError}</div>}
        <section className="panel resource-panel">
            {/* <p className="subheading">Staff count: {rows.length}</p> */}
            <DataTable columns={columns} rows={rows} onEdit={(row) => startEdit(row)} />
        </section>
        {open && <div className="modal-backdrop">
            <div className="modal modal-two-column">
                <div className="modal-heading">
                    <div><p className="eyebrow">{editing ? 'Edit staff login' : 'New staff login'}</p><h2>{editing ? 'Edit staff' : 'Add staff'}</h2></div>
                    <button className="icon-button" onClick={() => setOpen(false)}>×</button>
                </div>
                <form className="modal-form-two-column" onSubmit={submit}>
                    <label>Name<input value={form.name} onChange={(ev) => setForm({ ...form, name: ev.target.value })} required /></label>
                    <label>Username<input value={form.userName} onChange={(ev) => setForm({ ...form, userName: ev.target.value })} required /></label>
                    <label>Email<input type="email" value={form.emailId} onChange={(ev) => setForm({ ...form, emailId: ev.target.value })} required /></label>
                    <label>Password {editing && '(keep blank)'}<input type="password" value={form.password} onChange={(ev) => setForm({ ...form, password: ev.target.value })} required={!editing} /></label>
                    <label>Phone number<input value={form.phoneNumber} onChange={(ev) => setForm({ ...form, phoneNumber: ev.target.value })} /></label>
                    <label>Permission level<select value={form.permissionLevel} onChange={(ev) => setForm({ ...form, permissionLevel: ev.target.value })} required>
                        <option value="view">View</option>
                        <option value="edit">Edit</option>
                        <option value="full">Full</option>
                    </select></label>
                    <div className="readonly-info full-width">
                        <p>Subscription dates are taken automatically from your business subscription plan.</p>
                        {ownerStartDate && <p>Start date: {new Date(ownerStartDate).toLocaleDateString('en-IN')}</p>}
                        {ownerEndDate && <p>End date: {new Date(ownerEndDate).toLocaleDateString('en-IN')}</p>}
                    </div>
                    <label className="full-width">Allowed branches
                        <div className="branch-checkboxes">
                            {branchLoading && <span>Loading…</span>}
                            {!branchLoading && !branches.length && <span className="field-hint">No branches available — create one under Branches first</span>}
                            {branchError && <span className="field-hint">Branches: {branchError}</span>}
                            {branches.map((branch) => {
                                const checked = form.branchIds.includes(String(branch._id));
                                return <label key={branch._id} className="checkbox-row"><input type="checkbox" checked={!!checked} onChange={() => toggleBranch(String(branch._id))} />{branch.branchName}{branch.status === 'inactive' ? ' (inactive)' : ''}</label>;
                            })}
                        </div>
                    </label>
                    <button className="primary-button modal-submit full-width">Save</button>
                </form>
            </div>
        </div>}
    </div>;
}

