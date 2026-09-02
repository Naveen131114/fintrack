import { ChevronDown, LogOut, Menu, Search, Settings } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const pageNames = {
    '/': 'Overview',
    '/transactions': 'Transactions',
    '/masters': 'Masters',
    '/analytics': 'Analytics',
    '/budgets': 'Budgets',
    '/targets': 'Target',
    '/users': 'Users',
    '/subscriptions': 'Subscriptions'
};

export default function TopNavbar({ mobileMenuOpen, onToggleMobileMenu, profileMenuOpen, onToggleProfileMenu, onToggleTheme, searchOpen = false, searchQuery = '', onSearchChange = () => { }, onToggleSearch = () => { } }) {
    const navigate = useNavigate();
    const location = useLocation();
    const pageName = pageNames[location.pathname] || 'Workspace';

    const handleLogout = async () => {
        try {
            await api.auth.logout();
        } finally {
            navigate('/login', { replace: true });
            window.location.assign('/login');
        }
    };

    return <header className="topbar"><button className="mobile-menu icon-button" aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'} onClick={onToggleMobileMenu}><Menu size={20} /></button><div className="breadcrumbs"><span>Workspace</span><ChevronDown size={14} /><strong>{pageName}</strong></div><div className="topbar-actions"><div className={`search-wrap ${searchOpen ? 'open' : ''}`}><Search size={16} /><input type="text" value={searchQuery} onChange={onSearchChange} placeholder="Search transactions" aria-label="Search transactions" /></div><button className="icon-button search-button" aria-label="Search transactions" onClick={onToggleSearch}><Search size={19} /></button><div className="profile-menu-wrap"><button className="topbar-avatar" title="User Profile" type="button" onClick={onToggleProfileMenu}>FT</button>{profileMenuOpen && <div className="profile-menu"><button type="button" className="profile-menu-item" onClick={() => { onToggleTheme(); onToggleProfileMenu(); }}><Settings size={15} />Settings</button><button type="button" className="profile-menu-item danger" onClick={handleLogout}><LogOut size={15} />Logout</button></div>}</div></div></header>;
}
