import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { api, getErrorMessage } from '../api/client.js';
import { LoadingState, ErrorState, EmptyState } from '../components/States.jsx';
import Pagination from '../components/Pagination.jsx';
import AdminActionForm from '../components/AdminActionForm.jsx';
import AdminCompanies from './AdminCompanies.jsx';
const titles = {
  users: 'Përdoruesit',
};
const statusLabels = {
  active: 'Aktive',
  suspended: 'E pezulluar',
  draft: 'Draft',
  published: 'E publikuar',
  closed: 'E mbyllur',
  inactive: 'Joaktive',
};
export default function AdminManagement() {
  const { user } = useAuth();
  const { section } = useParams();
  if (user.role === 'admin' && section === 'companies') return <AdminCompanies />;
  if (user.role !== 'admin' || !titles[section])
    return <Navigate to={`/dashboard/${user.role}`} replace />;
  return <ManagementList key={section} section={section} />;
}
function ManagementList({ section }) {
  const [filters, setFilters] = useState({
    q: '',
    status: 'all',
    ...(section === 'users' ? { role: 'all' } : {}),
  });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    setError('');
    api
      .get(`/admin/${section}`, { params: { ...filters, page }, signal: controller.signal })
      .then(({ data }) => setResult(data.data))
      .catch((error) => {
        if (!controller.signal.aborted) setError(getErrorMessage(error));
      });
    return () => controller.abort();
  }, [section, filters, page, attempt]);
  function search(event) {
    event.preventDefault();
    setFilters(Object.fromEntries(new FormData(event.currentTarget)));
    setPage(1);
    setSelected(null);
  }
  const statuses =
    section === 'users'
      ? ['active', 'suspended']
      : section === 'skills'
        ? ['active', 'inactive']
        : ['draft', 'published', 'closed'];
  return (
    <div className="container py-5">
      <Link to="/dashboard/admin">← Administrimi</Link>
      <h1 className="mt-4">{titles[section]}</h1>
      <form onSubmit={search} className="surface p-3 my-4">
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label" htmlFor="admin-search">
              {section === 'users' ? 'Email' : 'Kërko sipas emrit ose titullit'}
            </label>
            <input id="admin-search" name="q" maxLength={100} className="form-control" />
          </div>
          <div className="col-md-3">
            <label className="form-label" htmlFor="admin-filter">
              Statusi
            </label>
            <select id="admin-filter" name="status" className="form-select">
              <option value="all">Të gjitha</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
          </div>
          {section === 'users' && (
            <div className="col-md-3">
              <label className="form-label" htmlFor="admin-role">
                Roli
              </label>
              <select id="admin-role" name="role" className="form-select">
                <option value="all">Të gjithë</option>
                <option value="student">Student</option>
                <option value="company">Kompani</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          )}
        </div>
        <button className="btn btn-primary mt-3" type="submit">
          Kërko
        </button>
      </form>
      <div className="d-flex gap-3 mb-3">
        {section === 'skills' && (
          <button
            className="btn btn-primary"
            onClick={() => {
              setSelected({ new: true });
              setMessage('');
            }}
          >
            Shto aftësi
          </button>
        )}
        <button
          className="btn btn-outline-primary"
          onClick={() => {
            setSelected(null);
            setAttempt(attempt + 1);
          }}
        >
          Rifresko listën
        </button>
      </div>
      {message && (
        <p role="status" className="text-success">
          {message}
        </p>
      )}
      {selected && (
        <>
          <AdminActionForm
            key={selected.new ? 'new' : `${selected.id}-${selected.revision}`}
            section={section}
            item={selected.new ? null : selected}
            onSaved={() => {
              setSelected(null);
              setMessage('Ndryshimi u ruajt.');
              setAttempt((value) => value + 1);
            }}
          />
          <button className="btn btn-outline-primary mb-4" onClick={() => setSelected(null)}>
            Anulo
          </button>
        </>
      )}
      {error ? (
        <ErrorState message={error} onRetry={() => setAttempt(attempt + 1)} />
      ) : !result ? (
        <LoadingState />
      ) : (
        <>
          {!result.items.length && (
            <EmptyState title="Nuk ka rezultate">Provo filtra të tjerë.</EmptyState>
          )}
          {result.items.map((item) => (
            <article className="surface p-4 mb-3 text-break" key={item.id}>
              <h2 className="h4">{item.email || item.name || item.title}</h2>
              {section === 'users' ? (
                <>
                  <p>
                    {item.role} · {statusLabels[item.status]}
                  </p>
                  {item.statusReason && <p>Arsyeja e fundit: {item.statusReason}</p>}
                  {item.company ? (
                    <Link to="/dashboard/admin">Menaxho te kompanitë →</Link>
                  ) : item.role === 'student' ? (
                    <button
                      className="btn btn-outline-primary"
                      onClick={() => {
                        setSelected(item);
                        setMessage('');
                      }}
                    >
                      {item.status === 'active' ? 'Pezullo' : 'Riaktivizo'}
                    </button>
                  ) : (
                    <p>Llogaria admin nuk ndryshohet nga ky panel.</p>
                  )}
                </>
              ) : section === 'skills' ? (
                <>
                  <p>{item.isActive ? 'Aktive' : 'Joaktive'}</p>
                  <button
                    className="btn btn-outline-primary"
                    onClick={() => {
                      setSelected(item);
                      setMessage('');
                    }}
                  >
                    Ndrysho aftësinë
                  </button>
                </>
              ) : (
                <>
                  <p>
                    {item.company.name} · {statusLabels[item.status]} · {item.location}
                  </p>
                  <details>
                    <summary>Detajet e ofertës</summary>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{item.description}</p>
                    <p>
                      {item.type === 'job' ? 'Punë' : 'Praktikë'} · {item.employmentType}
                    </p>
                    <p>{item.skills.map(({ skill }) => skill.name).join(', ')}</p>
                    {item.deadline && (
                      <p>Afati: {new Date(item.deadline).toLocaleDateString('sq-AL')}</p>
                    )}
                  </details>
                  {item.moderationReason && (
                    <p className="mt-3">
                      Mbyllur nga {item.moderatedBy?.email} më{' '}
                      {new Date(item.moderatedAt).toLocaleDateString('sq-AL')}:{' '}
                      {item.moderationReason}
                    </p>
                  )}
                  {item.status !== 'closed' && (
                    <button
                      className="btn btn-outline-danger mt-3"
                      onClick={() => {
                        setSelected(item);
                        setMessage('');
                      }}
                    >
                      Mbyll ofertën
                    </button>
                  )}
                </>
              )}
            </article>
          ))}
          <Pagination
            page={result.page}
            total={result.total}
            onPage={(next) => {
              setPage(next);
              setSelected(null);
            }}
          />
        </>
      )}
    </div>
  );
}
