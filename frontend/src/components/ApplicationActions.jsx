import { useState } from 'react';
import { api, getErrorMessage } from '../api/client.js';
import { applicationStatuses } from '../data/applicationStatuses.js';

export default function ApplicationActions({ application, role, onChanged }) {
  const [action, setAction] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const options =
    role === 'student'
      ? ['withdrawn']
      : application.status === 'pending'
        ? ['reviewed', 'accepted', 'rejected']
        : ['accepted', 'rejected'];
  async function submit(event) {
    event.preventDefault();
    const note = new FormData(event.currentTarget).get('note');
    setBusy(true);
    setError('');
    try {
      await api.post(`/applications/${application.id}/status`, {
        status: action,
        expectedStatus: application.status,
        note,
      });
      onChanged();
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  if (!['pending', 'reviewed'].includes(application.status))
    return <p className="notice">Ky status është përfundimtar.</p>;
  return (
    <section className="border-top mt-4 pt-4">
      <h2 className="h4">{role === 'student' ? 'Tërhiq aplikimin' : 'Ndrysho statusin'}</h2>
      {error && (
        <p className="text-danger" role="alert">
          {error}
        </p>
      )}
      {!action ? (
        <div className="d-flex gap-3 flex-wrap">
          {options.map((status) => (
            <button
              className="btn btn-outline-primary"
              key={status}
              onClick={() => setAction(status)}
            >
              {status === 'withdrawn' ? 'Tërhiq aplikimin' : applicationStatuses[status]}
            </button>
          ))}
        </div>
      ) : (
        <form onSubmit={submit}>
          <p>
            Konfirmo statusin: <strong>{applicationStatuses[action]}</strong>.
          </p>
          {['accepted', 'rejected', 'withdrawn'].includes(action) && (
            <p>
              Ky veprim është përfundimtar.
              {action === 'withdrawn' && ' Nuk mund të aplikosh përsëri në këtë ofertë.'}
            </p>
          )}
          <label className="form-label" htmlFor="application-note">
            Shënim (opsional, i dukshëm në historik)
          </label>
          <textarea
            id="application-note"
            name="note"
            className="form-control"
            rows={3}
            maxLength={2000}
            disabled={busy}
          />
          <div className="d-flex gap-3 mt-3">
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Po ruhet…' : 'Konfirmo ndryshimin'}
            </button>
            <button
              className="btn btn-outline-primary"
              type="button"
              disabled={busy}
              onClick={() => setAction('')}
            >
              Anulo
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
