import { Router } from 'express';
import { createBudget, deleteBudget, getBudgetByMonth, listBudgets, updateBudget } from '../controllers/budgetController.js';
import { requirePermission } from '../middleware/businessAccess.js';

const router = Router();

// Granular staff rights: staff read the owner's budgets and may change them
// when the owner ticked create/edit/delete (or approved a request for it).
router.get('/', requirePermission('view', 'budgets'), listBudgets);
router.post('/', requirePermission('create', 'budgets'), createBudget);
router.get('/:month', requirePermission('view', 'budgets'), getBudgetByMonth);
router.put('/:id', requirePermission('edit', 'budgets'), updateBudget);
router.delete('/:id', requirePermission('delete', 'budgets'), deleteBudget);

export default router;
