import mongoose from 'mongoose';

// "Keep Notes" is a single free-text scratchpad per user account. Every user
// role (personal user, business owner, business staff, super admin) owns
// exactly one note, so userId is unique. The note is never referenced by any
// transaction/budget logic - it only has to survive until it is cleared.
const noteSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    content: { type: String, default: '', maxlength: 20000 }
}, { timestamps: true });

export default mongoose.model('Note', noteSchema);
