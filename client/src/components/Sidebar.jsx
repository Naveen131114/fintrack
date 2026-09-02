import { BarChart3, LayoutDashboard, LogOut, PieChart, Settings, Tags, WalletCards, X } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const links = [
    { label: 'Overview', icon: LayoutDashboard, to: '/' },
    { label: 'Masters', icon: Tags, to: '/masters' },
    { label: 'Transactions', icon: WalletCards, to: '/transactions' },
    { label: 'Analytics', icon: BarChart3, to: '/analytics' },
    { label: 'Budgets', icon: PieChart, to: '/budgets' },
    { label: 'Target', icon: WalletCards, to: '/targets' }
];

export function Sidebar({ mobileMenuOpen = false, onCloseMobileMenu = () => { } }) {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('fintrack_user') || 'null');
    const isSuperAdmin = user?.role === 'super_admin';

    const handleLogout = async () => {
        try {
            await api.auth.logout();
        } finally {
            onCloseMobileMenu();
            navigate('/login', { replace: true });
            window.location.assign('/login');
        }
    };

    return <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <button className="sidebar-close mobile-only" type="button" aria-label="Close menu" onClick={onCloseMobileMenu}><X size={18} /></button>
        <div className="brand"><span className="brand-mark">f</span><span>fintrack</span></div>
        <div className="workspace-label">Workspace</div>
        <nav>{links.map(({ label, icon: ItemIcon, to }) => <NavLink className="nav-link" to={to} key={label} onClick={onCloseMobileMenu}><ItemIcon size={18} />{label}</NavLink>)}</nav>
        <div className="sidebar-bottom">{isSuperAdmin && <><NavLink className="nav-link" to="/users" onClick={onCloseMobileMenu}><Settings size={18} />Users</NavLink><NavLink className="nav-link" to="/subscriptions" onClick={onCloseMobileMenu}><PieChart size={18} />Subscriptions</NavLink></>}<div className="profile"><div className="avatar">{user?.name?.slice(0, 2)?.toUpperCase() || 'FT'}</div><div><strong>{user?.name || 'Signed-in user'}</strong><span>{user?.role === 'super_admin' ? 'Super admin' : 'Personal account'}</span></div><button className="icon-button" onClick={handleLogout} aria-label="Log out"><LogOut size={18} /></button></div></div>
    </aside>;
}

export default Sidebar;
