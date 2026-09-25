import { Router } from 'express';
import { activityLogs, createResource, createStaff, deleteStaff, listResource, listStaff, removeResource, updateResource, updateStaff } from '../controllers/businessController.js';
import { requireBusinessUser, requirePermission } from '../middleware/businessAccess.js';
const router = Router();
router.use(requireBusinessUser);
router.get('/activity-logs', requirePermission('view'), activityLogs);
router.get('/staff', requirePermission('view'), listStaff); router.post('/staff', requirePermission('edit'), createStaff); router.put('/staff/:id', requirePermission('edit'), updateStaff); router.delete('/staff/:id', requirePermission('full'), deleteStaff);
router.get('/:resource(branches|bankAccounts|upiAccounts)', requirePermission('view'), listResource); router.post('/:resource(branches|bankAccounts|upiAccounts)', requirePermission('edit'), createResource); router.put('/:resource(branches|bankAccounts|upiAccounts)/:id', requirePermission('edit'), updateResource); router.delete('/:resource(branches|bankAccounts|upiAccounts)/:id', requirePermission('full'), removeResource);
export default router;
