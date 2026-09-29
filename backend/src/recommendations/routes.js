import { Router } from 'express';
import { authenticate, requireRole } from '../auth/middleware.js';
import { parse, pageSchema, idSchema } from '../catalog/validation.js';
import { recommendations, offerMatch } from './service.js';

export function createRecommendationRouter(prisma) {
  const router = Router();
  router.use(authenticate(prisma), requireRole('student'));
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  router.get('/', async (req, res, next) => {
    try {
      res.json({
        data: await recommendations(prisma, req.user.id, parse(pageSchema, req.query).page),
      });
    } catch (error) {
      next(error);
    }
  });
  router.get('/:id', async (req, res, next) => {
    try {
      res.json({ data: await offerMatch(prisma, req.user.id, parse(idSchema, req.params.id)) });
    } catch (error) {
      next(error);
    }
  });
  return router;
}
