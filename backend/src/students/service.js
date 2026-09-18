import { authError } from '../auth/service.js';
import { resolveSkillNames } from '../skills/resolve.js';
export const studentFields = {
  id: true,
  firstName: true,
  lastName: true,
  phone: true,
  location: true,
  university: true,
  fieldOfStudy: true,
  graduationYear: true,
  bio: true,
  revision: true,
  cvOriginalName: true,
  cvSizeBytes: true,
  cvUploadedAt: true,
  skills: { select: { skill: { select: { id: true, name: true, isActive: true } } } },
};
export const conflict = () =>
  authError(409, 'CONFLICT', 'Profili ka ndryshuar. Rifresko të dhënat dhe provo përsëri.');
export async function getProfile(prisma, userId) {
  const student = await prisma.student.findUnique({ where: { userId }, select: studentFields });
  if (!student) throw authError(404, 'NOT_FOUND', 'Profili i studentit nuk u gjet.');
  return student;
}
export async function saveProfile(prisma, userId, input) {
  const { revision, skillIds: inputIds = [], skillNames, ...fields } = input;
  return prisma.$transaction(async (tx) => {
    const changed = await tx.student.updateMany({
      where: { userId, revision, user: { status: 'active' } },
      data: { ...fields, revision: { increment: 1 } },
    });
    if (changed.count !== 1) throw conflict();
    const student = await tx.student.findUnique({ where: { userId }, include: { skills: true } });
    const skillIds =
      skillNames !== undefined
        ? await resolveSkillNames(
            tx,
            skillNames,
            student.skills.map((item) => item.skillId),
          )
        : inputIds;
    const skills = await tx.skill.findMany({ where: { id: { in: skillIds } } });
    const previousIds = new Set(student.skills.map((item) => item.skillId));
    if (
      skills.length !== skillIds.length ||
      skills.some((skill) => !skill.isActive && !previousIds.has(skill.id))
    ) {
      throw authError(400, 'INVALID_SKILLS', 'Zgjidh aftësi nga katalogu aktiv.');
    }
    await tx.studentSkill.deleteMany({ where: { studentId: student.id } });
    if (skillIds.length)
      await tx.studentSkill.createMany({
        data: skillIds.map((skillId) => ({ studentId: student.id, skillId })),
      });
    return getProfile(tx, userId);
  });
}
