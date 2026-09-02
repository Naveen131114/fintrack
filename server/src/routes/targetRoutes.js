import { Router } from 'express';
import { createTarget, deleteTarget, getTargetByMonth, listTargets, updateTarget } from '../controllers/targetController.js';

const router = Router();

router.get('/', listTargets);
router.post('/', createTarget);
router.get('/:month', getTargetByMonth);
router.put('/:id', updateTarget);
router.delete('/:id', deleteTarget);

export default router;