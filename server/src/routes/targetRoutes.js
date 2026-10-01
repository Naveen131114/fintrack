import { Router } from 'express';
import { createTarget, deleteTarget, getTargetByMonth, listTargets, updateTarget } from '../controllers/targetController.js';
import { requirePermission } from '../middleware/businessAccess.js';

const router = Router();

// Granular staff rights: staff read the owner's targets and may change them
// when the owner ticked create/edit/delete (or approved a request for it).
router.get('/', requirePermission('view', 'targets'), listTargets);
router.post('/', requirePermission('create', 'targets'), createTarget);
router.get('/:month', requirePermission('view', 'targets'), getTargetByMonth);
router.put('/:id', requirePermission('edit', 'targets'), updateTarget);
router.delete('/:id', requirePermission('delete', 'targets'), deleteTarget);

export default router;