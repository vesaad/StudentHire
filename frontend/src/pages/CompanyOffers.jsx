import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { api, getErrorMessage } from '../api/client.js';
import { ErrorState, LoadingState, EmptyState } from '../components/States.jsx';
import OpportunityEditor, { offerStatuses } from '../components/OpportunityEditor.jsx';
export default function CompanyOffers() {
  const { user } = useAuth();
  if (user.role !== 'company') return <Navigate to={`/dashboard/${user.role}`} replace />;
  return <Offers />;
}
function Offers() {
  const [result, setResult] = useState(null);
  const [skills, setSkills] = useState([]);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    setError('');
    Promise.all([
      api.get('/company-opportunities', { params: { page, status }, signal: controller.signal }),
      api.get('/company-opportunities/skills', { signal: controller.signal }),
    ])
      .then(([list, catalog]) => {
        setResult(list.data.data);
        setSkills(catalog.data.data);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(getErrorMessage(error));
      });
    return () => controller.abort();
  }, [page, status, attempt]);
  return (
    <div className="container py-5 company-management">
      <Link to="/dashboard/company">← Profili i kompanisë</Link>
      <div className="management-toolbar">
        <h1 className="h2 mt-4 company-offers-title">Ofertat e mia</h1>
        <div className="d-flex gap-3 align-items-center flex-wrap my-4">
          <button
            className="btn btn-primary"
            disabled={busy}
            onClick={() => setSelected({ id: 'new', key: Date.now() })}
          >
            Krijo ofertë
          </button>
          <label htmlFor="offer-filter">Statusi</label>
          <select
            id="offer-filter"
            className="form-select w-auto"
            value={status}
            disabled={busy}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="all">Të gjitha</option>
            <option value="draft">Draft</option>
            <option value="published">Të publikuara</option>
            <option value="closed">Të mbyllura</option>
          </select>
        </div>
      </div>
      {error ? (
        <ErrorState message={error} onRetry={() => setAttempt(attempt + 1)} />
      ) : !result ? (
        <LoadingState />
      ) : (
        <>
          <div className="management-list">
            {result.items.length === 0 ? (
              <EmptyState title="Nuk ka oferta në këtë listë">
                Krijo një draft për punë ose praktikë.
              </EmptyState>
            ) : (
              result.items.map((offer) => (
                <article
                  className="surface management-item d-flex justify-content-between align-items-center gap-3 flex-wrap p-4"
                  key={offer.id}
                >
                  <div className="text-break">
                    <h2 className="h5">{offer.title}</h2>
                    <p className="mb-0">
                      {offer.type === 'job' ? 'Punë' : 'Praktikë'} · {offer.location} ·{' '}
                      <span className={`management-status status-${offer.status}`}>
                        {offerStatuses[offer.status]}
                      </span>
                    </p>
                    {offer.deadline && (
                      <small>Afati: {new Date(offer.deadline).toLocaleDateString('sq-AL')}</small>
                    )}
                  </div>
                  <button
                    className="btn btn-outline-primary"
                    disabled={busy}
                    onClick={() => setSelected({ id: offer.id, key: offer.id })}
                  >
                    Hap ofertën
                  </button>
                  <Link
                    className="btn btn-outline-primary"
                    to={`/dashboard/company/applications?opportunityId=${offer.id}`}
                  >
                    Shiko kandidatët
                  </Link>
                </article>
              ))
            )}
          </div>
          <div className="d-flex gap-3 align-items-center my-3">
            <button
              className="btn btn-outline-primary"
              disabled={page === 1 || busy}
              onClick={() => setPage(page - 1)}
            >
              Mbrapa
            </button>
            <span>Faqja {page}</span>
            <button
              className="btn btn-outline-primary"
              disabled={page * 10 >= result.total || busy}
              onClick={() => setPage(page + 1)}
            >
              Përpara
            </button>
          </div>
        </>
      )}
      {selected && !error && (
        <OpportunityEditor
          key={selected.key}
          id={selected.id}
          skills={skills}
          busy={busy}
          onBusyChange={setBusy}
          onSaved={(savedOffer) => {
            setStatus('all');
            setPage(1);
            setResult((current) =>
              current
                ? {
                    ...current,
                    page: 1,
                    items: [
                      savedOffer,
                      ...current.items.filter((item) => item.id !== savedOffer.id),
                    ].slice(0, 10),
                  }
                : current,
            );
            setAttempt((value) => value + 1);
          }}
        />
      )}
    </div>
  );
}

