import mongoose from 'mongoose';
const typeMasterSchema = new mongoose.Schema({ name: { type: String, required: true, unique: true, trim: true } }, { timestamps: true });
export default mongoose.model('TypeMaster', typeMasterSchema);
