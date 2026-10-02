import { Router } from 'express';
import { authenticate } from '../auth/middleware.js';
import { dashboardSummary } from './service.js';

export function createDashboardRouter(prisma) {
  const router = Router();
  router.use(authenticate(prisma));
  router.get('/', async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    try {
      res.json({ data: await dashboardSummary(prisma, req.user) });
    } catch (error) {
      next(error);
    }
  });
  return router;
}
