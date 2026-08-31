import { Router } from 'express';
import CategoryMaster from '../models/CategoryMaster.js';
import TypeMaster from '../models/TypeMaster.js';
import { createResource } from '../controllers/resourceController.js';

const router = Router();
const types = createResource(TypeMaster);
const categories = createResource(CategoryMaster);
router.route('/types').get(types.list).post(types.create);
router.route('/types/:id').put(types.update).delete(types.remove);
router.get('/categories', async (req, res, next) => { try { const filter = req.query.type ? { type: req.query.type } : {}; res.json(await CategoryMaster.find(filter).sort({ createdAt: -1 })); } catch (error) { next(error); } });
router.post('/categories', categories.create);
router.route('/categories/:id').put(categories.update).delete(categories.remove);
export default router;
