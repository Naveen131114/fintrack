import { BarChart3, LayoutDashboard, PieChart, Settings, Tags, WalletCards } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const links = [
    { label: 'Overview', icon: LayoutDashboard, to: '/' },
    { label: 'Masters', icon: Tags, to: '/masters' },
    { label: 'Transactions', icon: WalletCards, to: '/transactions' },
    { label: 'Analytics', icon: BarChart3, to: '/analytics' },
    { label: 'Budgets', icon: PieChart, to: '/budgets' }
];

export function Sidebar() {
    return <aside className="sidebar">
        <div className="brand"><span className="brand-mark">f</span><span>fintrack</span></div>
        <div className="workspace-label">Workspace</div>
        <nav>{links.map(({ label, icon: ItemIcon, to }) => <NavLink className="nav-link" to={to} key={label}><ItemIcon size={18} />{label}</NavLink>)}</nav>
        <div className="sidebar-bottom">{(import.meta.env.VITE_USER_ROLE || 'user') === 'super_admin' && <><NavLink className="nav-link" to="/users"><Settings size={18} />Users</NavLink><NavLink className="nav-link" to="/subscriptions"><PieChart size={18} />Subscriptions</NavLink></>}<div className="profile"><div className="avatar">FT</div><div><strong>Signed-in user</strong><span>Personal account</span></div><span className="profile-dots">•••</span></div></div>
    </aside>;
}

export default Sidebar;
