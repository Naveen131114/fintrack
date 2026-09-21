import mongoose from 'mongoose';
const subscriptionSchema = new mongoose.Schema({ planName: { type: String, required: true, trim: true }, period: { type: String, enum: ['1 month', '3 months', '6 months', '1 year'], required: true }, amount: { type: Number, required: true, min: 0 }, planType: { type: String, enum: ['personal', 'business'], default: 'personal' }, maxStaff: { type: Number, min: 0, default: 0 }, maxBranches: { type: Number, min: 0, default: 0 }, status: { type: String, enum: ['active', 'inactive'], default: 'active' } }, { timestamps: true });

// Personal plans never carry business capacity; business plans must allow at least one branch.
subscriptionSchema.pre('validate', function (next) {
    if (this.planType === 'personal') {
        this.maxBranches = 0;
        this.maxStaff = 0;
    } else if (this.planType === 'business') {
        if (!Number.isFinite(Number(this.maxBranches)) || Number(this.maxBranches) < 1) {
            return next(new Error('Business plans must allow at least 1 branch (branch limit in counts)'));
        }
        if (!Number.isFinite(Number(this.maxStaff)) || Number(this.maxStaff) < 0) {
            return next(new Error('Business plans must define staff login limit in counts (0 or more)'));
        }
        this.maxBranches = Number(this.maxBranches);
        this.maxStaff = Number(this.maxStaff);
    }
    next();
});
export default mongoose.model('Subscription', subscriptionSchema);
