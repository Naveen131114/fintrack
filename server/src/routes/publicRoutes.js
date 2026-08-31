import { Router } from 'express';
import { createSubscriptionRequest } from '../controllers/subscriptionRequestController.js';

import Subscription from '../models/Subscription.js';
const router = Router();
router.get('/plans', async (req, res, next) => { try { res.json(await Subscription.find().sort({ amount: 1 })); } catch (error) { next(error); } });
router.post('/subscription-requests', createSubscriptionRequest);
export default router;