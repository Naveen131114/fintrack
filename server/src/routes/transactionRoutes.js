import { Router } from 'express';
import { createTransaction, deleteTransaction, listTransactions, updateTransaction } from '../controllers/transactionController.js';
import { requirePermission } from '../middleware/businessAccess.js';

const router = Router();
// Granular rights decide, plus an approved "request approval" grant unlocks this module.
router.route('/').get(requirePermission('view', 'transactions'), listTransactions).post(requirePermission('create', 'transactions'), createTransaction);
// PUT/DELETE address ONE record, so the guard is pinned to it: an approval for
// one transaction row never authorises a change to another.
router.route('/:id').put(requirePermission('edit', 'transactions', (req) => req.params.id), updateTransaction).delete(requirePermission('delete', 'transactions', (req) => req.params.id), deleteTransaction);
export default router;
