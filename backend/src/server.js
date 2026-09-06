import { app } from './app.js';
import { env } from './config/env.js';
if (!env.JWT_ACCESS_SECRET) {
  throw new Error('Cakto JWT_ACCESS_SECRET me të paktën 32 karaktere në backend/.env.');
}
const server = app.listen(env.PORT, () =>
  console.log(`StudentHire API: http://localhost:${env.PORT}/api/health`),
);
server.on('error', (error) => {
  console.error(`Serveri nuk u nis: ${error.message}`);
  process.exit(1);
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  });
}
