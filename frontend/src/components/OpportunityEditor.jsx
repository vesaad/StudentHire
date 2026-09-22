import { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../api/client.js';
import { ErrorState, LoadingState } from './States.jsx';
import OpportunityForm from './OpportunityForm.jsx';
export const offerStatuses = { draft: 'Draft', published: 'E publikuar', closed: 'E mbyllur' };
export default function OpportunityEditor({ id, skills, busy, onBusyChange, onSaved }) {
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(id !== 'new');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const offerId = id === 'new' ? offer?.id : id;
  useEffect(() => {
    if (!offerId) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    api
      .get(`/company-opportunities/${offerId}`, { signal: controller.signal })
      .then(({ data }) => {
        setOffer(data.data);
        setDirty(false);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(getErrorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [offerId, attempt]);
  async function save(values) {
    onBusyChange(true);
    setError('');
    setMessage('');
    try {
      const response = offer
        ? await api.put(`/company-opportunities/${offer.id}`, {
            ...values,
            revision: offer.revision,
          })
        : await api.post('/company-opportunities', values);
      setOffer(response.data.data);
      setDirty(false);
      setMessage(
        offer
          ? 'Oferta u ruajt.'
          : 'Oferta u krijua si draft dhe u shtua te Ofertat e mia. Për ta bërë publike, kliko “Publiko ofertën”.',
      );
      onSaved(response.data.data);
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      onBusyChange(false);
    }
  }
  async function changeStatus(action) {
    onBusyChange(true);
    setError('');
    setMessage('');
    try {
      const { data } = await api.post(`/company-opportunities/${offer.id}/${action}`, {
        revision: offer.revision,
      });
      setOffer(data.data);
      setConfirmClose(false);
      setMessage(action === 'publish' ? 'Oferta u publikua.' : 'Oferta u mbyll.');
      onSaved(data.data);
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      onBusyChange(false);
    }
  }
  if (loading) return <LoadingState />;
  if (!offer && id !== 'new')
    return <ErrorState message={error} onRetry={() => setAttempt(attempt + 1)} />;
  return (
    <section className="surface p-4 mt-4">
      <h2 className="h3">{offer ? 'Detajet e ofertës' : 'Ofertë e re'}</h2>
      {offer && (
        <p>
          Statusi: <strong>{offerStatuses[offer.status]}</strong>
          {offer.publishedAt &&
            ` · Publikuar: ${new Date(offer.publishedAt).toLocaleDateString('sq-AL')}`}
          {offer.closedAt && ` · Mbyllur: ${new Date(offer.closedAt).toLocaleDateString('sq-AL')}`}
        </p>
      )}
      {error && (
        <p className="text-danger" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="text-success" role="status">
          {message}
        </p>
      )}
      <OpportunityForm
        key={offer ? `${offer.id}-${offer.revision}` : 'new'}
        offer={offer}
        skills={skills}
        busy={busy}
        onSave={save}
        onDirty={setDirty}
        error={error}
      />
      {offer && offer.status !== 'closed' && (
        <div className="mt-4 border-top pt-3">
          {dirty && <p>Ruaj ndryshimet përpara publikimit ose mbylljes.</p>}
          <div className="d-flex gap-3 flex-wrap">
            {offer.status === 'draft' && (
              <button
                className="btn btn-primary"
                disabled={busy || dirty}
                onClick={() => changeStatus('publish')}
              >
                Publiko ofertën
              </button>
            )}
            <button
              className="btn btn-outline-danger"
              disabled={busy || dirty}
              onClick={() => setConfirmClose(true)}
            >
              Mbyll ofertën
            </button>
          </div>
          {confirmClose && (
            <div className="notice">
              <p>Mbyllja është përfundimtare. Aplikimet dhe historiku ruhen.</p>
              <button
                className="btn btn-danger me-2"
                disabled={busy}
                onClick={() => changeStatus('close')}
              >
                Po, mbylle
              </button>
              <button
                className="btn btn-outline-primary"
                disabled={busy}
                onClick={() => setConfirmClose(false)}
              >
                Anulo
              </button>
            </div>
          )}
        </div>
      )}
      {offer && (
        <button
          className="btn btn-outline-primary mt-3"
          disabled={busy}
          onClick={() => {
            setMessage('');
            setAttempt(attempt + 1);
          }}
        >
          Rifresko të dhënat
        </button>
      )}
    </section>
  );
}

