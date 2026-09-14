import '../src/config/env.js';
import bcrypt from 'bcrypt';
import { createDatabaseClient } from '../src/config/database.js';
import { emailSchema, passwordSchema } from '../src/auth/validation.js';

// Ekzekutohet vetëm lokalisht nga operatori; nuk ekziston endpoint publik për admin.
const email = emailSchema.parse(process.env.ADMIN_EMAIL);
const password = passwordSchema.parse(process.env.ADMIN_PASSWORD);
const prisma = createDatabaseClient();
try {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error('Email-i ekziston. Asnjë llogari nuk u ndryshua.');
  await prisma.user.create({
    data: { email, passwordHash: await bcrypt.hash(password, 12), role: 'admin' },
  });
  console.log('Administratori u krijua. Largo ADMIN_PASSWORD nga mjedisi pas përdorimit.');
} finally {
  await prisma.$disconnect();
}
