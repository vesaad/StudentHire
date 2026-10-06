import { Router } from 'express';
import { authenticate, requireRole } from '../auth/middleware.js';
import {
  parse,
  idSchema,
  userQuery,
  accountSchema,
} from './validation.js';
import { adminList } from './queries.js';
import { changeAccount } from './service.js';
export function createAdminRouter(prisma) {
  const router = Router();
  router.use(authenticate(prisma), requireRole('admin'));
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  for (const [section, schema] of Object.entries({
    users: userQuery,
  }))
    router.get(`/${section}`, async (req, res, next) => {
      try {
        res.json({ data: await adminList(prisma, section, parse(schema, req.query)) });
      } catch (error) {
        next(error);
      }
    });
  router.patch('/users/:id/status', async (req, res, next) => {
    try {
      res.json({
        data: await changeAccount(
          prisma,
          req.user.id,
          parse(idSchema, req.params.id),
          parse(accountSchema, req.body),
        ),
      });
    } catch (error) {
      next(error);
    }
  });
  return router;
}
