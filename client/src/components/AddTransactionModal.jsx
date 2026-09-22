import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../services/api';
import { getStoredUser, isBusinessUser } from '../utils/roles';

export default function AddTransactionModal({ onClose, onAdd }) {
    const [type, setType] = useState('');
    const [form, setForm] = useState({ title: '', amount: '', category: '', date: '' });
    const [types, setTypes] = useState(['Income', 'Expense', 'Others']);
    const [categories, setCategories] = useState([]);
    const business = isBusinessUser(getStoredUser());
    const [branches, setBranches] = useState([]); const [banks, setBanks] = useState([]); const [upis, setUpis] = useState([]);
    const [paymentType, setPaymentType] = useState('Cash'); const [branchId, setBranchId] = useState(() => localStorage.getItem('fintrack_selected_branch') || 'ALL'); const [bankAccountId, setBankAccountId] = useState(''); const [upiAccountId, setUpiAccountId] = useState(''); const [transactionNumber, setTransactionNumber] = useState('');
    useEffect(() => { api.types.list().then((items) => setTypes(items.map((item) => item.name))).catch(() => { }); }, []);
    useEffect(() => { if (type) api.categories.list(type).then(setCategories).catch(() => { }); }, [type]);
    useEffect(() => { if (business) { api.business.branches.list().then(setBranches).catch(() => {}); api.business.bankAccounts.list().then(setBanks).catch(() => {}); api.business.upiAccounts.list().then(setUpis).catch(() => {}); } }, []);
    const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });
    const submit = (event) => {
        event.preventDefault();
        if (!form.amount || !type || !form.category || !form.date) return;

        const dateValue = new Date(`${form.date}T00:00:00`);
        if (business && (!branchId || branchId === 'ALL')) return;
        if (business && paymentType === 'UPI' && (!upiAccountId || !transactionNumber.trim())) return;
        if (business && paymentType === 'Bank' && !bankAccountId) return;
        onAdd({
            ...form,
            title: form.title || form.category,
            amount: Number(form.amount),
            type,
            date: dateValue.toISOString(),
            description: form.title,
            ...(business ? { branchId, paymentType, ...(paymentType === 'Bank' ? { bankAccountId } : {}), ...(paymentType === 'UPI' ? { upiAccountId, transactionNumber } : {}) } : {})
        });
    };
    return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal modal-two-column"><div className="modal-heading"><div><p className="eyebrow">New entry</p><h2>Add transaction</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button></div><form className="modal-form-two-column" onSubmit={submit}>{business && <><label>Branch<select value={branchId} onChange={(e) => setBranchId(e.target.value)} required><option value="ALL">Select branch</option>{branches.filter((b) => b.status === 'active').map((b) => <option key={b._id} value={b._id}>{b.branchName}</option>)}</select></label><label>Payment type<select value={paymentType} onChange={(e) => setPaymentType(e.target.value)}><option>Cash</option><option>Bank</option><option>UPI</option></select></label>{paymentType === 'Bank' && <label>Bank account<select value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)} required><option value="">Select bank account</option>{banks.filter((b) => b.status === 'active').map((b) => <option key={b._id} value={b._id}>{b.bankName} ({b.ifscCode})</option>)}</select></label>}{paymentType === 'UPI' && <><label>UPI account<select value={upiAccountId} onChange={(e) => setUpiAccountId(e.target.value)} required><option value="">Select UPI account</option>{upis.filter((u) => u.status === 'active').map((u) => <option key={u._id} value={u._id}>{u.upiId}</option>)}</select></label><label>Transaction number<input value={transactionNumber} onChange={(e) => setTransactionNumber(e.target.value)} required /></label></>}</>}<label><span className="field-label">Type <span className="required-asterisk">*</span></span><select value={type} onChange={(event) => { setType(event.target.value); setForm({ ...form, category: '' }); }} required><option value="">Select type</option>{types.map((item) => <option key={item}>{item}</option>)}</select></label><label><span className="field-label">Category <span className="required-asterisk">*</span></span><select value={form.category} onChange={update('category')} required><option value="">Select category</option>{categories.map((item) => <option key={item._id}>{item.name}</option>)}</select></label><label className="full-width"><span className="field-label">Description</span><input value={form.title} onChange={update('title')} placeholder="e.g. Monthly salary" /></label><label><span className="field-label">Date <span className="required-asterisk">*</span></span><input type="date" value={form.date} onChange={update('date')} required /></label><label><span className="field-label">Amount <span className="required-asterisk">*</span></span><input type="number" min="0" step="0.01" value={form.amount} onChange={update('amount')} placeholder="0.00" required /></label><button className="primary-button modal-submit full-width" type="submit">Save transaction</button></form></div></div>;
}
