import Transaction from '../models/Transaction.js';
import BankAccount from '../models/BankAccount.js';
import UpiAccount from '../models/UpiAccount.js';
import ActivityLog from '../models/ActivityLog.js';
import { assertBranchAccess, branchFilter, isBusinessUser, ownerIdFor } from '../middleware/businessAccess.js';

async function validateBusinessTransaction(req, payload, existing) {
    if (!isBusinessUser(req.user)) return payload;
    const ownerId = ownerIdFor(req.user);
    const branchId = payload.branchId || existing?.branchId;
    await assertBranchAccess(req.user, branchId);
    const paymentType = payload.paymentType || existing?.paymentType;
    if (!['Cash', 'Bank', 'UPI'].includes(paymentType)) throw Object.assign(new Error('Payment type is required'), { status: 400 });
    payload.businessOwnerId = ownerId; payload.branchId = branchId; payload.paymentType = paymentType;
    if (paymentType === 'Bank') {
        if (!payload.bankAccountId) throw Object.assign(new Error('Bank account is required'), { status: 400 });
        if (!await BankAccount.exists({ _id: payload.bankAccountId, businessOwnerId: ownerId, status: 'active' })) throw Object.assign(new Error('Invalid bank account'), { status: 400 });
        payload.upiAccountId = undefined; payload.transactionNumber = undefined;
    } else if (paymentType === 'UPI') {
        if (!payload.upiAccountId || !payload.transactionNumber?.trim()) throw Object.assign(new Error('UPI account and transaction number are required'), { status: 400 });
        if (!await UpiAccount.exists({ _id: payload.upiAccountId, businessOwnerId: ownerId, status: 'active' })) throw Object.assign(new Error('Invalid UPI account'), { status: 400 });
        payload.bankAccountId = undefined;
    } else { payload.bankAccountId = undefined; payload.upiAccountId = undefined; payload.transactionNumber = undefined; }
    return payload;
}
async function audit(req, action, transaction, changes) { if (req.user.role === 'business_staff') await ActivityLog.create({ businessOwnerId: req.user.businessOwnerId, staffUserId: req.user.id, action, module: 'transaction', recordId: transaction._id, description: `${req.user.userName} ${action} transaction`, changes }); }

export async function listTransactions(req, res, next) 
{
     try 
    { const filter = isBusinessUser(req.user) ? branchFilter(req.user, req.query.branchId) : { userId: req.user.id }; const transactions = await Transaction.find(filter).sort({ date: -1 }); 
    res.json(transactions); } 
    catch (error) { 
        next(error); } 
    }
export async function createTransaction(req, res, next) { try { const payload = { ...req.body, userId: req.user.id, title: req.body.title?.trim() || req.body.description?.trim() }; await validateBusinessTransaction(req, payload); const transaction = await Transaction.create(payload); await audit(req, 'create', transaction); res.status(201).json(transaction); } catch (error) { next(error); } }
export async function updateTransaction(req, res, next) { try { const filter = isBusinessUser(req.user) ? { _id: req.params.id, ...branchFilter(req.user) } : { _id: req.params.id, userId: req.user.id }; const transaction = await Transaction.findOne(filter); if (!transaction) return res.status(404).json({ message: 'Transaction not found' }); const payload = await validateBusinessTransaction(req, { ...req.body }, transaction); Object.assign(transaction, payload); await transaction.save(); await audit(req, 'update', transaction, payload); res.json(transaction); } catch (error) { next(error); } }
export async function deleteTransaction(req, res, next) { try { const filter = isBusinessUser(req.user) ? { _id: req.params.id, ...branchFilter(req.user) } : { _id: req.params.id, userId: req.user.id }; const transaction = await Transaction.findOneAndDelete(filter); if (!transaction) return res.status(404).json({ message: 'Transaction not found' }); await audit(req, 'delete', transaction); res.status(204).end(); } catch (error) { next(error); } }
