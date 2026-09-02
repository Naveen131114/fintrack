import { Router } from 'express';
import { createBudget, deleteBudget, getBudgetByMonth, listBudgets, updateBudget } from '../controllers/budgetController.js';

const router = Router();

router.get('/', listBudgets);
router.post('/', createBudget);
router.get('/:month', getBudgetByMonth);
router.put('/:id', updateBudget);
router.delete('/:id', deleteBudget);

export default router;
