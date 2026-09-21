import mongoose from 'mongoose';
const bankAccountSchema = new mongoose.Schema({
    businessOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    bankName: { type: String, required: true, trim: true },
    accountNumber: { type: String, required: true, trim: true, select: false },
    ifscCode: { type: String, required: true, uppercase: true, trim: true },
    branch: { type: String, trim: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });
bankAccountSchema.index({ businessOwnerId: 1, accountNumber: 1 }, { unique: true });
export default mongoose.model('BankAccount', bankAccountSchema);
