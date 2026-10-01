import mongoose from 'mongoose';
import ActivityLog from '../models/ActivityLog.js';
import BankAccount from '../models/BankAccount.js';
import Branch from '../models/Branch.js';
import Budget from '../models/Budget.js';
import CategoryMaster from '../models/CategoryMaster.js';
import ChangeRequest from '../models/ChangeRequest.js';
import MonthlyReport from '../models/MonthlyReport.js';
import Notification from '../models/Notification.js';
import Target from '../models/Target.js';
import Transaction from '../models/Transaction.js';
import TypeMaster from '../models/TypeMaster.js';
import UpiAccount from '../models/UpiAccount.js';
import User, { GRANT_HOURS } from '../models/User.js';
import { canPerform, ownerIdFor } from '../middleware/businessAccess.js';

// "Request approval" workflow - see the ChangeRequest model.
// ---------------------------------------------------------------------------
// Staff who can READ a record but not change it file a request instead of
// hitting a 403 wall. The owner (or a staff member who already holds that right)
// approves it, which hands out a short-lived grant for exactly that
// module + action. The requester then makes the change themselves, so data is
// always written by the person who has to live with it.
const ACTIONS = ['create', 'edit', 'delete'];

// Every module the workflow understands: how to find the record it is about and
// how to describe it in the approver's inbox.
const MODULES = {
    // A transaction's TENANT is businessOwnerId; `userId` is only whoever
    // entered the row (staff post under their own id), so scoping lookups by
    // userId alone 404s every request raised on a staff-entered transaction.
    transactions: { model: Transaction, scopeFields: ['businessOwnerId', 'userId'], label: 'Transaction', nameFields: ['title', 'category', 'notes'] },
    types: { model: TypeMaster, ownerField: 'userId', label: 'Type', nameFields: ['typeName', 'name'] },
    categories: { model: CategoryMaster, ownerField: 'userId', label: 'Category', nameFields: ['categoryName', 'name', 'category'] },
    budgets: { model: Budget, ownerField: 'userId', label: 'Budget', nameFields: ['month'] },
    targets: { model: Target, ownerField: 'userId', label: 'Target', nameFields: ['month'] },
    monthlyReports: { model: MonthlyReport, ownerField: 'userId', label: 'Monthly report', nameFields: ['month'] },
    branches: { model: Branch, ownerField: 'businessOwnerId', label: 'Branch', nameFields: ['branchName', 'name'] },
    bankAccounts: { model: BankAccount, ownerField: 'businessOwnerId', label: 'Bank account', nameFields: ['bankName', 'accountName'] },
    upiAccounts: { model: UpiAccount, ownerField: 'businessOwnerId', label: 'UPI account', nameFields: ['upiId'] }
};

function describe(module, record) {
    const config = MODULES[module] || {};
    const name = (config.nameFields || [])
        .map((field) => record?.[field])
        .find((value) => typeof value === 'string' && value.trim());
    return name ? `${config.label} - ${name.trim()}` : (config.label || module);
}

function actionPhrase(action, module) {
    const noun = `${(MODULES[module]?.label || module).toLowerCase()}s`;
    if (action === 'create') return `add new ${noun}`;
    if (action === 'delete') return `delete ${noun}`;
    return `edit ${noun}`;
}

// A record can only be the target of a request when it belongs to the same
// business - otherwise a request would be a way to probe other tenants' ids.
async function findRecord(module, recordId, ownerId) {
    if (!mongoose.isValidObjectId(recordId)) return undefined;
    const config = MODULES[module];
    if (!config) return undefined;
    // `scopeFields` defaults to the module's single owner field; a module may
    // name more when the tenant can be recorded under more than one column.
    const scope = config.scopeFields || [config.ownerField];
    return config.model.findOne({ _id: recordId, $or: scope.map((field) => ({ [field]: ownerId })) });
}

