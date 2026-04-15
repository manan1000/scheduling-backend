import { Request, Response, NextFunction } from 'express';
import * as rulesService from './rules.service';

export async function getAll(req: Request, res: Response, next: NextFunction) {
  try {
    const rules = await rulesService.getAllRules();
    res.json(rules);
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const { value, description } = req.body;
    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required' });
    }
    const rule = await rulesService.updateRule(req.params.key as string, String(value), description);
    res.json(rule);
  } catch (error) {
    next(error);
  }
}
