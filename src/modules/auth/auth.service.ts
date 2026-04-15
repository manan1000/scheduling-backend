import { prisma } from '../../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError } from '../../middleware/error.middleware';

export async function login(username: string, password: string) {
  const admin = await prisma.admin.findUnique({ where: { username } });
  
  if (!admin) {
    throw new AppError('Invalid credentials', 401);
  }

  const isValid = await bcrypt.compare(password, admin.passwordHash);
  
  if (!isValid) {
    throw new AppError('Invalid credentials', 401);
  }

  const secret = process.env.JWT_SECRET || 'fallback-secret';
  const token = jwt.sign(
    { adminId: admin.id },
    secret,
    { expiresIn: '24h' }
  );

  return { token, admin: { id: admin.id, username: admin.username } };
}
