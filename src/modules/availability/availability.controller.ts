import { Request, Response, NextFunction } from 'express';
import { getAvailability } from './availability.service';

export async function getAvailableSlots(req: Request, res: Response, next: NextFunction) {
  try {
    const { environmentType, osrRequired, month } = req.query;

    if (!environmentType || !['UT', 'PROD'].includes(String(environmentType))) {
      return res.status(400).json({ error: 'environmentType must be UT or PROD' });
    }

    const result = await getAvailability({
      environmentType: environmentType as 'UT' | 'PROD',
      osrRequired: osrRequired === 'true',
      month: month as string | undefined,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}
