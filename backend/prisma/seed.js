import { createDatabaseClient } from '../src/config/database.js';
import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { jobFields } from '../../shared/jobFields.js';
import { seedKnowledge } from './seed-knowledge.js';

const demoCompanies = [
  { name: 'ABC Company', email: 'abc@demo.studenthire.test' },
  { name: 'XYZ Solutions', email: 'xyz@demo.studenthire.test' },
  { name: 'TechNova', email: 'technova@demo.studenthire.test' },
  { name: 'BrightPath', email: 'brightpath@demo.studenthire.test' },
  { name: 'Innovatech', email: 'innovatech@demo.studenthire.test' },
];
const includeDemo = process.argv.includes('--demo-companies');
if (includeDemo && process.env.NODE_ENV === 'production') {
  throw new Error('Kompanitë demo shtohen vetëm në mjedisin lokal të zhvillimit.');
}

const skills = [
  'HTML',
  'CSS',
  'JavaScript',
  'TypeScript',
  'React',
  'Bootstrap',
  'Node.js',
  'Express',
  'MySQL',
  'Prisma',
  'Git',
  'Python',
  'Java',
  'C#',
  'SQL',
  'Figma',
  'Microsoft Excel',
  'Komunikim',
  'Punë në ekip',
  'Menaxhim projektesh',
];

const prisma = createDatabaseClient();
try {
  // Empty updates preserve any administrator changes, including deactivation.
  await prisma.$transaction(
    [...new Set([...skills, ...jobFields.flatMap((field) => field.skills)])].map((name) =>
      prisma.skill.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );
  console.log(`Seed përfundoi: ${skills.length} aftësi bazë.`);
  console.log('Knowledge base:', await seedKnowledge(prisma));
  if (includeDemo) {
    const password = process.env.DEMO_COMPANY_PASSWORD || randomBytes(18).toString('base64url');
    if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
      throw new Error(
        'DEMO_COMPANY_PASSWORD kërkon të paktën 12 karaktere dhe jo më shumë se 72 bytes.',
      );
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const createdEmails = await prisma.$transaction(async (tx) => {
      const created = [];
      for (const company of demoCompanies) {
        const existing = await tx.user.findUnique({
          where: { email: company.email },
          include: { company: true },
        });
        if (existing) {
          if (existing.role !== 'company' || !existing.company) {
            throw new Error(
              `Email-i demo është në përdorim nga një llogari tjetër: ${company.email}`,
            );
          }
          continue; // Preserve edited profiles, passwords and approval decisions.
        }
        await tx.user.create({
          data: {
            email: company.email,
            passwordHash,
            role: 'company',
            status: 'active',
            company: { create: { name: company.name, status: 'pending' } },
          },
        });
        created.push(company.email);
      }
      return created;
    });
    console.log(
      `Kompanitë demo: ${createdEmails.length} të krijuara; ${demoCompanies.length - createdEmails.length} ekzistuese të pandryshuara.`,
    );
    if (createdEmails.length) {
      console.log(`Email-et e reja: ${createdEmails.join(', ')}`);
      if (!process.env.DEMO_COMPANY_PASSWORD)
        console.log(`Fjalëkalimi i gjeneruar për llogaritë e reja demo: ${password}`);
    }
  }
} finally {
  await prisma.$disconnect();
}
