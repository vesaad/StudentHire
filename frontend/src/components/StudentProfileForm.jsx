import { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../api/client.js';
import SkillInput from './SkillInput.jsx';

const fields = [
  { name: 'firstName', label: 'Emri', max: 100, required: true },
  { name: 'lastName', label: 'Mbiemri', max: 100, required: true },
  { name: 'phone', label: 'Telefoni', max: 30 },
  { name: 'location', label: 'Lokacioni', max: 150 },
  { name: 'university', label: 'Universiteti', max: 200 },
  { name: 'fieldOfStudy', label: 'Drejtimi i studimit', max: 200 },
];
export default function StudentProfileForm({ student, skills, onSaved }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [skillNames, setSkillNames] = useState(student.skills.map((item) => item.skill.name));
  useEffect(() => setSkillNames(student.skills.map((item) => item.skill.name)), [student]);
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    const form = new FormData(event.currentTarget);
    const data = Object.fromEntries(form);
    data.revision = student.revision;
    data.skillNames = skillNames;
    data.graduationYear = form.get('graduationYear') ? Number(form.get('graduationYear')) : null;
    try {
      const response = await api.put('/students/me', data);
      onSaved(response.data.data);
      setMessage('Profili u ruajt.');
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="surface p-4" onSubmit={save}>
      <fieldset disabled={busy}>
        <h2 className="h4">Të dhënat personale dhe akademike</h2>
        <div className="row g-3 mt-1">
          {fields.map((field) => (
            <div className="col-md-6" key={field.name}>
              <label className="form-label" htmlFor={field.name}>
                {field.label}
              </label>
              <input
                className="form-control"
                id={field.name}
                name={field.name}
                defaultValue={student[field.name] || ''}
                maxLength={field.max}
                required={field.required}
              />
            </div>
          ))}
          <div className="col-md-6">
            <label className="form-label" htmlFor="graduationYear">
              Viti i diplomimit
            </label>
            <input
              className="form-control"
              id="graduationYear"
              name="graduationYear"
              type="number"
              min={1950}
              max={new Date().getFullYear() + 15}
              defaultValue={student.graduationYear || ''}
            />
          </div>
          <div className="col-12">
            <label className="form-label" htmlFor="bio">
              Rreth meje
            </label>
            <textarea
              className="form-control"
              id="bio"
              name="bio"
              rows={4}
              maxLength={5000}
              defaultValue={student.bio || ''}
            />
          </div>
        </div>
        <fieldset className="mt-4">
          <legend className="h4">Aftësitë e mia</legend>
          <SkillInput value={skillNames} onChange={setSkillNames} skills={skills} disabled={busy} />
        </fieldset>
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
        <button className="btn btn-primary mt-4" type="submit">
          {busy ? 'Po ruhet…' : 'Ruaj profilin'}
        </button>
      </fieldset>
    </form>
  );
}
