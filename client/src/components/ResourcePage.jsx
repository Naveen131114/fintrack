import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import DataTable from './DataTable';

export default function ResourcePage({ title, description, resource, columns, fields }) {
    const [rows, setRows] = useState([]);
    const [form, setForm] = useState({});
    const [editing, setEditing] = useState(null);
    const [open, setOpen] = useState(false);
    const [error, setError] = useState('');
    const load = () => resource.list().then(setRows).catch((err) => setError(err.message));
    const valueForInput = (value, type) => type === 'date' && value ? new Date(value).toISOString().slice(0, 10) : (value || '');
    useEffect(() => { load(); }, []);
    const submit = async (event) => {
        event.preventDefault();
        try {
            const payload = Object.fromEntries(Object.entries(form).filter(([key, value]) => !(editing && key === 'password' && value === '')));
            if (editing) await resource.update(editing._id, payload); else await resource.create(payload);
            setOpen(false); setEditing(null); setForm({}); load();
        } catch (err) { setError(err.message); }
    };
    const remove = async (row) => { if (window.confirm('Delete this record?')) { await resource.remove(row._id); load(); } };
    return <div className="resource-page"><div className="resource-heading"><div><p className="eyebrow">Management</p><h1>{title}</h1><p className="subheading">{description}</p></div><button className="primary-button" onClick={() => { setEditing(null); setForm({}); setOpen(true); }}><Plus size={18} />Add {title.slice(0, -1)}</button></div>{error && <div className="error-banner">{error}</div>}<section className="panel resource-panel"><DataTable columns={columns} rows={rows} onEdit={(row) => { setEditing(row); setForm(row); setOpen(true); }} onDelete={remove} /></section>{open && <div className="modal-backdrop"><div className="modal"><div className="modal-heading"><div><p className="eyebrow">{editing ? 'Edit record' : 'New record'}</p><h2>{editing ? `Edit ${title.slice(0, -1)}` : `Add ${title.slice(0, -1)}`}</h2></div><button className="icon-button" onClick={() => setOpen(false)}>×</button></div><form onSubmit={submit}>{fields.map(({ key, label, type = 'text', options, required = true }) => <label key={key}>{label}{options ? <select value={form[key] || ''} onChange={(event) => setForm({ ...form, [key]: event.target.value })} required={required}><option value="">Select</option>{options.map((option) => <option key={option}>{option}</option>)}</select> : <input type={type} value={valueForInput(form[key], type)} onChange={(event) => setForm({ ...form, [key]: event.target.value })} required={required} />}</label>)}<button className="primary-button modal-submit">Save</button></form></div></div>}</div>;
}
