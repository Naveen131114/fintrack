import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from './services/api';
import DataTable from './components/DataTable';
import { useChangeRequest } from './components/RequestApproval';
import { isBusinessUser, useStoredUser } from './utils/roles';
import { canEdit, canRequest, tablePermissions } from './utils/permissions';

const money = (value) => `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
// Signed money for the report Balance column: "+₹1,200.00" / "-₹1,200.00"
const signedMoney = (value) => `${Number(value) >= 0 ? '+' : '-'}₹${Math.abs(Number(value || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const REPORT_MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// "YYYY-MM" -> "September 2026"
function formatMonthLabel(value) {
    const [year, month] = String(value || '').split('-');
    const index = Number(month) - 1;
    if (!year || !Number.isInteger(index) || index < 0 || index > REPORT_MONTH_NAMES.length - 1) return value || '-';
    return `${REPORT_MONTH_NAMES[index]} ${year}`;
}
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
    // Live profile: the Overall Report actions follow monthlyReports rights, and
    // an approval granted while this page is open must unlock them in place.
    const user = useStoredUser();
    // Business PLAN logins get the Overall Report; everyone else keeps Transaction mix.
    const businessUser = isBusinessUser(user);
    // The Overall Report form and row actions follow the granular
    // `monthlyReports` right, so a view-only staff profile gets the request
    // route instead of a dead end.
    const canManageReports = isBusinessUser(user) ? canEdit(user, 'monthlyReports') : false;
    const mayAskForReports = canRequest(user, 'monthlyReports', 'create');
    const changes = useChangeRequest('monthlyReports');

    // Branch filter: the top navbar branch selector is the single source of
    // truth (same pattern as TransactionsPage) and the money-flow cards plus
    // the Overall Report below both follow it.
    const [selectedBranchId, setSelectedBranchId] = useState(() => localStorage.getItem('fintrack_selected_branch') || 'ALL');
    const [branches, setBranches] = useState([]);

    // A new report row starts on the branch being filtered, so the owner
    // rarely has to pick it manually.
    const defaultBranchId = selectedBranchId === 'ALL' ? '' : selectedBranchId;
    const newReportForm = (branchId = defaultBranchId) => ({ month: new Date().toISOString().slice(0, 7), branchId, clientsCount: '', income: '', expenses: '' });

    const [rows, setRows] = useState([]);
    // Money-flow cards follow the branch filter (the server scopes by branchId).
    useEffect(() => { api.transactions.list(selectedBranchId).then(setRows).catch(() => setRows([])); }, [selectedBranchId]);
    const income = rows.filter((row) => row.type === 'Income').reduce((sum, row) => sum + row.amount, 0);
    const expense = rows.filter((row) => row.type === 'Expense').reduce((sum, row) => sum + row.amount, 0);

    // Overall report: only business PLAN logins get it. `null` = plan check running.
    const [hasBusinessPlan, setHasBusinessPlan] = useState(null);
    const [reports, setReports] = useState([]);
    const [reportForm, setReportForm] = useState(() => newReportForm());
    const [editing, setEditing] = useState(null);
    const [reportMessage, setReportMessage] = useState('');
    const [reportError, setReportError] = useState('');
    const exportRef = useRef(null);

    // From month / To month filter: the pickers are fed by the months that
    // already have a saved Overall Report entry, so no empty range can be picked.
    const [fromMonth, setFromMonth] = useState('');
    const [toMonth, setToMonth] = useState('');

    // Branches power the report's Branch column and the picker in its form.
    useEffect(() => {
        if (!businessUser) return undefined;
        api.business.branches.list().then(setBranches).catch(() => setBranches([]));
        return undefined;
    }, []);

    // Follow the navbar branch selector, exactly like TransactionsPage.
    useEffect(() => {
        const handler = () => setSelectedBranchId(localStorage.getItem('fintrack_selected_branch') || 'ALL');
        window.addEventListener('fintrack-branch-change', handler);
        return () => window.removeEventListener('fintrack-branch-change', handler);
    }, []);

    const loadReports = () => api.reports.list(selectedBranchId).then(setReports).catch(() => setReports([]));

    useEffect(() => {
        if (!businessUser) return undefined;
        let cancelled = false;
        api.business.profile.get()
            .then((profile) => {
                if (cancelled) return;
                setHasBusinessPlan(Boolean(profile.branded));
            })
            .catch(() => { if (!cancelled) setHasBusinessPlan(false); });
        return () => { cancelled = true; };
    }, []);

    // The Overall Report obeys the same branch filter as the cards, and reloads
    // whenever the navbar branch changes.
    useEffect(() => {
        if (hasBusinessPlan !== true) return undefined;
        let cancelled = false;
        api.reports.list(selectedBranchId)
            .then((items) => { if (!cancelled) setReports(items); })
            .catch(() => { if (!cancelled) setReports([]); });
        return () => { cancelled = true; };
    }, [hasBusinessPlan, selectedBranchId]);

    // Months that actually have a saved report entry (oldest first) - the only
    // values the Analytics From / To month filter can offer.
    const reportMonths = useMemo(() => [...new Set(reports.map((report) => report.month))].sort(), [reports]);
    const reportMonthsKey = reportMonths.join('|');

    // Default the range to every saved month and keep it valid when the branch
    // filter (or a newly saved / deleted row) changes the month list.
    useEffect(() => {
        if (!reportMonths.length) {
            setFromMonth('');
            setToMonth('');
            return;
        }
        const first = reportMonths[0];
        const last = reportMonths[reportMonths.length - 1];
        setFromMonth((current) => (reportMonths.includes(current) ? current : first));
        setToMonth((current) => (reportMonths.includes(current) ? current : last));
    }, [reportMonthsKey]);

    // A range can never be inverted: moving one picker past its partner drags
    // the partner along, so the page always shows at least one saved month.
    const changeFromMonth = (event) => {
        const value = event.target.value;
        setFromMonth(value);
        setToMonth((current) => (!current || current < value ? value : current));
    };
    const changeToMonth = (event) => {
        const value = event.target.value;
        setToMonth(value);
        setFromMonth((current) => (!current || current > value ? value : current));
    };

    // Switching branch leaves edit mode (the edited row may not even be in the
    // newly selected branch) and re-seeds the form's default branch.
    useEffect(() => {
        setEditing(null);
        setReportForm(newReportForm());
    }, [selectedBranchId]);

    const setReportField = (key) => (event) => setReportForm((form) => ({ ...form, [key]: event.target.value }));

    // One row per month per branch: saving an existing month + branch updates it.
    const saveReport = async (event) => {
        event.preventDefault();
        setReportError('');
        setReportMessage('');
        const payload = {
            month: reportForm.month,
            branchId: reportForm.branchId || null,
            clientsCount: Number(reportForm.clientsCount),
            income: Number(reportForm.income),
            expenses: Number(reportForm.expenses)
        };
        try {
            await api.reports.create(payload);
            // Editing moved the row to another month or branch -> drop the old
            // one. The new row is saved first, so nothing is ever lost.
            const keyChanged = editing && (editing.month !== payload.month || String(editing.branchId || '') !== String(payload.branchId || ''));
            if (keyChanged) await api.reports.remove(editing._id);
            setReportMessage(editing ? 'Report updated' : 'Report saved');
            // Keep the saved month visible: an entry saved outside the current
            // window would otherwise look like it was never stored.
            setFromMonth((current) => (current && current > payload.month ? payload.month : current));
            setToMonth((current) => (current && current < payload.month ? payload.month : current));
            setEditing(null);
            setReportForm(newReportForm());
            loadReports();
        } catch (error) {
            if (changes.onRequestError(error, editing, editing ? 'edit' : 'create')) return;
            setReportError(error.message);
        }
    };

    const editReport = (row) => {
        setEditing(row);
        setReportError('');
        setReportMessage('');
        setReportForm({ month: row.month, branchId: row.branchId || '', clientsCount: String(row.clientsCount ?? ''), income: String(row.income ?? ''), expenses: String(row.expenses ?? '') });
    };

    const cancelEdit = () => {
        setEditing(null);
        setReportForm(newReportForm());
    };

    const removeReport = async (row) => {
        if (!window.confirm('Delete this report row?')) return;
        try {
            await api.reports.remove(row._id);
            loadReports();
        } catch (error) {
            if (changes.onRequestError(error, row, 'delete')) return;
            setReportError(error.message);
        }
    };

    const branchNameFor = (branchId) => (branches.find((branch) => String(branch._id) === String(branchId)) || {}).branchName || '';
    // Rows saved before branch support have no branch and only belong to the
    // "All branches" view, so they show a dash instead of a branch name.
    const branchLabelFor = (branchId) => branchNameFor(branchId) || '—';
    const activeBranches = branches.filter((branch) => branch.status === 'active');
    const selectedBranch = selectedBranchId === 'ALL' ? null : branches.find((branch) => String(branch._id) === String(selectedBranchId)) || null;
    const branchScope = selectedBranch ? selectedBranch.branchName : 'all branches';
    // The month range on screen, e.g. "April 2026 to September 2026".
    const monthRangeLabel = reportMonths.length
        ? (fromMonth === toMonth ? formatMonthLabel(fromMonth) : `${formatMonthLabel(fromMonth)} to ${formatMonthLabel(toMonth)}`)
        : '';
    // The branch (and the month range) travel into the export heading (and
    // file) so a filtered report is never mistaken for the full one.
    const reportExportTitle = `Overall Business Report${selectedBranch ? ` - ${selectedBranch.branchName}` : ''}${monthRangeLabel ? ` (${monthRangeLabel})` : ''}`;

    // Only entries inside the From-To month window reach the cards, the table
    // and every export, so the whole page reads as one consistent period.
    const visibleReports = reports.filter((report) => (!fromMonth || report.month >= fromMonth) && (!toMonth || report.month <= toMonth));

    // Balance and profit-or-loss are derived from income - expenses.
    const reportRows = visibleReports.map((report) => {
        const balance = Number(report.income || 0) - Number(report.expenses || 0);
        return { ...report, branchLabel: branchLabelFor(report.branchId), balance, profitLoss: balance >= 0 ? 'Profit' : 'Loss' };
    });

    // Totals row (last row of the Overall Report table): admissions count up,
    // and income / expenses / balance are summed across the months listed, so
    // the row always matches the branch filter above.
    const reportTotals = reportRows.reduce((totals, row) => ({
        clientsCount: totals.clientsCount + Number(row.clientsCount || 0),
        income: totals.income + Number(row.income || 0),
        expenses: totals.expenses + Number(row.expenses || 0),
        balance: totals.balance + Number(row.balance || 0)
    }), { clientsCount: 0, income: 0, expenses: 0, balance: 0 });
    const reportSummary = {
        labelKey: 'month',
        label: 'Total',
        // Each column keeps its own formatting (money / signed money / profit or loss).
        values: {
            clientsCount: String(reportTotals.clientsCount),
            income: money(reportTotals.income),
            expenses: money(reportTotals.expenses),
            balance: signedMoney(reportTotals.balance),
            profitLoss: <span className={`profit-loss ${reportTotals.balance >= 0 ? 'profit' : 'loss'}`}>{reportTotals.balance >= 0 ? 'Profit' : 'Loss'}</span>
        },
        // Plain-text twin of the same row for the XL / Word / PDF exports.
        exportValues: {
            month: 'Total',
            clientsCount: String(reportTotals.clientsCount),
            income: money(reportTotals.income),
            expenses: money(reportTotals.expenses),
            balance: signedMoney(reportTotals.balance),
            profitLoss: reportTotals.balance >= 0 ? 'Profit' : 'Loss'
        }
    };

    const reportColumns = [
        { key: 'month', label: 'Month', render: (row) => formatMonthLabel(row.month), exportValue: (row) => formatMonthLabel(row.month) },
        { key: 'branch', label: 'Branch', render: (row) => row.branchLabel, exportValue: (row) => row.branchLabel },
        { key: 'clientsCount', label: 'No. of Admissions', render: (row) => String(row.clientsCount ?? 0), exportValue: (row) => String(row.clientsCount ?? 0) },
        { key: 'income', label: 'Income', render: (row) => money(row.income), exportValue: (row) => money(row.income) },
        { key: 'expenses', label: 'Expenses', render: (row) => money(row.expenses), exportValue: (row) => money(row.expenses) },
        { key: 'balance', label: 'Balance', render: (row) => signedMoney(row.balance), exportValue: (row) => signedMoney(row.balance) },
        { key: 'profitLoss', label: 'Profit or Loss', render: (row) => <span className={`profit-loss ${row.profitLoss === 'Profit' ? 'profit' : 'loss'}`}>{row.profitLoss}</span>, exportValue: (row) => row.profitLoss }
    ];

    const planPending = businessUser && hasBusinessPlan === null;
    const showOverallReport = businessUser && hasBusinessPlan === true;

    // Business plan logins read the cards from the Overall Report entries - the
    // very same From-To month filter as the table below; everyone else keeps the
    // transaction money flow.
    const cardIncome = showOverallReport ? reportTotals.income : income;
    const cardExpense = showOverallReport ? reportTotals.expenses : expense;
    const cardBalance = showOverallReport ? reportTotals.balance : income - expense;
    return <div className="resource-page">
        <p className="eyebrow">Insights</p>
        <h1>Analytics</h1>
        <p className="subheading">A clear view of your money flow{businessUser && selectedBranch ? ` for ${selectedBranch.branchName}` : ''}.</p>
        {showOverallReport && <div className="analytics-month-filter">
            <label>From month
                <select value={fromMonth} onChange={changeFromMonth} disabled={!reportMonths.length} aria-label="From month">
                    {reportMonths.map((month) => <option key={month} value={month}>{formatMonthLabel(month)}</option>)}
                </select>
            </label>
            <label>To month
                <select value={toMonth} onChange={changeToMonth} disabled={!reportMonths.length} aria-label="To month">
                    {reportMonths.map((month) => <option key={month} value={month}>{formatMonthLabel(month)}</option>)}
                </select>
            </label>
            <span className="analytics-month-hint">{reportMonths.length ? `Showing ${formatMonthLabel(fromMonth)} to ${formatMonthLabel(toMonth)} from your saved report entries.` : 'Save a report entry to filter by month.'}</span>
        </div>}
        <div className="summary-grid analytics-cards">
            <div className="summary-card income"><span>Income</span><strong className="summary-value">{money(cardIncome)}</strong></div>
            <div className="summary-card expense"><span>Expenses</span><strong className="summary-value">{money(cardExpense)}</strong></div>
            <div className="summary-card balance"><span>{showOverallReport ? 'Balance' : 'Net cash flow'}</span><strong className="summary-value">{showOverallReport ? signedMoney(cardBalance) : money(cardBalance)}</strong></div>
        </div>
        {planPending ? null : showOverallReport ? (
            <section className="panel insight-panel">
                <div className="panel-head">
                    <div>
                        <h2>Overall Report</h2>
                        <p className="subheading">Month-wise business performance for {branchScope}{monthRangeLabel ? ` (${monthRangeLabel})` : ''}, ready to export.</p>
                    </div>
                    <div className="txn-table-tools">
                        <span className="export-label">Export as</span>
                        {['xl', 'word', 'pdf'].map((format) => <button type="button" key={format} onClick={() => exportRef.current?.(format)}>{format === 'xl' ? 'XL' : format[0].toUpperCase() + format.slice(1)}</button>)}
                    </div>
                </div>
                {reportError && <div className="error-banner">{reportError}</div>}
                {reportMessage && <div className="success-banner">{reportMessage}</div>}
                {!canManageReports && mayAskForReports && <div className="inline-form"><span className="field-hint">Your profile can view report entries but not change them.</span><button className="secondary-button" type="button" onClick={() => changes.requestChange('create', null)}>Request report access</button></div>}
                {canManageReports && <form className="inline-form" onSubmit={saveReport}>
                    <input type="month" value={reportForm.month} onChange={setReportField('month')} required aria-label="Month" />
                    <select value={reportForm.branchId} onChange={setReportField('branchId')} required aria-label="Branch">
                        <option value="" disabled>Select branch</option>
                        {activeBranches.map((branch) => <option key={branch._id} value={branch._id}>{branch.branchName}</option>)}
                    </select>
                    <input type="number" min="0" step="1" placeholder="No. of Admissions" value={reportForm.clientsCount} onChange={setReportField('clientsCount')} required aria-label="No. of Business/Clients" />
                    <input type="number" min="0" step="0.01" placeholder="Income" value={reportForm.income} onChange={setReportField('income')} required aria-label="Income" />
                    <input type="number" min="0" step="0.01" placeholder="Expenses" value={reportForm.expenses} onChange={setReportField('expenses')} required aria-label="Expenses" />
                    <button className="primary-button" type="submit">{editing ? 'Update' : 'Add'}</button>
                    {editing && <button type="button" className="icon-button" title="Cancel edit" onClick={cancelEdit}>×</button>}
                </form>}
                <DataTable
                    columns={reportColumns}
                    rows={reportRows}
                    summary={reportSummary}
                    exportTitle={reportExportTitle}
                    onExportReady={exportRef}
                    onEdit={editReport}
                    onDelete={removeReport}
                    permissions={tablePermissions(user, 'monthlyReports')}
                    onRequest={changes.requestChange}
                />
            </section>
        ) : (
            <section className="panel insight-panel"><h2>Transaction mix</h2><div className="bar-track"><span className="income-bar" style={{ width: `${income + expense ? income / (income + expense) * 100 : 0}%` }} /></div><p className="subheading">Income versus expenses across your recorded transactions.</p></section>
        )}
        {changes.notice}
        {changes.modal}
    </div>;
}

export function BudgetsPage() {
    const [budget, setBudget] = useState('');
    const [saved, setSaved] = useState(null);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [transactions, setTransactions] = useState([]);

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

    // Budget edits follow the granular `budgets` right: staff ask, the owner
    // approves through the Requests page (see components/RequestApproval).
    const user = useStoredUser();
    const mayEditBudget = canEdit(user, 'budgets');
    const mayAskForBudget = canRequest(user, 'budgets', 'create');
    const changes = useChangeRequest('budgets');

    useEffect(() => {
        api.transactions.list().then(setTransactions).catch(() => { });
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

    const monthExpenses = transactions.filter((transaction) => transaction.type === 'Expense' && transaction.date?.startsWith(currentMonth)).reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
    const budgetDifference = Number(budget || 0) - monthExpenses;

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
            if (changes.onRequestError(error, saved, saved ? 'edit' : 'create')) return;
            setMessage(error.message);
        } finally {
            setLoading(false);
        }
    };

    return <div className="resource-page"><p className="eyebrow">Planning</p><h1>Budgets</h1><p className="subheading">Set a monthly spending target and keep it visible.</p>{message && <div className="success-banner">{message}</div>}<section className="panel budget-panel"><h2>Monthly expense budget</h2>{mayEditBudget ? <form className="inline-form" onSubmit={handleSubmit}><input type="number" min="0" step="0.01" value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="Enter budget amount" required /><button className="primary-button" disabled={loading}>{loading ? 'Saving...' : 'Save budget'}</button></form> : mayAskForBudget && <div className="inline-form"><span className="field-hint">Your profile can view budgets but not change them.</span><button className="secondary-button" type="button" onClick={() => changes.requestChange(saved ? 'edit' : 'create', saved)}>Request budget access</button></div>}{saved !== null && <><p className="budget-result">Your monthly budget is {money(saved.amount)}.</p><div className={`achievement-card ${budgetDifference >= 0 ? 'positive' : 'negative'}`}>{budgetDifference >= 0 ? `Under budget by ${money(budgetDifference)}` : `Over budget by ${money(Math.abs(budgetDifference))}`}</div></>}</section>{changes.notice}{changes.modal}</div>;
}

export function TargetPage() {
    const [target, setTarget] = useState('');
    const [saved, setSaved] = useState(null);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [transactions, setTransactions] = useState([]);

    const currentMonth = new Date().toISOString().slice(0, 7);

    // Target edits follow the granular `targets` right (see the budget page).
    const user = useStoredUser();
    const mayEditTarget = canEdit(user, 'targets');
    const mayAskForTarget = canRequest(user, 'targets', 'create');
    const changes = useChangeRequest('targets');

    useEffect(() => {
        api.transactions.list().then(setTransactions).catch(() => { });
        const loadTarget = async () => {
            try {
                const result = await api.targets.getByMonth(currentMonth);
                setSaved(result);
                setTarget(result.amount);
            } catch (error) {
                setSaved(null);
                setTarget('');
            }
        };
        loadTarget();
    }, []);

    const monthIncome = transactions.filter((transaction) => transaction.type === 'Income' && transaction.date?.startsWith(currentMonth)).reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
    const targetDifference = monthIncome - Number(target || 0);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!target) return;

        try {
            setLoading(true);
            const amount = Number(target);
            if (saved?._id) {
                await api.targets.update(saved._id, { amount, month: currentMonth });
                setSaved({ ...saved, amount });
                setMessage('Monthly income target updated successfully');
            } else {
                const result = await api.targets.create({ amount, month: currentMonth });
                setSaved(result);
                setMessage('Monthly income target saved successfully');
            }
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            if (changes.onRequestError(error, saved, saved ? 'edit' : 'create')) return;
            setMessage(error.message);
        } finally {
            setLoading(false);
        }
    };

    return <div className="resource-page"><p className="eyebrow">Planning</p><h1>Target</h1><p className="subheading">Set a monthly income target to guide your savings and growth.</p>{message && <div className="success-banner">{message}</div>}<section className="panel budget-panel"><h2>Monthly income target</h2>{mayEditTarget ? <form className="inline-form" onSubmit={handleSubmit}><input type="number" min="0" step="0.01" value={target} onChange={(event) => setTarget(event.target.value)} placeholder="Enter target amount" required /><button className="primary-button" disabled={loading}>{loading ? 'Saving...' : 'Save target'}</button></form> : mayAskForTarget && <div className="inline-form"><span className="field-hint">Your profile can view the target but not change it.</span><button className="secondary-button" type="button" onClick={() => changes.requestChange(saved ? 'edit' : 'create', saved)}>Request target access</button></div>}{saved !== null && <><p className="budget-result">Your monthly income target is {money(saved.amount)}.</p><div className={`achievement-card ${targetDifference >= 0 ? 'positive' : 'negative'}`}>{targetDifference >= 0 ? `Achieved target + ${money(targetDifference)}` : `Remaining ${money(Math.abs(targetDifference))} to reach target`}</div></>}</section>{changes.notice}{changes.modal}</div>;
}

