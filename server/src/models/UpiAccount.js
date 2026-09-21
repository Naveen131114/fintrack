import mongoose from 'mongoose';
const upiAccountSchema = new mongoose.Schema({
    businessOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    upiId: { type: String, required: true, lowercase: true, trim: true },
    upiPhoneNumber: { type: String, trim: true },
    qrCode: { type: String, trim: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });
upiAccountSchema.index({ businessOwnerId: 1, upiId: 1 }, { unique: true });
export default mongoose.model('UpiAccount', upiAccountSchema);
