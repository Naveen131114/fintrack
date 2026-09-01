import { Router } from 'express';
import { login, logout, me, refreshAccessToken } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/login', login);
router.post('/refresh-token', refreshAccessToken);
router.get('/me', authenticateToken, me);
router.post('/logout', authenticateToken, logout);

export default router;
