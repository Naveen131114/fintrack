import { useEffect, useState } from 'react';
import { Bell, CalendarDays, ChevronDown, Menu, Plus, Search } from 'lucide-react';
import Sidebar from './components/Sidebar';
import SummaryCard from './components/SummaryCard';
import TransactionList from './components/TransactionList';
import ExpenseChart from './components/ExpenseChart';
import AddTransactionModal from './components/AddTransactionModal';
import { api } from './services/api';

const money = (value) => `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function getDateRange(filter) {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    switch (filter) {
        case 'today':
            return [new Date(year, month, today.getDate()), new Date(year, month, today.getDate() + 1)];
        case 'this-week':
            const start = new Date(year, month, today.getDate() - today.getDay());
            const end = new Date(start);
            end.setDate(end.getDate() + 7);
            return [start, end];
        case 'this-month':
            return [new Date(year, month, 1), new Date(year, month + 1, 1)];
        case 'last-month':
            return [new Date(year, month - 1, 1), new Date(year, month, 1)];
        case 'last-3-months':
            return [new Date(year, month - 3, 1), new Date(year, month + 1, 1)];
        default:
            return [new Date(year, month, 1), new Date(year, month + 1, 1)];
    }
}

export default function App() {
    const [transactions, setTransactions] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [dateFilter, setDateFilter] = useState('this-month');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => { api.transactions.list().then(setTransactions).catch(() => { }); }, []);

    const [start, end] = getDateRange(dateFilter);
    const filtered = transactions.filter((item) => {
        const itemDate = new Date(item.date);
        return itemDate >= start && itemDate < end;
    });

    const income = filtered.filter((item) => item.type === 'Income' || item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
    const expenses = filtered.filter((item) => item.type === 'Expense' || item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
    const balance = income - expenses;

    const addTransaction = async (transaction) => { await api.transactions.create(transaction); setIsModalOpen(false); api.transactions.list().then(setTransactions).catch(() => { }); };

    return <div className="app-shell"><Sidebar /><main className="main-content"><header className="topbar"><button className="mobile-menu icon-button" aria-label="Open menu" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}><Menu size={20} /></button><div className="breadcrumbs"><span>Workspace</span><ChevronDown size={14} /><strong>Overview</strong></div><div className="topbar-actions"><button className="icon-button search-button" aria-label="Search" onClick={() => alert('Search feature coming soon')}><Search size={19} /></button><button className="icon-button notification-button" aria-label="Notifications" onClick={() => alert('No new notifications')}><Bell size={19} /><i /></button><div className="topbar-avatar" title="User Profile">FT</div></div></header><div className="page-content"><div className="page-heading"><div><p className="eyebrow">{new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })}</p><h1>Your financial snapshot <span>✦</span></h1><p className="subheading">Track your income and expenses for this month.</p></div><button className="primary-button" onClick={() => setIsModalOpen(true)}><Plus size={18} />Add transaction</button></div><div className="toolbar"><div className="date-filter-group"><button className="date-filter"><CalendarDays size={17} />{dateFilter === 'today' ? 'Today' : dateFilter === 'this-week' ? 'This week' : dateFilter === 'this-month' ? 'This month' : dateFilter === 'last-month' ? 'Last month' : 'Last 3 months'}<ChevronDown size={15} /></button><div className="date-filter-dropdown"><button onClick={() => setDateFilter('today')}>Today</button><button onClick={() => setDateFilter('this-week')}>This week</button><button onClick={() => setDateFilter('this-month')}>This month</button><button onClick={() => setDateFilter('last-month')}>Last month</button><button onClick={() => setDateFilter('last-3-months')}>Last 3 months</button></div></div><span className="updated">Synced with your account</span></div><section className="summary-grid"><SummaryCard type="balance" label="Total balance" value={money(balance)} change="Live" tone="balance" /><SummaryCard type="income" label="Total income" value={money(income)} change="Live" tone="income" /><SummaryCard type="expense" label="Total expenses" value={money(expenses)} change="Live" tone="expense" /></section><div className="dashboard-grid"><TransactionList transactions={filtered.slice(0, 5)} onSeeAll={() => setTransactions([...transactions])} /><ExpenseChart transactions={filtered} /></div></div></main>{isModalOpen && <AddTransactionModal onClose={() => setIsModalOpen(false)} onAdd={addTransaction} />}</div>;
}