export async function createChangeRequest(req, res, next) {
    try {
        const { module, action } = req.body;
        const reason = String(req.body.reason || '').trim();
        if (!MODULES[module]) return res.status(400).json({ message: 'Unknown module' });
        if (!ACTIONS.includes(action)) return res.status(400).json({ message: 'Unknown action' });
        if (!reason) return res.status(400).json({ message: 'Add a short reason so the owner knows what you need it for' });
        if (reason.length > 500) return res.status(400).json({ message: 'Reason must be 500 characters or less' });
        if (req.user.role !== 'business_staff') return res.status(400).json({ message: 'Your account does not need approval for this action' });
        // "Already allowed" is answered for THE record when the request names
        // one: a grant for row A must not block asking about row B.
        if (canPerform(req.user, action, module, req.body.recordId || null)) return res.status(400).json({ message: 'You are already allowed to do this' });
        if (!canPerform(req.user, 'view', module)) return res.status(403).json({ message: 'You can only request changes to records you are allowed to see' });

        const ownerId = ownerIdFor(req.user);
        const isCreate = action === 'create';
        let record = null;
        if (!isCreate) {
            if (!mongoose.isValidObjectId(req.body.recordId)) return res.status(400).json({ message: 'Select the record you want to change' });
            record = await findRecord(module, req.body.recordId, ownerId);
            if (!record) return res.status(404).json({ message: 'That record is not part of your business' });
        }

        const duplicate = await ChangeRequest.findOne({
            requestedBy: req.user.id,
            module,
            action,
            recordId: isCreate ? null : req.body.recordId,
            status: 'pending'
        });
        if (duplicate) return res.status(409).json({ message: 'You already have a request waiting for approval', request: duplicate });

        const recordLabel = isCreate ? describe(module, null) : describe(module, record);
        const request = await ChangeRequest.create({
            businessOwnerId: ownerId,
            requestedBy: req.user.id,
            module,
            action,
            recordId: isCreate ? null : req.body.recordId,
            recordLabel,
            branchId: record?.branchId || req.body.branchId || undefined,
            payload: req.body.payload ?? (isCreate ? null : record?.toObject?.()),
            reason,
            status: 'pending'
        });

        await Notification.create({
            userId: ownerId,
            businessOwnerId: ownerId,
            type: 'change_request',
            title: `${req.user.userName} asked to ${actionPhrase(action, module)}`,
            message: `${recordLabel}: ${reason}`,
            changeRequestId: request._id,
            actorId: req.user.id
        });
        try {
            await ActivityLog.create({ businessOwnerId: ownerId, staffUserId: req.user.id, action: `request_${action}`, module, recordId: request._id, description: `${req.user.userName} requested approval to ${actionPhrase(action, module)}` });
        } catch { /* the audit trail is best effort */ }

        res.status(201).json(request);
    } catch (error) {
        next(error);
    }
}

