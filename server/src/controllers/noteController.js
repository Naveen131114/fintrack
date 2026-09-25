import Note from '../models/Note.js';

// Notes are private to the signed-in account: the request user's own id is the
// only scope, so business staff keep their own scratchpad and can never read or
// overwrite the owner's notes (unlike masters/budgets, which are shared).
export async function getNote(req, res, next) {
    try {
        const note = await Note.findOne({ userId: req.user.id });
        // No note saved yet is not an error - return an empty one so the page
        // can render an empty editor without handling a 404.
        res.json(note || { userId: req.user.id, content: '', updatedAt: null });
    } catch (error) {
        next(error);
    }
}

export async function saveNote(req, res, next) {
    try {
        const { content } = req.body;
        if (typeof content !== 'string') {
            return res.status(400).json({ message: 'Note content is required' });
        }

        const note = await Note.findOneAndUpdate(
            { userId: req.user.id },
            { $set: { content } },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        );
        res.json(note);
    } catch (error) {
        next(error);
    }
}

export async function clearNote(req, res, next) {
    try {
        await Note.findOneAndDelete({ userId: req.user.id });
        res.status(204).end();
    } catch (error) {
        next(error);
    }
}
