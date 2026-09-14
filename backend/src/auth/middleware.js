import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { authError } from './service.js';

export function authenticate(prisma) {
  return async (req, res, next) => {
    const authorization = req.get('Authorization') || '';
    if (!authorization.startsWith('Bearer ')) {
      return next(authError(401, 'UNAUTHORIZED', 'Duhet të hysh në llogari.'));
    }
    let payload;
    try {
      payload = jwt.verify(authorization.slice(7), env.JWT_ACCESS_SECRET, {
        algorithms: ['HS256'],
        issuer: 'studenthire',
        audience: 'studenthire-web',
      });
      if (!/^\d+$/.test(payload.sub)) throw new Error('Invalid subject');
    } catch {
      return next(authError(401, 'UNAUTHORIZED', 'Sesioni ka skaduar ose është i pavlefshëm.'));
    }
    try {
      // Statusi dhe roli lexohen nga databaza në çdo kërkesë.
      const user = await prisma.user.findUnique({ where: { id: Number(payload.sub) } });
      if (!user) return next(authError(401, 'UNAUTHORIZED', 'Sesioni është i pavlefshëm.'));
      if (user.status !== 'active')
        return next(authError(403, 'ACCOUNT_SUSPENDED', 'Llogaria është pezulluar.'));
      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}
export function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role)
      return next(authError(403, 'FORBIDDEN', 'Nuk ke qasje në këtë hapësirë.'));
    next();
  };
}
