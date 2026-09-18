import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../api/client.js';
import { ErrorState, LoadingState } from '../components/States.jsx';

const cities = [
  'Prishtinë',
  'Prizren',
  'Pejë',
  'Gjakovë',
  'Ferizaj',
  'Gjilan',
  'Mitrovicë',
  'Vushtrri',
  'Podujevë',
  'Suharekë',
  'Rahovec',
  'Lipjan',
  'Drenas',
  'Skenderaj',
  'Istog',
  'Klinë',
];
const localPhone = (phone = '') => phone.replace(/^(?:\+383|00383)/, '').trim();

export default function CompanyProfile({ overview }) {
  const [company, setCompany] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    setCompany(null);
    api
      .get('/companies/me', { signal: controller.signal })
      .then(({ data }) => setCompany(data.data))
      .catch((error) => {
        if (!controller.signal.aborted) setError(getErrorMessage(error));
      });
    return () => controller.abort();
  }, [attempt]);
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    fields.phone = fields.phone.trim() ? `+383${localPhone(fields.phone)}` : '';
    try {
      const { data } = await api.put('/companies/me', { ...fields, revision: company.revision });
      setCompany(data.data);
      setMessage('Profili u ruajt me sukses.');
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  if (!company)
    return error ? (
      <ErrorState message={error} onRetry={() => setAttempt(attempt + 1)} />
    ) : (
      <LoadingState />
    );
  return (
    <div className="container py-5 company-profile-layout">
      <div className="company-profile-main">
        {overview}
        <h2 className="h2 company-heading-banner company-profile-heading">Profili i kompanisë</h2>
        <form className="surface p-4" key={company.revision} onSubmit={save}>
          <fieldset disabled={busy}>
            <div className="row g-3">
              {[
                { name: 'name', label: 'Emri i kompanisë', max: 200, required: true },
                { name: 'industry', label: 'Industria', max: 150 },
                { name: 'location', label: 'Qyteti', max: 150 },
                { name: 'address', label: 'Adresa', max: 300 },
                { name: 'phone', label: 'Telefoni', max: 8, type: 'tel' },
                { name: 'website', label: 'Website', max: 500, type: 'url' },
              ].map((field) => (
                <div className="col-md-6" key={field.name}>
                  <div className="company-input-group">
                    <label className="form-label" htmlFor={field.name}>
                      {field.label}
                    </label>
                    {field.name === 'location' ? (
                      <select
                        className="form-control form-select"
                        id="location"
                        name="location"
                        defaultValue={company.location || ''}
                      >
                        <option value="">Zgjidh qytetin</option>
                        {company.location && !cities.includes(company.location) && (
                          <option value={company.location}>{company.location}</option>
                        )}
                        {cities.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <>
                        {field.name === 'phone' && (
                          <span className="company-phone-prefix">+383</span>
                        )}
                        <input
                          className="form-control"
                          id={field.name}
                          name={field.name}
                          defaultValue={
                            field.name === 'phone'
                              ? localPhone(company.phone || '')
                              : company[field.name] || ''
                          }
                          aria-label={
                            field.name === 'phone' ? 'Telefoni, prefiksi +383' : undefined
                          }
                          maxLength={field.max}
                          minLength={field.name === 'phone' ? 8 : undefined}
                          pattern={field.name === 'phone' ? '[0-9]{8}' : undefined}
                          inputMode={field.name === 'phone' ? 'numeric' : undefined}
                          title={
                            field.name === 'phone'
                              ? 'Shkruaj saktësisht 8 shifra pas +383.'
                              : undefined
                          }
                          onInput={
                            field.name === 'phone'
                              ? (event) => {
                                  event.currentTarget.value = event.currentTarget.value
                                    .replace(/\D/g, '')
                                    .slice(0, 8);
                                }
                              : undefined
                          }
                          required={field.required}
                          type={field.type || 'text'}
                        />
                      </>
                    )}
                  </div>
                </div>
              ))}
              <div className="col-12">
                <div className="company-input-group company-input-description">
                  <label className="form-label" htmlFor="description">
                    Përshkrimi
                  </label>
                  <textarea
                    className="form-control"
                    id="description"
                    name="description"
                    rows={5}
                    maxLength={5000}
                    defaultValue={company.description || ''}
                  />
                </div>
              </div>
            </div>
            {error && (
              <p className="text-danger mt-3" role="alert">
                {error}
              </p>
            )}
            {message && (
              <p className="text-success mt-3" role="status">
                {message}
              </p>
            )}
            <div className="d-flex gap-3 flex-wrap mt-3">
              <button className="btn btn-primary" type="submit">
                {busy ? 'Po ruhet…' : 'Ruaj profilin'}
              </button>
              <button
                className="btn btn-outline-primary"
                type="button"
                onClick={() => {
                  setMessage('');
                  setAttempt(attempt + 1);
                }}
              >
                Rifresko të dhënat
              </button>
            </div>
          </fieldset>
        </form>
      </div>
      <aside className="company-profile-actions" aria-label="Menaxhimi i kompanisë">
        <Link
          className="company-action-card company-action-candidates"
          to="/dashboard/company/applications"
        >
          <span className="company-action-symbol" aria-hidden="true">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="9" cy="8" r="3" />
              <path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v3" />
            </svg>
          </span>
          <strong>Kandidatët dhe aplikimet</strong>
          <span>Njihu me talentet që duan të bëhen pjesë e ekipit tënd.</span>
          <span className="company-action-link">
            Shiko kandidatët <span aria-hidden="true">↗</span>
          </span>
        </Link>
        <Link className="company-action-card company-action-offers" to="/dashboard/company/offers">
          <span className="company-action-symbol" aria-hidden="true">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="7" width="18" height="14" rx="3" />
              <path d="M8 7V3h8v4M3 12a24 24 0 0 0 18 0M12 11v4" />
            </svg>
          </span>
          <strong>Ofertat e mia</strong>
          <span>Krijo mundësi të reja dhe menaxho ofertat e kompanisë.</span>
          <span className="company-action-link">
            Menaxho ofertat <span aria-hidden="true">↗</span>
          </span>
        </Link>
      </aside>
    </div>
  );
}
