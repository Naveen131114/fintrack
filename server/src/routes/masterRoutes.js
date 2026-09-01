import { Router } from 'express';
import CategoryMaster from '../models/CategoryMaster.js';
import TypeMaster from '../models/TypeMaster.js';

const router = Router();

router.get('/types', async (req, res, next) => {
    try {
        const types = await TypeMaster.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json(types);
    } catch (error) {
        next(error);
    }
});

router.post('/types', async (req, res, next) => {
    try {
        const type = await TypeMaster.create({ ...req.body, userId: req.user.id });
        res.status(201).json(type);
    } catch (error) {
        next(error);
    }
});

router.put('/types/:id', async (req, res, next) => {
    try {
        const type = await TypeMaster.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, req.body, { new: true, runValidators: true });
        if (!type) return res.status(404).json({ message: 'Type not found' });
        res.json(type);
    } catch (error) {
        next(error);
    }
});

router.delete('/types/:id', async (req, res, next) => {
    try {
        const type = await TypeMaster.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        if (!type) return res.status(404).json({ message: 'Type not found' });
        res.status(204).end();
    } catch (error) {
        next(error);
    }
});

router.get('/categories', async (req, res, next) => {
    try {
        const filter = { userId: req.user.id };
        if (req.query.type) filter.type = req.query.type;
        const categories = await CategoryMaster.find(filter).sort({ createdAt: -1 });
        res.json(categories);
    } catch (error) {
        next(error);
    }
});

router.post('/categories', async (req, res, next) => {
    try {
        const category = await CategoryMaster.create({ ...req.body, userId: req.user.id });
        res.status(201).json(category);
    } catch (error) {
        next(error);
    }
});

router.put('/categories/:id', async (req, res, next) => {
    try {
        const category = await CategoryMaster.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, req.body, { new: true, runValidators: true });
        if (!category) return res.status(404).json({ message: 'Category not found' });
        res.json(category);
    } catch (error) {
        next(error);
    }
});

router.delete('/categories/:id', async (req, res, next) => {
    try {
        const category = await CategoryMaster.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        if (!category) return res.status(404).json({ message: 'Category not found' });
        res.status(204).end();
    } catch (error) {
        next(error);
    }
});

export default router;
