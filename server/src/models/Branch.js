import mongoose from 'mongoose';

const branchSchema = new mongoose.Schema({
    businessOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    branchName: { type: String, required: true, trim: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });
branchSchema.index({ businessOwnerId: 1, branchName: 1 }, { unique: true });
export default mongoose.model('Branch', branchSchema);
