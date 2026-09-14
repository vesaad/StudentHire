import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function authError(status, code, message) {
  return Object.assign(new Error(message), { status, code });
}
export function publicUser(user) {
  return { id: user.id, email: user.email, role: user.role, status: user.status };
}
export function createSession(user) {
  const token = jwt.sign({}, env.JWT_ACCESS_SECRET, {
    subject: String(user.id),
    expiresIn: '15m',
    algorithm: 'HS256',
    issuer: 'studenthire',
    audience: 'studenthire-web',
  });
  return { token, user: publicUser(user) };
}
export async function register(prisma, data) {
  const passwordHash = await bcrypt.hash(data.password, 12);
  const profile =
    data.role === 'student'
      ? { student: { create: { firstName: data.firstName, lastName: data.lastName } } }
      : { company: { create: { name: data.companyName } } };
  try {
    // Prisma krijon përdoruesin dhe profilin në të njëjtin transaksion.
    return await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: data.role,
        ...profile,
      },
    });
  } catch (error) {
    if (error.code === 'P2002')
      throw authError(409, 'EMAIL_EXISTS', 'Ky email është përdorur tashmë.');
    throw error;
  }
}
export async function login(prisma, data) {
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  // I njëjti kontroll hash edhe për email që nuk ekziston.
  const hash = user?.passwordHash || '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW';
  const matches = await bcrypt.compare(data.password, hash);
  if (!user || !matches)
    throw authError(401, 'INVALID_CREDENTIALS', 'Email-i ose fjalëkalimi është i gabuar.');
  if (user.status !== 'active')
    throw authError(403, 'ACCOUNT_SUSPENDED', 'Llogaria është pezulluar.');
  return user;
}
