import { useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { api, getErrorMessage } from '../api/client.js';
import { LoadingState, ErrorState, EmptyState } from '../components/States.jsx';
import OfferCard from '../components/OfferCard.jsx';
import SkillMatch from '../components/SkillMatch.jsx';
import Pagination from '../components/Pagination.jsx';

export default function Recommendations() {
  const { user } = useAuth();
  if (user.role !== 'student') return <Navigate to={`/dashboard/${user.role}`} replace />;
  return <RecommendationList key={user.id} />;
}
function RecommendationList() {
  const [params, setParams] = useSearchParams();
  const query = params.toString();
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    setError('');
    api
      .get(`/recommendations?${query}`, { signal: controller.signal })
      .then(({ data }) => setResult(data.data))
      .catch((error) => {
        if (!controller.signal.aborted) setError(getErrorMessage(error));
      });
    return () => controller.abort();
  }, [query, attempt]);
  return (
    <div className="container py-5">
      <Link to="/dashboard/student">← Profili im</Link>
      <h1 className="mt-4">Ofertat e rekomanduara</h1>
      <p>
        Renditen sipas aftësive të përbashkëta me profilin tënd. Përputhja = aftësitë e përbashkëta
        / aftësitë e kërkuara × 100.
      </p>
      <p className="text-secondary">
        Përqindja përshkruan vetëm aftësitë e zgjedhura; nuk garanton pranimin. Ofertat pa aftësi të
        kërkuara renditen në fund.
      </p>
      <div className="d-flex gap-3 flex-wrap mb-4">
        <Link className="btn btn-outline-primary" to="/dashboard/student">
          Përditëso aftësitë
        </Link>
        <button className="btn btn-outline-primary" onClick={() => setAttempt(attempt + 1)}>
          Rifresko rekomandimet
        </button>
      </div>
      {error ? (
        <ErrorState message={error} onRetry={() => setAttempt(attempt + 1)} />
      ) : !result ? (
        <LoadingState />
      ) : (
        <>
          {result.studentSkillCount === 0 && (
            <p className="notice">
              Nuk ke zgjedhur aftësi në profil. Shtoji që rekomandimet të pasqyrojnë njohuritë e
              tua.
            </p>
          )}
          {!result.items.length && (
            <EmptyState title="Nuk ka oferta të disponueshme">Provo përsëri më vonë.</EmptyState>
          )}
          {result.items.map((offer) => (
            <OfferCard key={offer.id} offer={offer}>
              <SkillMatch match={offer.match} />
            </OfferCard>
          ))}
          <Pagination
            page={result.page}
            total={result.total}
            onPage={(page) => setParams({ page })}
          />
        </>
      )}
    </div>
  );
}
