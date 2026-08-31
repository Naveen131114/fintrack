import { useEffect, useState } from 'react';
import { Bell, CalendarDays, ChevronDown, Menu, Plus, Search } from 'lucide-react';
import Sidebar from './components/Sidebar';
import SummaryCard from './components/SummaryCard';
import TransactionList from './components/TransactionList';
import ExpenseChart from './components/ExpenseChart';
import AddTransactionModal from './components/AddTransactionModal';
import { api } from './services/api';

const money = (value) => `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export default function App() {
    const [transactions, setTransactions] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    useEffect(() => { api.transactions.list().then(setTransactions).catch(() => { }); }, []);
    const income = transactions.filter((item) => item.type === 'Income' || item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
    const expenses = transactions.filter((item) => item.type === 'Expense' || item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
    const balance = income - expenses;
    const addTransaction = async (transaction) => { await api.transactions.create(transaction); setIsModalOpen(false); api.transactions.list().then(setTransactions).catch(() => { }); };
    return <div className="app-shell"><Sidebar /><main className="main-content"><header className="topbar"><button className="mobile-menu icon-button" aria-label="Open menu"><Menu size={20} /></button><div className="breadcrumbs"><span>Workspace</span><ChevronDown size={14} /><strong>Overview</strong></div><div className="topbar-actions"><button className="icon-button search-button" aria-label="Search"><Search size={19} /></button><button className="icon-button notification-button" aria-label="Notifications"><Bell size={19} /><i /></button><div className="topbar-avatar">FT</div></div></header><div className="page-content"><div className="page-heading"><div><p className="eyebrow">{new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })}</p><h1>Your financial snapshot <span>✦</span></h1><p className="subheading">Track your income and expenses for this month.</p></div><button className="primary-button" onClick={() => setIsModalOpen(true)}><Plus size={18} />Add transaction</button></div><div className="toolbar"><button className="date-filter"><CalendarDays size={17} />This month<ChevronDown size={15} /></button><span className="updated">Synced with your account</span></div><section className="summary-grid"><SummaryCard type="balance" label="Total balance" value={money(balance)} change="Live" tone="balance" /><SummaryCard type="income" label="Total income" value={money(income)} change="Live" tone="income" /><SummaryCard type="expense" label="Total expenses" value={money(expenses)} change="Live" tone="expense" /></section><div className="dashboard-grid"><TransactionList transactions={transactions.slice(0, 5)} onSeeAll={() => setTransactions([...transactions])} /><ExpenseChart transactions={transactions} /></div></div></main>{isModalOpen && <AddTransactionModal onClose={() => setIsModalOpen(false)} onAdd={addTransaction} />}</div>;
}
