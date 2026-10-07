import { jobFields, skillKey } from '../../../shared/jobFields.js';

// Curated domain knowledge, not learned associations. A category alone never awards points.
export const canonicalFields = jobFields
  .filter((field) => field.value !== 'other')
  .map((field) => field.value);
const group = (name, fields, names, isGeneric = false) => ({
  name,
  fields,
  names: names.split('|'),
  isGeneric,
});
export const categories = [
  group('Frontend', ['technology'], 'HTML|CSS|JavaScript|TypeScript|React|Bootstrap'),
  group('Backend', ['technology'], 'Node.js|Express|Java|C#|Python|REST API'),
  group('Database', ['technology'], 'SQL|MySQL|PostgreSQL|MongoDB|Prisma'),
  group('Cloud / DevOps', ['technology'], 'AWS|Azure|Docker|Kubernetes|Git|GitHub'),
  group(
    'Marketing dhe shitje',
    ['marketing'],
    'SEO|Rrjete sociale|Shkrim përmbajtjeje|Shitje|Google Ads|Google Analytics|Email Marketing|Digital Marketing|Copywriting|Content Marketing|Social Media|Market Research|CRM',
  ),
  group(
    'Financë dhe kontabilitet',
    ['finance'],
    'Kontabilitet|Analizë financiare|Buxhetim|Tatime|Audit|Analizë e kostove|Menaxhim i riskut financiar|Raportim financiar|Planifikim financiar|Menaxhim financiar|Bookkeeping',
  ),
  group(
    'Kujdes shëndetësor',
    ['health'],
    'Kujdes infermieror|Ndihma e parë|Kujdes ndaj pacientit|Administrim i barnave|Dokumentacion mjekësor|Kontroll i infeksioneve|Monitorim i pacientit|Terminologji mjekësore|Komunikim me pacientë|Licencë aktive pune',
  ),
  group(
    'Arsim dhe pedagogji',
    ['education'],
    'Mësimdhënie|Planifikim mësimor|Pedagogji|Menaxhim klase|Mësim online|Google Classroom|Vlerësim i nxënësve|Zhvillim i kurrikulës',
  ),
  group(
    'Inxhinieri dhe projektim',
    ['engineering'],
    'AutoCAD|SolidWorks|Projektim teknik|BIM (Revit)|MATLAB|Lexim i vizatimeve teknike|Analizë teknike|Planifikim projekti|Menaxhim ndërtimi|Siguri në punë',
  ),
  group(
    'Drejtësi',
    ['law'],
    'Kërkim juridik|Hartim kontratash|Analizë ligjore|E drejta civile|E drejta penale|E drejta e punës|Legal Writing|Përgatitje dokumentesh ligjore|Compliance',
  ),
  group(
    'Dizajn dhe media',
    ['design'],
    'Figma|Photoshop|Illustrator|Dizajn grafik|Montazh video|Canva|Adobe After Effects|Adobe Premiere Pro|Branding|Fotografi|Motion Graphics|Typography|UI Design|UX Design|Video Editing',
  ),
  group(
    'Turizëm dhe hoteleri',
    ['tourism'],
    'Menaxhim rezervimesh|Hospitality Management|Menaxhim hoteli|Recepsion|Sisteme rezervimi|Menaxhim eventesh',
  ),
  group(
    'Administratë dhe HR',
    ['administration'],
    'Microsoft Word|Rekrutim|Organizim dokumentesh|Administrim zyre|Burime njerëzore|Intervistim|Menaxhim dokumentacioni|Menaxhim i stafit|Menaxhim performance|Onboarding|Payroll',
  ),
  group(
    'Logjistikë dhe prodhim',
    ['logistics'],
    'Menaxhim inventari|Planifikim transporti|Kontroll cilësie|Logistics Management|Menaxhim furnizimi|Menaxhim magazine|Menaxhim operacionesh|Planifikim prodhimi|Prokurim|Supply Chain Management',
  ),
  group('Analizë me tabela', ['finance', 'administration', 'logistics'], 'Microsoft Excel'),
  group(
    'Komunikim dhe bashkëpunim',
    canonicalFields,
    'Komunikim|Punë në ekip|Gjuhë angleze|Prezantim|Negocim|Menaxhim projektesh|Microsoft PowerPoint|Communication|Teamwork|Time Management|Problem Solving',
    true,
  ),
  group(
    'Shërbim ndaj klientit',
    ['tourism', 'marketing', 'administration', 'logistics'],
    'Shërbim ndaj klientit|Customer Experience|Menaxhim ankesash',
    true,
  ),
];
const extraFields = {
  Canva: ['marketing'],
  Branding: ['marketing'],
  'Shkrim përmbajtjeje': ['design'],
  'Microsoft Word': ['law'],
  Payroll: ['finance'],
  Compliance: ['finance'],
  'E drejta e punës': ['administration'],
  'Kontroll cilësie': ['engineering'],
  'Siguri në punë': ['logistics'],
  'Menaxhim eventesh': ['marketing'],
};

export function knowledgeForSkill(name) {
  const category = categories.find((item) =>
    item.names.some((value) => skillKey(value) === skillKey(name)),
  );
  if (!category) return { category: 'Pa klasifikim', isGeneric: true, fields: [] };
  const extras =
    Object.entries(extraFields).find(([value]) => skillKey(value) === skillKey(name))?.[1] || [];
  return {
    category: category.name,
    isGeneric: category.isGeneric,
    fields: [...new Set([...category.fields, ...extras])].map((field) => ({
      field,
      relevanceWeight: category.isGeneric ? 0.25 : 1,
    })),
  };
}

// Both directions are seeded explicitly. Values are partial credit, never equivalence.
export const relationships = [
  ['React', 'JavaScript', 0.5],
  ['React', 'TypeScript', 0.5],
  ['JavaScript', 'TypeScript', 0.7],
  ['Node.js', 'Express', 0.6],
  ['SQL', 'MySQL', 0.7],
  ['SQL', 'PostgreSQL', 0.7],
  ['MySQL', 'PostgreSQL', 0.6],
  ['AWS', 'Azure', 0.5],
  ['Photoshop', 'Illustrator', 0.4],
  ['Canva', 'Figma', 0.3],
  ['Kontabilitet', 'Bookkeeping', 0.7],
  ['Analizë financiare', 'Raportim financiar', 0.5],
  ['Rrjete sociale', 'Social Media', 0.8],
  ['Copywriting', 'Shkrim përmbajtjeje', 0.7],
  ['AutoCAD', 'SolidWorks', 0.4],
  ['Kujdes infermieror', 'Kujdes ndaj pacientit', 0.5],
  ['Mësimdhënie', 'Pedagogji', 0.5],
  ['Kërkim juridik', 'Analizë ligjore', 0.5],
  ['Menaxhim rezervimesh', 'Sisteme rezervimi', 0.6],
  ['Organizim dokumentesh', 'Menaxhim dokumentacioni', 0.7],
  ['Menaxhim inventari', 'Menaxhim magazine', 0.6],
];
