import mongoose from 'mongoose';

// In-app notifications. Currently only the approval workflow raises them:
//   - to the approver(s) when a request needs a decision
//   - to the requester when their request is approved or rejected
// They are deliberately lightweight (no delivery tracking beyond readAt).
const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    businessOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['change_request', 'change_request_decision', 'info'], default: 'info' },
    title: { type: String, required: true },
    message: { type: String, default: '' },
    changeRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChangeRequest' },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: Date
}, { timestamps: true });

notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
