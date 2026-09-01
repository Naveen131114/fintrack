import jwt from 'jsonwebtoken';

const accessSecret = process.env.JWT_SECRET || 'fintrack-access-secret';
const refreshSecret = process.env.JWT_REFRESH_SECRET || 'fintrack-refresh-secret';

export function createTokenPair(user) {
    const payload = {
        id: user._id,
        userName: user.userName,
        emailId: user.emailId,
        phoneNumber: user.phoneNumber,
        role: user.role
    };

    const accessToken = jwt.sign(payload, accessSecret, { expiresIn: '18h' });
    const refreshToken = jwt.sign({ id: user._id, type: 'refresh' }, refreshSecret, { expiresIn: '7d' });

    return { accessToken, refreshToken };
}

export function verifyAccessToken(token) {
    return jwt.verify(token, accessSecret);
}

export function verifyRefreshToken(token) {
    return jwt.verify(token, refreshSecret);
}
