import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, getErrorMessage } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { LoadingState, ErrorState } from '../components/States.jsx';
import { employmentLabels } from '../components/OfferCard.jsx';
import SaveOfferButton from '../components/SaveOfferButton.jsx';
import ApplyForm from '../components/ApplyForm.jsx';
import OfferMatch from '../components/OfferMatch.jsx';
import { workModes } from '../../../shared/jobFields.js';

export default function OpportunityDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [offer, setOffer] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setOffer(null);
    setError('');
    api
      .get(`/opportunities/${id}`, { signal: controller.signal })
      .then(({ data }) => setOffer(data.data))
      .catch((error) => {
        if (!controller.signal.aborted) setError(getErrorMessage(error));
      });
    return () => controller.abort();
  }, [id, attempt]);
  return (
    <div className="container opportunity-detail-page py-5">
      <Link className="detail-back" to="/opportunities">
        ← Të gjitha ofertat
      </Link>
      {error ? (
        <ErrorState message={error} onRetry={() => setAttempt(attempt + 1)} />
      ) : !offer ? (
        <LoadingState />
      ) : (
        <OfferDetailsContent key={`${id}-${user?.id || 'guest'}`} offer={offer} user={user} />
      )}
    </div>
  );
}

function Icon({ kind }) {
  const paths = {
    building: (
      <>
        <path d="M5 21V5l7-3 7 3v16M2 21h20M9 7h1m4 0h1M9 11h1m4 0h1M9 15h1m4 0h1M10 21v-3h4v3" />
      </>
    ),
    pin: (
      <>
        <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <ellipse cx="12" cy="12" rx="4" ry="9" />
        <path d="M3 12h18" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 6v6l4 2" />
      </>
    ),
    briefcase: (
      <>
        <rect x="3" y="7" width="18" height="14" rx="2" />
        <path d="M8 7V3h8v4M3 12h18M12 10v4" />
      </>
    ),
    document: (
      <>
        <path d="M14 2H5v20h14V7ZM14 2v5h5M8 12h8M8 16h6" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="7" r="4" />
        <path d="M4 21v-3a8 8 0 0 1 16 0v3Z" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
  };
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[kind]}
    </svg>
  );
}

function OfferDetailsContent({ offer, user }) {
  const [applying, setApplying] = useState(false);
  const website =
    offer.company.website && /^https?:\/\//i.test(offer.company.website)
      ? offer.company.website
      : null;
  const initials = offer.company.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
  const deadline = offer.deadline
    ? new Date(offer.deadline).toLocaleDateString('sq-AL')
    : 'Pa afat të caktuar';
  return (
    <>
      <header className="detail-hero">
        {user?.role === 'student' && <SaveOfferButton id={offer.id} compact />}
        <div className="detail-company">
          <span className="offer-company-avatar">{initials}</span>
          <span>{offer.company.name}</span>
        </div>
        <h1>{offer.title}</h1>
        <div className="detail-hero-actions">
          <div className="detail-meta-tags">
            {offer.company.industry && (
              <span>
                <Icon kind="building" />
                {offer.company.industry}
              </span>
            )}
            <span>
              <Icon kind="pin" />
              {offer.location}
            </span>
            {website && (
              <a href={website} target="_blank" rel="noreferrer">
                <Icon kind="globe" />
                {website.replace(/^https?:\/\//i, '').replace(/\/$/, '')}
              </a>
            )}
          </div>
          <div className="detail-apply-stack">
            {user?.role === 'student' ? (
              <button
                className="btn btn-primary detail-apply"
                onClick={() => {
                  setApplying(true);
                  setTimeout(() => {
                    document
                      .getElementById('detail-application')
                      ?.scrollIntoView({ block: 'start' });
                    document.getElementById('detail-application')?.focus({ preventScroll: true });
                  }, 0);
                }}
                aria-expanded={applying}
                aria-controls="detail-application"
              >
                Apliko tani
              </button>
            ) : !user ? (
              <Link className="btn btn-primary detail-apply" to="/login">
                Kyçu për të aplikuar
              </Link>
            ) : null}
            <span className="detail-apply-deadline">
              <Icon kind="clock" />
              Afati: {deadline}
            </span>
          </div>
        </div>
        <div className="offer-skill-tags mt-4">
          {offer.skills.map(({ skill }) => (
            <span key={skill.id}>{skill.name}</span>
          ))}
        </div>
      </header>
      <div className="detail-body-grid">
        <aside className="detail-panel detail-facts" aria-label="Informacioni i kompanisë">
          {offer.company.industry && (
            <div className="detail-fact">
              <span className="detail-icon">
                <Icon kind="building" />
              </span>
              <div>
                <span>Industria</span>
                <strong>{offer.company.industry}</strong>
              </div>
            </div>
          )}
          <div className="detail-fact">
            <span className="detail-icon">
              <Icon kind="pin" />
            </span>
            <div>
              <span>Qyteti</span>
              <strong>{offer.location}</strong>
            </div>
          </div>
          {website && (
            <div className="detail-fact">
              <span className="detail-icon">
                <Icon kind="globe" />
              </span>
              <div>
                <span>Website</span>
                <a href={website} target="_blank" rel="noreferrer">
                  {website.replace(/^https?:\/\//i, '')} ↗
                </a>
              </div>
            </div>
          )}
          <section className="detail-section">
            <h2>
              <Icon kind="briefcase" />
              Kushtet e punës
            </h2>
            <p>
              <Icon kind="check" />
              {employmentLabels[offer.employmentType]}
            </p>
            {offer.workMode && (
              <p>
                <Icon kind="check" />
                {workModes[offer.workMode]}
              </p>
            )}
          </section>
        </aside>
        <div className="detail-panel">
          <section className="detail-section">
            <h2>
              <Icon kind="document" />
              Përshkrimi
            </h2>
            <p className="detail-description">{offer.description}</p>
          </section>
          <section className="detail-section">
            <h2>
              <Icon kind="user" />
              Aftësitë e kërkuara
            </h2>
            {offer.skills.length ? (
              <div className="detail-meta-tags">
                {offer.skills.map(({ skill }) => (
                  <span key={skill.id}>{skill.name}</span>
                ))}
              </div>
            ) : (
              <p>Nuk janë caktuar aftësi të veçanta.</p>
            )}
          </section>
          <section className="detail-section">
            <h2>
              <Icon kind="building" />
              Rreth kompanisë
            </h2>
            <p>
              {offer.company.name}
              {offer.company.industry && ` · ${offer.company.industry}`}
            </p>
            {offer.company.description && (
              <p className="detail-description">{offer.company.description}</p>
            )}
          </section>
          {user?.role === 'student' && <OfferMatch id={offer.id} />}
        </div>
      </div>
      {user?.role === 'student' && (
        <div
          id="detail-application"
          hidden={!applying}
          tabIndex="-1"
          className="detail-panel detail-application"
        >
          <ApplyForm opportunityId={offer.id} />
        </div>
      )}
    </>
  );
}
