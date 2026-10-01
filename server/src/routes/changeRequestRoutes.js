import { Router } from 'express';
import { approveChangeRequest, cancelChangeRequest, createChangeRequest, listChangeRequests, pendingRequestCount, rejectChangeRequest } from '../controllers/changeRequestController.js';

// "Request approval" inbox: staff file requests, owners (or staff who already
// hold the right) decide them.
const router = Router();
router.get('/', listChangeRequests);
router.get('/counts', pendingRequestCount);
router.post('/', createChangeRequest);
router.post('/:id/approve', approveChangeRequest);
router.post('/:id/reject', rejectChangeRequest);
router.delete('/:id', cancelChangeRequest);

export default router;
