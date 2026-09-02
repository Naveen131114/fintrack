import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import App from './App';
import { MastersPage, SubscriptionsPage, TransactionsPage, UsersPage } from './pages';
import { Sidebar } from './components/Sidebar';
import TopNavbar from './components/TopNavbar';
import { AnalyticsPage, BudgetsPage, LoginPage, PlansPage, TargetPage } from './publicPages';

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem('fintrack_user') || 'null');
    } catch {
        return null;
    }
}

function PageLayout({ children }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [theme, setTheme] = useState(() => localStorage.getItem('fintrack_theme') || 'light');
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('fintrack_theme', theme);
    }, [theme]);

    return <div className="app-shell">{mobileMenuOpen && <div className="mobile-backdrop" onClick={() => setMobileMenuOpen(false)} />}<Sidebar mobileMenuOpen={mobileMenuOpen} onCloseMobileMenu={() => setMobileMenuOpen(false)} /><main className="main-content"><TopNavbar mobileMenuOpen={mobileMenuOpen} onToggleMobileMenu={() => setMobileMenuOpen((value) => !value)} profileMenuOpen={profileMenuOpen} onToggleProfileMenu={() => setProfileMenuOpen((value) => !value)} onToggleTheme={() => setTheme((value) => value === 'light' ? 'dark' : 'light')} searchOpen={searchOpen} searchQuery={searchQuery} onSearchChange={(event) => setSearchQuery(event.target.value)} onToggleSearch={() => setSearchOpen((value) => !value)} />{children}</main></div>;
}

export default function AppRoutes() {
    const currentUser = getCurrentUser();
    const isAuthenticated = Boolean(localStorage.getItem('fintrack_access_token'));
    const isSuperAdmin = currentUser?.role === 'super_admin';

    return <Routes>
        <Route path="/" element={isAuthenticated ? <App /> : <Navigate to="/login" replace />} />
        <Route path="/transactions" element={isAuthenticated ? <PageLayout><TransactionsPage /></PageLayout> : <Navigate to="/login" replace />} />
        <Route path="/masters" element={isAuthenticated ? <PageLayout><MastersPage /></PageLayout> : <Navigate to="/login" replace />} />
        <Route path="/analytics" element={isAuthenticated ? <PageLayout><AnalyticsPage /></PageLayout> : <Navigate to="/login" replace />} />
        <Route path="/budgets" element={isAuthenticated ? <PageLayout><BudgetsPage /></PageLayout> : <Navigate to="/login" replace />} />
        <Route path="/targets" element={isAuthenticated ? <PageLayout><TargetPage /></PageLayout> : <Navigate to="/login" replace />} />
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
        {isSuperAdmin && (
            <>
                <Route path="/users" element={<PageLayout><UsersPage /></PageLayout>} />
                <Route path="/subscriptions" element={<PageLayout><SubscriptionsPage /></PageLayout>} />
            </>
        )}
        <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/plans'} replace />} />
    </Routes>;
}
