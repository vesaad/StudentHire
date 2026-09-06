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
app.use(notFound);
app.use(errorHandler);
