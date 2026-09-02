import Budget from '../models/Budget.js';

export async function listBudgets(req, res, next) {
    try {
        const budgets = await Budget.find({ userId: req.user.id }).sort({ month: -1 });
        res.json(budgets);
    } catch (error) {
        next(error);
    }
}

export async function createBudget(req, res, next) {
    try {
        const { amount, month, description } = req.body;
        if (amount === undefined || !month) {
            return res.status(400).json({ message: 'Amount and month are required' });
        }

        const existingBudget = await Budget.findOne({ userId: req.user.id, month });
        if (existingBudget) {
            existingBudget.amount = Number(amount);
            existingBudget.description = description || existingBudget.description;
            await existingBudget.save();
            return res.json(existingBudget);
        }

        const budget = await Budget.create({ userId: req.user.id, amount: Number(amount), month, description });
        res.status(201).json(budget);
    } catch (error) {
        next(error);
    }
}

export async function getBudgetByMonth(req, res, next) {
    try {
        const budget = await Budget.findOne({ userId: req.user.id, month: req.params.month });
        if (!budget) return res.status(404).json({ message: 'Budget not found' });
        res.json(budget);
    } catch (error) {
        next(error);
    }
}

export async function updateBudget(req, res, next) {
    try {
        const budget = await Budget.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, req.body, { new: true, runValidators: true });
        if (!budget) return res.status(404).json({ message: 'Budget not found' });
        res.json(budget);
    } catch (error) {
        next(error);
    }
}

export async function deleteBudget(req, res, next) {
    try {
        const budget = await Budget.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        if (!budget) return res.status(404).json({ message: 'Budget not found' });
        res.status(204).end();
    } catch (error) {
        next(error);
    }
}