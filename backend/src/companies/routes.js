import { Router } from 'express';
import { authenticate, requireRole } from '../auth/middleware.js';
import { authError } from '../auth/service.js';
import { parse, profileSchema, decisionSchema, listSchema, idSchema } from './validation.js';
import { companyDetails, saveProfile, decideCompany } from './service.js';

export function createCompanyRouter(prisma) {
  const router = Router();
  router.use(authenticate(prisma));
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  router.get('/me', requireRole('company'), async (req, res, next) => {
    try {
      const company = await prisma.company.findUnique({
        where: { userId: req.user.id },
        include: companyDetails,
      });
      if (!company) throw authError(404, 'NOT_FOUND', 'Profili nuk u gjet.');
      res.json({ data: company });
    } catch (error) {
      next(error);
    }
  });
  router.put('/me', requireRole('company'), async (req, res, next) => {
    try {
      res.json({ data: await saveProfile(prisma, req.user.id, parse(profileSchema, req.body)) });
    } catch (error) {
      next(error);
    }
  });
  router.get('/', requireRole('admin'), async (req, res, next) => {
    try {
      const { page, status, q } = parse(listSchema, req.query);
      const where = {
        ...(status === 'all' ? {} : { status }),
        ...(q ? { OR: [{ name: { contains: q } }, { user: { email: { contains: q } } }] } : {}),
      };
      const [items, total] = await Promise.all([
        prisma.company.findMany({
          where,
          skip: (page - 1) * 10,
          take: 10,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          include: { user: { select: { email: true, status: true } } },
        }),
        prisma.company.count({ where }),
      ]);
      res.json({ data: { items, total, page } });
    } catch (error) {
      next(error);
    }
  });
  router.get('/:id', requireRole('admin'), async (req, res, next) => {
    try {
      const company = await prisma.company.findUnique({
        where: { id: parse(idSchema, req.params.id) },
        include: companyDetails,
      });
      if (!company) throw authError(404, 'NOT_FOUND', 'Kompania nuk u gjet.');
      res.json({ data: company });
    } catch (error) {
      next(error);
    }
  });
  router.post('/:id/decisions', requireRole('admin'), async (req, res, next) => {
    try {
      res.json({
        data: await decideCompany(
          prisma,
          parse(idSchema, req.params.id),
          req.user.id,
          parse(decisionSchema, req.body),
        ),
      });
    } catch (error) {
      next(error);
    }
  });
  return router;
}
