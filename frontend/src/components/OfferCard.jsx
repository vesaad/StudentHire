import { Link } from 'react-router-dom';
import SaveOfferButton from './SaveOfferButton.jsx';
import { workModes } from '../../../shared/jobFields.js';

export const employmentLabels = {
  full_time: 'Orar i plotë',
  part_time: 'Orar i pjesshëm',
  contract: 'Kontratë',
};

function DetailIcon({ kind }) {
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
      {kind === 'location' ? (
        <>
          <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </>
      ) : kind === 'calendar' ? (
        <>
          <rect x="3" y="5" width="18" height="16" rx="3" />
          <path d="M7 3v4m10-4v4M3 11h18" />
        </>
      ) : kind === 'home' ? (
        <>
          <path d="m3 10 9-7 9 7v11H3ZM9 21v-8h6v8" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 6v6l4 2" />
        </>
      )}
    </svg>
  );
}

export default function OfferCard({ offer, children, showSave = false }) {
  const initials = offer.company.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
  return (
    <article
      className={`surface offer-card p-4 mb-3 text-break${showSave ? ' offer-with-save' : ''}`}
    >
      {showSave && <SaveOfferButton key={offer.id} id={offer.id} compact />}
      <div className="offer-company-heading">
        <span className="offer-company-avatar" aria-hidden="true">
          {initials}
        </span>
        <span>{offer.company.name}</span>
      </div>
      <h2 className="h4">
        <Link to={`/opportunities/${offer.id}`}>{offer.title}</Link>
      </h2>
      <div className="offer-detail-tags">
        <span>
          <DetailIcon kind="location" />
          {offer.location}
        </span>
        <span>
          <DetailIcon kind="calendar" />
          {employmentLabels[offer.employmentType]}
        </span>
        {offer.workMode && (
          <span>
            <DetailIcon kind="home" />
            {workModes[offer.workMode]}
          </span>
        )}
        {offer.type === 'internship' && <span>Praktikë</span>}
      </div>
      <div className="offer-skill-tags">
        {offer.skills.map(({ skill }) => (
          <span key={skill.id}>{skill.name}</span>
        ))}
      </div>
      <div className="offer-card-footer">
        <span className="offer-deadline">
          <DetailIcon kind="clock" />
          {offer.deadline
            ? `Afati: ${new Date(offer.deadline).toLocaleDateString('sq-AL', { day: 'numeric', month: 'short', year: 'numeric' })}`
            : 'Pa afat të caktuar'}
        </span>
        <Link className="btn btn-primary offer-apply-link" to={`/opportunities/${offer.id}`}>
          Apliko tani
        </Link>
      </div>
      {children}
    </article>
  );
}
