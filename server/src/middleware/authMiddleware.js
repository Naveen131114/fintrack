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
            businessOwnerId: user.businessOwnerId,
            permissionLevel: user.permissionLevel,
            // Read straight from the database on every request, so a permission
            // change - or an approval grant that just expired - takes effect
            // immediately instead of waiting for the access token to be renewed.
            canView: user.canView === true,
            canCreate: user.canCreate === true,
            canEdit: user.canEdit === true,
            canDelete: user.canDelete === true,
            canManageBusiness: user.canManageBusiness === true,
            permissionsConfigured: user.permissionsConfigured === true,
            permissionsGrant: user.permissionsGrant || [],
            allowedBranches: user.allowedBranches || [],
            status: user.status,
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
