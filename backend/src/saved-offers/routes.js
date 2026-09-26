import { Router } from 'express';
import { authenticate, requireRole } from '../auth/middleware.js';
import { parse, idSchema, pageSchema } from '../catalog/validation.js';
import { findStudent, listSaved, saveOffer } from './service.js';

export function createSavedOffersRouter(prisma) {
  const router = Router();
  router.use(authenticate(prisma), requireRole('student'));
  router.use(async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    try {
      req.student = await findStudent(prisma, req.user.id);
      next();
    } catch (error) {
      next(error);
    }
  });
  router.get('/', async (req, res, next) => {
    try {
      res.json({
        data: await listSaved(prisma, req.student.id, parse(pageSchema, req.query).page),
      });
    } catch (error) {
      next(error);
    }
  });
  router.get('/:id', async (req, res, next) => {
    try {
      const opportunityId = parse(idSchema, req.params.id);
      const saved = await prisma.savedOpportunity.findUnique({
        where: { studentId_opportunityId: { studentId: req.student.id, opportunityId } },
      });
      res.json({ data: { saved: Boolean(saved) } });
    } catch (error) {
      next(error);
    }
  });
  router.put('/:id', async (req, res, next) => {
    try {
      await saveOffer(prisma, req.student.id, parse(idSchema, req.params.id));
      res.json({ data: { saved: true } });
    } catch (error) {
      next(error);
    }
  });
  router.delete('/:id', async (req, res, next) => {
    try {
      await prisma.savedOpportunity.deleteMany({
        where: { studentId: req.student.id, opportunityId: parse(idSchema, req.params.id) },
      });
      res.json({ data: { saved: false } });
    } catch (error) {
      next(error);
    }
  });
  return router;
}
