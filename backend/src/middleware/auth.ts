import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization as string | undefined;
  if (!auth) return res.status(401).json({ error: 'missing auth header' });
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'invalid auth header' });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as any;
    // Map 'sub' to 'id' for compatibility with routes expecting req.user.id
    (req as any).user = {
      ...payload,
      id: payload.sub
    };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

export function authorize(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'not authenticated' });
    const roles = user.roles || [];
    if (allowedRoles.length === 0) return next();
    const ok = roles.some((r: string) => allowedRoles.includes(r));
    if (!ok) return res.status(403).json({ error: 'forbidden' });
    next();
  };
}
