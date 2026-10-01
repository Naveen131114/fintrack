import { Router } from 'express';
import CategoryMaster from '../models/CategoryMaster.js';
import TypeMaster from '../models/TypeMaster.js';
import { dataOwnerIdFor, requirePermission } from '../middleware/businessAccess.js';

const router = Router();

// Reads are scoped to the business owner's data set so business_staff can see
// the masters created by their Business Owner. Personal users see their own.
router.get('/types', requirePermission('view', 'types'), async (req, res, next) => {
    try {
        const types = await TypeMaster.find({ userId: dataOwnerIdFor(req.user) }).sort({ createdAt: -1 });
        res.json(types);
    } catch (error) {
        next(error);
    }
});

router.post('/types', requirePermission('create', 'types'), async (req, res, next) => {
    try {
        const type = await TypeMaster.create({ ...req.body, userId: dataOwnerIdFor(req.user) });
        res.status(201).json(type);
    } catch (error) {
        next(error);
    }
});

router.put('/types/:id', requirePermission('edit', 'types'), async (req, res, next) => {
    try {
        const type = await TypeMaster.findOneAndUpdate({ _id: req.params.id, userId: dataOwnerIdFor(req.user) }, req.body, { new: true, runValidators: true });
        if (!type) return res.status(404).json({ message: 'Type not found' });
        res.json(type);
    } catch (error) {
        next(error);
    }
});

router.delete('/types/:id', requirePermission('delete', 'types'), async (req, res, next) => {
    try {
        const type = await TypeMaster.findOneAndDelete({ _id: req.params.id, userId: dataOwnerIdFor(req.user) });
        if (!type) return res.status(404).json({ message: 'Type not found' });
        res.status(204).end();
    } catch (error) {
        next(error);
    }
});

router.get('/categories', requirePermission('view', 'categories'), async (req, res, next) => {
    try {
        const filter = { userId: dataOwnerIdFor(req.user) };
        if (req.query.type) filter.type = req.query.type;
        const categories = await CategoryMaster.find(filter).sort({ createdAt: -1 });
        res.json(categories);
    } catch (error) {
        next(error);
    }
});

router.post('/categories', requirePermission('create', 'categories'), async (req, res, next) => {
    try {
        const category = await CategoryMaster.create({ ...req.body, userId: dataOwnerIdFor(req.user) });
        res.status(201).json(category);
    } catch (error) {
        next(error);
    }
});

router.put('/categories/:id', requirePermission('edit', 'categories'), async (req, res, next) => {
    try {
        const category = await CategoryMaster.findOneAndUpdate({ _id: req.params.id, userId: dataOwnerIdFor(req.user) }, req.body, { new: true, runValidators: true });
        if (!category) return res.status(404).json({ message: 'Category not found' });
        res.json(category);
    } catch (error) {
        next(error);
    }
});

router.delete('/categories/:id', requirePermission('delete', 'categories'), async (req, res, next) => {
    try {
        const category = await CategoryMaster.findOneAndDelete({ _id: req.params.id, userId: dataOwnerIdFor(req.user) });
        if (!category) return res.status(404).json({ message: 'Category not found' });
        res.status(204).end();
    } catch (error) {
        next(error);
    }
});

export default router;
