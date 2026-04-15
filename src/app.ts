import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authRoutes } from './modules/auth/auth.routes';
import { resourceRoutes } from './modules/resources/resources.routes';
import { holidayRoutes } from './modules/holidays/holidays.routes';
import { rulesRoutes } from './modules/rules/rules.routes';
import { availabilityRoutes } from './modules/availability/availability.routes';
import { bookingRoutes } from './modules/bookings/bookings.routes';
import { errorMiddleware } from './middleware/error.middleware';

dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/bookings', bookingRoutes);

// Admin routes
app.use('/api/admin/resources', resourceRoutes);
app.use('/api/admin/holidays', holidayRoutes);
app.use('/api/admin/rules', rulesRoutes);

// Error handler (must be last)
app.use(errorMiddleware as any);

export default app;
