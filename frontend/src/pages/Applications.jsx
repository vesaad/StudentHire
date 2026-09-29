import { useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { api, getErrorMessage } from '../api/client.js';
import { LoadingState, ErrorState, EmptyState } from '../components/States.jsx';
import Pagination from '../components/Pagination.jsx';
import { applicationStatuses } from '../data/applicationStatuses.js';
import StudentApplicationCard, {
  ApplicationArtwork,
} from '../components/StudentApplicationCard.jsx';

export default function Applications() {
  const { user } = useAuth();
  if (!['student', 'company'].includes(user.role))
    return <Navigate to={`/dashboard/${user.role}`} replace />;
  return <ApplicationList user={user} />;
}
function ApplicationList({ user }) {
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
      .get(`/applications?${query}`, { signal: controller.signal })
      .then(({ data }) => setResult(data.data))
      .catch((error) => {
        if (!controller.signal.aborted) setError(getErrorMessage(error));
      });
    return () => controller.abort();
  }, [query, attempt]);
  function filter(status) {
    const next = new URLSearchParams(params);
    next.delete('page');
    if (status) next.set('status', status);
    else next.delete('status');
    setParams(next);
  }
  return (
    <div
      className={`container py-5${user.role === 'company' ? ' company-management' : ' student-applications'}`}
    >
      <Link
        className={user.role === 'student' ? 'applications-back' : undefined}
        to={`/dashboard/${user.role}`}
      >
        ← Profili im
      </Link>
      <div className={user.role === 'company' ? 'management-toolbar' : 'applications-heading'}>
        <h1 className="mt-4">
          {user.role === 'company' ? 'Kandidatët dhe aplikimet' : 'Aplikimet e mia'}
        </h1>
        {user.role === 'student' && (
          <>
            <p className="applications-intro">
              Këtu mund t’i shohësh të gjitha aplikimet e tua për oferta pune dhe ta ndjekësh
              statusin e tyre.
            </p>
            <ApplicationArtwork />
          </>
        )}
        {params.get('opportunityId') && (
          <p>
            Aplikimet për ofertën e zgjedhur.{' '}
            <button className="btn btn-link" onClick={() => setParams({})}>
              Shiko të gjitha
            </button>
          </p>
        )}
        <div
          className={`d-flex gap-3 align-items-center my-4${user.role === 'student' ? ' applications-filter' : ''}`}
        >
          <label htmlFor="application-filter">Statusi</label>
          <select
            id="application-filter"
            className="form-select w-auto"
            value={params.get('status') || ''}
            onChange={(event) => filter(event.target.value)}
          >
            <option value="">Të gjitha</option>
            {Object.entries(applicationStatuses).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error ? (
        <ErrorState message={error} onRetry={() => setAttempt(attempt + 1)} />
      ) : !result ? (
        <LoadingState />
      ) : (
        <>
          {!result.items.length && (
            <EmptyState title="Nuk ka aplikime në këtë listë">
              {user.role === 'student'
                ? 'Aplikimet e dërguara do të shfaqen këtu.'
                : 'Kandidatët do të shfaqen pasi të aplikojnë në ofertat e tua.'}
            </EmptyState>
          )}
          {result.items.map((item) =>
            user.role === 'student' ? (
              <StudentApplicationCard key={item.id} item={item} />
            ) : (
              <article key={item.id} className="surface p-4 mb-3 text-break management-item">
                <h2 className="h4">
                  <Link to={`/dashboard/${user.role}/applications/${item.id}`}>
                    {item.opportunity.title}
                  </Link>
                </h2>
                <p className="management-person">
                  {user.role === 'company'
                    ? `${item.student.firstName} ${item.student.lastName}`
                    : item.opportunity.company.name}
                </p>
                <p className="mb-0">
                  <strong className={`management-status status-${item.status}`}>
                    {applicationStatuses[item.status]}
                  </strong>{' '}
                  · {new Date(item.createdAt).toLocaleDateString('sq-AL')}
                </p>
                {user.role === 'company' && (
                  <Link
                    className="management-detail-link"
                    to={`/dashboard/company/applications/${item.id}`}
                  >
                    Shiko aplikimin <span aria-hidden="true">↗</span>
                  </Link>
                )}
              </article>
            ),
          )}
          <div className={user.role === 'student' ? 'applications-pagination' : undefined}>
            {user.role === 'student' && <span>{result.total} aplikime gjithsej</span>}
            <Pagination
              page={result.page}
              total={result.total}
              onPage={(page) => setParams({ ...Object.fromEntries(params), page })}
            />
          </div>
        </>
      )}
    </div>
  );
}
