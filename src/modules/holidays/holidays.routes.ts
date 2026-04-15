import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import * as holidayController from './holidays.controller';

const router = Router();

router.use(authMiddleware);

// Blocked-days routes MUST come before /:id to avoid shadowing
router.get('/blocked-days', holidayController.getBlockedDays);
router.post('/blocked-days', holidayController.addBlockedDay);
router.delete('/blocked-days/:id', holidayController.removeBlockedDay);

// Holiday routes
router.get('/', holidayController.getAllHolidays);
router.post('/', holidayController.createHoliday);
router.delete('/:id', holidayController.deleteHoliday);

export { router as holidayRoutes };
