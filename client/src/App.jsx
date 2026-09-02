import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronDown, LogOut, Menu, Plus, Search, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import SummaryCard from './components/SummaryCard';
import TransactionList from './components/TransactionList';
import ExpenseChart from './components/ExpenseChart';
import AddTransactionModal from './components/AddTransactionModal';
import { api } from './services/api';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function getDateRange(filter) {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    switch (filter) {
        case 'today':
            return [new Date(year, month, today.getDate()), new Date(year, month, today.getDate() + 1)];
        case 'this-week': {
            const start = new Date(year, month, today.getDate() - today.getDay());
            const end = new Date(start);
            end.setDate(end.getDate() + 7);
            return [start, end];
        }
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

const DATE_OPTIONS = [
    { value: 'today', label: 'Today' },
    { value: 'this-week', label: 'This week' },
    { value: 'this-month', label: 'This month' },
    { value: 'last-month', label: 'Last month' },
    { value: 'last-3-months', label: 'Last 3 months' }
];

export default function App() {
    const navigate = useNavigate();
    const [transactions, setTransactions] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [dateFilter, setDateFilter] = useState('this-month');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAllTransactions, setShowAllTransactions] = useState(false);
    const [theme, setTheme] = useState(() => localStorage.getItem('fintrack_theme') || 'light');
    const [filterOpen, setFilterOpen] = useState(false);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('fintrack_theme', theme);
    }, [theme]);

    useEffect(() => { api.transactions.list().then(setTransactions).catch(() => { }); }, []);

    useEffect(() => {
        setShowAllTransactions(false);
    }, [dateFilter, searchQuery]);

    const [start, end] = getDateRange(dateFilter);
    const filtered = useMemo(() => transactions.filter((item) => {
        const itemDate = new Date(item.date);
        const inRange = itemDate >= start && itemDate < end;
        if (!inRange) return false;
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return [item.title, item.description, item.category, item.type].some((value) => String(value || '').toLowerCase().includes(query));
    }), [transactions, start, end, searchQuery]);

    const income = filtered.filter((item) => item.type === 'Income' || item.type === 'income').reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const expenses = filtered.filter((item) => item.type === 'Expense' || item.type === 'expense').reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const balance = income - expenses;
    const visibleTransactions = showAllTransactions ? filtered : filtered.slice(0, 5);

    const addTransaction = async (transaction) => {
        await api.transactions.create(transaction);
        setIsModalOpen(false);
        api.transactions.list().then(setTransactions).catch(() => { });
    };

    const handleLogout = async () => {
        setProfileMenuOpen(false);
        try {
            await api.auth.logout();
        } finally {
            navigate('/login', { replace: true });
            window.location.assign('/login');
        }
    };

    return <div className="app-shell">{mobileMenuOpen && <div className="mobile-backdrop" onClick={() => setMobileMenuOpen(false)} />}<Sidebar mobileMenuOpen={mobileMenuOpen} onCloseMobileMenu={() => setMobileMenuOpen(false)} /><main className="main-content"><header className="topbar"><button className="mobile-menu icon-button" aria-label="Open menu" onClick={() => setMobileMenuOpen((value) => !value)}><Menu size={20} /></button><div className="breadcrumbs"><span>Workspace</span><ChevronDown size={14} /><strong>Overview</strong></div><div className="topbar-actions"><div className={`search-wrap ${searchOpen ? 'open' : ''}`}><Search size={16} /><input type="text" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search transactions" aria-label="Search transactions" /></div><button className="icon-button search-button" aria-label="Search transactions" onClick={() => setSearchOpen((value) => !value)}><Search size={19} /></button><div className="profile-menu-wrap"><button className="topbar-avatar" title="User Profile" type="button" onClick={() => setProfileMenuOpen((value) => !value)}>FT</button>{profileMenuOpen && <div className="profile-menu"><button type="button" className="profile-menu-item" onClick={() => { setTheme((value) => value === 'light' ? 'dark' : 'light'); setProfileMenuOpen(false); }}><Settings size={15} />Settings</button><button type="button" className="profile-menu-item danger" onClick={handleLogout}><LogOut size={15} />Logout</button></div>}</div></div></header><div className="page-content"><div className="page-heading"><div><p className="eyebrow">{new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })}</p><h1>Your financial snapshot <span>✦</span></h1><p className="subheading">Track your income and expenses for this month.</p></div><button className="primary-button" onClick={() => setIsModalOpen(true)}><Plus size={18} />Add transaction</button></div><div className="toolbar"><div className="overview-date-filter-group"><button className="date-filter" type="button" onClick={() => setFilterOpen((value) => !value)}><CalendarDays size={17} />{DATE_OPTIONS.find((option) => option.value === dateFilter)?.label || 'This month'}<ChevronDown size={15} /></button>{filterOpen && <div className="overview-date-filter-dropdown">{DATE_OPTIONS.map((option) => <button key={option.value} type="button" className={dateFilter === option.value ? 'selected' : ''} onClick={() => { setDateFilter(option.value); setFilterOpen(false); }}>{option.label}</button>)}</div>}</div><span className="updated">Synced with your account</span></div><section className="summary-grid"><SummaryCard type="balance" label="Total balance" value={money(balance)} change="Live" tone="balance" /><SummaryCard type="income" label="Total income" value={money(income)} change="Live" tone="income" /><SummaryCard type="expense" label="Total expenses" value={money(expenses)} change="Live" tone="expense" /></section><div className="dashboard-grid"><TransactionList transactions={visibleTransactions} onSeeAll={() => setShowAllTransactions((value) => !value)} showAll={showAllTransactions} /><ExpenseChart transactions={filtered} /></div></div></main>{isModalOpen && <AddTransactionModal onClose={() => setIsModalOpen(false)} onAdd={addTransaction} />}</div>;
}
