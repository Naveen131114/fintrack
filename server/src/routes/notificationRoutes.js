import { Router } from 'express';
import { deleteNotification, listNotifications, markNotificationsRead } from '../controllers/notificationController.js';

const router = Router();
router.get('/', listNotifications);
router.post('/read', markNotificationsRead);
router.delete('/:id', deleteNotification);

export default router;
