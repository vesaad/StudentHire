import { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../api/client.js';
import { LoadingState, ErrorState } from './States.jsx';
import { applicationStatuses } from '../data/applicationStatuses.js';
import { AdminIcon } from './AdminShell.jsx';

export default function DashboardOverview({ user }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError('');
    api
      .get('/dashboard', { signal: controller.signal })
      .then((response) => setData(response.data.data))
      .catch((error) => {
        if (!controller.signal.aborted) setError(getErrorMessage(error));
      });
    return () => controller.abort();
  }, [user.id, attempt]);
  if (error) return <ErrorState message={error} onRetry={() => setAttempt(attempt + 1)} />;
  if (!data) return <LoadingState />;
  if (data.role === 'student') {
    return (
      <div className="student-application-stats">
        {Object.entries(applicationStatuses)
          .filter(([status]) => status !== 'withdrawn')
          .map(([status, label]) => (
            <div className="surface p-3" key={status}>
              <p className="mb-2">Aplikime: {label}</p>
              <strong className="h3">{data.applications?.[status] || 0}</strong>
            </div>
          ))}
      </div>
    );
  }
  const isCompany = data.role === 'company';
  const cards = isCompany ? [] : [['Njoftime të palexuara', data.unreadCount]];
  if (data.role === 'admin')
    cards.push(
      ['Përdorues', data.users],
      ['Studentë', data.students],
      ['Aplikime gjithsej', data.applicationCount],
      ['Kompani në pritje', data.companies.pending || 0],
      ['Kompani të aprovuara', data.companies.approved || 0],
      ['Kompani të refuzuara', data.companies.rejected || 0],
    );
  if (data.offers && isCompany) cards.push(['Oferta të publikuara', data.offers.published || 0]);
  else if (data.offers)
    cards.push(
      ['Oferta draft', data.offers.draft || 0],
      ['Oferta të publikuara', data.offers.published || 0],
      ['Oferta të mbyllura', data.offers.closed || 0],
    );
  if (data.applications)
    for (const [status, label] of Object.entries(applicationStatuses)) {
      if (isCompany && ['reviewed', 'withdrawn'].includes(status)) continue;
      cards.push([`Aplikime: ${label}`, data.applications[status] || 0]);
    }
  return (
    <section
      className={`container pt-5${isCompany ? ' company-overview' : data.role === 'admin' ? ' admin-overview' : ''}`}
    >
      <div className={isCompany ? 'company-heading-banner' : undefined}>
        <h1 className="h2">
          {isCompany
            ? data.name || 'Kompania ime'
            : data.role === 'admin'
              ? 'Paneli i administrimit'
              : `Përmbledhja${data.name ? ` — ${data.name}` : ''}`}
        </h1>
        {data.role === 'company' && (
          <p>
            Statusi i kompanisë:{' '}
            <strong>
              {
                { pending: 'Në pritje', approved: 'E aprovuar', rejected: 'E refuzuar' }[
                  data.companyStatus
                ]
              }
            </strong>
          </p>
        )}
      </div>
      {data.role === 'admin' && (
        <p className="admin-page-intro">
          Monitoro dhe menaxho aktivitetin e platformës, përdoruesit, kompanitë, ofertat dhe
          aplikimet nga një vend i vetëm.
        </p>
      )}
      <div className="row g-3 my-3">
        {cards.map(([label, value], index) => (
          <div className="col-sm-6 col-lg-3" key={label}>
            <div
              className={`surface p-3 h-100${data.role === 'admin' ? ` admin-stat admin-stat-${index % 4}` : ''}`}
            >
              {data.role === 'admin' && (
                <span className="admin-stat-icon">
                  <AdminIcon
                    kind={
                      label.includes('Kompani')
                        ? 'companies'
                        : label.includes('Oferta')
                          ? 'offers'
                          : label.includes('Njoftime')
                            ? 'bell'
                            : 'users'
                    }
                  />
                </span>
              )}
              <p className="mb-2">{label}</p>
              <strong className="h3">{value}</strong>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
