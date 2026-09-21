import { Router } from 'express';
import { createResource } from '../controllers/resourceController.js';

export function resourceRoutes(Model, { superAdmin = false, middleware, isUserModel = false } = {}) {
    const router = Router();
    const controller = createResource(Model, { isUserModel });
    if (superAdmin) router.use(middleware);
    router.route('/').get(controller.list).post(controller.create);
    router.route('/:id').put(controller.update).delete(controller.remove);
    return router;
}
