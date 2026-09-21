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

transactionSchema.add({
    businessOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    paymentType: { type: String, enum: ['Cash', 'Bank', 'UPI'] },
    bankAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount' },
    upiAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'UpiAccount' },
    transactionNumber: { type: String, trim: true }
});
transactionSchema.index({ businessOwnerId: 1, branchId: 1, date: -1 });

export default mongoose.model('Transaction', transactionSchema);
