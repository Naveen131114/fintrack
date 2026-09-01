import mongoose from 'mongoose';
const typeMasterSchema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, name: { type: String, required: true, trim: true } }, { timestamps: true });
typeMasterSchema.index({ userId: 1, name: 1 }, { unique: true });
export default mongoose.model('TypeMaster', typeMasterSchema);