// The approver inbox. Owners see every request of their business; staff who
// already hold the right being asked for see the ones they can decide (never
// their own). `scope=mine` switches to the requester's own history.
export async function listChangeRequests(req, res, next) {
    try {
        const ownerId = ownerIdFor(req.user);
        const mine = req.query.scope === 'mine';
        const status = ['pending', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : 'pending';
        const filter = { businessOwnerId: ownerId, status };
        if (mine) filter.requestedBy = req.user.id;
        else if (req.user.role !== 'business_owner') filter.requestedBy = { $ne: req.user.id };

        const requests = await ChangeRequest.find(filter)
            .sort({ createdAt: -1 })
            .limit(200)
            .populate('requestedBy', 'name userName')
            .populate('decidedBy', 'name userName');

        const visible = mine || req.user.role === 'business_owner'
            ? requests
            : requests.filter((request) => canPerform(req.user, request.action, request.module));
        res.json(visible);
    } catch (error) {
        next(error);
    }
}

async function decide(req, res, approve) {
    const request = await ChangeRequest.findById(req.params.id);
    if (!request) return { status: 404, body: { message: 'Request not found' } };

    const ownerId = ownerIdFor(req.user);
    if (String(request.businessOwnerId) !== String(ownerId)) return { status: 403, body: { message: 'This request belongs to a different business' } };
    if (String(request.requestedBy) === String(req.user.id)) return { status: 403, body: { message: 'You cannot decide your own request' } };
    // Handing out a right you do not hold yourself would defeat the whole point.
    if (req.user.role !== 'business_owner' && !canPerform(req.user, request.action, request.module)) {
        return { status: 403, body: { message: 'You cannot approve a change you are not allowed to make' } };
    }
    if (request.status !== 'pending') return { status: 409, body: { message: `This request was already ${request.status}` } };

    const requester = await User.findOne({ _id: request.requestedBy, businessOwnerId: ownerId, role: 'business_staff' });
    if (!requester) return { status: 404, body: { message: 'That staff member is no longer part of this business' } };

    const note = String(req.body.note || '').trim();
    request.status = approve ? 'approved' : 'rejected';
    request.decidedBy = req.user.id;
    request.decidedAt = new Date();
    request.decisionNote = note;

    if (approve) {
        const expiresAt = new Date(Date.now() + GRANT_HOURS * 60 * 60 * 1000);
        request.grantExpiresAt = expiresAt;
        // One live grant per target: re-approving refreshes that window instead
        // of piling up identical entries - and approving row B must not drop the
        // grant row A is still using.
        const sameTarget = (grant) => grant.module === request.module
            && grant.action === request.action
            && String(grant.recordId || '') === String(request.recordId || '');
        const kept = (requester.permissionsGrant || []).filter((grant) => !sameTarget(grant));
        kept.push({
            module: request.module,
            action: request.action,
            recordId: request.recordId || undefined,
            changeRequestId: request._id,
            approvedBy: req.user.id,
            expiresAt
        });
        requester.permissionsGrant = kept;
        await requester.save();
    }
    await request.save();

    const phrase = actionPhrase(request.action, request.module);
    await Notification.create({
        userId: requester._id,
        businessOwnerId: ownerId,
        type: 'change_request_decision',
        title: approve ? `Approved: you can now ${phrase}` : `Declined: ${phrase}`,
        message: approve
            ? `${request.recordLabel || request.module} - you have ${GRANT_HOURS} hours to make the change.${note ? ` Note: ${note}` : ''}`
            : `${request.recordLabel || request.module}.${note ? ` Reason: ${note}` : ''}`,
        changeRequestId: request._id,
        actorId: req.user.id
    });
    try {
        await ActivityLog.create({ businessOwnerId: ownerId, staffUserId: req.user.id, action: approve ? 'approve_request' : 'reject_request', module: request.module, recordId: request._id, description: `${req.user.userName} ${approve ? 'approved' : 'rejected'} ${requester.userName}'s request to ${phrase}` });
    } catch { /* the audit trail is best effort */ }

    const populated = await request.populate([
        { path: 'requestedBy', select: 'name userName' },
        { path: 'decidedBy', select: 'name userName' }
    ]);
    return { status: 200, body: populated };
}

async function decideRoute(req, res, next, approve) {
    try {
        const result = await decide(req, res, approve);
        res.status(result.status).json(result.body);
    } catch (error) {
        next(error);
    }
}

export function approveChangeRequest(req, res, next) { return decideRoute(req, res, next, true); }
export function rejectChangeRequest(req, res, next) { return decideRoute(req, res, next, false); }

// Lets a requester withdraw something that is still waiting.
export async function cancelChangeRequest(req, res, next) {
    try {
        const request = await ChangeRequest.findOneAndDelete({ _id: req.params.id, requestedBy: req.user.id, status: 'pending' });
        if (!request) return res.status(404).json({ message: 'Only your own pending requests can be withdrawn' });
        res.status(204).end();
    } catch (error) {
        next(error);
    }
}

// Badge counts: what is waiting on me, and what I am waiting for.
export async function pendingRequestCount(req, res, next) {
    try {
        const ownerId = ownerIdFor(req.user);
        const mine = await ChangeRequest.countDocuments({ requestedBy: req.user.id, status: 'pending' });
        const inbox = req.user.role === 'business_owner'
            ? await ChangeRequest.countDocuments({ businessOwnerId: ownerId, status: 'pending' })
            : 0;
        res.json({ mine, inbox });
    } catch (error) {
        next(error);
    }
}



