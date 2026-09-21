import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    phoneNumber: String,
    emailId: { type: String, required: true, lowercase: true, trim: true },
    userName: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'super_admin', 'business_owner', 'business_staff'], default: 'user' },
    // Existing "user" records remain personal accounts. Business relationships are optional.
    businessOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    permissionLevel: { type: String, enum: ['view', 'edit', 'full'] },
    allowedBranches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }],
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
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
