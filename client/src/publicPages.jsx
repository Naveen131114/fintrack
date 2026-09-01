import { useEffect, useState } from 'react';
import { api } from './services/api';

const money = (value) => `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const upiMobileNumber = '8489294594';
const upiQrUrl = import.meta.env.VITE_UPI_QR_URL || '/images/upi-qr.jpeg';

export function LoginPage() {
    const [form, setForm] = useState({ userName: '', password: '' });
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const submit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        setMessage('');

        try {
            await api.auth.login(form);
            window.location.href = '/';
        } catch (error) {
            setMessage(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return <div className="auth-page"><div className="auth-panel"><div className="brand"><span className="brand-mark">f</span><span>fintrack</span></div><p className="eyebrow">Welcome back</p><h1>Sign in to your account</h1><p className="subheading">Your finances, organized in one quiet place.</p><form onSubmit={submit}><label>Username<input value={form.userName} onChange={(event) => setForm({ ...form, userName: event.target.value })} required /></label><label>Password<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></label><button className="primary-button modal-submit" disabled={isSubmitting}>{isSubmitting ? 'Signing in...' : 'Sign in'}</button></form>{message && <p className="error-banner">{message}</p>}<a href="/plans" className="auth-link">View subscription plans</a></div></div>;
}

export function AnalyticsPage() {
    const [rows, setRows] = useState([]);
    useEffect(() => { api.transactions.list().then(setRows).catch(() => { }); }, []);
    const income = rows.filter((row) => row.type === 'Income').reduce((sum, row) => sum + row.amount, 0);
    const expense = rows.filter((row) => row.type === 'Expense').reduce((sum, row) => sum + row.amount, 0);
    return <div className="resource-page"><p className="eyebrow">Insights</p><h1>Analytics</h1><p className="subheading">A clear view of your money flow.</p><div className="summary-grid analytics-cards"><div className="summary-card income"><span>Income</span><strong className="summary-value">{money(income)}</strong></div><div className="summary-card expense"><span>Expenses</span><strong className="summary-value">{money(expense)}</strong></div><div className="summary-card balance"><span>Net cash flow</span><strong className="summary-value">{money(income - expense)}</strong></div></div><section className="panel insight-panel"><h2>Transaction mix</h2><div className="bar-track"><span className="income-bar" style={{ width: `${income + expense ? income / (income + expense) * 100 : 0}%` }} /></div><p className="subheading">Income versus expenses across your recorded transactions.</p></section></div>;
}

export function BudgetsPage() {
    const [budget, setBudget] = useState('');
    const [saved, setSaved] = useState(null);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

    useEffect(() => {
        const loadBudget = async () => {
            try {
                const result = await api.budgets.getByMonth(currentMonth);
                setSaved(result);
                setBudget(result.amount);
            } catch (error) {
                setSaved(null);
                setBudget('');
            }
        };
        loadBudget();
    }, []);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!budget) return;

        try {
            setLoading(true);
            const amount = Number(budget);
            if (saved?._id) {
                await api.budgets.update(saved._id, { amount, month: currentMonth });
                setSaved({ ...saved, amount });
                setMessage('Budget updated successfully');
            } else {
                const result = await api.budgets.create({ amount, month: currentMonth });
                setSaved(result);
                setMessage('Budget saved successfully');
            }
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage(error.message);
        } finally {
            setLoading(false);
        }
    };

    return <div className="resource-page"><p className="eyebrow">Planning</p><h1>Budgets</h1><p className="subheading">Set a monthly spending target and keep it visible.</p>{message && <div className="success-banner">{message}</div>}<section className="panel budget-panel"><h2>Monthly expense budget</h2><form className="inline-form" onSubmit={handleSubmit}><input type="number" min="0" step="0.01" value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="Enter budget amount" required /><button className="primary-button" disabled={loading}>{loading ? 'Saving...' : 'Save budget'}</button></form>{saved !== null && <p className="budget-result">Your monthly budget is {money(saved.amount)}.</p>}</section></div>;
}

export function PlansPage() {
    const [plans, setPlans] = useState([]);
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState({});
    const [message, setMessage] = useState('');

    useEffect(() => { api.public.plans().then(setPlans).catch(() => { }); }, []);
    const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });

    const submit = async (event) => {
        event.preventDefault();
        try {
            await api.public.requestSubscription({ ...form, planId: selected._id });
            setSelected(null);
            setMessage('Your request has been submitted successfully. The payment request has been sent to the super admin for approval. Once validated, your subscription access will be activated.');
        } catch (error) {
            setMessage(error.message);
        }
    };

    return <div className="plans-page"><div className="plans-intro"><p className="eyebrow">Fintrack personal finance</p><h1>Choose a plan for calmer money management.</h1><p>Track income, expenses, budgets, and the details that make your monthly decisions easier.</p><a href="/login" className="primary-button">Sign in to your account</a></div>{message && <div className="success-banner">{message}</div>}<div className="plans-grid">{plans.map((plan) => <button className={`plan-card ${selected?._id === plan._id ? 'selected' : ''}`} key={plan._id} onClick={() => setSelected(plan)}><span>{plan.planName}</span><strong>₹{Number(plan.amount).toLocaleString('en-IN')}</strong><small>{plan.period}</small></button>)}</div><div className="payment-instructions"><h2>Payment and approval</h2><p>Pay using the UPI QR code below or the mobile number shown here. After payment, we will verify the payment request and activate your subscription.</p><div className="upi-box"><img src={upiQrUrl} alt="UPI payment QR code" /><div><p><strong>UPI Mobile Number:</strong> {upiMobileNumber}</p><p><strong>UPI ID:</strong> m.naveenkumarmunees@upi</p></div></div></div>{selected && <div className="modal-backdrop"><div className="modal"><div className="modal-heading"><div><p className="eyebrow">{selected.planName} · {selected.period}</p><h2>Your details</h2></div><button className="icon-button" onClick={() => setSelected(null)}>×</button></div><form onSubmit={submit}>{[['name', 'Name'], ['phoneNumber', 'Phone number'], ['emailId', 'Email'], ['userName', 'Username'], ['password', 'Password']].map(([key, label]) => <label key={key}>{label}<input type={key === 'password' ? 'password' : key === 'emailId' ? 'email' : 'text'} value={form[key] || ''} onChange={update(key)} required /></label>)}<label>UPI transaction reference<input value={form.paymentReference || ''} onChange={update('paymentReference')} placeholder="Add after payment" /></label><button className="primary-button modal-submit">Submit payment request</button></form></div></div>}</div>;
}
