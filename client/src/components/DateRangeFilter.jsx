export default function DateRangeFilter({ startDate, endDate, onStartDateChange, onEndDateChange }) {
    const invalidRange = startDate && endDate && startDate > endDate;

    return <div className="date-range-filter" aria-label="Filter by date range">
        <label>
            {/* <span>Start date</span> */}
            <input type="date" value={startDate} onChange={(event) => onStartDateChange(event.target.value)} />
        </label>
        <label>
            {/* <span>End date</span> */}
            <input type="date" value={endDate} onChange={(event) => onEndDateChange(event.target.value)} />
        </label>
        {invalidRange && <span className="date-range-error" role="alert">Start date must be on or before end date.</span>}
    </div>;
}
