import { ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { getStoredUser, isBusinessUser } from '../utils/roles';

// Cached business PDF-template (logo + address from the business_owner).
// Fetched once per page load for business users so owner + staff exports
// share the same neat header; personal users never trigger this call.
let brandingCache = null;
let brandingCacheKey = null;
let brandingPromise = null;
export function clearBusinessBrandingCache(value = null) {
    brandingCache = value;
    brandingCacheKey = value ? brandingKeyFor(getStoredUser()) : null;
    brandingPromise = null;
}
function brandingKeyFor(user) {
    return String(user?.businessOwnerId || user?._id || user?.userName || '');
}
function getBusinessBranding() {
    const user = getStoredUser();
    if (!isBusinessUser(user)) return Promise.resolve(null);
    const key = brandingKeyFor(user);
    if (brandingCache && brandingCacheKey === key) return Promise.resolve(brandingCache);
    if (!brandingPromise) {
        brandingPromise = api.business.profile.get()
            .then((profile) => {
                brandingCache = (profile && profile.branded) ? profile : null;
                brandingCacheKey = key;
                return brandingCache;
            })
            .catch(() => null)
            .finally(() => { brandingPromise = null; });
    }
    return brandingPromise;
}

const REPORT_MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

function formatDayMonthYear(date) {
    return `${date.getDate()} ${REPORT_MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

function formatMonthYear(date) {
    return `${REPORT_MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

function formatLast3MonthsLabel(now = new Date()) {
    // Last 3 calendar months including current month: e.g. Sept 2026 -> July, August, September 2026
    const months = [2, 1, 0].map((offset) => new Date(now.getFullYear(), now.getMonth() - offset, 1));
    const years = new Set(months.map((d) => d.getFullYear()));
    if (years.size === 1) {
        return `${months.map((d) => REPORT_MONTH_NAMES[d.getMonth()]).join(', ')} ${months[0].getFullYear()}`;
    }
    // Year boundary (e.g. Nov 2025, Dec 2025, Jan 2026) -> keep year per month.
    return months.map((d) => formatMonthYear(d)).join(', ');
}

function formatWeekLabel(now = new Date()) {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
        return `${start.getDate()}-${end.getDate()} ${REPORT_MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`;
    }
    if (start.getFullYear() === end.getFullYear()) {
        return `${start.getDate()} ${REPORT_MONTH_NAMES[start.getMonth()]} - ${end.getDate()} ${REPORT_MONTH_NAMES[end.getMonth()]} ${end.getFullYear()}`;
    }
    return `${formatDayMonthYear(start)} - ${formatDayMonthYear(end)}`;
}

function normalizeTypeLabel(typeFilter) {
    const normalized = String(typeFilter || 'All').trim().toLowerCase();
    if (!normalized || normalized === 'all') return 'All Transactions';
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

// Shared by all users/roles: single source for export heading + filename.
// Examples:
//  this-month + All     -> "September 2026 All Transactions Report"
//  last-3-months + Income -> "July, August, September 2026 Income Report"
export function getTransactionReportTitle(dateFilter = 'all', typeFilter = 'All', now = new Date()) {
    const typeLabel = normalizeTypeLabel(typeFilter);
    const isAllTypes = typeLabel === 'All Transactions';
    switch (dateFilter) {
        case 'today':
            return `${formatDayMonthYear(now)} ${typeLabel} Report`;
        case 'this-week':
            return `${formatWeekLabel(now)} ${typeLabel} Report`;
        case 'this-month':
            return `${formatMonthYear(now)} ${typeLabel} Report`;
        case 'last-month': {
            const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            return `${formatMonthYear(d)} ${typeLabel} Report`;
        }
        case 'last-3-months':
            return `${formatLast3MonthsLabel(now)} ${typeLabel} Report`;
        case 'all':
        default:
            if (isAllTypes) return 'All Transactions Report';
            return `All Time ${typeLabel} Report`;
    }
}

// Numbers (optionally signed, currency formatted or a percentage) are right
// aligned in tables and exports; everything else stays left aligned.
const NUMERIC_TEXT = /^[+-]?\s*[₹$€£]?\s*\d[\d,]*(\.\d+)?%?$/;
function isNumericText(value) {
    return NUMERIC_TEXT.test(String(value ?? '').trim());
}

// Split the printable width over columns using each column's label and value
// lengths as weights (min 50pt per column) so a custom table still fits.
function distributeColumnWidths(labels, rows, total) {
    const weights = labels.map((label, index) => {
        const longestValue = rows.reduce((max, row) => Math.max(max, String(row?.[index] ?? '').length), 0);
        return Math.max(String(label).length, Math.min(longestValue, 20), 6);
    });
    const weightTotal = weights.reduce((sum, weight) => sum + weight, 0) || 1;
    const widths = weights.map((weight) => Math.max(50, Math.round((weight / weightTotal) * total)));
    // Push the rounding remainder into the last column so widths add up exactly.
    widths[widths.length - 1] += total - widths.reduce((sum, width) => sum + width, 0);
    return widths;
}

function createPdf(rows, rawTitle = 'Transactions', branding = null, labels = null) {
    const title = String(rawTitle || 'Transactions');
    // Neat business header: logo (left, width set by the owner as a % of the
    // page) + business name + address flush to the right end, only when the
    // owner holds an active *business* subscription plan and has saved the
    // PDF template. Personal users keep the plain heading.
    const header = (branding && branding.branded)
        ? { name: String(branding.businessName || '').trim(), address: String(branding.businessAddress || '').trim(), logo: branding.businessLogo || null, logoWidthPercent: branding.businessLogoWidthPercent }
        : null;
    const hasHeader = Boolean(header && (header.name || header.address || header.logo));
    const escapePdf = (value) =>
        String(value)
            .replace(/\\/g, '\\\\')
            .replace(/\(/g, '\\(')
            .replace(/\)/g, '\\)')
            .replace(/[^\x20-\x7E]/g, '');

    // Rough Helvetica advance width (~0.5em average) - good enough to
    // right-align the business block and centre the report title.
    const estimateTextWidth = (text, size) => String(text).length * size * 0.5;
    const round = (value) => Math.round(value * 100) / 100;
    // Logo width is chosen by the owner as a % of the PDF page width
    // (US Letter = 612pt). Clamp so a bad value can't break the header.
    const requestedLogoWidth = Number(header && header.logoWidthPercent);
    const logoWidthPercent = Number.isFinite(requestedLogoWidth) && requestedLogoWidth > 0
        ? Math.min(25, requestedLogoWidth)
        : 8;

    // Same order as XL / Word / UI table. Custom tables (e.g. the business
    // Overall Report) pass their own column labels instead.
    const headers = (Array.isArray(labels) && labels.length)
        ? labels.map((label) => String(label))
        : ['Type', 'Category', 'Date', 'Description', 'Amount'];
    const isCustomTable = (Array.isArray(labels) && labels.length > 0);

    const pageWidth = 612;
    const pageHeight = 792;

    const tableLeft = 36;
    const tableRight = 576;
    const tableWidth = tableRight - tableLeft;

    // Total = 540 for the transactions table; custom tables split the same
    // width in proportion to their labels and values.
    const columnWidths = isCustomTable
        ? distributeColumnWidths(headers, rows, tableWidth)
        : [
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
    // Branded business header sits above the report title, so the table
    // starts lower to keep a neat gap (title baseline 690 -> top border 672).
    const tableTop = hasHeader ? 672 : 755;
    const bottomMargin = 45;

    const rowsPerPage = Math.floor(
        (tableTop - bottomMargin) / rowHeight
    );

    // Split rows into pages
    const pdfPages = [];

    for (let i = 0; i < rows.length; i += rowsPerPage - 1) {
        pdfPages.push(rows.slice(i, i + rowsPerPage - 1));
    }

    if (!pdfPages.length) {
        pdfPages.push([]);
    }

    const createPageContent = (pageRows, pageTitle) => {
        const content = [];
        let titleY = 770;
        if (hasHeader) {
            content.push('0.75 w');
            content.push('0.55 0.55 0.55 RG');
            content.push(`${tableLeft} 706 m ${tableRight} 706 l S`);
            content.push('0 0 0 RG');

            // Logo sits on the left edge; width = owner-defined % of the page
            // width, height follows the image aspect ratio.
            let logoWidth = 0;
            let logoHeight = 0;
            if (header.logo && logoImage) {
                logoWidth = pageWidth * (logoWidthPercent / 100);
                logoHeight = logoWidth * (logoImage.height / logoImage.width);
                // Keep very tall logos inside the band above the divider.
                const maxLogoHeight = 68;
                if (logoHeight > maxLogoHeight) {
                    logoHeight = maxLogoHeight;
                    logoWidth = logoHeight * (logoImage.width / logoImage.height);
                }
            }
            // Text block never runs into the logo.
            const textLeftLimit = tableLeft + logoWidth + 12;
            const fitToWidth = (text, size) => {
                let value = String(text);
                while (value.length > 1 && tableRight - estimateTextWidth(value, size) < textLeftLimit) {
                    value = value.slice(0, -1);
                }
                return value;
            };

            // Business name + address aligned to the right end of the header.
            let cursorY = 762;
            if (header.name) {
                const name = fitToWidth(header.name.slice(0, 60), 13);
                content.push('BT');
                content.push('/F1 13 Tf');
                content.push(`1 0 0 1 ${round(tableRight - estimateTextWidth(name, 13))} ${cursorY} Tm`);
                content.push(`(${escapePdf(name)}) Tj`);
                content.push('ET');
                cursorY -= 14;
            }
            if (header.address) {
                const lines = header.address.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 3);
                content.push('BT');
                content.push('/F1 8 Tf');
                content.push('0.35 0.35 0.35 rg');
                lines.forEach((line, i) => {
                    const text = fitToWidth(line.slice(0, 80), 8);
                    const y = cursorY - (i * 10);
                    content.push(`1 0 0 1 ${round(tableRight - estimateTextWidth(text, 8))} ${y} Tm`);
                    content.push(`(${escapePdf(text)}) Tj`);
                });
                content.push('ET');
                content.push('0 0 0 rg');
            }
            if (logoWidth) {
                // Vertically centred in the band between the divider and the
                // top of the page (706 -> 792).
                const logoY = Math.min(786 - logoHeight, Math.max(708, 744 - (logoHeight / 2)));
                content.push(`q ${round(logoWidth)} 0 0 ${round(logoHeight)} ${tableLeft} ${round(logoY)} cm /Logo Do Q`);
            }
            titleY = 690;
        }

        // -----------------------------
        // PDF Heading (dynamic report title, e.g. "September 2026 All Transactions Report")
        // -----------------------------
        const headingSize = pageTitle.length > 42 ? 12 : 14;
        // Export-filter summary (e.g. "September 2026 All Transactions Report")
        // centred across the page.
        const titleWidth = estimateTextWidth(pageTitle, headingSize);
        const titleX = Math.max(tableLeft, (pageWidth - titleWidth) / 2);
        content.push('BT');
        content.push(`/F1 ${headingSize} Tf`);
        content.push(`1 0 0 1 ${round(titleX)} ${titleY} Tm`);
        content.push(`(${escapePdf(pageTitle)}) Tj`);
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

                // Truncate to whatever fits inside the column.
                const maxChars = Math.max(
                    4,
                    Math.floor((columnWidths[columnIndex] - 12) / 5.2)
                );
                text = text.slice(0, maxChars);

                // -----------------------------
                // Numbers (amounts, counts) = Right aligned
                // -----------------------------
                if (isNumericText(text)) {

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
    // PDF Objects (binary-safe: logo JPEG bytes ride as latin1 chars)
    // -----------------------------
    const byteLength = (str) => {
        if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str).length;
        return str.length;
    };
    const toBinary = (bytes) => {
        let s = '';
        for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
        return s;
    };
    function jpegSizeAndBody(dataUrl) {
        try {
            const base64 = String(dataUrl).split(',')[1] || '';
            const bin = atob(base64);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            // Scan JPEG SOF markers for width/height.
            let width = 0;
            let height = 0;
            for (let i = 0; i < bytes.length - 1; i++) {
                if (bytes[i] !== 0xFF) continue;
                const marker = bytes[i + 1];
                if (marker === 0xD8 || marker === 0xD9 || (marker >= 0xD0 && marker <= 0xD7) || marker === 0x01) continue;
                if (i + 3 >= bytes.length) break;
                const len = (bytes[i + 2] << 8) + bytes[i + 3];
                if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
                    height = (bytes[i + 5] << 8) + bytes[i + 6];
                    width = (bytes[i + 7] << 8) + bytes[i + 8];
                    break;
                }
                i += len;
            }
            return { width: width || 1, height: height || 1, body: toBinary(bytes) };
        } catch {
            return null;
        }
    }

    // Parse JPEG bytes before any page content is generated;
    // createPageContent() closes over logoImage (declared here, invoked later).
    const logoImage = hasHeader && header.logo ? jpegSizeAndBody(header.logo) : null;

    const objects = [];

    // Catalog
    objects.push(
        '<< /Type /Catalog /Pages 2 0 R >>'
    );

    // Pages
    const logoObjectNumber = logoImage ? (4 + (pdfPages.length * 2)) : null;
    const pageObjectRefs = [];

    pdfPages.forEach((_, index) => {
        const pageObjectNumber =
            4 + (index * 2);

        pageObjectRefs.push(
            `${pageObjectNumber} 0 R`
        );
    });

    objects.push(
        `<< /Type /Pages /Kids [${pageObjectRefs.join(' ')}] /Count ${pdfPages.length} >>`
    );

    // Font
    objects.push(
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
    );

    // Pages
    pdfPages.forEach((pageRows, index) => {

        const pageObjectNumber =
            4 + (index * 2);

        const contentObjectNumber =
            pageObjectNumber + 1;

        const stream =
            createPageContent(pageRows, title);

        // Page object
        objects.push(
            `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R >>${logoImage ? ` /XObject << /Logo ${logoObjectNumber} 0 R >>` : ''} >> /Contents ${contentObjectNumber} 0 R >>`
        );

        // Content object
        objects.push(
            `<< /Length ${byteLength(stream)} >>
stream
${stream}
endstream`
        );
    });

    if (logoImage) {
        // /Length must match the latin1 byte count: exportRows encodes the
        // final string via charCodeAt & 0xFF (1 char -> 1 byte).
        objects.push(
            `<< /Type /XObject /Subtype /Image /Width ${logoImage.width} /Height ${logoImage.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logoImage.body.length} >>\nstream\n${logoImage.body}\nendstream`
        );
    }

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
export default function DataTable({ columns, rows, onEdit, onDelete, pageSize = 8, dateFilter = 'all', typeFilter = 'All', onExportReady, showTotal = false, exportTitle = '' }) {
    const [page, setPage] = useState(1);
    // Read-only tables (no handlers) skip the Actions column entirely.
    const showActions = Boolean(onEdit || onDelete);
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
        // Last 3 calendar months including current month (Sep 2026 -> Jul, Aug, Sep).
        if (dateFilter === 'last-3-months') start = new Date(year, month - 2, 1);
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
    const exportRows = async (format) => {
        const reportTitle = exportTitle || (isTransactionsTable ? getTransactionReportTitle(dateFilter, typeFilter) : 'Transactions Report');
        const fileBase = reportTitle.replace(/[\\/:*?"<>|]/g, '').trim() || 'Transactions Report';
        const data = isTransactionsTable
            ? filteredRows.map((row) => [row.type, row.category, new Date(row.date).toLocaleDateString('en-IN'), row.description || row.title || '', Number(row.amount || 0).toFixed(2)])
            : filteredRows.map((row) => columns.map((column) => String(column.exportValue ? column.exportValue(row) : (row[column.key] ?? ''))));
        if (isTransactionsTable) data.push(['', '', '', 'Total', (totalAmount >= 0 ? '+' : '') + totalAmount.toFixed(2)]);
        const escapeHtml = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        // Transactions keep their fixed column styling; custom tables right-align
        // numeric cells (income, expenses, balance) and leave text left.
        const exportHeaders = isTransactionsTable
            ? ['Type', 'Category', 'Date', 'Description', 'Amount']
            : columns.map((column) => column.label);
        const cellStyleFor = (value, index) => {
            if (isTransactionsTable) {
                if (index === 2) return 'mso-number-format:\\@;width:100px;';
                if (index === 3) return 'width:180px;';
                if (index === 4) return 'width:90px;text-align:right;';
                return '';
            }
            return isNumericText(value) ? 'text-align:right;' : '';
        };
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
            ${exportHeaders.map((header) => `
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
                    <td style="padding:6px;${cellStyleFor(value, index)}">
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
            content = `<html><head><meta charset="utf-8"></head><body><h2 style="text-align:center">${escapeHtml(reportTitle)}</h2>${table}</body></html>`;
            type = 'application/vnd.ms-excel';
            extension = 'xls';
        } else if (format === 'word') {
            content = `<html><head><meta charset="utf-8"><style>table{border-collapse:collapse}th,td{border:1px solid #999;padding:6px}th{background:#e3f2eb}</style></head><body><h2 style="text-align:center">${escapeHtml(reportTitle)}</h2>${table}</body></html>`;
            type = 'application/msword';
            extension = 'doc';
        } else {
            // PDF only: every export gets the neat logo + address letterhead
            // from the owner's PDF template (owner and staff share it) when the
            // account holds an active business plan. That includes custom
            // tables such as the business Overall Report, so its PDF carries
            // the same header section as the transactions report; personal
            // users (and unbranded businesses) get a plain PDF.
            const branding = await getBusinessBranding();
            const pdfString = createPdf(data, reportTitle, branding, isTransactionsTable ? null : columns.map((column) => column.label));
            const bytes = new Uint8Array(pdfString.length);
            for (let i = 0; i < pdfString.length; i++) bytes[i] = pdfString.charCodeAt(i) & 0xFF;
            const blob = new Blob([bytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${fileBase}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
            return;
        }
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${fileBase}.${extension}`;
        link.click();
        URL.revokeObjectURL(url);
    };
    const totalRow = (showTotal && isTransactionsTable) ? <tr className="total-row"><td></td><td></td><td></td><td><strong>Total</strong></td><td className={`total-amount ${totalAmount >= 0 ? 'income' : 'expense'}`}>{totalAmount >= 0 ? '+' : '-'}{'₹' + Math.abs(totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td><td></td></tr> : null;
    if (onExportReady) onExportReady.current = exportRows;
    return <><div className="data-table-tools" /><div className="data-table-wrap"><table className="data-table"><thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}{showActions && <th>Actions</th>}</tr></thead><tbody>{current.map((row) => <tr key={row._id || row.id}>{columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key] || '-'}</td>)}{showActions && <td className="table-actions"><button className="table-icon" onClick={() => onEdit?.(row)} aria-label="Edit"><Pencil size={15} /></button><button className="table-icon delete" onClick={() => onDelete?.(row)} aria-label="Delete"><Trash2 size={15} /></button></td>}</tr>)}{totalRow}</tbody></table>{!current.length && <div className="empty-state">No records found.</div>}</div><div className="pagination"><span>Showing {current.length ? (page - 1) * pageSize + 1 : 0}-{Math.min(page * pageSize, filteredRows.length)} of {filteredRows.length}</span><div><button className="table-icon" disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft size={16} /></button><button className="table-icon" disabled={page === pages} onClick={() => setPage(page + 1)}><ChevronRight size={16} /></button></div></div></>;
}
