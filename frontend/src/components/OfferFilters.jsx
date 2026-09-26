import { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../api/client.js';
import { jobFields } from '../../../shared/jobFields.js';

export default function OfferFilters({ filters, skills, onSearch, onReset }) {
  const [field, setField] = useState(filters.field || '');
  const [selected, setSelected] = useState(
    (filters.skillIds || filters.skillId || '').split(',').filter(Boolean),
  );
  const [catalog, setCatalog] = useState(skills);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    setLoading(true);
    setCatalog([]);
    api
      .get('/opportunities/skills', { params: { field }, signal: controller.signal })
      .then(({ data }) => setCatalog(data.data))
      .catch((error) => {
        if (!controller.signal.aborted) setError(getErrorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [field]);
  function submit(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (selected.length) values.skillIds = selected.join(',');
    onSearch(Object.fromEntries(Object.entries(values).filter(([, value]) => value.trim())));
  }
  return (
    <form id="opportunity-search" className="surface p-4 mb-4 offer-filter-form" onSubmit={submit}>
      <div className="offer-search-row">
        <div className="col-md-4">
          <div className="offer-filter-bubble">
            <label htmlFor="search-field" className="form-label">
              Fusha e punës
            </label>
            <select
              id="search-field"
              name="field"
              className="form-select"
              value={field}
              onChange={(event) => {
                setField(event.target.value);
                setSelected([]);
              }}
            >
              <option value="">Të gjitha fushat</option>
              {jobFields.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="col-md-4">
          <div className="offer-filter-bubble">
            <label htmlFor="search-location" className="form-label">
              Qyteti
            </label>
            <input
              id="search-location"
              className="form-control"
              name="location"
              maxLength={150}
              defaultValue={filters.location || ''}
              placeholder="P.sh. Prishtinë"
            />
          </div>
        </div>
        <div className="col-md-4">
          <div className="offer-filter-bubble">
            <label htmlFor="search-type" className="form-label">
              Lloji i mundësisë
            </label>
            <select
              id="search-type"
              className="form-select"
              name="type"
              defaultValue={filters.type || ''}
            >
              <option value="">Punë dhe praktika</option>
              <option value="job">Punë</option>
              <option value="internship">Praktikë</option>
            </select>
          </div>
        </div>
        <div className="offer-filter-actions">
          <button className="btn btn-primary" type="submit">
            Kërko
          </button>
          <button
            className="btn btn-outline-primary"
            type="button"
            onClick={(event) => {
              event.currentTarget.form.reset();
              setField('');
              setSelected([]);

              onReset();
            }}
          >
            Pastro filtrat
          </button>
        </div>
      </div>
      {(field || selected.length > 0) && (
        <fieldset className="mt-4">
          <legend className="h6">Aftësitë</legend>
          <p className="small text-secondary">
            Zgjidh një ose disa. Shfaqen ofertat që kërkojnë të paktën njërën.
          </p>
          {loading ? (
            <p role="status">Po ngarkohen aftësitë…</p>
          ) : error ? (
            <p role="alert" className="text-danger">
              {error}
            </p>
          ) : (
            <div className="d-flex gap-2 flex-wrap">
              {catalog.map((skill) => (
                <button
                  key={skill.id}
                  type="button"
                  className={`btn btn-sm ${selected.includes(String(skill.id)) ? 'btn-primary' : 'btn-outline-primary'}`}
                  aria-pressed={selected.includes(String(skill.id))}
                  onClick={() =>
                    setSelected((current) =>
                      current.includes(String(skill.id))
                        ? current.filter((id) => id !== String(skill.id))
                        : [...current, String(skill.id)],
                    )
                  }
                >
                  {skill.name}
                </button>
              ))}
              {!catalog.length && (
                <p className="small text-secondary">
                  Nuk ka ende aftësi për këtë fushë. Mund të kërkosh sipas fushës.
                </p>
              )}
            </div>
          )}
        </fieldset>
      )}
    </form>
  );
}
