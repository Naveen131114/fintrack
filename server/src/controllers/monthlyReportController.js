import MonthlyReport from '../models/MonthlyReport.js';
import { assertBranchAccess, branchFilter, dataOwnerIdFor, isBusinessUser } from '../middleware/businessAccess.js';

const OBJECT_ID = /^[a-f\d]{24}$/i;

// Body -> validated report payload. Balance / profit-or-loss are derived at
// read time so they always follow income - expenses.
function parseReport(body = {}) {
    const month = String(body.month || '').trim();
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
        throw Object.assign(new Error('Month is required and must be in YYYY-MM format'), { status: 400 });
    }
    const clientsCount = Number(body.clientsCount);
    const income = Number(body.income);
    const expenses = Number(body.expenses);
    if (![clientsCount, income, expenses].every((value) => Number.isFinite(value))) {
        throw Object.assign(new Error('No. of business/clients, income and expenses must be numbers'), { status: 400 });
    }
    if (clientsCount < 0 || income < 0 || expenses < 0) {
        throw Object.assign(new Error('No. of business/clients, income and expenses cannot be negative'), { status: 400 });
    }
    // Branch is optional so rows saved before branch support keep working;
    // saveReport proves it belongs to this business.
    const rawBranchId = String(body.branchId || '').trim();
    if (rawBranchId && !OBJECT_ID.test(rawBranchId)) {
        throw Object.assign(new Error('Selected branch is not valid'), { status: 400 });
    }
    return { month, branchId: rawBranchId || null, clientsCount, income, expenses };
}

export async function listReports(req, res, next) {
    try {
        const filter = { userId: dataOwnerIdFor(req.user) };
        // Same branch scoping as transactions: the Analytics branch filter
        // (?branchId=...) narrows the list, "ALL" keeps every branch, and staff
        // can only ever see the branches they are allowed to use.
        if (isBusinessUser(req.user)) {
            const scope = branchFilter(req.user, req.query.branchId);
            if (scope.branchId) filter.branchId = scope.branchId;
        }
        const reports = await MonthlyReport.find(filter).sort({ month: -1 });
        res.json(reports);
    } catch (error) {
        next(error);
    }
}

// One row per month PER BRANCH: saving a month + branch that already exists
// updates it instead of creating a duplicate.
export async function saveReport(req, res, next) {
    try {
        const payload = parseReport(req.body || {});
        const userId = dataOwnerIdFor(req.user);
        // The branch must belong to this business (staff cannot reach here:
        // the route is guarded by requireDataWrite).
        if (payload.branchId) await assertBranchAccess(req.user, payload.branchId);
        const existing = await MonthlyReport.findOne({ userId, month: payload.month, branchId: payload.branchId });
        if (existing) {
            Object.assign(existing, payload);
            await existing.save();
            return res.json(existing);
        }
        const report = await MonthlyReport.create({ ...payload, userId });
        res.status(201).json(report);
    } catch (error) {
        next(error);
    }
}

export async function deleteReport(req, res, next) {
    try {
        const report = await MonthlyReport.findOneAndDelete({ _id: req.params.id, userId: dataOwnerIdFor(req.user) });
        if (!report) return res.status(404).json({ message: 'Report not found' });
        res.status(204).end();
    } catch (error) {
        next(error);
    }
}
