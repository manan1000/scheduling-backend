import { Router } from 'express';
import { getAvailableSlots } from './availability.controller';

const router = Router();

// Public endpoint - no auth required
router.get('/', getAvailableSlots);

export { router as availabilityRoutes };
