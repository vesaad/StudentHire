import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../auth/middleware.js';
import { authError } from '../auth/service.js';
import { pageSchema, idSchema, parse } from '../catalog/validation.js';

const listSchema = pageSchema.extend({ filter: z.enum(['all', 'unread']).default('all'), category: z.enum(['all', 'offers', 'applications', 'system']).default('all') });
const categories = {
  offers: ['opportunity_moderated'],
  applications: ['application_received', 'application_status_changed'],
  system: ['account_status_changed', 'company_decision'],
};
export const notificationFields = {
  id: true,
  type: true,
  title: true,
  message: true,
  applicationId: true,
  companyApprovalId: true,
  readAt: true,
  createdAt: true,
};

export function createNotificationRouter(prisma) {
  const router = Router();
  router.use(authenticate(prisma));
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  router.get('/unread-count', async (req, res, next) => {
    try {
      res.json({
        data: {
          count: await prisma.notification.count({ where: { userId: req.user.id, readAt: null } }),
        },
      });
    } catch (error) {
      next(error);
    }
  });
  router.get('/', async (req, res, next) => {
    try {
      const { page, filter, category } = parse(listSchema, req.query);
      const base = { userId: req.user.id, ...(filter === 'unread' ? { readAt: null } : {}) };
      const where = { ...base, ...(category === 'all' ? {} : { type: { in: categories[category] } }) };
      const [items, total, unreadCount, all, offers, applications, system] = await prisma.$transaction([
        prisma.notification.findMany({
          where,
          select: notificationFields,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * 10,
          take: 10,
        }),
        prisma.notification.count({ where }),
        prisma.notification.count({ where: { userId: req.user.id, readAt: null } }),
        prisma.notification.count({ where: base }),
        ...Object.values(categories).map((types) => prisma.notification.count({ where: { ...base, type: { in: types } } })),
      ]);
      res.json({ data: { items, total, unreadCount, page, counts: { all, offers, applications, system } } });
    } catch (error) {
      next(error);
    }
  });
  router.patch('/:id/read', async (req, res, next) => {
    try {
      const id = parse(idSchema, req.params.id);
      await prisma.notification.updateMany({
        where: { id, userId: req.user.id, readAt: null },
        data: { readAt: new Date() },
      });
      const notification = await prisma.notification.findFirst({
        where: { id, userId: req.user.id },
        select: notificationFields,
      });
      if (!notification) throw authError(404, 'NOT_FOUND', 'Njoftimi nuk u gjet.');
      res.json({ data: notification });
    } catch (error) {
      next(error);
    }
  });
  return router;
}
