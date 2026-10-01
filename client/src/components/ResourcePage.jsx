import { useEffect, useState } from 'react';
import { Plus, ShieldQuestion } from 'lucide-react';
import DataTable from './DataTable';
import { useChangeRequest } from './RequestApproval';
import { canCreate, canRequest, tablePermissions } from '../utils/permissions';
import { useStoredUser } from '../utils/roles';

// Shared CRUD screen (branches, bank accounts, UPI accounts, subscriptions).
// `module` names the permission module the server guards this resource with:
// when it is given, the page hides what the profile may not do and offers the
// "Request approval" route instead (see components/RequestApproval).
export default function ResourcePage({ title, description, resource, columns, fields, hideAdd = false, formDefaults = {}, module = null }) {
    const [rows, setRows] = useState([]);
    const [form, setForm] = useState(formDefaults);
    const [editing, setEditing] = useState(null);
    const [open, setOpen] = useState(false);
    const [error, setError] = useState('');
    // Rights come from the same helper the server mirrors, so a business-staff
    // profile only sees the buttons it may actually use.
    const user = useStoredUser();
    const changes = useChangeRequest(module || 'records');
    const mayCreate = !module || canCreate(user, module);
    const mayAskForCreate = Boolean(module) && canRequest(user, module, 'create');
    const load = () => {
        setError('');
        return resource.list().then((items) => setRows(Array.isArray(items) ? items : [])).catch((err) => {
            setRows([]);
            setError(err.message);
        });
    };
    const valueForInput = (value, type) => type === 'date' && value ? new Date(value).toISOString().slice(0, 10) : (value || '');
    useEffect(() => { load(); }, []);
    const hideField = (field) => field.showWhen && field.showWhen(form) === false;
    const submit = async (event) => {
        event.preventDefault();
        setError('');
        try {
            const visibleFields = fields.filter((field) => !hideField(field));
            const payload = Object.fromEntries(Object.entries(form).filter(([key, value]) => {
                if (editing && key === 'password' && value === '') return false;
                if (hideField(fields.find((field) => field.key === key) || {})) return false;
                return true;
            }));
            for (const [key, value] of Object.entries(payload)) {
                if (visibleFields.some((field) => field.key === key && field.type === 'number') && value !== '' && value != null) {
                    payload[key] = Number(value);
                }
            }
            if (editing) await resource.update(editing._id, payload); else await resource.create(payload);
            setOpen(false); setEditing(null); setForm(formDefaults); load();
        } catch (err) {
            // A requestable 403 becomes the "Request approval" dialog instead of a
            // dead-end error; anything else is reported as before.
            if (changes.onRequestError(err, editing, editing ? 'edit' : 'create')) return;
            setError(err.message);
        }
    };
    const remove = async (row) => {
        if (!resource.remove) return;
        if (!window.confirm('Delete this record?')) return;
        setError('');
        try {
            await resource.remove(row._id);
            load();
        } catch (err) {
            if (changes.onRequestError(err, row, 'delete')) return;
            setError(err.message);
        }
    };
    return <div className="resource-page"><div className="resource-heading"><div><p className="eyebrow">Management</p><h1>{title}</h1><p className="subheading">{description}</p></div>{!hideAdd && (mayCreate
            ? <button className="primary-button" onClick={() => { setEditing(null); setForm(formDefaults); setOpen(true); }}><Plus size={18} />Add {title.slice(0, -1)}</button>
            : mayAskForCreate && <button className="secondary-button" type="button" onClick={() => changes.requestChange('create', null)}><ShieldQuestion size={16} />Request add access</button>)}</div>{error && <div className="error-banner">{error}</div>}{changes.notice}<section className="panel resource-panel"><DataTable columns={columns} rows={rows} onEdit={(row) => { setEditing(row); setForm({ ...formDefaults, ...row }); setOpen(true); }} onDelete={remove} permissions={module ? tablePermissions(user, module) : null} onRequest={module ? changes.requestChange : null} /></section>{changes.modal}{open && <div className="modal-backdrop"><div className="modal"><div className="modal-heading"><div><p className="eyebrow">{editing ? 'Edit record' : 'New record'}</p><h2>{editing ? `Edit ${title.slice(0, -1)}` : `Add ${title.slice(0, -1)}`}</h2></div><button className="icon-button" onClick={() => setOpen(false)}>×</button></div><form onSubmit={submit}>{fields.filter((field) => !hideField(field)).map(({ key, label, type = 'text', options, required = true, min, hint }) => <label key={key}>{label}{hint && <small className="field-hint">{hint}</small>}{options ? <select value={form[key] ?? ''} onChange={(event) => setForm({ ...form, [key]: event.target.value })} required={required}><option value="">Select</option>{options.map((option) => <option key={option}>{option}</option>)}</select> : <input type={type} min={min} value={valueForInput(form[key], type)} onChange={(event) => setForm({ ...form, [key]: event.target.value })} required={required} />}</label>)}<button className="primary-button modal-submit">Save</button></form></div></div>}</div>;
}
