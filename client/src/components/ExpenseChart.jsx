export default function ExpenseChart({ transactions = [] }) {
    const colors = ['#ef8c68', '#e8b44e', '#84a98c', '#7c91c9', '#b2a7c7'];

    const expenseBreakdown = Object.entries(
        transactions.filter((item) => item.type === 'Expense' || item.type === 'expense').reduce((groups, item) => {
            const category = item.category || 'Other';
            groups[category] = (groups[category] || 0) + Number(item.amount || 0);
            return groups;
        }, {})
    ).map(([label, value], index) => ({ label, value, color: colors[index % colors.length] }));

    const total = expenseBreakdown.reduce((sum, item) => sum + item.value, 0);
    let offset = 0;
    const segments = expenseBreakdown.map((item) => {
        const start = offset;
        offset += (item.value / (total || 1)) * 100;
        return `${item.color} ${start}% ${offset}%`;
    });

    return <section className="panel expense-panel"><div className="panel-heading"><div><p className="eyebrow">Spending</p><h2>Expense breakdown</h2></div></div>{total ? <div className="chart-content"><div className="donut" style={{ background: `conic-gradient(${segments.join(', ')})` }}><div className="donut-hole"><strong>₹{total.toLocaleString('en-IN')}</strong><span>Total spent</span></div></div><div className="legend">{expenseBreakdown.map((item) => <div className="legend-item" key={item.label}><span className="legend-dot" style={{ background: item.color }}></span><span>{item.label}</span><strong>₹{item.value.toLocaleString('en-IN')}</strong></div>)}</div></div> : <div className="empty-state">Add expenses to see your spending breakdown.</div>}</section>;
}
