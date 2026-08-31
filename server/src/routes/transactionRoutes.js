import { Router } from 'express';
import { createTransaction, deleteTransaction, listTransactions, updateTransaction } from '../controllers/transactionController.js';

const router = Router();
router.route('/').get(listTransactions).post(createTransaction);
router.route('/:id').put(updateTransaction).delete(deleteTransaction);
export default router;
