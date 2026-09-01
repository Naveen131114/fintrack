import mongoose from 'mongoose';
const categoryMasterSchema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, name: { type: String, required: true, trim: true }, type: { type: String, required: true, trim: true } }, { timestamps: true });
categoryMasterSchema.index({ userId: 1, name: 1, type: 1 }, { unique: true });
export default mongoose.model('CategoryMaster', categoryMasterSchema);
