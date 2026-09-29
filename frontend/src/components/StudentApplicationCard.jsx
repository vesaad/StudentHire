import { Link } from 'react-router-dom';
import { applicationStatuses } from '../data/applicationStatuses.js';
import { jobFields, workModes } from '../../../shared/jobFields.js';

const statusMessages = {
  pending: 'Aplikimi yt është dërguar dhe është në pritje të shqyrtimit nga kompania.',
  reviewed: 'Kompania po shqyrton aplikimin tënd. Ndiq këtu përditësimet e radhës.',
  accepted: 'Urime! Kompania e ka pranuar aplikimin tënd. Shiko detajet për më shumë.',
  rejected: 'Ky aplikim nuk u pranua. Eksploro oferta të tjera që përputhen me aftësitë e tua.',
  withdrawn: 'E ke tërhequr këtë aplikim. Mund të vazhdosh të eksplorosh mundësi të tjera.',
};

function Icon({ kind }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === 'pin' ? (
        <>
          <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </>
      ) : kind === 'clock' ? (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 6v6l4 2" />
        </>
      ) : kind === 'work' ? (
        <>
          <rect x="3" y="7" width="18" height="14" rx="3" />
          <path d="M8 7V3h8v4M3 12h18M12 10v4" />
        </>
      ) : kind === 'mode' ? (
        <path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 4l-4 16" />
      ) : (
        <>
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path d="M9 8h6M9 12h6M9 16h4" />
        </>
      )}
    </svg>
  );
}

export default function StudentApplicationCard({ item }) {
  const offer = item.opportunity;
  const href = `/dashboard/student/applications/${item.id}`;
  const initials = offer.company.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
  const field = jobFields.find((field) => field.value === offer.field)?.label;
  return (
    <article className="student-application-card">
      <span className="application-company-avatar" aria-hidden="true">
        {initials}
      </span>
      <div className="application-position">
        <p>{offer.company.name}</p>
        <h2>
          <Link to={href}>{offer.title}</Link>
        </h2>
        <div className="application-meta">
          {offer.location && (
            <span>
              <Icon kind="pin" />
              {offer.location}
            </span>
          )}
          {field && (
            <span>
              <Icon kind="work" />
              {field}
            </span>
          )}
          {workModes[offer.workMode] && (
            <span>
              <Icon kind="mode" />
              {workModes[offer.workMode]}
            </span>
          )}
        </div>
      </div>
      <span className="application-date">
        <Icon kind="clock" />
        {offer.deadline ? 'Afati' : 'Aplikuar më'}:{' '}
        {new Date(offer.deadline || item.createdAt).toLocaleDateString('sq-AL')}
      </span>
      <Link
        className={`application-status-pill status-${item.status}`}
        to={href}
        aria-label={`${applicationStatuses[item.status]} — Shiko aplikimin për ${offer.title}`}
      >
        <span className="application-status-dot" />
        {applicationStatuses[item.status]}
        <span aria-hidden="true">›</span>
      </Link>
      {!!offer.skills?.length && (
        <div className="application-skills">
          {offer.skills.map(({ skill }) => (
            <span key={skill.id}>{skill.name}</span>
          ))}
        </div>
      )}
      <p className="application-status-note">
        <Icon kind="document" />
        {statusMessages[item.status]}
      </p>
    </article>
  );
}

export function ApplicationArtwork() {
  return (
    <div className="applications-artwork" aria-hidden="true">
      <svg viewBox="0 0 360 210" fill="none">
        <ellipse cx="188" cy="115" rx="148" ry="88" fill="#eaf2ff" />
        <path
          d="M270 52c76-50 76 43 23 31s-49 26-7 38"
          stroke="#82aaff"
          strokeWidth="2"
          strokeDasharray="5 6"
        />
        <g transform="rotate(-9 114 85)">
          <rect x="62" y="22" width="106" height="131" rx="12" fill="white" stroke="#cbdfff" />
          <path
            d="M81 48h53M81 63h68M81 78h42M81 94h28"
            stroke="#bdd3ff"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <circle cx="142" cy="122" r="17" fill="#3478ef" />
          <path d="m134 122 6 6 10-13" stroke="white" strokeWidth="3" strokeLinecap="round" />
        </g>
        <path d="M90 188c-19-18-29-44-21-59 19 4 24 27 21 59Z" fill="#77cace" />
        <path d="M88 188c-2-34 8-57 25-58 8 22-6 41-25 58Z" fill="#a1dfe0" />
        <path d="M74 181h32l-5 23H79Z" fill="#abc6ed" />
        <rect
          x="156"
          y="109"
          width="134"
          height="85"
          rx="9"
          fill="#9dbef3"
          stroke="#fff"
          strokeWidth="3"
        />
        <path d="M142 194h161l-10 10H153Z" fill="#6497e7" />
        <path d="m217 146 6 6 6-6" stroke="white" strokeWidth="5" strokeLinecap="round" />
        <path d="m304 31 26-12-8 25-6-12-12-1Z" fill="#80a9f4" />
        <path
          d="M32 94l-12-5m19-10-7-10m3 39-13 4"
          stroke="#4789ff"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <span>
        Hap pas hapi,
        <br />
        drejt karrierës tënde!
      </span>
    </div>
  );
}
