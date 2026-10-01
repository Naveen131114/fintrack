import { useEffect, useMemo, useState } from 'react';
import { Check, Clock, X } from 'lucide-react';
import { api } from '../services/api';
import AlertDialog from './AlertDialog';
import { refreshNotifications } from './NotificationBell';
import { isBusinessStaff, roleLabel, useStoredUser } from '../utils/roles';
import { GRANT_HOURS, PERMISSION_ACTIONS, actionPhrase, effectivePermissions, refreshPermissions } from '../utils/permissions';

// Tabs. The inbox only appears for people who can decide (owners, and staff who
// already hold the right being asked for); everyone has "My requests".
const TABS = [
    { key: 'inbox', label: 'Waiting for you' },
    { key: 'mine', label: 'My requests' }
];
const STATUSES = [
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Declined' }
];

function when(value) {
    return value ? new Date(value).toLocaleString() : '-';
}

export default function ApprovalsPage() {
    // Live profile: a decision hands the requester a grant and can also widen a
    // staff approver's own rights, so the tabs follow the current one.
    const user = useStoredUser();
    const staff = isBusinessStaff(user);
    // Right the server re-checks when a request is decided: staff only see an
    // inbox when they hold a right someone could be asking for, because
    // otherwise the endpoint always answers with an empty list.
    const rights = effectivePermissions(user);
    const canDecide = !staff || PERMISSION_ACTIONS.some((action) => rights[action] === true) || rights.grants.length > 0;
    const [tab, setTab] = useState(staff ? 'mine' : 'inbox');
    const [status, setStatus] = useState('pending');
    const [rows, setRows] = useState([]);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState('');
    const [cancelAlert, setCancelAlert] = useState(null);

    const tabs = canDecide ? TABS : TABS.filter((item) => item.key === 'mine');

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            const items = await api.requests.list({ scope: tab === 'mine' ? 'mine' : undefined, status });
            setRows(Array.isArray(items) ? items : []);
        } catch (err) {
            setError(err.message);
            setRows([]);
        } finally {
            setLoading(false);
        }
        // An approval may have just handed this account a grant (see
        // refreshPermissions): re-read the profile so the pages behind this one
        // open up with the new rights instead of waiting for a re-login.
        refreshPermissions();
    };

    useEffect(() => { load(); }, [tab, status]);

    const decide = async (row, approve) => {
        try {
            setBusyId(row._id);
            setMessage('');
            await (approve ? api.requests.approve(row._id) : api.requests.reject(row._id));
            setMessage(approve
                ? `Approved - ${row.requestedBy?.name || row.requestedBy?.userName || 'the requester'} can now ${actionPhrase(row.action, row.module)} for ${GRANT_HOURS} hours.`
                : 'Request declined.');
            refreshNotifications();
            await load();
        } catch (err) {
            setError(err.message);
        } finally {
            setBusyId('');
        }
    };

    const withdraw = async (row) => {
        try {
            setBusyId(row._id);
            await api.requests.cancel(row._id);
            setMessage('Request withdrawn.');
            setCancelAlert(null);
            refreshNotifications();
            await load();
        } catch (err) {
            setError(err.message);
        } finally {
            setBusyId('');
        }
    };

    const heading = useMemo(() => (tab === 'inbox'
        ? 'Requests from your team that need a decision.'
        : 'Requests you sent and what happened to them.'), [tab]);

    return <div className="resource-page approvals-page">
        <div className="resource-heading">
            <div>
                <p className="eyebrow">Approval workflow</p>
                <h1>Requests</h1>
                <p className="subheading">{heading}</p>
            </div>
        </div>
        {error && <div className="error-banner">{error}</div>}
        {message && <div className="success-banner">{message}</div>}
        <div className="approvals-filters">
            {tabs.length > 1 && <div className="approvals-tabs">
                {tabs.map((item) => <button key={item.key} type="button" className={`tab-button ${tab === item.key ? 'active' : ''}`} onClick={() => setTab(item.key)}>{item.label}</button>)}
            </div>}
            <div className="approvals-tabs status-tabs">
                {STATUSES.map((item) => <button key={item.key} type="button" className={`tab-button ${status === item.key ? 'active' : ''}`} onClick={() => setStatus(item.key)}>{item.label}</button>)}
            </div>
        </div>
        {loading && <p className="subheading">Loading requests...</p>}
        {!loading && !rows.length && <div className="panel approvals-empty">No {status} requests.</div>}
        {!loading && rows.length > 0 && <div className="approvals-list">
            {rows.map((row) => <article className="approval-card" key={row._id}>
                <header>
                    <div>
                        <strong>{actionPhrase(row.action, row.module)}</strong>
                        {row.recordLabel && <p className="approval-record">{row.recordLabel}</p>}
                    </div>
                    <span className={`plan-badge status-${row.status}`}>{row.status}</span>
                </header>
                <p className="approval-reason">&ldquo;{row.reason}&rdquo;</p>
                <div className="approval-meta">
                    <span>{tab === 'mine' ? `Decided by ${row.decidedBy?.name || row.decidedBy?.userName || roleLabel(row.decidedBy?.role)}` : `${row.requestedBy?.name || row.requestedBy?.userName || 'Staff'}`}</span>
                    <span><Clock size={13} /> {when(row.createdAt)}</span>
                    {row.status === 'approved' && row.grantExpiresAt && <span>Unlocked until {when(row.grantExpiresAt)}</span>}
                    {row.decisionNote && <span>Note: {row.decisionNote}</span>}
                </div>
                {row.status === 'pending' && <footer className="approval-actions">
                    {tab === 'inbox' && <>
                        <button className="primary-button" type="button" disabled={busyId === row._id} onClick={() => decide(row, true)}><Check size={15} />Approve</button>
                        <button className="secondary-button" type="button" disabled={busyId === row._id} onClick={() => decide(row, false)}><X size={15} />Decline</button>
                    </>}
                    {tab === 'mine' && <button className="secondary-button" type="button" disabled={busyId === row._id} onClick={() => setCancelAlert(row)}>Withdraw</button>}
                </footer>}
            </article>)}
        </div>}
        {cancelAlert && <AlertDialog open title="Withdraw this request?" message={`Your request to ${actionPhrase(cancelAlert.action, cancelAlert.module)} will be removed from the owner's list.`} confirmText="Withdraw" cancelText="Keep it" variant="destructive" onConfirm={() => withdraw(cancelAlert)} onCancel={() => setCancelAlert(null)} />}
    </div>;
}

