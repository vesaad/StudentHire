import { Router } from 'express';
import multer from 'multer';
import { rateLimit } from 'express-rate-limit';
import { authenticate, requireRole } from '../auth/middleware.js';
import { authError } from '../auth/service.js';
import { getProfile, saveProfile } from './service.js';
import { parse, profileSchema, revisionSchema } from './validation.js';
import { createCvStorage, MAX_CV_SIZE } from './cv-storage.js';
import { replaceCv, deleteCv } from './cv-service.js';

export function createStudentRouter(prisma, storage = createCvStorage()) {
  const router = Router();
  router.use(authenticate(prisma), requireRole('student'));
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  router.get('/me', async (req, res, next) => {
    try {
      res.json({ data: await getProfile(prisma, req.user.id) });
    } catch (error) {
      next(error);
    }
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
  router.put('/me', async (req, res, next) => {
    try {
      res.json({ data: await saveProfile(prisma, req.user.id, parse(profileSchema, req.body)) });
    } catch (error) {
      next(error);
    }
  });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_CV_SIZE, files: 1, fields: 1, parts: 2, fieldSize: 30 },
  }).single('cv');
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Shumë ngarkime. Provo më vonë.' } },
  });
  router.post('/me/cv', limiter, (req, res, next) => {
    upload(req, res, async (error) => {
      if (error)
        return next(
          authError(
            error.code === 'LIMIT_FILE_SIZE' ? 413 : 400,
            'UPLOAD_ERROR',
            'Ngarko vetëm një PDF deri në 5 MB.',
          ),
        );
      try {
        res.json({
          data: await replaceCv(
            prisma,
            storage,
            req.user.id,
            parse(revisionSchema, req.body?.revision),
            req.file,
          ),
        });
      } catch (error) {
        next(error);
      }
    });
  });
  router.delete('/me/cv', async (req, res, next) => {
    try {
      res.json({
        data: await deleteCv(
          prisma,
          storage,
          req.user.id,
          parse(revisionSchema, req.body?.revision),
        ),
      });
    } catch (error) {
      next(error);
    }
  });
  router.get('/me/cv', async (req, res, next) => {
    try {
      const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
      if (!student?.cvStorageKey) throw authError(404, 'CV_NOT_FOUND', 'Nuk ke ngarkuar CV.');
      const buffer = await storage.read(student.cvStorageKey);
      res.attachment('CV.pdf');
      res.type('application/pdf');
      res.set('X-Content-Type-Options', 'nosniff');
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  });
  return router;
}
