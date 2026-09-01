import { Router } from 'express';
import Budget from '../models/Budget.js';

const router = Router();

router.get('/', async (req, res, next) => {
    try {
        const budgets = await Budget.find({ userId: req.user.id }).sort({ month: -1 });
        res.json(budgets);
    } catch (error) {
        next(error);
    }
});

router.post('/', async (req, res, next) => {
    try {
        const { amount, month } = req.body;
        if (!amount || !month) return res.status(400).json({ message: 'Amount and month are required' });

        const existingBudget = await Budget.findOne({ userId: req.user.id, month });
        if (existingBudget) {
            existingBudget.amount = amount;
            await existingBudget.save();
            return res.json(existingBudget);
        }

        const budget = await Budget.create({ userId: req.user.id, amount, month });
        res.status(201).json(budget);
    } catch (error) {
        next(error);
    }
});

router.get('/:month', async (req, res, next) => {
    try {
        const budget = await Budget.findOne({ userId: req.user.id, month: req.params.month });
        if (!budget) return res.status(404).json({ message: 'Budget not found' });
        res.json(budget);
    } catch (error) {
        next(error);
    }
});

router.put('/:id', async (req, res, next) => {
    try {
        const budget = await Budget.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, req.body, { new: true, runValidators: true });
        if (!budget) return res.status(404).json({ message: 'Budget not found' });
        res.json(budget);
    } catch (error) {
        next(error);
    }
});

router.delete('/:id', async (req, res, next) => {
    try {
        const budget = await Budget.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        if (!budget) return res.status(404).json({ message: 'Budget not found' });
        res.status(204).end();
    } catch (error) {
        next(error);
    }
});

export default router;