export function PlansPage() {
    const [plans, setPlans] = useState([]);
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState({ accountType: 'personal' });
    const [message, setMessage] = useState('');

    useEffect(() => { api.public.plans().then(setPlans).catch(() => { }); }, []);
    const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });

    const submit = async (event) => {
        event.preventDefault();
        try {
            await api.public.requestSubscription({ ...form, planId: selected._id });
            setSelected(null);
            setForm({ accountType: 'personal' });
            setMessage('Your request has been submitted successfully. The payment request has been sent to the super admin for approval. Once validated, your subscription access will be activated.');
        } catch (error) {
            setMessage(error.message);
        }
    };

    const personalPlans = plans.filter((p) => p.planType !== 'business');
    const businessPlans = plans.filter((p) => p.planType === 'business');

    return <div className="plans-page"><div className="plans-intro"><p className="eyebrow">Fintrack personal finance</p><h1>Choose a plan for calmer money management.</h1><p>Track income, expenses, budgets, and the details that make your monthly decisions easier.</p><a href="/login" className="primary-button">Sign in to your account</a></div>{message && <div className="success-banner">{message}</div>}
        <div className="plans-grid">
            <h2 className="plan-section-title">Personal Plans</h2>{personalPlans.length === 0 ? <p className="subheading">No personal plans available.</p> :
                <div className="plan-list personal-plans">{personalPlans.map((plan) =>
                    <button className={`plan-card ${selected?._id === plan._id ? 'selected' : ''}`} key={plan._id} onClick={() => { setSelected(plan); setForm((f) => ({ ...f, accountType: 'personal' })); }} data-plan-type={plan.planType || 'personal'}><span>{plan.planName}</span>
                        <strong>₹{Number(plan.amount).toLocaleString('en-IN')}</strong><small>{plan.period}</small></button>)}</div>}</div>
        <div className="plans-grid">
            <h2 className="plan-section-title">Business Plans</h2>{businessPlans.length === 0 ? <p className="subheading">No business plans available.</p> :
                <div className="plan-list business-plans">{businessPlans.map((plan) =>
                    <button className={`plan-card business ${selected?._id === plan._id ? 'selected' : ''}`} key={plan._id} onClick={() => { setSelected(plan); setForm((f) => ({ ...f, accountType: 'business' })); }} data-plan-type={plan.planType}><span>{plan.planName}</span>
                        <strong>₹{Number(plan.amount).toLocaleString('en-IN')}</strong><small>{plan.period}</small>{plan.maxBranches !== undefined && plan.maxBranches !== null && <span className="plan-badge">Branches Limit: {plan.maxBranches}</span>}{plan.maxStaff !== undefined && plan.maxStaff !== null && <span className="plan-badge">Staff Limit: {plan.maxStaff}</span>}</button>)}</div>}</div>
        <div className="payment-instructions"><h2>Payment and approval</h2>
            <p>Pay using the UPI QR code below or the mobile number shown here. After payment, we will verify the payment request and activate your subscription.</p>
            <div className="upi-box"><img src={upiQrUrl} alt="UPI payment QR code" /><div><p><strong>UPI Mobile Number:</strong> {upiMobileNumber}</p><p><strong>UPI ID:</strong> m.naveenkumarmunees@upi</p></div></div></div>{selected && <div className="modal-backdrop"><div className="modal"><div className="modal-heading"><div><p className="eyebrow">{selected.planName} · {selected.period}</p><h2>Your details</h2></div><button className="icon-button" onClick={() => setSelected(null)}>×</button></div><form onSubmit={submit}>{[['name', 'Name'], ['phoneNumber', 'Phone number'], ['emailId', 'Email'], ['userName', 'Username'], ['password', 'Password']].map(([key, label]) => <label key={key}>{label}<input type={key === 'password' ? 'password' : key === 'emailId' ? 'email' : 'text'} value={form[key] || ''} onChange={update(key)} required /></label>)}<label>Account type<select value={form.accountType || 'personal'} onChange={update('accountType')} required><option value="personal">Personal account</option><option value="business">Business account</option></select></label><label>UPI transaction reference<input value={form.paymentReference || ''} onChange={update('paymentReference')} placeholder="Add after payment" /></label><button className="primary-button modal-submit">Submit payment request</button></form></div></div>}</div>;
}
