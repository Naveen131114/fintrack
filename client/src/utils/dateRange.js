function formatDateInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function getDefaultDateRange(now = new Date()) {
    return {
        startDate: formatDateInput(new Date(now.getFullYear(), now.getMonth(), 1)),
        endDate: formatDateInput(now)
    };
}

export function parseDateInput(value) {
    if (!value) return null;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return date;
}

export function isDateInRange(value, startDate, endDate) {
    if (startDate && endDate && startDate > endDate) return false;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;

    const start = parseDateInput(startDate);
    const end = parseDateInput(endDate);
    if ((startDate && !start) || (endDate && !end)) return false;
    if (end) end.setDate(end.getDate() + 1);

    return (!start || date >= start) && (!end || date < end);
}
