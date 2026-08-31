import { Navigate, Route, Routes } from 'react-router-dom';
import App from './App';
import { MastersPage, SubscriptionsPage, TransactionsPage, UsersPage } from './pages';
import { Sidebar } from './components/Sidebar';
import { AnalyticsPage, BudgetsPage, LoginPage, PlansPage } from './publicPages';

const isSuperAdmin = (import.meta.env.VITE_USER_ROLE || 'user') === 'super_admin';

function PageLayout({ children }) {
    return <div className="app-shell"><Sidebar /><main className="main-content">{children}</main></div>;
}

export default function AppRoutes() {
    return <Routes>
        <Route path="/" element={<App />} />
        <Route path="/transactions" element={<PageLayout><TransactionsPage /></PageLayout>} />
        <Route path="/masters" element={<PageLayout><MastersPage /></PageLayout>} />
        <Route path="/analytics" element={<PageLayout><AnalyticsPage /></PageLayout>} />
        <Route path="/budgets" element={<PageLayout><BudgetsPage /></PageLayout>} />
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/login" element={<LoginPage />} />
        {isSuperAdmin && (
            <>
                <Route path="/users" element={<PageLayout><UsersPage /></PageLayout>} />
                <Route path="/subscriptions" element={<PageLayout><SubscriptionsPage /></PageLayout>} />
            </>
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>;
}
