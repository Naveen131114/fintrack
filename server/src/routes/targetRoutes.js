import { Router } from 'express';
import { createTarget, deleteTarget, getTargetByMonth, listTargets, updateTarget } from '../controllers/targetController.js';
import { requireDataWrite } from '../middleware/businessAccess.js';

const router = Router();

// Staff can view the owner's targets but only the owner (or a personal user
// for their own) can modify them.
router.get('/', listTargets);
router.post('/', requireDataWrite, createTarget);
router.get('/:month', getTargetByMonth);
router.put('/:id', requireDataWrite, updateTarget);
router.delete('/:id', requireDataWrite, deleteTarget);

export default router;