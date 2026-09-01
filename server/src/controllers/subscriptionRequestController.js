import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Subscription from '../models/Subscription.js';
import { sendSuperAdminNotification, sendUserNotification } from '../utils/email.js';
import { isSuperAdminIdentity } from '../config/superAdmin.js';

export async function approveSubscriptionRequest(req, res, next) {
    try {
        const { id } = req.params;
        const { approved, subscriptionStartDate, subscriptionEndDate } = req.body;
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ message: 'User request not found' });
        }

        const startDate = subscriptionStartDate ? new Date(subscriptionStartDate) : new Date();
        const endDate = subscriptionEndDate ? new Date(subscriptionEndDate) : new Date(startDate.getTime());

        if (approved === false) {
            user.approvalStatus = 'rejected';
            await user.save();

            // Send rejection email to user
            try {
                await sendUserNotification({
                    userName: user.userName,
                    emailId: user.emailId,
                    status: 'rejected',
                    message: 'Your subscription request has been rejected. Please contact support for more information.'
                });
            } catch (emailError) {
                console.error('Failed to send rejection email:', emailError.message);
            }

            return res.json({ message: 'Subscription request rejected', user });
        }

        user.approvalStatus = 'approved';
        user.subscriptionStartDate = startDate;
        user.subscriptionEndDate = endDate;
        if (!user.subscriptionPlan) {
            user.subscriptionPlan = 'Manual approval';
        }
        await user.save();

        // Send approval email to user
        try {
            await sendUserNotification({
                userName: user.userName,
                emailId: user.emailId,
                status: 'approved',
                message: 'Your subscription request has been approved! You can now access Fintrack with your account.',
                subscriptionPlan: user.subscriptionPlan,
                subscriptionStartDate: startDate,
                subscriptionEndDate: endDate
            });
        } catch (emailError) {
            console.error('Failed to send approval email:', emailError.message);
        }

        return res.json({ message: 'Subscription request approved', user });
    } catch (error) {
        next(error);
    }
}

export async function createSubscriptionRequest(req, res, next) {
    try {
        const { planId, name, phoneNumber, emailId, userName, password, paymentReference, paymentScreenshotUrl } = req.body;

        if (!planId || !name || !phoneNumber || !emailId || !userName || !password) {
            return res.status(400).json({ message: 'Plan, name, phone, email, username and password are required' });
        }

        const normalizedUserName = String(userName).trim();
        const normalizedEmail = String(emailId).trim().toLowerCase();
        const plan = await Subscription.findById(planId);
        if (!plan) return res.status(404).json({ message: 'Subscription plan not found' });

        const escapedUserName = normalizedUserName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const existingUser = await User.findOne({
            $or: [
                { userName: normalizedUserName },
                { userName: normalizedUserName.toLowerCase() },
                { userName: { $regex: `^${escapedUserName}$`, $options: 'i' } },
                { emailId: normalizedEmail }
            ]
        });
        if (existingUser) {
            return res.status(409).json({ message: 'A user with this username or email already exists' });
        }

        const start = new Date();
        const end = new Date(start);
        const months = { '1 month': 1, '3 months': 3, '6 months': 6, '1 year': 12 }[plan.period];
        end.setMonth(end.getMonth() + months);

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            name,
            phoneNumber,
            emailId: normalizedEmail,
            userName: normalizedUserName,
            password: hashedPassword,
            role: isSuperAdminIdentity(normalizedEmail, phoneNumber) ? 'super_admin' : 'user',
            subscriptionPlan: plan.planName,
            subscriptionStartDate: start,
            subscriptionEndDate: end,
            paymentReference,
            paymentScreenshotUrl,
            approvalStatus: 'pending'
        });

        await sendSuperAdminNotification({
            name,
            phoneNumber,
            emailId: normalizedEmail,
            userName: normalizedUserName,
            planName: plan.planName,
            period: plan.period,
            amount: plan.amount,
            paymentReference,
            paymentScreenshotUrl
        });

        res.status(201).json({
            message: 'Payment verification request submitted. The super admin will review and activate access after approval.',
            userId: user.id,
            subscriptionStartDate: start,
            subscriptionEndDate: end
        });
    } catch (error) { next(error); }
}