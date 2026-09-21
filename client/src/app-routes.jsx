import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import App from './App';
import { MastersPage, StaffPage, SubscriptionsPage, TransactionsPage, UsersPage, BranchesPage, BankAccountsPage, UpiAccountsPage, ActivityLogsPage } from './pages';
import { Sidebar } from './components/Sidebar';
import TopNavbar from './components/TopNavbar';
import { AnalyticsPage, BudgetsPage, LoginPage, PlansPage, TargetPage } from './publicPages';
import { api } from './services/api';
import { getStoredUser, isBusinessUser, isSuperAdmin as isSuperAdminRole } from './utils/roles';

function getCurrentUser() {
    return getStoredUser();
}

function BusinessGuard({ children }) {
    const user = getStoredUser();
    if (!isBusinessUser(user)) return <div className="resource-page"><div className="error-banner">Business account access required</div></div>;
    return children;
}

function PageLayout({ children }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [theme, setTheme] = useState(() => localStorage.getItem('fintrack_theme') || 'light');
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [branches, setBranches] = useState([]);
    const [selectedBranchId, setSelectedBranchId] = useState(() => localStorage.getItem('fintrack_selected_branch') || 'ALL');
    const user = getCurrentUser();
    useEffect(() => { if (isBusinessUser(user)) api.business.branches.list().then((items) => setBranches(items.filter((item) => item.status === 'active'))).catch(() => {}); }, []);
    const selectBranch = (id) => { setSelectedBranchId(id); localStorage.setItem('fintrack_selected_branch', id); };

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('fintrack_theme', theme);
    }, [theme]);

    return <div className="app-shell">{mobileMenuOpen && <div className="mobile-backdrop" onClick={() => setMobileMenuOpen(false)} />}<Sidebar mobileMenuOpen={mobileMenuOpen} onCloseMobileMenu={() => setMobileMenuOpen(false)} /><main className="main-content"><TopNavbar mobileMenuOpen={mobileMenuOpen} onToggleMobileMenu={() => setMobileMenuOpen((value) => !value)} profileMenuOpen={profileMenuOpen} onToggleProfileMenu={() => setProfileMenuOpen((value) => !value)} onToggleTheme={() => setTheme((value) => value === 'light' ? 'dark' : 'light')} searchOpen={searchOpen} searchQuery={searchQuery} onSearchChange={(event) => setSearchQuery(event.target.value)} onToggleSearch={() => setSearchOpen((value) => !value)} branches={branches} selectedBranchId={selectedBranchId} onBranchChange={selectBranch} />{children}</main></div>;
}

export default function AppRoutes() {
    const currentUser = getCurrentUser();
    const isAuthenticated = Boolean(localStorage.getItem('fintrack_access_token'));
    const superAdmin = isSuperAdminRole(currentUser);

    return <Routes>
        <Route path="/" element={isAuthenticated ? <App /> : <Navigate to="/login" replace />} />
        <Route path="/transactions" element={isAuthenticated ? <PageLayout><TransactionsPage /></PageLayout> : <Navigate to="/login" replace />} />
        <Route path="/masters" element={isAuthenticated ? <PageLayout><MastersPage /></PageLayout> : <Navigate to="/login" replace />} />
        <Route path="/analytics" element={isAuthenticated ? <PageLayout><AnalyticsPage /></PageLayout> : <Navigate to="/login" replace />} />
        <Route path="/budgets" element={isAuthenticated ? <PageLayout><BudgetsPage /></PageLayout> : <Navigate to="/login" replace />} />
        <Route path="/targets" element={isAuthenticated ? <PageLayout><TargetPage /></PageLayout> : <Navigate to="/login" replace />} />
        <Route path="/branches" element={isAuthenticated ? <PageLayout><BusinessGuard><BranchesPage /></BusinessGuard></PageLayout> : <Navigate to="/login" replace />} />
        <Route path="/bank-accounts" element={isAuthenticated ? <PageLayout><BusinessGuard><BankAccountsPage /></BusinessGuard></PageLayout> : <Navigate to="/login" replace />} />
        <Route path="/upi-accounts" element={isAuthenticated ? <PageLayout><BusinessGuard><UpiAccountsPage /></BusinessGuard></PageLayout> : <Navigate to="/login" replace />} />
        <Route path="/staff" element={isAuthenticated ? <PageLayout><BusinessGuard><StaffPage /></BusinessGuard></PageLayout> : <Navigate to="/login" replace />} />
        <Route path="/activity-logs" element={isAuthenticated ? <PageLayout><BusinessGuard><ActivityLogsPage /></BusinessGuard></PageLayout> : <Navigate to="/login" replace />} />
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
        {superAdmin && (
            <>
                <Route path="/users" element={<PageLayout><UsersPage /></PageLayout>} />
                <Route path="/subscriptions" element={<PageLayout><SubscriptionsPage /></PageLayout>} />
            </>
        )}
        <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/plans'} replace />} />
    </Routes>;
}
