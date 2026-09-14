import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { createDatabaseClient } from '../config/database.js';
import { registrationSchema, loginSchema, validate } from './validation.js';
import { register, login, createSession, publicUser } from './service.js';
import { authenticate, requireRole } from './middleware.js';

let database;
export function getDatabase() {
  database ??= createDatabaseClient();
  return database;
}
export function createAuthRouter(prisma) {
  const router = Router();
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Shumë tentativa. Provo përsëri pas 15 minutash.',
      },
    },
  });
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  router.post('/register', limiter, async (req, res, next) => {
    try {
      const user = await register(prisma, validate(registrationSchema, req.body));
      res.status(201).json({ data: createSession(user) });
    } catch (error) {
      next(error);
    }
  });
  router.post('/login', limiter, async (req, res, next) => {
    try {
      const user = await login(prisma, validate(loginSchema, req.body));
      res.json({ data: createSession(user) });
    } catch (error) {
      next(error);
    }
  });
  router.get('/me', authenticate(prisma), (req, res) => res.json({ data: publicUser(req.user) }));
  router.post('/renew', authenticate(prisma), (req, res) => {
    res.json({ data: createSession(req.user) });
  });
  for (const role of ['student', 'company', 'admin']) {
    router.get(
      `/workspace/${role}`,
      authenticate(prisma),
      requireRole(role),
      async (req, res, next) => {
        try {
          // Profili merret vetëm për përdoruesin e autentikuar, jo nga një ID e klientit.
          let profile = null;
          if (role === 'student')
            profile = await prisma.student.findUnique({
              where: { userId: req.user.id },
              select: { firstName: true, lastName: true },
            });
          if (role === 'company')
            profile = await prisma.company.findUnique({
              where: { userId: req.user.id },
              select: { name: true, status: true },
            });
          res.json({ data: { user: publicUser(req.user), profile } });
        } catch (error) {
          next(error);
        }
      },
    );
  }
  return router;
}
