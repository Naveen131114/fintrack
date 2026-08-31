import { ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

export default function DataTable({ columns, rows, onEdit, onDelete, pageSize = 8 }) {
    const [page, setPage] = useState(1);
    const pages = Math.max(1, Math.ceil(rows.length / pageSize));
    const current = rows.slice((page - 1) * pageSize, page * pageSize);
    return <><div className="data-table-wrap"><table className="data-table"><thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}<th>Actions</th></tr></thead><tbody>{current.map((row) => <tr key={row._id || row.id}>{columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key] || '-'}</td>)}<td className="table-actions"><button className="table-icon" onClick={() => onEdit?.(row)} aria-label="Edit"><Pencil size={15} /></button><button className="table-icon delete" onClick={() => onDelete?.(row)} aria-label="Delete"><Trash2 size={15} /></button></td></tr>)}</tbody></table>{!current.length && <div className="empty-state">No records found.</div>}</div><div className="pagination"><span>Showing {current.length ? (page - 1) * pageSize + 1 : 0}-{Math.min(page * pageSize, rows.length)} of {rows.length}</span><div><button className="table-icon" disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft size={16} /></button><button className="table-icon" disabled={page === pages} onClick={() => setPage(page + 1)}><ChevronRight size={16} /></button></div></div></>;
}
