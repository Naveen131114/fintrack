import { Router } from 'express';
import { createBudget, deleteBudget, getBudgetByMonth, listBudgets, updateBudget } from '../controllers/budgetController.js';
import { requireDataWrite } from '../middleware/businessAccess.js';

const router = Router();

// Staff can view the owner's budgets but only the owner (or a personal user
// for their own) can modify them.
router.get('/', listBudgets);
router.post('/', requireDataWrite, createBudget);
router.get('/:month', getBudgetByMonth);
router.put('/:id', requireDataWrite, updateBudget);
router.delete('/:id', requireDataWrite, deleteBudget);

export default router;
