import { useState } from 'react';
import { ShieldQuestion, X } from 'lucide-react';
import { api } from '../services/api';
import { getStoredUser } from '../utils/roles';
import { GRANT_HOURS, actionPhrase, canPerform, canRequest, isPermissionDenied, refreshPermissions } from '../utils/permissions';

// Fields tried, in order, when the dialog needs a short name for a record.
const LABEL_FIELDS = ['title', 'description', 'branchName', 'bankName', 'accountName', 'upiId', 'typeName', 'name', 'categoryName', 'category', 'month', 'notes'];

export function recordLabel(row) {
    if (!row) return '';
    const value = LABEL_FIELDS.map((field) => row[field]).find((item) => typeof item === 'string' && item.trim());
    return value ? value.trim().slice(0, 80) : '';
}

/**
 * Page-level helper for the "Request approval" workflow.
 *
 *   const changes = useChangeRequest('transactions');
 *   <DataTable permissions={(row) => tablePermissions(user, 'transactions', row?._id)}
 *              onRequest={changes.requestChange} ... />
 *   {changes.notice}
 *   {changes.modal}
 *
 * `requestChange(action, row)` opens the dialog directly (used by the locked
 * row buttons); `onRequestError(error, row)` turns a requestable 403 from any
 * API call into the same dialog, so a permission wall never dead-ends.
 */
export function useChangeRequest(module) {
    const [target, setTarget] = useState(null);
    const [notice, setNotice] = useState('');
    const user = getStoredUser();

    // Open the dialog for one action. The stored profile can be older than an
    // approval - a grant handed out while this tab was open - and asking for a
    // right that is already live is exactly what the server answers with "You are
    // already allowed to do this". So re-read the profile first: if the right is
    // there, the click becomes an instant unlock instead of a pointless request.
    // A grant can be pinned to ONE record, so the check asks about this row - a
    // grant for row A must not swallow the request for row B.
    const requestChange = async (action, row = null, payload = null) => {
        await refreshPermissions();
        const rowId = row?._id || row?.id || null;
        if (canPerform(getStoredUser(), action, module, rowId)) {
            setTarget(null);
            setNotice(`You already have this right - ${actionPhrase(action, module)} is unlocked on this page now.`);
            return true;
        }
        setTarget({ action, rowId, label: recordLabel(row), payload });
        return true;
    };

    const onRequestError = (error, row = null, fallbackAction = 'edit') => {
        if (!isPermissionDenied(error)) return false;
        requestChange(error.permission?.action || fallbackAction, row, error.permission?.payload || null);
        return true;
    };

    const noticeBanner = notice ? <div className="success-banner request-notice"><span>{notice}</span><button className="icon-button" type="button" aria-label="Dismiss" onClick={() => setNotice('')}><X size={15} /></button></div> : null;

    const modal = target
        ? <RequestApprovalDialog
            module={module}
            action={target.action}
            recordId={target.rowId}
            recordLabelText={target.label}
            payload={target.payload}
            onClose={() => setTarget(null)}
            onSubmitted={(message) => { setTarget(null); setNotice(message); window.dispatchEvent(new CustomEvent('fintrack:requests-changed')); }}
        />
        : null;

    return {
        user,
        // Only offer the button when asking is actually possible for this module
        // (and, for a row, for that record - see canRequest).
        canAskFor: (action, row = null) => canRequest(user, module, action, row?._id || row?.id || null),
        requestChange,
        onRequestError,
        modal,
        notice: noticeBanner
    };
}

/**
 * The dialog itself: reason + submit. The record's proposed values are sent
 * along for create/edit so the owner can see what is being asked for, and an
 * approval then unlocks this module + action for GRANT_HOURS hours.
 */
export function RequestApprovalDialog({ module, action, recordId = null, recordLabelText = '', payload = null, onClose, onSubmitted }) {
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const phrase = actionPhrase(action, module);

    const submit = async (event) => {
        event.preventDefault();
        const trimmed = reason.trim();
        if (!trimmed) { setError('Add a short reason so the owner knows what you need it for'); return; }
        try {
            setSaving(true);
            setError('');
            await api.requests.create({ module, action, recordId: recordId || undefined, payload: payload ?? undefined, reason: trimmed });
            onSubmitted(`Request sent - the owner will be notified about your request to ${phrase}.`);
        } catch (err) {
            // "You are already allowed to do this" (400) is not a failure either:
            // the server knows about a right this tab had not seen yet (an
            // approval that landed while the page was open, say). Re-read the
            // profile and finish with that news - the buttons are live now.
            if (err.status === 400 && /already allowed/i.test(err.message || '')) {
                await refreshPermissions();
                onSubmitted('You already have this right - no request was needed, and this page has been updated.');
                return;
            }
            // 409 means the same request is still waiting: that is not a failure.
            setError(err.status === 409 ? 'Your request for this is already waiting for approval.' : err.message);
        } finally {
            setSaving(false);
        }
    };

    return <div className="modal-backdrop">
        <div className="modal">
            <div className="modal-heading">
                <div><p className="eyebrow">Request approval</p><h2>Ask to {phrase}</h2></div>
                <button className="icon-button" type="button" aria-label="Close" onClick={onClose}><X size={16} /></button>
            </div>
            <form onSubmit={submit}>
                <div className="request-summary">
                    <ShieldQuestion size={18} />
                    <p>
                        {recordLabelText ? <strong>{recordLabelText}: </strong> : null}
                        Your profile does not allow you to {phrase}. Send a request and the business owner can approve it - an approval unlocks this action for {GRANT_HOURS} hours, and you make the change yourself.
                    </p>
                </div>
                {error && <div className="error-banner">{error}</div>}
                <label className="full-width">Reason for the request
                    <textarea rows={3} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="For example: this entry was recorded with the wrong amount" required />
                    <small className="field-hint">{reason.length}/500 characters</small>
                </label>
                <div className="modal-actions">
                    <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
                    <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Sending...' : 'Send request'}</button>
                </div>
            </form>
        </div>
    </div>;
}

export default RequestApprovalDialog;
