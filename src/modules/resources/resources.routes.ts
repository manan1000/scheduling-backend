import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import * as resourceController from './resources.controller';

const router = Router();

// All resource routes require admin auth
router.use(authMiddleware);

router.get('/', resourceController.getAll);
router.get('/:id', resourceController.getById);
router.post('/', resourceController.create);
router.put('/:id', resourceController.update);
router.delete('/:id', resourceController.remove);

export { router as resourceRoutes };
