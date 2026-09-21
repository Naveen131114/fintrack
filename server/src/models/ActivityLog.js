import mongoose from 'mongoose';
const activityLogSchema = new mongoose.Schema({
    businessOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    staffUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, enum: ['create', 'update', 'delete'], required: true },
    module: { type: String, required: true },
    recordId: { type: mongoose.Schema.Types.ObjectId, required: true },
    description: { type: String, required: true },
    changes: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });
activityLogSchema.index({ businessOwnerId: 1, createdAt: -1 });
export default mongoose.model('ActivityLog', activityLogSchema);
