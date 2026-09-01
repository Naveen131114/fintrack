import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { createTokenPair, verifyRefreshToken } from '../utils/tokens.js';
import { isSuperAdminIdentity } from '../config/superAdmin.js';

function normalizeUserName(value = '') {
    return String(value).trim();
}

function escapeRegex(value = '') {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function passwordMatches(storedPassword, submittedPassword) {
    if (!storedPassword) {
        return false;
    }

    if (storedPassword.startsWith('$2')) {
        return bcrypt.compare(submittedPassword, storedPassword);
    }

    return storedPassword === submittedPassword;
}

function serializeUser(user) {
    return {
        _id: user._id,
        name: user.name,
        userName: user.userName,
        emailId: user.emailId,
        phoneNumber: user.phoneNumber,
        role: user.role,
        subscriptionPlan: user.subscriptionPlan,
        approvalStatus: user.approvalStatus,
        subscriptionStartDate: user.subscriptionStartDate,
        subscriptionEndDate: user.subscriptionEndDate,
        paymentReference: user.paymentReference,
        paymentScreenshotUrl: user.paymentScreenshotUrl,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
    };
}

export async function login(req, res, next) {
    try {
        const { userName, password } = req.body;

        if (!userName || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }

        const normalizedUserName = normalizeUserName(userName);
        const user = await User.findOne({
            $or: [
                { userName: normalizedUserName },
                { userName: normalizedUserName.toLowerCase() },
                { userName: { $regex: `^${escapeRegex(normalizedUserName)}$`, $options: 'i' } },
                { emailId: normalizedUserName.toLowerCase() }
            ]
        }).select('+password');

        if (!user) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        const isPasswordValid = await passwordMatches(user.password, password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        if (user.password && !user.password.startsWith('$2')) {
            user.password = await bcrypt.hash(password, 10);
            await user.save();
        }

        const isOwner = isSuperAdminIdentity(user.emailId, user.phoneNumber);
        if (isOwner) {
            user.role = 'super_admin';
            user.approvalStatus = 'approved';
            user.subscriptionPlan = 'Super Admin';
            user.subscriptionStartDate = user.subscriptionStartDate || new Date();
            user.subscriptionEndDate = user.subscriptionEndDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        }

        if (!isOwner && user.approvalStatus !== 'approved') {
            return res.status(403).json({ message: 'Your account is pending admin approval' });
        }

        const endDate = user.subscriptionEndDate ? new Date(user.subscriptionEndDate) : null;
        if (!isOwner && endDate && endDate < new Date()) {
            return res.status(403).json({ message: 'Your subscription has expired. Please renew your plan.' });
        }

        const tokens = createTokenPair(user);
        user.refreshToken = tokens.refreshToken;
        user.lastLoginAt = new Date();
        await user.save();

        return res.json({
            message: 'Login successful',
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: serializeUser(user)
        });
    } catch (error) {
        next(error);
    }
}

export async function refreshAccessToken(req, res, next) {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ message: 'Refresh token is required' });
        }

        const decoded = verifyRefreshToken(refreshToken);
        const user = await User.findById(decoded.id).select('+refreshToken');

        if (!user || user.refreshToken !== refreshToken) {
            return res.status(401).json({ message: 'Refresh token is invalid' });
        }

        const tokens = createTokenPair(user);
        user.refreshToken = tokens.refreshToken;
        await user.save();

        return res.json({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
    } catch (error) {
        next(error);
    }
}

export async function logout(req, res, next) {
    try {
        const user = await User.findById(req.user.id);

        if (user) {
            user.refreshToken = null;
            await user.save();
        }

        return res.json({ message: 'Logged out successfully' });
    } catch (error) {
        next(error);
    }
}

export async function me(req, res) {
    return res.json({ user: serializeUser(await User.findById(req.user.id)) });
}
