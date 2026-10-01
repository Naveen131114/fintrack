import mongoose from 'mongoose';

// "Request approval" workflow.
// ---------------------------------------------------------------------------
// A staff member who can READ a record but is not allowed to change it does not
// get a dead-end error: the UI offers to file a request instead. The request
// carries the module, the action (create/edit/delete), the record it is about
// and the reason. The business owner (or any staff member who already holds the
// right) approves or rejects it; approval unlocks that module for that staff
// member for a limited time (see User.permissionsGrant).
const changeRequestSchema = new mongoose.Schema({
    businessOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    module: { type: String, required: true },
    action: { type: String, enum: ['create', 'edit', 'delete'], required: true },
    recordId: { type: mongoose.Schema.Types.ObjectId },
    // Human readable description of the target row ("Payment #42 - Acme Corp"),
    // so an approver knows what they are approving without opening the record.
    recordLabel: { type: String, default: '' },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    // Proposed values for create/edit requests, kept as-is for the approver to
    // read and for the requester to re-submit unchanged once approved.
    payload: { type: mongoose.Schema.Types.Mixed },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    decidedAt: Date,
    decisionNote: { type: String, maxlength: 500 },
    grantExpiresAt: Date
}, { timestamps: true });

// One open request per action per record per requester: keeps the inbox usable
// and stops a double-click from creating duplicates.
changeRequestSchema.index({ requestedBy: 1, module: 1, action: 1, recordId: 1, status: 1 });
changeRequestSchema.index({ businessOwnerId: 1, status: 1, createdAt: -1 });

export default mongoose.model('ChangeRequest', changeRequestSchema);
