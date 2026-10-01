import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { refreshPermissions } from '../utils/permissions';

// How often the bell re-checks the server. Approval requests can arrive while a
// page is open, and there is no push channel here, so a slow poll is enough.
const POLL_MS = 60000;
// Rights can change without any notification reaching this tab (an owner
// approving a request hands the requester a short-lived grant), so the profile
// is re-read more often than the notifications themselves - that is what makes
// an approval take effect on the page the staff member is already looking at.
const PERMISSION_POLL_MS = 20000;

export function refreshNotifications() {
    window.dispatchEvent(new CustomEvent('fintrack:notifications-changed'));
}

export default function NotificationBell() {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [unread, setUnread] = useState(0);
    const [error, setError] = useState('');
    const wrapRef = useRef(null);

    const load = async () => {
        try {
            const result = await api.notifications.list();
            setItems(Array.isArray(result?.items) ? result.items : []);
            setUnread(Number(result?.unread || 0));
            setError('');
        } catch (err) {
            // A dead session is handled by api.js; anything else just hides the badge.
            if (err.status !== 401) setError(err.message);
        }
        // The decision notification arriving is the moment to re-read the profile:
        // an approval carried a grant for this account, so the buttons that were
        // locked because the right was missing have to unlock themselves.
        refreshPermissions();
    };

    useEffect(() => {
        load();
        const timer = setInterval(load, POLL_MS);
        const permissionTimer = setInterval(refreshPermissions, PERMISSION_POLL_MS);
        const resync = () => { if (!document.hidden) load(); };
        window.addEventListener('fintrack:notifications-changed', load);
        window.addEventListener('fintrack:requests-changed', load);
        // Coming back to the tab is the moment an approval made elsewhere is
        // expected to be in force - re-check before the first click.
        window.addEventListener('focus', resync);
        document.addEventListener('visibilitychange', resync);
        return () => {
            clearInterval(timer);
            clearInterval(permissionTimer);
            window.removeEventListener('fintrack:notifications-changed', load);
            window.removeEventListener('fintrack:requests-changed', load);
            window.removeEventListener('focus', resync);
            document.removeEventListener('visibilitychange', resync);
        };
    }, []);

    // Close the dropdown on any outside click, like the profile menu does.
    useEffect(() => {
        if (!open) return undefined;
        const onDocumentClick = (event) => {
            if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false);
        };
        document.addEventListener('mousedown', onDocumentClick);
        return () => document.removeEventListener('mousedown', onDocumentClick);
    }, [open]);

    const markAllRead = async () => {
        try {
            await api.notifications.markRead();
            setUnread(0);
            setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
        } catch (err) {
            setError(err.message);
        }
    };

    const removeOne = async (id) => {
        try {
            await api.notifications.remove(id);
            setItems((current) => current.filter((item) => item._id !== id));
            setUnread((count) => Math.max(0, count - 1));
        } catch (err) {
            setError(err.message);
        }
    };

    const openPanel = () => {
        const next = !open;
        setOpen(next);
        if (next) load();
    };

    return <div className="notification-wrap" ref={wrapRef}>
        <button className="icon-button notification-button" type="button" aria-label={unread ? `${unread} unread notifications` : 'Notifications'} onClick={openPanel}>
            <Bell size={19} />
            {unread > 0 && <span className="notification-badge">{unread > 9 ? '9+' : unread}</span>}
        </button>
        {open && <div className="notification-panel">
            <div className="notification-head">
                <strong>Notifications</strong>
                {unread > 0 && <button className="notification-mark" type="button" onClick={markAllRead}><CheckCheck size={14} />Mark all read</button>}
            </div>
            {error && <div className="notification-error">{error}</div>}
            {!error && !items.length && <p className="notification-empty">Nothing yet. Approval requests and decisions show up here.</p>}
            <ul className="notification-list">
                {items.map((item) => <li key={item._id} className={item.readAt ? '' : 'unread'}>
                    <button type="button" className="notification-item" onClick={() => { setOpen(false); if (item.changeRequestId) navigate('/approvals'); }}>
                        <strong>{item.title}</strong>
                        {item.message && <span>{item.message}</span>}
                        <time>{new Date(item.createdAt).toLocaleString()}</time>
                    </button>
                    <button className="icon-button notification-remove" type="button" aria-label="Dismiss notification" onClick={() => removeOne(item._id)}><Trash2 size={13} /></button>
                </li>)}
            </ul>
        </div>}
    </div>;
}
