import { Request, Response, NextFunction } from 'express';
import { login } from './auth.service';

export async function loginController(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const result = await login(username, password);
    return res.json(result);
  } catch (error) {
    next(error);
  }
}
