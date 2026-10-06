import { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../api/client.js';
import { ErrorState, LoadingState, EmptyState } from '../components/States.jsx';
import { statusLabel } from '../components/CompanyHistory.jsx';
import CompanyReview from '../components/CompanyReview.jsx';
import { AdminIcon } from '../components/AdminShell.jsx';

export default function AdminCompanies() {
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [list, setList] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setList(null);
    setError('');
    api
      .get('/companies', { params: { status, page, q: query }, signal: controller.signal })
      .then(({ data }) => setList(data.data))
      .catch((error) => {
        if (!controller.signal.aborted) setError(getErrorMessage(error));
      });
    return () => controller.abort();
  }, [status, page, query, attempt]);
  return (
    <div className="container py-5 admin-companies">
      <h1 className="h2">Menaxhimi i kompanive</h1>
      <p className="admin-page-intro">
        Këtu mund t’i menaxhosh të gjitha kompanitë e regjistruara në platformë.
      </p>
      <div className="admin-company-table-panel">
        <form
          className="admin-company-toolbar"
          onSubmit={(event) => {
            event.preventDefault();
            setQuery(search.trim());
            setPage(1);
            setSelectedId(null);
          }}
        >
          <div className="admin-company-search">
            <label htmlFor="company-search">Kërko kompani</label>
            <div>
              <input
                id="company-search"
                className="form-control"
                placeholder="Emri i kompanisë ose emaili…"
                maxLength={100}
                value={search}
                disabled={busy}
                onChange={(event) => setSearch(event.target.value)}
              />
              <button className="btn btn-primary" disabled={busy} type="submit">
                Kërko
              </button>
            </div>
          </div>
          <div className="admin-company-filter">
            <label className="form-label" htmlFor="company-filter">
              Filtro sipas aprovimit
            </label>
            <select
              id="company-filter"
              className="form-select"
              disabled={busy}
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
                setSelectedId(null);
              }}
            >
              <option value="pending">Në pritje</option>
              <option value="approved">Të aprovuara</option>
              <option value="rejected">Të refuzuara</option>
              <option value="all">Të gjitha</option>
            </select>
          </div>
        </form>
        {error ? (
          <ErrorState message={error} onRetry={() => setAttempt(attempt + 1)} />
        ) : !list ? (
          <LoadingState />
        ) : (
          <>
            <div className="admin-company-table-scroll">
              {list.items.length === 0 ? (
                <EmptyState title="Nuk ka kompani në këtë listë" />
              ) : (
                <table className="admin-company-table">
                  <caption className="visually-hidden">
                    Kompanitë e regjistruara dhe statusi i tyre
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Kompania</th>
                      <th scope="col">Email</th>
                      <th scope="col">Qyteti</th>
                      <th scope="col">Telefoni</th>
                      <th scope="col">Statusi</th>
                      <th scope="col">Veprime</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.items.map((item, index) => (
                      <tr key={item.id} className={selectedId === item.id ? 'is-selected' : ''}>
                        <td>
                          <div className="admin-company-name">
                            <span className={`admin-company-avatar company-tone-${index % 4}`}>
                              <AdminIcon kind="companies" />
                            </span>
                            <div>
                              <strong>{item.name}</strong>
                              <small>{item.industry || 'Industria nuk është plotësuar'}</small>
                            </div>
                          </div>
                        </td>
                        <td>{item.user.email}</td>
                        <td>{item.location || '—'}</td>
                        <td className="admin-phone">{item.phone || '—'}</td>
                        <td>
                          <span className={`admin-company-status company-${item.status}`}>
                            {statusLabel(item.status)}
                          </span>
                          <small className={`admin-account-status account-${item.user.status}`}>
                            {statusLabel(item.user.status)}
                          </small>
                        </td>
                        <td>
                          <button
                            disabled={busy}
                            className="btn btn-outline-primary admin-review-button"
                            aria-expanded={selectedId === item.id}
                            aria-controls="admin-company-review"
                            onClick={() => {
                              setSelectedId(selectedId === item.id ? null : item.id);
                            }}
                          >
                            Shqyrto
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="admin-company-pagination">
              <span>
                {list.total
                  ? `${(page - 1) * 10 + 1}–${Math.min(page * 10, list.total)} nga ${list.total} kompani`
                  : '0 kompani'}
              </span>
              <div className="d-flex gap-3 align-items-center">
                <button
                  className="btn btn-outline-primary"
                  disabled={page === 1 || busy}
                  onClick={() => {
                    setPage(page - 1);
                    setSelectedId(null);
                  }}
                >
                  Mbrapa
                </button>
                <span>Faqja {page}</span>
                <button
                  className="btn btn-outline-primary"
                  disabled={page * 10 >= list.total || busy}
                  onClick={() => {
                    setPage(page + 1);
                    setSelectedId(null);
                  }}
                >
                  Përpara
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      {selectedId && (
        <div id="admin-company-review" className="admin-company-review">
          <CompanyReview
            key={selectedId}
            companyId={selectedId}
            busy={busy}
            onBusyChange={setBusy}
            onSaved={() => setAttempt(attempt + 1)}
          />
        </div>
      )}
    </div>
  );
}
