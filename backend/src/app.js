import { createOpportunityRouter } from './opportunities/routes.js';
import { createApplicationRouter } from './applications/routes.js';
import { createRecommendationRouter } from './recommendations/routes.js';
import { createNotificationRouter } from './notifications/routes.js';
import { createCatalogRouter } from './catalog/routes.js';
import { createSavedOffersRouter } from './saved-offers/routes.js';
import { createStudentRouter } from './students/routes.js';
import { createCompanyRouter } from './companies/routes.js';
import { createAuthRouter, getDatabase } from './auth/routes.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/errors.js';
export const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN }));
if (env.NODE_ENV !== 'test') app.use(morgan('dev'));
app.use(express.json({ limit: '100kb' }));
app.get('/api/health', (req, res) =>
  res.json({ data: { status: 'ok', service: 'StudentHire API' } }),
);
let authRouter;
app.use('/api/auth', (req, res, next) => {
  try {
    if (!env.JWT_ACCESS_SECRET)
      throw new Error('JWT_ACCESS_SECRET duhet t� ket� t� pakt�n 32 karaktere.');
    authRouter ??= createAuthRouter(getDatabase());
    authRouter(req, res, next);
  } catch (error) {
    next(error);
  }
});
let companyRouter;
app.use('/api/companies', (req, res, next) => {
  try {
    companyRouter ??= createCompanyRouter(getDatabase());
    companyRouter(req, res, next);
  } catch (error) {
    next(error);
  }
});
let studentRouter;
app.use('/api/students', (req, res, next) => {
  try {
    studentRouter ??= createStudentRouter(getDatabase());
    studentRouter(req, res, next);
  } catch (error) {
    next(error);
  }
});
let opportunityRouter;
app.use('/api/company-opportunities', (req, res, next) => {
  try {
    opportunityRouter ??= createOpportunityRouter(getDatabase());
    opportunityRouter(req, res, next);
  } catch (error) {
    next(error);
  }
});
let catalogRouter;
app.use('/api/opportunities', (req, res, next) => {
  try {
    catalogRouter ??= createCatalogRouter(getDatabase());
    catalogRouter(req, res, next);
  } catch (error) {
    next(error);
  }
});
let savedOffersRouter;
app.use('/api/saved-opportunities', (req, res, next) => {
  try {
    savedOffersRouter ??= createSavedOffersRouter(getDatabase());
    savedOffersRouter(req, res, next);
  } catch (error) {
    next(error);
  }
});
let applicationRouter;
app.use('/api/applications', (req, res, next) => {
  try {
    applicationRouter ??= createApplicationRouter(getDatabase());
    applicationRouter(req, res, next);
  } catch (error) {
    next(error);
  }
});
let recommendationRouter;
app.use('/api/recommendations', (req, res, next) => {
  try {
    recommendationRouter ??= createRecommendationRouter(getDatabase());
    recommendationRouter(req, res, next);
  } catch (error) {
    next(error);
  }
});
let notificationRouter;
app.use('/api/notifications', (req, res, next) => {
  try {
    notificationRouter ??= createNotificationRouter(getDatabase());
    notificationRouter(req, res, next);
  } catch (error) {
    next(error);
  }
});
app.use(notFound);
app.use(errorHandler);
