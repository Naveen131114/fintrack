import { ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

function createPdf(rows) {
    const escapePdf = (value) =>
        String(value)
            .replace(/\\/g, '\\\\')
            .replace(/\(/g, '\\(')
            .replace(/\)/g, '\\)')
            .replace(/[^\x20-\x7E]/g, '');

    // Same order as XL / Word / UI table
    const headers = [
        'Type',
        'Category',
        'Date',
        'Description',
        'Amount'
    ];

    const pageWidth = 612;
    const pageHeight = 792;

    const tableLeft = 36;
    const tableRight = 576;
    const tableWidth = tableRight - tableLeft;

    // Total = 540
    const columnWidths = [
        80,   // Type
        110,  // Category
        100,  // Date
        160,  // Description
        90    // Amount
    ];

    const columnX = [];
    let currentX = tableLeft;

    columnWidths.forEach((width) => {
        columnX.push(currentX);
        currentX += width;
    });

    const columnRight = columnX.map(
        (x, index) => x + columnWidths[index]
    );

    const rowHeight = 24;
    const tableTop = 755;
    const bottomMargin = 45;

    const rowsPerPage = Math.floor(
        (tableTop - bottomMargin) / rowHeight
    );

    // Split rows into pages
    const pages = [];

    for (let i = 0; i < rows.length; i += rowsPerPage - 1) {
        pages.push(rows.slice(i, i + rowsPerPage - 1));
    }

    if (!pages.length) {
        pages.push([]);
    }

    const createPageContent = (pageRows) => {
        const content = [];

        // -----------------------------
        // PDF Heading
        // -----------------------------
        content.push('BT');
        content.push('/F1 16 Tf');
        content.push('1 0 0 1 36 765 Tm');
        content.push('(Transactions) Tj');
        content.push('ET');

        // -----------------------------
        // Table borders
        // -----------------------------
        content.push('0.5 w');

        // Top border
        content.push(
            `${tableLeft} ${tableTop} m ${tableRight} ${tableTop} l S`
        );

        const totalRows = pageRows.length + 1;

        // Horizontal lines
        for (let i = 1; i <= totalRows; i++) {
            const y = tableTop - (i * rowHeight);

            content.push(
                `${tableLeft} ${y} m ${tableRight} ${y} l S`
            );
        }

        // Vertical lines
        const verticalLines = [
            tableLeft,
            ...columnRight
        ];

        verticalLines.forEach((x) => {
            const bottomY =
                tableTop - (totalRows * rowHeight);

            content.push(
                `${x} ${tableTop} m ${x} ${bottomY} l S`
            );
        });

        // -----------------------------
        // Text
        // -----------------------------
        content.push('BT');
        content.push('/F1 9 Tf');

        const textPadding = 6;

        const drawText = (text, x, y) => {
            content.push(
                `1 0 0 1 ${x} ${y} Tm`
            );

            content.push(
                `(${escapePdf(text)}) Tj`
            );
        };

        // -----------------------------
        // Header
        // -----------------------------
        const headerY = tableTop - 16;

        headers.forEach((header, index) => {
            drawText(
                header,
                columnX[index] + textPadding,
                headerY
            );
        });

        // -----------------------------
        // Data rows
        // -----------------------------
        pageRows.forEach((row, rowIndex) => {

            const rowTop =
                tableTop - ((rowIndex + 1) * rowHeight);

            const textY = rowTop - 16;

            row.forEach((value, columnIndex) => {

                let text = String(value ?? '');

                // Maximum text length based on column
                if (columnIndex === 0) {
                    text = text.slice(0, 14);
                }

                if (columnIndex === 1) {
                    text = text.slice(0, 18);
                }

                if (columnIndex === 2) {
                    text = text.slice(0, 16);
                }

                if (columnIndex === 3) {
                    text = text.slice(0, 28);
                }

                if (columnIndex === 4) {
                    text = text.slice(0, 16);
                }

                // -----------------------------
                // Amount = Right aligned
                // -----------------------------
                if (columnIndex === 4) {

                    const estimatedTextWidth =
                        text.length * 5.2;

                    const rightPadding = 6;

                    const x =
                        columnRight[columnIndex]
                        - rightPadding
                        - estimatedTextWidth;

                    drawText(
                        text,
                        x,
                        textY
                    );

                } else {

                    // Left aligned
                    drawText(
                        text,
                        columnX[columnIndex] + textPadding,
                        textY
                    );
                }
            });
        });

        content.push('ET');

        return content.join('\n');
    };

    // -----------------------------
    // PDF Objects
    // -----------------------------
    const objects = [];

    // Catalog
    objects.push(
        '<< /Type /Catalog /Pages 2 0 R >>'
    );

    // Pages
    const pageObjectStart = 4;
    const pageObjectRefs = [];

    pages.forEach((_, index) => {
        const pageObjectNumber =
            pageObjectStart + (index * 2);

        pageObjectRefs.push(
            `${pageObjectNumber} 0 R`
        );
    });

    objects.push(
        `<< /Type /Pages /Kids [${pageObjectRefs.join(' ')}] /Count ${pages.length} >>`
    );

    // Font
    objects.push(
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
    );

    // Pages
    pages.forEach((pageRows, index) => {

        const pageObjectNumber =
            pageObjectStart + (index * 2);

        const contentObjectNumber =
            pageObjectNumber + 1;

        const stream =
            createPageContent(pageRows);

        // Page object
        objects.push(
            `<<
                /Type /Page
                /Parent 2 0 R
                /MediaBox [0 0 ${pageWidth} ${pageHeight}]
                /Resources <<
                    /Font <<
                        /F1 3 0 R
                    >>
                >>
                /Contents ${contentObjectNumber} 0 R
            >>`
        );

        // Content object
        objects.push(
            `<< /Length ${stream.length} >>
stream
${stream}
endstream`
        );
    });

    // -----------------------------
    // Build PDF
    // -----------------------------
    let pdf =
        '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';

    const offsets = [0];

    objects.forEach((object, index) => {

        offsets.push(pdf.length);

        pdf += `${index + 1} 0 obj\n`;
        pdf += `${object}\n`;
        pdf += 'endobj\n';
    });

    const xref = pdf.length;

    pdf += `xref\n`;
    pdf += `0 ${objects.length + 1}\n`;
    pdf += `0000000000 65535 f \n`;

    for (let i = 1; i < offsets.length; i++) {
        pdf +=
            `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }

    pdf += `trailer\n`;
    pdf +=
        `<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
    pdf += `startxref\n`;
    pdf += `${xref}\n`;
    pdf += `%%EOF`;

    return pdf;
}
export default function DataTable({ columns, rows, onEdit, onDelete, pageSize = 8, dateFilter = 'all', typeFilter = 'All', onExportReady, showTotal = false }) {
    const [page, setPage] = useState(1);
    useEffect(() => { setPage(1); }, [dateFilter, typeFilter, rows]);
    const isTransactionsTable = columns.some((column) => column.key === 'category') && columns.some((column) => column.key === 'type');
    const filteredRows = isTransactionsTable ? rows.filter((row) => {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        let start = new Date(year, month, 1);
        let end = new Date(year, month + 1, 1);
        if (dateFilter === 'today') { start = new Date(year, month, today.getDate()); end = new Date(year, month, today.getDate() + 1); }
        if (dateFilter === 'this-week') { start = new Date(year, month, today.getDate() - today.getDay()); end = new Date(start); end.setDate(end.getDate() + 7); }
        if (dateFilter === 'last-month') { start = new Date(year, month - 1, 1); end = new Date(year, month, 1); }
        if (dateFilter === 'last-3-months') start = new Date(year, month - 3, 1);
        const date = new Date(row.date);
        return (typeFilter === 'All' || row.type === typeFilter) && (dateFilter === 'all' || (date >= start && date < end));
    }) : rows;
    const pages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
    const current = filteredRows.slice((page - 1) * pageSize, page * pageSize);
    const totalAmount = isTransactionsTable ? filteredRows.reduce((sum, row) => {
        const value = Number(row.amount || 0);
        const normalizedType = String(row.type || '').trim().toLowerCase();
        const isExpense = normalizedType === 'expense';
        return sum + (isExpense ? -value : value);
    }, 0) : 0;
    const exportRows = (format) => {
        const data = filteredRows.map((row) => [row.type, row.category, new Date(row.date).toLocaleDateString('en-IN'), row.description || row.title || '', Number(row.amount || 0).toFixed(2)]);
        if (isTransactionsTable) data.push(['', '', '', 'Total', (totalAmount >= 0 ? '+' : '') + totalAmount.toFixed(2)]);
        const escapeHtml = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const table = `
<table
    border="1"
    style="
        border-collapse:collapse;
        font-family:Arial;
        font-size:11pt;
        width:100%;
    "
>
    <thead>
        <tr>
            ${[
                'Type',
                'Category',
                'Date',
                'Description',
                'Amount'
            ].map((header) => `
                <th style="
                    background:#e3f2eb;
                    padding:6px;
                    text-align:left;
                ">
                    ${header}
                </th>
            `).join('')}
        </tr>
    </thead>

    <tbody>
        ${data.map((row) => `
            <tr>
                ${row.map((value, index) => `
                    <td style="
                        padding:6px;
                        ${index === 2
                    ? 'mso-number-format:\\@;width:100px;'
                    : ''
                }
                        ${index === 3
                    ? 'width:180px;'
                    : ''
                }
                        ${index === 4
                    ? 'width:90px;text-align:right;'
                    : ''
                }
                    ">
                        ${escapeHtml(value)}
                    </td>
                `).join('')}
            </tr>
        `).join('')}
    </tbody>
</table>`;
        let content;
        let type;
        let extension;
        if (format === 'xl') {
            content = `<html><head><meta charset="utf-8"></head><body><h2>Transactions</h2>${table}</body></html>`;
            type = 'application/vnd.ms-excel';
            extension = 'xls';
        } else if (format === 'word') {
            content = `<html><head><meta charset="utf-8"><style>table{border-collapse:collapse}th,td{border:1px solid #999;padding:6px}th{background:#e3f2eb}</style></head><body><h2>Transactions</h2>${table}</body></html>`;
            type = 'application/msword';
            extension = 'doc';
        } else {
            content = createPdf(data);
            type = 'application/pdf';
            extension = 'pdf';
        }
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `transactions.${extension}`;
        link.click();
        URL.revokeObjectURL(url);
    };
    const totalRow = (showTotal && isTransactionsTable) ? <tr className="total-row"><td></td><td></td><td></td><td><strong>Total</strong></td><td className={`total-amount ${totalAmount >= 0 ? 'income' : 'expense'}`}>{totalAmount >= 0 ? '+' : '-'}{'₹' + Math.abs(totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td><td></td></tr> : null;
    if (onExportReady) onExportReady.current = exportRows;
    return <><div className="data-table-tools" /><div className="data-table-wrap"><table className="data-table"><thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}<th>Actions</th></tr></thead><tbody>{current.map((row) => <tr key={row._id || row.id}>{columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key] || '-'}</td>)}<td className="table-actions"><button className="table-icon" onClick={() => onEdit?.(row)} aria-label="Edit"><Pencil size={15} /></button><button className="table-icon delete" onClick={() => onDelete?.(row)} aria-label="Delete"><Trash2 size={15} /></button></td></tr>)}{totalRow}</tbody></table>{!current.length && <div className="empty-state">No records found.</div>}</div><div className="pagination"><span>Showing {current.length ? (page - 1) * pageSize + 1 : 0}-{Math.min(page * pageSize, filteredRows.length)} of {filteredRows.length}</span><div><button className="table-icon" disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft size={16} /></button><button className="table-icon" disabled={page === pages} onClick={() => setPage(page + 1)}><ChevronRight size={16} /></button></div></div></>;
}
