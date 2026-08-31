import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../services/api';

export default function AddTransactionModal({ onClose, onAdd }) {
    const [type, setType] = useState('');
    const [form, setForm] = useState({ title: '', amount: '', category: '' });
    const [types, setTypes] = useState(['Income', 'Expense', 'Others']);
    const [categories, setCategories] = useState([]);
    useEffect(() => { api.types.list().then((items) => setTypes(items.map((item) => item.name))).catch(() => { }); }, []);
    useEffect(() => { if (type) api.categories.list(type).then(setCategories).catch(() => { }); }, [type]);
    const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });
    const submit = (event) => { event.preventDefault(); if (!form.title || !form.amount || !type || !form.category) return; onAdd({ ...form, title: form.title, amount: Number(form.amount), type, date: new Date().toISOString(), description: form.title }); };
    return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal"><div className="modal-heading"><div><p className="eyebrow">New entry</p><h2>Add transaction</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button></div><form onSubmit={submit}><label>Type<select value={type} onChange={(event) => { setType(event.target.value); setForm({ ...form, category: '' }); }} required><option value="">Select type</option>{types.map((item) => <option key={item}>{item}</option>)}</select></label><label>Category<select value={form.category} onChange={update('category')} required><option value="">Select category</option>{categories.map((item) => <option key={item._id}>{item.name}</option>)}</select></label><label>Description<input value={form.title} onChange={update('title')} placeholder="e.g. Monthly salary" required /></label><label>Amount<input type="number" min="0" step="0.01" value={form.amount} onChange={update('amount')} placeholder="0.00" required /></label><button className="primary-button modal-submit" type="submit">Save transaction</button></form></div></div>;
}
