import { BarChart3, Building2, Landmark, LayoutDashboard, LogOut, PieChart, QrCode, ScrollText, Settings, Tags, Users, WalletCards, X } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { getStoredUser, isBusinessStaff, isBusinessUser as checkIsBusinessUser, isSuperAdmin as checkIsSuperAdmin, roleLabel } from '../utils/roles';

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
    const user = getStoredUser();
    const showSuperAdmin = checkIsSuperAdmin(user);
    const showBusiness = checkIsBusinessUser(user);

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
        <nav>{links.map(({ label, icon: ItemIcon, to }) => <NavLink className="nav-link" to={to} key={label} onClick={onCloseMobileMenu}><ItemIcon size={18} />{label}</NavLink>)}{showBusiness && !isBusinessStaff(user) && <><NavLink className="nav-link" to="/branches"><Building2 size={18} />Branches</NavLink><NavLink className="nav-link" to="/bank-accounts"><Landmark size={18} />Bank accounts</NavLink><NavLink className="nav-link" to="/upi-accounts"><QrCode size={18} />UPI accounts</NavLink><NavLink className="nav-link" to="/staff"><Users size={18} />Staff</NavLink><NavLink className="nav-link" to="/activity-logs"><ScrollText size={18} />Activity logs</NavLink></>}</nav>
        <div className="sidebar-bottom">{showSuperAdmin && <><NavLink className="nav-link" to="/users" onClick={onCloseMobileMenu}><Settings size={18} />Users</NavLink><NavLink className="nav-link" to="/subscriptions" onClick={onCloseMobileMenu}><PieChart size={18} />Subscriptions</NavLink></>}<div className="profile"><div className="avatar">{user?.name?.slice(0, 2)?.toUpperCase() || 'FT'}</div><div><strong>{user?.name || 'Signed-in user'}</strong><span>{roleLabel(user?.role)}</span></div><button className="icon-button" onClick={handleLogout} aria-label="Log out"><LogOut size={18} /></button></div></div>
    </aside>;
}

export default Sidebar;
