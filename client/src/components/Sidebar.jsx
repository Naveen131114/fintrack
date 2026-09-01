import { BarChart3, LayoutDashboard, LogOut, PieChart, Settings, Tags, WalletCards } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const links = [
    { label: 'Overview', icon: LayoutDashboard, to: '/' },
    { label: 'Masters', icon: Tags, to: '/masters' },
    { label: 'Transactions', icon: WalletCards, to: '/transactions' },
    { label: 'Analytics', icon: BarChart3, to: '/analytics' },
    { label: 'Budgets', icon: PieChart, to: '/budgets' }
];

export function Sidebar() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('fintrack_user') || 'null');
    const isSuperAdmin = user?.role === 'super_admin';

    const handleLogout = async () => {
        await api.auth.logout();
        navigate('/login');
    };

    return <aside className="sidebar">
        <div className="brand"><span className="brand-mark">f</span><span>fintrack</span></div>
        <div className="workspace-label">Workspace</div>
        <nav>{links.map(({ label, icon: ItemIcon, to }) => <NavLink className="nav-link" to={to} key={label}><ItemIcon size={18} />{label}</NavLink>)}</nav>
        <div className="sidebar-bottom">{isSuperAdmin && <><NavLink className="nav-link" to="/users"><Settings size={18} />Users</NavLink><NavLink className="nav-link" to="/subscriptions"><PieChart size={18} />Subscriptions</NavLink></>}<div className="profile"><div className="avatar">{user?.name?.slice(0, 2)?.toUpperCase() || 'FT'}</div><div><strong>{user?.name || 'Signed-in user'}</strong><span>{user?.role === 'super_admin' ? 'Super admin' : 'Personal account'}</span></div><button className="icon-button" onClick={handleLogout} aria-label="Log out"><LogOut size={18} /></button></div></div>
    </aside>;
}

export default Sidebar;
