import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, getErrorMessage } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { LoadingState, ErrorState, EmptyState } from '../components/States.jsx';
import OfferFilters from '../components/OfferFilters.jsx';
import OfferCard from '../components/OfferCard.jsx';
import Pagination from '../components/Pagination.jsx';
import TopRecommendation from '../components/TopRecommendation.jsx';
import OfferSidebarFilters from '../components/OfferSidebarFilters.jsx';

export default function Opportunities() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const query = params.toString();
  const [result, setResult] = useState(null);
  const [skills, setSkills] = useState([]);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    setError('');
    Promise.all([
      api.get(`/opportunities?${query}`, { signal: controller.signal }),
      api.get('/opportunities/skills', { signal: controller.signal }),
    ])
      .then(([offers, catalog]) => {
        setResult(offers.data.data);
        setSkills(catalog.data.data);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(getErrorMessage(error));
      });
    return () => controller.abort();
  }, [query, attempt]);
  return (
    <div className="opportunities-page">
      <section className="opportunities-search-band">
        <div className="opportunities-heading">
          <h1>Oferta pune dhe praktika</h1>
        </div>
        <OfferFilters
          key={`${query}-${skills.length}`}
          filters={Object.fromEntries(params)}
          skills={skills}
          onSearch={setParams}
          onReset={() => setParams({})}
        />
      </section>
      <div className="opportunities-results opportunities-sidebar-layout">
        <aside className="opportunities-sidebar" aria-label="Rekomandimet dhe filtrat">
          {user?.role === 'student' && <TopRecommendation key={user.id} />}
          <OfferSidebarFilters key={query} filters={Object.fromEntries(params)} />
        </aside>
        <div className="opportunities-list">
          {error ? (
            <ErrorState message={error} onRetry={() => setAttempt(attempt + 1)} />
          ) : !result ? (
            <LoadingState />
          ) : (
            <>
              {result.items.length ? (
                <div className="opportunities-grid">
                  {result.items.map((offer) => (
                    <OfferCard
                      key={`${user?.id || 'guest'}-${offer.id}`}
                      offer={offer}
                      showSave={user?.role === 'student'}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState title="Nuk u gjet asnjë ofertë">
                  Provo fjalë kyçe ose filtra të tjerë.
                </EmptyState>
              )}
              <Pagination
                page={result.page}
                total={result.total}
                onPage={(page) => setParams({ ...Object.fromEntries(params), page })}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
