import { Router } from 'express';
import { activityLogs, createResource, createStaff, deleteStaff, getBusinessProfile, listResource, listStaff, removeResource, updateBusinessProfile, updateResource, updateStaff } from '../controllers/businessController.js';
import { requireBusinessOwner, requireBusinessUser, requirePermission } from '../middleware/businessAccess.js';

const router = Router();
router.use(requireBusinessUser);

// Business profile: every member of the business can read it (staff need it for
// the branded PDF header), only the owner edits the branding.
router.get('/profile', requirePermission('view', 'businessProfile'), getBusinessProfile);
router.put('/profile', requireBusinessOwner, updateBusinessProfile);

// Audit trail: readable by anyone in the business who can view data, written by
// the server itself.
router.get('/activity-logs', requirePermission('view', 'activityLogs'), activityLogs);

// Staff accounts stay owner-only. A staff member - even one who can manage
// business records - must never be able to hand out or widen their own rights.
router.get('/staff', requirePermission('view', 'staff'), listStaff);
router.post('/staff', requireBusinessOwner, createStaff);
router.put('/staff/:id', requireBusinessOwner, updateStaff);
router.delete('/staff/:id', requireBusinessOwner, deleteStaff);

// Branches, bank and UPI accounts: readable by staff (the transaction form
// needs the pickers), changes need the "manage business" right - or an
// approved request for exactly that module. The module is read from the URL.
const RESOURCE = '/:resource(branches|bankAccounts|upiAccounts)';
const resourceModule = (req) => req.params.resource;
router.get(RESOURCE, requirePermission('view', resourceModule), listResource);
router.post(RESOURCE, requirePermission('create', resourceModule), createResource);
router.put(`${RESOURCE}/:id`, requirePermission('edit', resourceModule), updateResource);
router.delete(`${RESOURCE}/:id`, requirePermission('delete', resourceModule), removeResource);

export default router;

