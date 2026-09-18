import { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../api/client.js';
import { ErrorState, LoadingState } from './States.jsx';
import CompanyHistory, { statusLabel } from './CompanyHistory.jsx';

export default function CompanyReview({ companyId, busy, onBusyChange, onSaved }) {
  const [company, setCompany] = useState(null);
  const [detailError, setDetailError] = useState('');
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!companyId) return;
    const controller = new AbortController();
    setCompany(null);
    setDetailError('');
    api
      .get(`/companies/${companyId}`, { signal: controller.signal })
      .then(({ data }) => setCompany(data.data))
      .catch((error) => {
        if (!controller.signal.aborted) setDetailError(getErrorMessage(error));
      });
    return () => controller.abort();
  }, [companyId, attempt]);
  async function decide(event) {
    event.preventDefault();
    onBusyChange(true);
    setDetailError('');
    setMessage('');
    const fields = new FormData(event.currentTarget);
    try {
      await api.post(`/companies/${company.id}/decisions`, {
        revision: company.revision,
        action: fields.get('action'),
        reason: fields.get('reason'),
      });
      setMessage('Vendimi, historiku dhe njoftimi u ruajtën.');
      setAttempt(attempt + 1);
      onSaved();
    } catch (error) {
      setDetailError(getErrorMessage(error));
    } finally {
      onBusyChange(false);
    }
  }
  return (
    <>
      {message && (
        <p className="text-success" role="status">
          {message}
        </p>
      )}
      <section className="mt-4">
        <h2 className="h3">Shqyrtimi i kompanisë</h2>
        {!company ? (
          detailError ? (
            <ErrorState message={detailError} onRetry={() => setAttempt(attempt + 1)} />
          ) : (
            <LoadingState />
          )
        ) : (
          <>
            <div className="surface p-4">
              <h3 className="h4">{company.name}</h3>
              <p>{company.user.email}</p>
              <p>
                {statusLabel(company.status)} · {statusLabel(company.user.status)}
              </p>
              <p className="text-break" style={{ whiteSpace: 'pre-wrap' }}>
                {company.description || 'Pa përshkrim.'}
              </p>
              <dl>
                {[
                  ['Industria', company.industry],
                  ['Lokacioni', company.location],
                  ['Telefoni', company.phone],
                  ['Website', company.website],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd className="text-break">{value || '—'}</dd>
                  </div>
                ))}
              </dl>
              <form key={company.revision} onSubmit={decide}>
                <fieldset disabled={busy}>
                  <label className="form-label" htmlFor="decision">
                    Vendimi
                  </label>
                  <select
                    className="form-select mb-3"
                    id="decision"
                    name="action"
                    required
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Zgjidh veprimin
                    </option>
                    {company.status !== 'approved' && <option value="approve">Aprovo</option>}
                    {company.status !== 'rejected' && <option value="reject">Refuzo</option>}
                    {company.user.status === 'active' ? (
                      <option value="suspend">Pezullo llogarinë</option>
                    ) : (
                      <option value="reactivate">Riaktivizo llogarinë</option>
                    )}
                  </select>
                  <label className="form-label" htmlFor="reason">
                    Arsyetimi (i detyrueshëm për refuzim ose pezullim)
                  </label>
                  <textarea
                    className="form-control"
                    name="reason"
                    id="reason"
                    maxLength={2000}
                    rows={3}
                  />
                  {detailError && (
                    <p className="text-danger mt-3" role="alert">
                      {detailError}
                    </p>
                  )}
                  <div className="d-flex gap-3 flex-wrap mt-3">
                    <button className="btn btn-primary" type="submit">
                      {busy ? 'Po ruhet…' : 'Ruaj vendimin'}
                    </button>
                    <button
                      className="btn btn-outline-primary"
                      type="button"
                      onClick={() => setAttempt(attempt + 1)}
                    >
                      Rifresko
                    </button>
                  </div>
                </fieldset>
              </form>
            </div>
            <CompanyHistory history={company.approvals} />
          </>
        )}
      </section>
    </>
  );
}
