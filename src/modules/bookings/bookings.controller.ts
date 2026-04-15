import { Request, Response, NextFunction } from 'express';
import * as bookingService from './bookings.service';

// Public: create a booking (customer)
export async function createBooking(req: Request, res: Response, next: NextFunction) {
  try {
    const booking = await bookingService.createBooking(req.body);
    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
}

// Admin: create a booking (can override rules)
export async function createAdminBooking(req: Request, res: Response, next: NextFunction) {
  try {
    const booking = await bookingService.createAdminBooking(req.body);
    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
}

// Admin: list all bookings
export async function getAllBookings(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, environmentType, startDate, endDate } = req.query;
    const bookings = await bookingService.getAllBookings({
      status: status as string,
      environmentType: environmentType as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    res.json(bookings);
  } catch (error) {
    next(error);
  }
}

// Admin: get single booking
export async function getBookingById(req: Request, res: Response, next: NextFunction) {
  try {
    const booking = await bookingService.getBookingById(req.params.id);
    res.json(booking);
  } catch (error) {
    next(error);
  }
}

// Admin: update booking
export async function updateBooking(req: Request, res: Response, next: NextFunction) {
  try {
    const booking = await bookingService.updateBooking(req.params.id, req.body);
    res.json(booking);
  } catch (error) {
    next(error);
  }
}

// Admin: cancel/delete booking
export async function deleteBooking(req: Request, res: Response, next: NextFunction) {
  try {
    await bookingService.deleteBooking(req.params.id);
    res.json({ message: 'Booking cancelled' });
  } catch (error) {
    next(error);
  }
}
