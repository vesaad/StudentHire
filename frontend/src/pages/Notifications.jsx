import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { api, getErrorMessage } from '../api/client.js';
import { LoadingState, ErrorState, EmptyState } from '../components/States.jsx';
import Pagination from '../components/Pagination.jsx';

export default function Notifications() {
  const { user } = useAuth();
  return <NotificationList key={user.id} user={user} />;
}
function NotificationList({ user }) {
  const [result, setResult] = useState(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('all');
  const [category, setCategory] = useState('all');
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    setError('');
    api
      .get('/notifications', { params: { page, filter, category }, signal: controller.signal })
      .then(({ data }) => {
        if (!data.data.items.length && page > 1) setPage(page - 1);
        else setResult(data.data);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(getErrorMessage(error));
      });
    return () => controller.abort();
  }, [page, filter, category, attempt]);
  async function markRead(id) {
    setBusy(true);
    setActionError('');
    try {
      await api.patch(`/notifications/${id}/read`);
      window.dispatchEvent(new Event('notifications-read'));
      setAttempt((value) => value + 1);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  const tabs = [
    ['all', 'Të gjitha', 'bell'],
    ['offers', 'Ofertat', 'briefcase'],
    ['applications', 'Aplikimet', 'document'],
  ];
  function choose(value) {
    setCategory(value);
    setPage(1);
  }
  return (
    <div className="container notification-page py-4">
      <div className="notification-main">
        <header className="notification-banner">
          <span className="notification-banner-icon">
            <NotificationIcon kind="bell" />
          </span>
          <div>
            <h1>Njoftimet</h1>
            <p>Qëndro i informuar për aplikimet, ofertat dhe përditësimet nga StudentHire.</p>
          </div>
          <div className="notification-envelope" aria-hidden="true">
            <svg viewBox="0 0 120 90" width="130" height="100">
              <rect x="12" y="20" width="96" height="64" rx="12" fill="#a7c8ff" />
              <path d="m14 25 46 35 46-35v47q0 12-12 12H26q-12 0-12-12Z" fill="#3978d8" />
              <path d="m14 79 34-28m58 28L72 51" stroke="#2459a6" strokeWidth="3" />
              <circle cx="105" cy="18" r="12" fill="#ff759d" />
              <path d="M103 12v9m0 4v1" stroke="white" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
        </header>
        <nav className="notification-tabs" aria-label="Kategoritë e njoftimeve">
          {tabs.map(([value, label, icon]) => (
            <button
              key={value}
              className={category === value ? 'active' : ''}
              aria-pressed={category === value}
              disabled={busy}
              onClick={() => choose(value)}
            >
              <NotificationIcon kind={icon} />
              {label}
              {result && (
                <span>{result.counts?.[value] ?? (value === 'all' ? result.total : 0)}</span>
              )}
            </button>
          ))}
        </nav>
        {actionError && (
          <p role="alert" className="text-danger">
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
              <EmptyState title="Nuk ka njoftime në këtë listë">
                Njoftimet e reja do të shfaqen këtu.
              </EmptyState>
            )}
            <div className="notification-list">
              {result.items.map((item) => {
                const group = item.type.startsWith('application_')
                  ? 'applications'
                  : item.type === 'opportunity_moderated'
                    ? 'offers'
                    : 'system';
                const tab = tabs.find(([value]) => value === group) || ['all', 'Njoftim', 'bell'];
                const href =
                  item.applicationId && ['student', 'company'].includes(user.role)
                    ? `/dashboard/${user.role}/applications/${item.applicationId}`
                    : item.type === 'company_decision' && user.role === 'company'
                      ? '/dashboard/company'
                      : null;
                return (
                  <article
                    className={`notification-item ${!item.readAt ? 'unread' : ''}`}
                    key={item.id}
                  >
                    <span className={`notification-item-icon ${group}`}>
                      <NotificationIcon kind={tab[2]} />
                    </span>
                    <div className="notification-copy">
                      <h2>{item.title}</h2>
                      <p>{item.message}</p>
                      <span className={`notification-category ${group}`}>{tab[1]}</span>
                      <div className="notification-item-actions">
                        {!item.readAt && (
                          <button disabled={busy} onClick={() => markRead(item.id)}>
                            Shëno si të lexuar
                          </button>
                        )}
                        {href && (
                          <Link to={href}>
                            Shiko detajet <span aria-hidden="true">↗</span>
                          </Link>
                        )}
                      </div>
                    </div>
                    <div className="notification-date">
                      <time dateTime={item.createdAt}>
                        {new Date(item.createdAt).toLocaleDateString('sq-AL')}
                      </time>
                      <span>{item.readAt ? 'I lexuar' : '● I palexuar'}</span>
                    </div>
                  </article>
                );
              })}
            </div>
            <Pagination page={result.page} total={result.total} disabled={busy} onPage={setPage} />
          </>
        )}
      </div>
      <aside className="notification-sidebar">
        <section className="notification-summary">
          <span className="notification-summary-icon">
            <NotificationIcon kind="bell" />
          </span>
          <h2>{result ? `Ke ${result.unreadCount} njoftime të palexuara` : 'Njoftimet e tua'}</h2>
          <p>Shiko përditësimet për të ndjekur mundësitë dhe aplikimet.</p>
          <button
            className="btn btn-primary w-100"
            disabled={busy}
            onClick={() => {
              setFilter('all');
              choose('all');
            }}
          >
            Shiko të gjitha →
          </button>
        </section>
        <section className="notification-filter-card">
          <h2>Filtro njoftimet</h2>
          {tabs.map(([value, label]) => (
            <label key={value} className={category === value ? 'active' : ''}>
              <input
                type="radio"
                name="notification-category"
                checked={category === value}
                disabled={busy}
                onChange={() => choose(value)}
              />
              {label}
              {result && <span>{result.counts?.[value] ?? 0}</span>}
            </label>
          ))}
          <label className="notification-unread-filter">
            <input
              type="checkbox"
              checked={filter === 'unread'}
              disabled={busy}
              onChange={(event) => {
                setFilter(event.target.checked ? 'unread' : 'all');
                setPage(1);
              }}
            />
            Vetëm të palexuarat
          </label>
        </section>
        <div className="notification-tip">
          <strong>✦ Qëndro në dijeni</strong>
          <p>Njoftimet e palexuara dallohen me sfond blu të çelët.</p>
          <button
            disabled={busy}
            onClick={() => {
              setAttempt(attempt + 1);
              window.dispatchEvent(new Event('notifications-read'));
            }}
          >
            Rifresko njoftimet ↻
          </button>
        </div>
        <Link to={`/dashboard/${user.role}`}>← Llogaria ime</Link>
      </aside>
    </div>
  );
}

function NotificationIcon({ kind }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === 'bell' ? (
        <>
          <path d="M18 8a6 6 0 0 0-12 0c0 9-3 9-3 10h18c0-1-3-1-3-10M9 21h6" />
        </>
      ) : kind === 'briefcase' ? (
        <>
          <rect x="3" y="7" width="18" height="14" rx="2" />
          <path d="M8 7V3h8v4M3 12h18M12 10v4" />
        </>
      ) : kind === 'document' ? (
        <>
          <path d="M14 2H5v20h14V7ZM14 2v5h5M8 12h8M8 16h6" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2" />
        </>
      )}
    </svg>
  );
}
