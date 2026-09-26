import { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../api/client.js';

export default function SaveOfferButton({ id, compact = false }) {
  const [saved, setSaved] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setSaved(null);
    setError('');
    api
      .get(`/saved-opportunities/${id}`, { signal: controller.signal })
      .then(({ data }) => setSaved(data.data.saved))
      .catch((error) => {
        if (!controller.signal.aborted) setError(getErrorMessage(error));
      });
    return () => controller.abort();
  }, [id, attempt]);
  async function toggle() {
    setBusy(true);
    setError('');
    try {
      const { data } = saved
        ? await api.delete(`/saved-opportunities/${id}`)
        : await api.put(`/saved-opportunities/${id}`);
      setSaved(data.data.saved);
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={compact ? 'offer-save-control' : 'my-4'}>
      {error && (
        <p className="text-danger" role="alert">
          {error}
        </p>
      )}
      {saved === null && error ? (
        <button className="btn btn-outline-primary" onClick={() => setAttempt(attempt + 1)}>
          Provo përsëri ruajtjen
        </button>
      ) : (
        <button
          className={compact ? 'offer-heart' : 'btn btn-primary'}
          aria-label={saved ? 'Largo nga të ruajturat' : 'Ruaj ofertën'}
          title={saved ? 'Largo nga të ruajturat' : 'Ruaj ofertën'}
          disabled={busy || saved === null}
          aria-pressed={Boolean(saved)}
          onClick={toggle}
        >
          {compact ? (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill={saved ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
            </svg>
          ) : busy || saved === null ? (
            'Duke ngarkuar…'
          ) : saved ? (
            'Largo nga të ruajturat'
          ) : (
            'Ruaj ofertën'
          )}
        </button>
      )}
    </div>
  );
}
