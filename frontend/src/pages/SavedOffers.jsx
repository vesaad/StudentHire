import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { api, getErrorMessage } from '../api/client.js';
import { LoadingState, ErrorState, EmptyState } from '../components/States.jsx';
import OfferCard from '../components/OfferCard.jsx';
import Pagination from '../components/Pagination.jsx';

export default function SavedOffers() {
  const { user } = useAuth();
  if (user.role !== 'student') return <Navigate to={`/dashboard/${user.role}`} replace />;
  return <SavedList />;
}
function SavedList() {
  const [result, setResult] = useState(null);
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    setError('');
    api
      .get('/saved-opportunities', { params: { page }, signal: controller.signal })
      .then(({ data }) => {
        if (!data.data.items.length && page > 1) setPage(page - 1);
        else setResult(data.data);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(getErrorMessage(error));
      });
    return () => controller.abort();
  }, [page, attempt]);
  async function remove(id) {
    setBusy(true);
    setActionError('');
    try {
      await api.delete(`/saved-opportunities/${id}`);
      setAttempt((value) => value + 1);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container py-5 saved-offers-page">
      <Link className="saved-back" to="/">
        ← Kthehu te faqja kryesore
      </Link>
      <header className="saved-offers-heading">
        <div>
          <h1>Ofertat e ruajtura</h1>
          <p>Këto janë ofertat që i ke ruajtur, sepse mund të jenë mundësia jote e radhës.</p>
        </div>
        <svg
          width="140"
          height="110"
          viewBox="0 0 140 110"
          aria-hidden="true"
          className="saved-header-art"
        >
          <rect
            x="33"
            y="19"
            width="77"
            height="78"
            rx="15"
            fill="#dceaff"
            transform="rotate(12 70 58)"
          />
          <rect
            x="22"
            y="12"
            width="77"
            height="78"
            rx="15"
            fill="#eaf1ff"
            transform="rotate(-8 60 50)"
          />
          <rect x="39" y="26" width="58" height="54" rx="12" fill="white" />
          <path d="M68 65 53 51c-10-12 8-22 15-10 7-12 25-2 15 10Z" fill="#2464dc" />
          <path d="M89 10h10v20l-5-4-5 4Z" fill="#397de2" />
          <path
            d="m12 38-7-3m8 17H4m113-16 8-4m-7 20h10"
            stroke="#8ab7ff"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </header>
      {actionError && (
        <p className="text-danger" role="alert">
          {actionError}
        </p>
      )}
      {error ? (
        <ErrorState message={error} onRetry={() => setAttempt(attempt + 1)} />
      ) : !result ? (
        <LoadingState />
      ) : (
        <>
          {!result.items.length && (
            <EmptyState title="Ende nuk ke oferta të ruajtura">
              Hap një ofertë dhe zgjidh zemrën për ta ruajtur.{' '}
              <Link to="/opportunities">Gjej oferta ↗</Link>
            </EmptyState>
          )}
          {result.items.map((item) => {
            const button = (
              <details className="saved-offer-menu">
                <summary aria-label="Veprimet e ofertës" title="Veprimet e ofertës">
                  ⋮
                </summary>
                <button
                  className="saved-remove"
                  disabled={busy}
                  onClick={() => remove(item.opportunityId)}
                >
                  Largo nga të ruajturat
                </button>
              </details>
            );
            return item.offer ? (
              <OfferCard key={item.opportunityId} offer={item.offer}>
                {button}
              </OfferCard>
            ) : (
              <article key={item.opportunityId} className="surface p-4 mb-3 saved-unavailable">
                <h2 className="h4">Ofertë jo e disponueshme</h2>
                <p>Oferta është mbyllur, i ka kaluar afati ose nuk është më publike.</p>
                {button}
              </article>
            );
          })}
          <Pagination page={result.page} total={result.total} disabled={busy} onPage={setPage} />
        </>
      )}
    </div>
  );
}
