import mongoose from 'mongoose';

// Month-wise overall business report shown on the Analytics page: the owner
// records the branch the month belongs to, the number of business/clients,
// income and expenses. Balance and profit-or-loss are NEVER stored - they are
// derived from income - expenses wherever the row is displayed or exported.
const monthlyReportSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    month: { type: String, required: true }, // Format: YYYY-MM
    // Branch the month belongs to, so a business owner can keep one report per
    // month per branch. Rows saved before branch support have no branchId and
    // only appear under "All branches".
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    clientsCount: { type: Number, required: true, min: 0, default: 0 },
    income: { type: Number, required: true, min: 0, default: 0 },
    expenses: { type: Number, required: true, min: 0, default: 0 }
}, { timestamps: true });

// One report row per month PER BRANCH. server.js calls syncIndexes() on boot so
// databases created before branch support swap the older userId+month index.
monthlyReportSchema.index({ userId: 1, month: 1, branchId: 1 }, { unique: true });

export default mongoose.model('MonthlyReport', monthlyReportSchema);
