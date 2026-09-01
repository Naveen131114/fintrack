import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    phoneNumber: String,
    emailId: { type: String, required: true, lowercase: true, trim: true },
    userName: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'super_admin'], default: 'user' },
    subscriptionPlan: String,
    subscriptionStartDate: Date,
    subscriptionEndDate: Date,
    approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    paymentReference: String,
    paymentScreenshotUrl: String,
    refreshToken: { type: String, default: null, select: false },
    lastLoginAt: Date
}, { timestamps: true });

export default mongoose.model('User', userSchema);
