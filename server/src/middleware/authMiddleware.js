import User from '../models/User.js';
import { verifyAccessToken } from '../utils/tokens.js';

export async function authenticateToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const payload = verifyAccessToken(token);
        const user = await User.findById(payload.id);

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        req.user = {
            id: user._id,
            userName: user.userName,
            emailId: user.emailId,
            phoneNumber: user.phoneNumber,
            role: user.role,
            approvalStatus: user.approvalStatus,
            subscriptionPlan: user.subscriptionPlan,
            subscriptionStartDate: user.subscriptionStartDate,
            subscriptionEndDate: user.subscriptionEndDate
        };

        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
}
