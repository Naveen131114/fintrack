import { Router } from 'express';
import { createTransaction, deleteTransaction, listTransactions, updateTransaction } from '../controllers/transactionController.js';
import { requireTransactionAccess } from '../middleware/businessAccess.js';

const router = Router();
router.route('/').get(listTransactions).post(requireTransactionAccess('edit'), createTransaction);
router.route('/:id').put(requireTransactionAccess('edit'), updateTransaction).delete(requireTransactionAccess('full'), deleteTransaction);
export default router;
