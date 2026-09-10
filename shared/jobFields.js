export const jobFields = [
  {
    value: 'technology',
    label: 'Teknologji',
    skills: [
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
    ],
  },
  {
    value: 'marketing',
    label: 'Marketing dhe shitje',
    skills: ['SEO', 'Rrjete sociale', 'Shkrim përmbajtjeje', 'Shitje', 'Google Ads'],
  },
  {
    value: 'finance',
    label: 'Financë dhe kontabilitet',
    skills: ['Microsoft Excel', 'Kontabilitet', 'Analizë financiare', 'Buxhetim'],
  },
  {
    value: 'health',
    label: 'Shëndetësi',
    skills: ['Kujdes infermieror', 'Ndihma e parë', 'Kujdes ndaj pacientit'],
  },
  {
    value: 'education',
    label: 'Arsim',
    skills: ['Mësimdhënie', 'Planifikim mësimor', 'Pedagogji'],
  },
  {
    value: 'engineering',
    label: 'Inxhinieri',
    skills: ['AutoCAD', 'SolidWorks', 'Projektim teknik'],
  },
  {
    value: 'law',
    label: 'Drejtësi',
    skills: ['Kërkim juridik', 'Hartim kontratash', 'Analizë ligjore'],
  },
  {
    value: 'design',
    label: 'Dizajn dhe media',
    skills: ['Figma', 'Photoshop', 'Illustrator', 'Dizajn grafik', 'Montazh video'],
  },
  {
    value: 'tourism',
    label: 'Turizëm dhe hoteleri',
    skills: ['Shërbim ndaj klientit', 'Menaxhim rezervimesh', 'Gjuhë angleze'],
  },
  {
    value: 'administration',
    label: 'Administratë dhe burime njerëzore',
    skills: ['Microsoft Excel', 'Microsoft Word', 'Rekrutim', 'Organizim dokumentesh'],
  },
  {
    value: 'logistics',
    label: 'Logjistikë dhe prodhim',
    skills: ['Menaxhim inventari', 'Planifikim transporti', 'Kontroll cilësie'],
  },
  {
    value: 'other',
    label: 'Fusha të tjera',
    skills: ['Komunikim', 'Punë në ekip', 'Menaxhim projektesh'],
  },
];
export const jobFieldValues = jobFields.map(({ value }) => value);
export const workModes = { onsite: 'Në zyrë', hybrid: 'Hibride', remote: 'Në distancë' };
export const normalizeSkillName = (value) => value.normalize('NFKC').trim().replace(/\s+/g, ' ');
export const skillKey = (value) => normalizeSkillName(value).toLocaleLowerCase('sq');
