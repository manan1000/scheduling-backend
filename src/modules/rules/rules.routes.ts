import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import * as rulesController from './rules.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', rulesController.getAll);
router.put('/:key', rulesController.update);

export { router as rulesRoutes };
