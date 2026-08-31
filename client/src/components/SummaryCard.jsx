import { ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react';

const icons = { balance: Wallet, income: ArrowDownLeft, expense: ArrowUpRight };
export default function SummaryCard({ type, label, value, change, tone }) {
    const ItemIcon = icons[type];
    return <article className={`summary-card ${tone}`}><div className="summary-top"><span>{label}</span><span className="summary-icon"><ItemIcon size={18} /></span></div><strong className="summary-value">{value}</strong><div className="summary-change"><span className="change-pill">{change}</span><span>vs last month</span></div></article>;
}
