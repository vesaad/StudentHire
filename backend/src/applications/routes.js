import { Router } from 'express';
import { authenticate, requireRole } from '../auth/middleware.js';
import { authError } from '../auth/service.js';
import { requireApprovedCompany } from '../companies/service.js';
import { createCvStorage } from '../students/cv-storage.js';
import { parse, idSchema, applicationSchema, decisionSchema, listSchema } from './validation.js';
import { ownerFilter, listApplications, applicationDetails } from './queries.js';
import { applyForOffer, changeApplicationStatus } from './service.js';

export function createApplicationRouter(prisma, storage = createCvStorage()) {
  const router = Router();
  const companyGuard = requireApprovedCompany(prisma);
  router.use(authenticate(prisma));
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (req.user.role === 'company') return companyGuard(req, res, next);
    if (req.user.role !== 'student')
      return next(authError(403, 'FORBIDDEN', 'Nuk ke qasje te aplikimet.'));
    next();
  });
  router.get('/', async (req, res, next) => {
    try {
      res.json({ data: await listApplications(prisma, req.user, parse(listSchema, req.query)) });
    } catch (error) {
      next(error);
    }
  });
  router.get('/for-offer/:id', requireRole('student'), async (req, res, next) => {
    try {
      res.json({
        data: await prisma.application.findFirst({
          where: { ...ownerFilter(req.user), opportunityId: parse(idSchema, req.params.id) },
          select: { id: true, status: true },
        }),
      });
    } catch (error) {
      next(error);
    }
  });
  router.post('/', requireRole('student'), async (req, res, next) => {
    try {
      res
        .status(201)
        .json({
          data: await applyForOffer(prisma, storage, req.user, parse(applicationSchema, req.body)),
        });
    } catch (error) {
      next(error);
    }
  });
  router.get('/:id', async (req, res, next) => {
    try {
      res.json({
        data: await applicationDetails(prisma, req.user, parse(idSchema, req.params.id)),
      });
    } catch (error) {
      next(error);
    }
  });
  router.post('/:id/status', async (req, res, next) => {
    try {
      res.json({
        data: await changeApplicationStatus(
          prisma,
          req.user,
          parse(idSchema, req.params.id),
          parse(decisionSchema, req.body),
        ),
      });
    } catch (error) {
      next(error);
    }
  });
  router.get('/:id/cv', async (req, res, next) => {
    try {
      const application = await prisma.application.findFirst({
        where: { id: parse(idSchema, req.params.id), ...ownerFilter(req.user) },
        select: { cvSnapshotKey: true },
      });
      if (!application) throw authError(404, 'NOT_FOUND', 'Aplikimi nuk u gjet.');
      const buffer = await storage.read(application.cvSnapshotKey);
      res.attachment('CV-aplikimi.pdf');
      res.type('application/pdf');
      res.set('X-Content-Type-Options', 'nosniff');
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  });
  return router;
}
