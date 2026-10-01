import { Router } from 'express';
import { deleteReport, listReports, saveReport } from '../controllers/monthlyReportController.js';
import { requireBusinessPlan, requirePermission } from '../middleware/businessAccess.js';

const router = Router();

// Overall monthly report (Analytics page) is a business-plan feature: every
// route needs an ACTIVE business subscription. Staff may read the owner's
// report, and staff may write it too when the owner granted create/edit/delete
// (or approved a request for the monthly-report module).
router.get('/', requireBusinessPlan, requirePermission('view', 'monthlyReports'), listReports);
router.post('/', requirePermission('create', 'monthlyReports'), requireBusinessPlan, saveReport);
router.delete('/:id', requirePermission('delete', 'monthlyReports'), requireBusinessPlan, deleteReport);

export default router;
