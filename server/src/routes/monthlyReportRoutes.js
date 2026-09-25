import { Router } from 'express';
import { deleteReport, listReports, saveReport } from '../controllers/monthlyReportController.js';
import { requireBusinessPlan, requireDataWrite } from '../middleware/businessAccess.js';

const router = Router();

// Overall monthly report (Analytics page) is a business-plan feature: every
// route needs an ACTIVE business subscription. Staff may read the owner's
// report, only the owner (or a personal user, which never reaches here) writes.
router.get('/', requireBusinessPlan, listReports);
router.post('/', requireDataWrite, requireBusinessPlan, saveReport);
router.delete('/:id', requireDataWrite, requireBusinessPlan, deleteReport);

export default router;
