import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getErrorMessage } from '../api/client.js';
import { jobFields } from '../../../shared/jobFields.js';
import { employmentLabels } from './OfferCard.jsx';

const featuredSectors = ['technology', 'finance', 'marketing', 'health', 'education', 'other'];
const sectorLabels = { finance: 'Financë', marketing: 'Marketing', other: 'Të tjera' };
function DiscoveryIcon({ kind }) {
  const paths = {
    technology: 'm8 5-7 7 7 7m8-14 7 7-7 7M14 3l-4 18',
    finance:
      'M20 6c0 2-4 3-8 3S4 8 4 6s4-3 8-3 8 1 8 3Zm0 0v12c0 2-4 3-8 3s-8-1-8-3V6m0 6c0 2 4 3 8 3s8-1 8-3',
    marketing: 'M3 9v6h5l11 5V4L8 9H3Zm4 6 2 7h4l-3-6M22 9v6',
    health: 'M12 21S2 15 2 8a5 5 0 0 1 10-2 5 5 0 0 1 10 2c0 7-10 13-10 13Z',
    education: 'm2 8 10-5 10 5-10 5-10-5m4 3v6l6 3 6-3v-6m4-3v8',
    other: 'M3 3h7v7H3Zm11 0h7v7h-7ZM3 14h7v7H3Zm11 0h7v7h-7Z',
    pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    work: 'M8 7V3h8v4M3 7h18v14H3ZM3 12h18M12 10v4',
    offers: 'M5 3h14v18H5ZM9 7h6m-6 5h6m-6 5h3',
  };
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[kind] || paths.other} />
    </svg>
  );
}
export default function HomeDiscovery() {
  const [offers, setOffers] = useState(null);
  const [sectors, setSectors] = useState(null);
  const [offerError, setOfferError] = useState('');
  const [sectorError, setSectorError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setOfferError('');
    setSectorError('');
    api
      .get('/opportunities', { signal: controller.signal })
      .then(({ data }) => setOffers(data.data.items.slice(0, 3)))
      .catch((error) => {
        if (!controller.signal.aborted) setOfferError(getErrorMessage(error));
      });
    api
      .get('/opportunities/sectors', { signal: controller.signal })
      .then(({ data }) => setSectors(data.data))
      .catch((error) => {
        if (!controller.signal.aborted) setSectorError(getErrorMessage(error));
      });
    return () => controller.abort();
  }, [attempt]);
  return (
    <section className="container home-discovery" aria-label="Ofertat e fundit dhe sektorët">
      <div className="home-discovery-panel">
        <div className="home-discovery-heading">
          <h2>
            <span className="discovery-icon">
              <DiscoveryIcon kind="offers" />
            </span>
            Ofertat më të fundit
          </h2>
          <Link to="/opportunities">
            Shiko të gjitha <span aria-hidden="true">→</span>
          </Link>
        </div>
        {offerError ? (
          <div className="discovery-state" role="alert">
            <p>{offerError}</p>
            <button
              className="btn btn-outline-primary btn-sm"
              onClick={() => setAttempt((value) => value + 1)}
            >
              Provo përsëri
            </button>
          </div>
        ) : !offers ? (
          <p className="discovery-state" role="status">
            Po ngarkohen ofertat…
          </p>
        ) : !offers.length ? (
          <p className="discovery-state">Ofertat e reja do të shfaqen këtu sapo të publikohen.</p>
        ) : (
          <div className="home-latest-offers">
            {offers.map((offer, index) => (
              <Link
                className={`home-latest-offer offer-tone-${index}`}
                key={offer.id}
                to={`/opportunities/${offer.id}`}
              >
                <span className="home-company-initials" aria-hidden="true">
                  {offer.company.name
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((word) => word[0])
                    .join('')
                    .toUpperCase()}
                </span>
                <div className="home-offer-main">
                  <h3>{offer.title}</h3>
                  <span>{offer.company.name}</span>
                  <div className="home-offer-skills">
                    {offer.skills.slice(0, 3).map(({ skill }) => (
                      <span key={skill.id}>{skill.name}</span>
                    ))}
                  </div>
                </div>
                <div className="home-offer-facts">
                  <span>
                    <DiscoveryIcon kind="pin" />
                    {offer.location}
                  </span>
                  <span>
                    <DiscoveryIcon kind="work" />
                    {offer.type === 'internship'
                      ? 'Praktikë'
                      : employmentLabels[offer.employmentType]}
                  </span>
                </div>
                <div className="home-offer-published">
                  {offer.publishedAt && (
                    <time dateTime={offer.publishedAt}>
                      {new Date(offer.publishedAt).toLocaleDateString('sq-AL')}
                    </time>
                  )}
                  <span aria-hidden="true">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
        <Link className="home-all-offers" to="/opportunities">
          Shiko të gjitha ofertat <span aria-hidden="true">→</span>
        </Link>
      </div>
      <div className="home-discovery-panel">
        <div className="home-discovery-heading">
          <h2>
            <span className="discovery-icon">
              <DiscoveryIcon kind="other" />
            </span>
            Eksploro sipas sektorit
          </h2>
          <Link to="/opportunities">
            Të gjithë sektorët <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="home-sector-grid">
          {featuredSectors.map((value) => {
            const sector = jobFields.find((field) => field.value === value);
            const count = sectors?.find((field) => field.value === value)?.total;
            return (
              <Link
                key={value}
                className={`home-sector sector-${value}`}
                to={`/opportunities?field=${value}`}
              >
                <span className="discovery-icon">
                  <DiscoveryIcon kind={value} />
                </span>
                <div>
                  <h3>{sectorLabels[value] || sector.label}</h3>
                  <span>
                    {count === undefined
                      ? 'Eksploro ofertat'
                      : `${count} ${count === 1 ? 'ofertë' : 'oferta'}`}
                  </span>
                </div>
                <span className="sector-arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            );
          })}
        </div>
        {sectorError && (
          <div className="discovery-sector-error" role="alert">
            Numrat e ofertave nuk u ngarkuan.{' '}
            <button onClick={() => setAttempt((value) => value + 1)}>Provo përsëri</button>
          </div>
        )}
      </div>
    </section>
  );
}
