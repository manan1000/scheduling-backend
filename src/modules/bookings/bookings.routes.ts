import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import * as bookingController from './bookings.controller';

const router = Router();

// Public routes
router.post('/', bookingController.createBooking);

// Admin routes
router.get('/', authMiddleware, bookingController.getAllBookings);
router.get('/:id', authMiddleware, bookingController.getBookingById);
router.post('/admin', authMiddleware, bookingController.createAdminBooking);
router.put('/:id', authMiddleware, bookingController.updateBooking);
router.delete('/:id', authMiddleware, bookingController.deleteBooking);

export { router as bookingRoutes };
