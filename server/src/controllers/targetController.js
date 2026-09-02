import Target from '../models/Target.js';

export async function listTargets(req, res, next) {
    try {
        const targets = await Target.find({ userId: req.user.id }).sort({ month: -1 });
        res.json(targets);
    } catch (error) {
        next(error);
    }
}

export async function createTarget(req, res, next) {
    try {
        const { amount, month, description } = req.body;
        if (amount === undefined || !month) {
            return res.status(400).json({ message: 'Amount and month are required' });
        }

        const existingTarget = await Target.findOne({ userId: req.user.id, month });
        if (existingTarget) {
            existingTarget.amount = Number(amount);
            existingTarget.description = description || existingTarget.description;
            await existingTarget.save();
            return res.json(existingTarget);
        }

        const target = await Target.create({ userId: req.user.id, amount: Number(amount), month, description });
        res.status(201).json(target);
    } catch (error) {
        next(error);
    }
}

export async function getTargetByMonth(req, res, next) {
    try {
        const target = await Target.findOne({ userId: req.user.id, month: req.params.month });
        if (!target) return res.status(404).json({ message: 'Target not found' });
        res.json(target);
    } catch (error) {
        next(error);
    }
}

export async function updateTarget(req, res, next) {
    try {
        const target = await Target.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, req.body, { new: true, runValidators: true });
        if (!target) return res.status(404).json({ message: 'Target not found' });
        res.json(target);
    } catch (error) {
        next(error);
    }
}

export async function deleteTarget(req, res, next) {
    try {
        const target = await Target.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        if (!target) return res.status(404).json({ message: 'Target not found' });
        res.status(204).end();
    } catch (error) {
        next(error);
    }
}