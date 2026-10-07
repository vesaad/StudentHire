import { Router } from 'express';
import { parse, searchSchema, idSchema } from './validation.js';
import { searchOffers, offerDetails, visibleOffers } from './service.js';
import { jobFields } from '../../../shared/jobFields.js';
import { authenticate, requireRole } from '../auth/middleware.js';
import { offerMatch } from '../recommendations/service.js';

export function createCatalogRouter(prisma) {
  const router = Router();
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  router.get('/skills', async (req, res, next) => {
    try {
      const { field } = parse(searchSchema, req.query);
      const names = jobFields.find((item) => item.value === field)?.skills || [];
      res.json({
        data: await prisma.skill.findMany({
          where: {
            isActive: true,
            ...(field
              ? {
                  OR: [
                    { fields: { some: { field } } },
                    { name: { in: names } },
                    { opportunities: { some: { opportunity: { field } } } },
                  ],
                }
              : {}),
          },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
      });
    } catch (error) {
      next(error);
    }
  });
  router.get('/', async (req, res, next) => {
    try {
      res.json({ data: await searchOffers(prisma, parse(searchSchema, req.query)) });
    } catch (error) {
      next(error);
    }
  });
  router.get('/sectors', async (req, res, next) => {
    try {
      const sectors = await prisma.opportunity.groupBy({
        by: ['field'],
        where: visibleOffers(),
        _count: { _all: true },
      });
      res.json({
        data: jobFields.map(({ value, label }) => ({
          value,
          label,
          total: sectors.find((sector) => sector.field === value)?._count._all || 0,
        })),
      });
    } catch (error) {
      next(error);
    }
  });
  router.get('/:id/match', authenticate(prisma), requireRole('student'), async (req, res, next) => {
    try {
      res.json({ data: await offerMatch(prisma, req.user.id, parse(idSchema, req.params.id)) });
    } catch (error) {
      next(error);
    }
  });
  router.get('/:id', async (req, res, next) => {
    try {
      res.json({ data: await offerDetails(prisma, parse(idSchema, req.params.id)) });
    } catch (error) {
      next(error);
    }
  });
  return router;
}
