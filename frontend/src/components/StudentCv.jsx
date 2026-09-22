import { useState } from 'react';
import { api, getErrorMessage } from '../api/client.js';

export default function StudentCv({ student, onSaved }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  async function upload(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get('cv');
    if (!file?.size || file.size > 5 * 1024 * 1024) {
      setError('Zgjidh një PDF deri në 5 MB.');
      return;
    }
    data.set('revision', String(student.revision));
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await api.post('/students/me/cv', data);
      onSaved(response.data.data);
      form.reset();
      setConfirmDelete(false);
      setMessage('CV-ja u ruajt.');
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function download() {
    setBusy(true);
    setError('');
    try {
      const response = await api.get('/students/me/cv', { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = student.cvOriginalName || 'CV.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setError('CV-ja nuk mund të shkarkohet. Rifresko faqen dhe provo përsëri.');
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await api.delete('/students/me/cv', {
        data: { revision: student.revision },
      });
      onSaved(response.data.data);
      setConfirmDelete(false);
      setMessage('CV-ja u fshi.');
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="surface p-4 mt-4">
      <h2 className="h4">CV-ja ime</h2>
      <p className="text-secondary">Një CV PDF, deri në 5 MB. CV-ja ruhet privatisht.</p>
      {student.cvOriginalName ? (
        <>
          <p className="text-break">
            <strong>{student.cvOriginalName}</strong> · {Math.ceil(student.cvSizeBytes / 1024)} KB
          </p>
          <div className="d-flex gap-3 flex-wrap mb-3">
            <button className="btn btn-outline-primary" disabled={busy} onClick={download}>
              Shkarko CV-në
            </button>
            <button
              className="btn btn-outline-danger"
              disabled={busy}
              onClick={() => setConfirmDelete(true)}
            >
              Fshi CV-në
            </button>
          </div>
        </>
      ) : (
        <p>Ende nuk ke ngarkuar CV.</p>
      )}
      {confirmDelete && student.cvOriginalName && (
        <div className="notice">
          <p>A dëshiron ta fshish CV-në aktuale?</p>
          <button className="btn btn-danger me-2" disabled={busy} onClick={remove}>
            Po, fshije
          </button>
          <button
            className="btn btn-outline-primary"
            disabled={busy}
            onClick={() => setConfirmDelete(false)}
          >
            Anulo
          </button>
        </div>
      )}
      {!student.cvOriginalName && (
        <form onSubmit={upload}>
          <fieldset disabled={busy}>
            <label className="form-label" htmlFor="cv">
              Ngarko CV-në
            </label>
            <input
              id="cv"
              className="form-control"
              name="cv"
              type="file"
              accept="application/pdf,.pdf"
              required
            />
            <button className="btn btn-primary mt-3" type="submit">
              {busy ? 'Po përpunohet…' : 'Ruaj CV-në'}
            </button>
          </fieldset>
        </form>
      )}
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
    </section>
  );
}
