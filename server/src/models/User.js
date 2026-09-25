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
    // Business PDF-template branding (managed by the business_owner, applied to
    // owner + staff transaction PDF exports). Logo stored as a JPEG data URL.
    businessName: { type: String, trim: true, maxlength: 120 },
    businessAddress: { type: String, trim: true, maxlength: 600 },
    businessLogo: { type: String, default: null },
    // Logo width on exported PDFs, expressed as a percentage of the PDF page
    // width (US Letter = 612pt). Validated to 1-25% in businessController.
    businessLogoWidthPercent: { type: Number, default: 8 },
    refreshToken: { type: String, default: null, select: false },
    lastLoginAt: Date
}, { timestamps: true });

export default mongoose.model('User', userSchema);
