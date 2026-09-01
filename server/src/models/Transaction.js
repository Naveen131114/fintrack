import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    type: { type: String, enum: ['Income', 'Expense', 'Others'], required: true },
    category: { type: String, required: true, trim: true },
    date: { type: Date, default: Date.now },
    description: { type: String, trim: true },
    notes: { type: String, trim: true }
}, { timestamps: true });

export default mongoose.model('Transaction', transactionSchema);
