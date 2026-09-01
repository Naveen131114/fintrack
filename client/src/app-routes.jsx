import { Navigate, Route, Routes } from 'react-router-dom';
import App from './App';
import { MastersPage, SubscriptionsPage, TransactionsPage, UsersPage } from './pages';
import { Sidebar } from './components/Sidebar';
import { AnalyticsPage, BudgetsPage, LoginPage, PlansPage } from './publicPages';

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem('fintrack_user') || 'null');
    } catch {
        return null;
    }
}

function PageLayout({ children }) {
    return <div className="app-shell"><Sidebar /><main className="main-content">{children}</main></div>;
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
