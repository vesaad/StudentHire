import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getErrorMessage } from '../api/client.js';
import { LoadingState, ErrorState } from './States.jsx';
import { applicationStatuses } from '../data/applicationStatuses.js';

export default function ApplyForm({ opportunityId }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    setError('');
    Promise.all([
      api.get(`/applications/for-offer/${opportunityId}`, { signal: controller.signal }),
      api.get('/students/me', { signal: controller.signal }),
    ])
      .then(([application, profile]) =>
        setResult({ application: application.data.data, cv: profile.data.data.cvOriginalName }),
      )
      .catch((error) => {
        if (!controller.signal.aborted) setError(getErrorMessage(error));
      });
    return () => controller.abort();
  }, [opportunityId, attempt]);
  async function submit(event) {
    event.preventDefault();
    const message = new FormData(event.currentTarget).get('message');
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/applications', { opportunityId, message });
      setResult({ ...result, application: data.data });
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="border-top pt-4 mt-4">
      <h2 className="h4">Aplikimi im</h2>
      {!result ? (
        error ? (
          <ErrorState message={error} onRetry={() => setAttempt(attempt + 1)} />
        ) : (
          <LoadingState />
        )
      ) : result.application ? (
        <>
          <p role="status">Ke aplikuar · {applicationStatuses[result.application.status]}</p>
          <Link to={`/dashboard/student/applications/${result.application.id}`}>
            Shiko aplikimin dhe historikun →
          </Link>
        </>
      ) : (
        <>
          {error && (
            <p className="text-danger" role="alert">
              {error}
            </p>
          )}
          {result.cv ? (
            <form onSubmit={submit}>
              <p>
                Do të dërgohet një kopje e CV-së: <strong>{result.cv}</strong>.
              </p>
              <p className="text-secondary">
                Kompania do të shohë profilin tënd dhe këtë kopje të CV-së. Mund të aplikosh vetëm
                një herë në këtë ofertë.
              </p>
              <label className="form-label" htmlFor="application-message">
                Mesazhi për kompaninë (opsional)
              </label>
              <textarea
                className="form-control"
                id="application-message"
                name="message"
                maxLength={3000}
                rows={4}
                disabled={busy}
              />
              <button className="btn btn-primary mt-3" type="submit" disabled={busy}>
                {busy ? 'Po dërgohet…' : 'Dërgo aplikimin'}
              </button>
            </form>
          ) : (
            <p>
              <Link to="/dashboard/student">Ngarko CV-në PDF në profil</Link> përpara se të
              aplikosh.
            </p>
          )}
          <button
            className="btn btn-outline-primary mt-3"
            disabled={busy}
            onClick={() => setAttempt(attempt + 1)}
          >
            Rifresko të dhënat e aplikimit
          </button>
        </>
      )}
    </section>
  );
}
