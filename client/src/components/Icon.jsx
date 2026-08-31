import { BriefcaseBusiness, Fuel, Home, Laptop, MoreHorizontal, Plus, Search, Settings, ShoppingBag, Tags, TrendingUp, Wallet, X } from 'lucide-react';

const icons = { briefcase: BriefcaseBusiness, fuel: Fuel, home: Home, laptop: Laptop, 'shopping-bag': ShoppingBag, wallet: Wallet };
export function Icon({ name, size = 20, ...props }) { const Component = icons[name] || MoreHorizontal; return <Component size={size} strokeWidth={1.8} {...props} />; }
export { Fuel, Plus, Search, Settings, Tags, TrendingUp, Wallet, X };
