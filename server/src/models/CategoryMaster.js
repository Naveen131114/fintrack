import mongoose from 'mongoose';
const categoryMasterSchema = new mongoose.Schema({ name: { type: String, required: true, trim: true }, type: { type: String, required: true, trim: true } }, { timestamps: true });
export default mongoose.model('CategoryMaster', categoryMasterSchema);
