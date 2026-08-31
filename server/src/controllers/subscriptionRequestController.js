import User from '../models/User.js';
import Subscription from '../models/Subscription.js';

export async function createSubscriptionRequest(req, res, next) {
    try {
        const { planId, name, phoneNumber, emailId, userName, password, paymentReference, paymentScreenshotUrl } = req.body;
        const plan = await Subscription.findById(planId);
        if (!plan) return res.status(404).json({ message: 'Subscription plan not found' });
        const start = new Date();
        const end = new Date(start);
        const months = { '1 month': 1, '3 months': 3, '6 months': 6, '1 year': 12 }[plan.period];
        end.setMonth(end.getMonth() + months);
        const user = await User.create({ name, phoneNumber, emailId, userName, password, subscriptionPlan: plan.planName, subscriptionStartDate: start, subscriptionEndDate: end, paymentReference, paymentScreenshotUrl, approvalStatus: 'pending' });
        res.status(201).json({ message: 'Request submitted for manual payment verification', userId: user.id, subscriptionStartDate: start, subscriptionEndDate: end });
    } catch (error) { next(error); }
}