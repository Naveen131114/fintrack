import bcrypt from 'bcryptjs';
import Branch from '../models/Branch.js';
import BankAccount from '../models/BankAccount.js';
import UpiAccount from '../models/UpiAccount.js';
import ActivityLog from '../models/ActivityLog.js';
import Subscription from '../models/Subscription.js';
import Transaction from '../models/Transaction.js';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { ownerIdFor } from '../middleware/businessAccess.js';

// allowedBranches must always be an array of Branch ObjectIds.
// The frontend branch selector sends an array, but older/generic forms may send a
// stringified value such as "[ '1' ]". Normalize here so a bad payload returns a
// clear 400 instead of `User validation failed ... Cast to [ObjectId] failed`.
function normalizeBranchIds(value) {
    let arr = value;
    if (typeof arr === 'string') {
        const text = arr.trim();
        if (!text) return [];
        try {
            arr = JSON.parse(text.replace(/'/g, '"'));
        } catch {
            arr = text.replace(/^\[|\]$/g, '').split(',');
        }
    }
    if (!Array.isArray(arr)) return null;
    return arr.map((entry) => String(entry?._id ?? entry ?? '').trim()).filter(Boolean);
}

const resources = { branches: Branch, bankAccounts: BankAccount, upiAccounts: UpiAccount };
const ifsc = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const upi = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/;
async function planFor(owner) { return owner.subscriptionPlan ? Subscription.findOne({ planName: owner.subscriptionPlan, status: 'active' }) : null; }
async function checkLimit(ownerId, model, field, label) {
    const owner = await User.findById(ownerId); const plan = await planFor(owner);
    if (!plan || plan[field] <= 0) throw Object.assign(new Error(`Your subscription does not include ${label}. Please upgrade your plan.`), { status: 403 });
    if (await model.countDocuments({ businessOwnerId: ownerId, ...(model === User ? { status: 'active', role: 'business_staff' } : { status: 'active' }) }) >= plan[field]) throw Object.assign(new Error(`You have reached the maximum number of ${label} allowed by your current subscription plan. Please upgrade your plan.`), { status: 403 });
}
export async function listResource(req, res, next) {
    try {
        const Model = resources[req.params.resource];
        if (!Model) return res.status(404).end();
        const filter = { businessOwnerId: ownerIdFor(req.user) };
        // Staff may only list the branches the owner assigned to them.
        if (req.params.resource === 'branches' && req.user.role === 'business_staff') filter._id = { $in: req.user.allowedBranches || [] };
        res.json(await Model.find(filter).sort({ createdAt: -1 }));
    } catch (e) { next(e); }
}
export async function createResource(req, res, next) { try { const Model = resources[req.params.resource]; const ownerId = ownerIdFor(req.user); if (req.params.resource === 'branches') await checkLimit(ownerId, Branch, 'maxBranches', 'branches'); if (req.params.resource === 'bankAccounts' && (!/^\d{6,24}$/.test(String(req.body.accountNumber || '')) || !ifsc.test(String(req.body.ifscCode || '').toUpperCase()))) return res.status(400).json({ message: 'Enter a valid account number and IFSC code' }); if (req.params.resource === 'upiAccounts' && !upi.test(String(req.body.upiId || ''))) return res.status(400).json({ message: 'Enter a valid UPI ID' }); res.status(201).json(await Model.create({ ...req.body, businessOwnerId: ownerId })); } catch (e) { next(e); } }
export async function updateResource(req, res, next) { try { const Model = resources[req.params.resource]; const item = await Model.findOneAndUpdate({ _id: req.params.id, businessOwnerId: ownerIdFor(req.user) }, req.body, { new: true, runValidators: true }); if (!item) return res.status(404).json({ message: 'Record not found' }); res.json(item); } catch (e) { next(e); } }
export async function removeResource(req, res, next) { try { const Model = resources[req.params.resource]; const filter = { _id: req.params.id, businessOwnerId: ownerIdFor(req.user) }; if (req.params.resource === 'branches' && await Transaction.exists({ branchId: req.params.id })) return res.status(409).json({ message: 'This branch has transactions and cannot be deleted. Deactivate it instead.' }); const item = await Model.findOneAndDelete(filter); if (!item) return res.status(404).json({ message: 'Record not found' }); res.status(204).end(); } catch (e) { next(e); } }
export async function listStaff(req, res, next) { try { const staff = await User.find({ businessOwnerId: ownerIdFor(req.user), role: 'business_staff' }).populate('allowedBranches', 'branchName status').select('-password -refreshToken').sort({ createdAt: -1 }); res.json(staff); } catch (e) { next(e); } }
export async function createStaff(req, res, next) {
    try {
        if (req.user.role !== 'business_owner') return res.status(403).json({ message: 'Only a business owner can manage staff' });
        const owner = await User.findById(ownerIdFor(req.user));
        const ownerId = owner._id;
        await checkLimit(ownerId, User, 'maxStaff', 'staff');
        const { name, userName, emailId, password, phoneNumber, permissionLevel, subscriptionPlan } = req.body;
        const branchIds = normalizeBranchIds(req.body.allowedBranches);
        if (!name || !userName || !emailId || !password || !['view', 'edit', 'full'].includes(permissionLevel)) return res.status(400).json({ message: 'Name, username, email, password and permission level are required' });
        if (!branchIds || !branchIds.length) return res.status(400).json({ message: 'Select at least one branch for this staff member' });
        if (!branchIds.every((id) => mongoose.isValidObjectId(id))) return res.status(400).json({ message: 'One or more selected branches are invalid' });
        const branches = await Branch.countDocuments({ _id: { $in: branchIds }, businessOwnerId: ownerId, status: 'active' });
        if (branches !== branchIds.length) return res.status(400).json({ message: 'One or more selected branches are invalid' });
        let staffPlan = subscriptionPlan ? subscriptionPlan.toString().trim() : owner.subscriptionPlan;
        if (staffPlan && staffPlan !== owner.subscriptionPlan) {
            const belongs = await Subscription.exists({ planName: staffPlan, planType: 'business', status: 'active' });
            if (!belongs) return res.status(400).json({ message: 'Selected subscription plan is not a valid business plan for this owner' });
        }
        // Subscription dates are always inherited from the business owner's plan.
        const startDate = owner.subscriptionStartDate;
        const endDate = owner.subscriptionEndDate;
        const staffUser = await User.create({ name, userName, emailId: String(emailId).toLowerCase(), password: await bcrypt.hash(password, 10), phoneNumber, role: 'business_staff', businessOwnerId: ownerId, permissionLevel, allowedBranches: branchIds, approvalStatus: 'approved', subscriptionPlan: staffPlan || undefined, subscriptionStartDate: startDate || undefined, subscriptionEndDate: endDate || undefined });
        try {
            await ActivityLog.create({ businessOwnerId: ownerId, staffUserId: staffUser._id, action: 'create_staff', module: 'staff', recordId: staffUser._id, description: `${req.user.userName} added staff member ${staffUser.name || staffUser.userName}` });
        } catch { }
        res.status(201).json(staffUser);
    } catch (e) { next(e); }
}
export async function updateStaff(req, res, next) {
    try {
        if (req.user.role !== 'business_owner') return res.status(403).json({ message: 'Only a business owner can manage staff' }); const ownerId = ownerIdFor(req.user); const owner = await User.findById(ownerId); const update = {}; const { name, userName, emailId, phoneNumber, permissionLevel, password, status, subscriptionPlan } = req.body; if (name !== undefined) update.name = name; if (userName !== undefined) update.userName = userName; if (emailId !== undefined) update.emailId = String(emailId).toLowerCase(); if (phoneNumber !== undefined) update.phoneNumber = phoneNumber; if (status !== undefined) { if (!['active', 'inactive'].includes(status)) return res.status(400).json({ message: 'Invalid status' }); update.status = status; } if (permissionLevel !== undefined) { if (!['view', 'edit', 'full'].includes(permissionLevel)) return res.status(400).json({ message: 'Invalid permission level' }); update.permissionLevel = permissionLevel; } if (password) update.password = await bcrypt.hash(String(password), 10);
        if (subscriptionPlan !== undefined) {
            const planName = String(subscriptionPlan || '').trim();
            if (planName) { const ok = await Subscription.findOne({ planName, planType: 'business', status: 'active' }); if (!ok) return res.status(400).json({ message: 'Selected subscription plan is not a valid business plan' }); update.subscriptionPlan = planName; } else { update.subscriptionPlan = undefined; }
        }
        if (req.body.subscriptionStartDate !== undefined) { const d = req.body.subscriptionStartDate ? new Date(req.body.subscriptionStartDate) : null; update.subscriptionStartDate = Number.isNaN(d?.getTime()) ? undefined : d; }
        if (req.body.subscriptionEndDate !== undefined) { const d = req.body.subscriptionEndDate ? new Date(req.body.subscriptionEndDate) : null; update.subscriptionEndDate = Number.isNaN(d?.getTime()) ? undefined : d; }
        if (req.body.allowedBranches !== undefined) { const branchIds = normalizeBranchIds(req.body.allowedBranches); if (!branchIds || !branchIds.length) return res.status(400).json({ message: 'Select at least one branch for this staff member' }); if (!branchIds.every((id) => mongoose.isValidObjectId(id))) return res.status(400).json({ message: 'One or more selected branches are invalid' }); const count = await Branch.countDocuments({ _id: { $in: branchIds }, businessOwnerId: ownerId, status: 'active' }); if (count !== branchIds.length) return res.status(400).json({ message: 'One or more selected branches are invalid' }); update.allowedBranches = branchIds; } const staff = await User.findOneAndUpdate({ _id: req.params.id, businessOwnerId: ownerId, role: 'business_staff' }, update, { new: true, runValidators: true }).select('-password -refreshToken'); if (!staff) return res.status(404).json({ message: 'Staff member not found' }); res.json(staff);
    } catch (e) { next(e); }
}
export async function activityLogs(req, res, next) { try { res.json(await ActivityLog.find({ businessOwnerId: ownerIdFor(req.user) }).populate('staffUserId', 'name userName').sort({ createdAt: -1 })); } catch (e) { next(e); } }
