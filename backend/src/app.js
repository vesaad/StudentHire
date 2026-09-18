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
app.use(notFound);
app.use(errorHandler);
