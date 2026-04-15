import { Request, Response, NextFunction } from 'express';
import * as holidayService from './holidays.service';

export async function getAllHolidays(req: Request, res: Response, next: NextFunction) {
  try {
    const holidays = await holidayService.getAllHolidays();
    res.json(holidays);
  } catch (error) {
    next(error);
  }
}

export async function createHoliday(req: Request, res: Response, next: NextFunction) {
  try {
    const holiday = await holidayService.createHoliday(req.body);
    res.status(201).json(holiday);
  } catch (error) {
    next(error);
  }
}

export async function deleteHoliday(req: Request, res: Response, next: NextFunction) {
  try {
    await holidayService.deleteHoliday(req.params.id as string);
    res.json({ message: 'Holiday removed' });
  } catch (error) {
    next(error);
  }
}

export async function getBlockedDays(req: Request, res: Response, next: NextFunction) {
  try {
    const blockedDays = await holidayService.getBlockedDays();
    res.json(blockedDays);
  } catch (error) {
    next(error);
  }
}

export async function addBlockedDay(req: Request, res: Response, next: NextFunction) {
  try {
    const blockedDay = await holidayService.addBlockedDay(req.body.dayOfWeek);
    res.status(201).json(blockedDay);
  } catch (error) {
    next(error);
  }
}

export async function removeBlockedDay(req: Request, res: Response, next: NextFunction) {
  try {
    await holidayService.removeBlockedDay(req.params.id as string);
    res.json({ message: 'Blocked day removed' });
  } catch (error) {
    next(error);
  }
}
