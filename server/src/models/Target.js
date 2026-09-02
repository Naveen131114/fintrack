import mongoose from 'mongoose';

const targetSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0 },
    month: { type: String, required: true },
    description: { type: String, trim: true }
}, { timestamps: true });

targetSchema.index({ userId: 1, month: 1 }, { unique: true });

export default mongoose.model('Target', targetSchema);