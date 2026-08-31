import mongoose from 'mongoose';
const subscriptionSchema = new mongoose.Schema({ planName: { type: String, required: true, trim: true }, period: { type: String, enum: ['1 month', '3 months', '6 months', '1 year'], required: true }, amount: { type: Number, required: true, min: 0 } }, { timestamps: true });
export default mongoose.model('Subscription', subscriptionSchema);
