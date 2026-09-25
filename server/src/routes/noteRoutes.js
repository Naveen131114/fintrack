import { Router } from 'express';
import { clearNote, getNote, saveNote } from '../controllers/noteController.js';

const router = Router();

// Every signed-in user owns their own notes, so no business-role middleware is
// applied here: the controller always scopes the query to req.user.id.
router.get('/', getNote);
router.put('/', saveNote);
router.delete('/', clearNote);

export default router;
