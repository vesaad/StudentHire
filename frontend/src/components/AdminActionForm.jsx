import { useState } from 'react';
import { api, getErrorMessage } from '../api/client.js';
export default function AdminActionForm({ section, item, onSaved }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      if (section === 'skills') {
        const values = { name: form.get('name') };
        if (item)
          await api.put(`/admin/skills/${item.id}`, {
            ...values,
            revision: item.revision,
            isActive: form.get('isActive') === 'on',
          });
        else await api.post('/admin/skills', values);
      } else if (section === 'users')
        await api.patch(`/admin/users/${item.id}/status`, {
          revision: item.revision,
          status: item.status === 'active' ? 'suspended' : 'active',
          reason: form.get('reason'),
        });
      else
        await api.post(`/admin/offers/${item.id}/close`, {
          revision: item.revision,
          reason: form.get('reason'),
        });
      onSaved();
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="surface p-4 my-4" onSubmit={submit}>
      <h2 className="h4">
        {section === 'skills'
          ? item
            ? 'Ndrysho aftësinë'
            : 'Aftësi e re'
          : section === 'users'
            ? item.status === 'active'
              ? 'Pezullo studentin'
              : 'Riaktivizo studentin'
            : 'Mbyll ofertën'}
      </h2>
      {error && (
        <p className="text-danger" role="alert">
          {error}
        </p>
      )}
      <fieldset disabled={busy}>
        {section === 'skills' ? (
          <>
            <label className="form-label" htmlFor="skill-name">
              Emri i aftësisë
            </label>
            <input
              id="skill-name"
              name="name"
              className="form-control"
              required
              maxLength={100}
              defaultValue={item?.name || ''}
            />
            {item && (
              <>
                <label className="d-block my-3">
                  <input
                    className="form-check-input me-2"
                    type="checkbox"
                    name="isActive"
                    defaultChecked={item.isActive}
                  />
                  Aktive në katalog
                </label>
                <p>
                  Ndryshimi i emrit shfaqet edhe në profilet dhe ofertat që e përdorin. Çaktivizimi
                  ruan lidhjet ekzistuese.
                </p>
              </>
            )}
          </>
        ) : (
          <>
            <p>{item.email || item.title}</p>
            <p>
              {section === 'offers'
                ? 'Mbyllja është përfundimtare. Aplikimet, CV-të dhe historiku ruhen.'
                : 'Pezullimi bllokon qasjen edhe me një sesion ekzistues. Të dhënat ruhen.'}
            </p>
            <label className="form-label" htmlFor="admin-reason">
              Arsyeja
            </label>
            <textarea
              id="admin-reason"
              name="reason"
              className="form-control"
              required
              minLength={3}
              maxLength={2000}
              rows={3}
            />
          </>
        )}
        <button className="btn btn-primary mt-3" type="submit">
          {busy ? 'Po ruhet…' : 'Konfirmo dhe ruaj'}
        </button>
      </fieldset>
    </form>
  );
}
