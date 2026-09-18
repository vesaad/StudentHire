import { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../api/client.js';
import { ErrorState, LoadingState, EmptyState } from '../components/States.jsx';
import { statusLabel } from '../components/CompanyHistory.jsx';
import CompanyReview from '../components/CompanyReview.jsx';

export default function AdminCompanies() {
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [list, setList] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setList(null);
    setError('');
    api
      .get('/companies', { params: { status, page }, signal: controller.signal })
      .then(({ data }) => setList(data.data))
      .catch((error) => {
        if (!controller.signal.aborted) setError(getErrorMessage(error));
      });
    return () => controller.abort();
  }, [status, page, attempt]);
  return (
    <div className="container py-5">
      <h1 className="h2">Menaxhimi i kompanive</h1>
      <label className="form-label mt-3" htmlFor="company-filter">
        Filtro sipas aprovimit
      </label>
      <select
        id="company-filter"
        className="form-select mb-4"
        disabled={busy}
        value={status}
        onChange={(event) => {
          setStatus(event.target.value);
          setPage(1);
        }}
      >
        <option value="pending">Në pritje</option>
        <option value="approved">Të aprovuara</option>
        <option value="rejected">Të refuzuara</option>
        <option value="all">Të gjitha</option>
      </select>
      {error ? (
        <ErrorState message={error} onRetry={() => setAttempt(attempt + 1)} />
      ) : !list ? (
        <LoadingState />
      ) : (
        <>
          <div className="surface p-3">
            {list.items.length === 0 ? (
              <EmptyState title="Nuk ka kompani në këtë listë" />
            ) : (
              list.items.map((item) => (
                <div
                  className="d-flex justify-content-between align-items-center gap-3 border-bottom py-3 flex-wrap"
                  key={item.id}
                >
                  <div>
                    <strong>{item.name}</strong>
                    <p className="small mb-0">
                      {statusLabel(item.status)} · {statusLabel(item.user.status)}
                    </p>
                  </div>
                  <button
                    disabled={busy}
                    className="btn btn-outline-primary"
                    onClick={() => {
                      setSelectedId(item.id);
                    }}
                  >
                    Shqyrto
                  </button>
                </div>
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
              disabled={page * 10 >= list.total || busy}
              onClick={() => setPage(page + 1)}
            >
              Përpara
            </button>
          </div>
        </>
      )}
      {selectedId && (
        <CompanyReview
          key={selectedId}
          companyId={selectedId}
          busy={busy}
          onBusyChange={setBusy}
          onSaved={() => setAttempt(attempt + 1)}
        />
      )}
    </div>
  );
}
