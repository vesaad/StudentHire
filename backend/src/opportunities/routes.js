import { Router } from 'express';
import { authenticate, requireRole } from '../auth/middleware.js';
import { requireApprovedCompany } from '../companies/service.js';
import {
  parse,
  createSchema,
  updateSchema,
  revisionSchema,
  idSchema,
  listSchema,
} from './validation.js';
import { createOpportunity, updateOpportunity, getOpportunity, changeStatus } from './service.js';

export function createOpportunityRouter(prisma) {
  const router = Router();
  router.use(authenticate(prisma), requireRole('company'), requireApprovedCompany(prisma));
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  router.get('/skills', async (req, res, next) => {
    try {
      res.json({
        data: await prisma.skill.findMany({
          where: { isActive: true },
          select: { id: true, name: true, isActive: true },
          orderBy: { name: 'asc' },
        }),
      });
    } catch (error) {
      next(error);
    }
  });
  router.get('/', async (req, res, next) => {
    try {
      const { page, status } = parse(listSchema, req.query);
      const where = { companyId: req.company.id, ...(status === 'all' ? {} : { status }) };
      const [items, total] = await Promise.all([
        prisma.opportunity.findMany({
          where,
          skip: (page - 1) * 10,
          take: 10,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        }),
        prisma.opportunity.count({ where }),
      ]);
      res.json({ data: { items, total, page } });
    } catch (error) {
      next(error);
    }
  });
  router.get('/:id', async (req, res, next) => {
    try {
      res.json({
        data: await getOpportunity(prisma, req.company.id, parse(idSchema, req.params.id)),
      });
    } catch (error) {
      next(error);
    }
  });
  router.post('/', async (req, res, next) => {
    try {
      res
        .status(201)
        .json({
          data: await createOpportunity(prisma, req.company.id, parse(createSchema, req.body)),
        });
    } catch (error) {
      next(error);
    }
  });
  router.put('/:id', async (req, res, next) => {
    try {
      res.json({
        data: await updateOpportunity(
          prisma,
          req.company.id,
          parse(idSchema, req.params.id),
          parse(updateSchema, req.body),
        ),
      });
    } catch (error) {
      next(error);
    }
  });
  for (const action of ['publish', 'close'])
    router.post(`/:id/${action}`, async (req, res, next) => {
      try {
        res.json({
          data: await changeStatus(
            prisma,
            req.company.id,
            parse(idSchema, req.params.id),
            parse(revisionSchema, req.body).revision,
            action,
          ),
        });
      } catch (error) {
        next(error);
      }
    });
  return router;
}
