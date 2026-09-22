import { useState } from 'react';
import { jobFields, workModes } from '../../../shared/jobFields.js';
import SkillInput from './SkillInput.jsx';

function localDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
export default function OpportunityForm({ offer, skills, busy, onSave, onDirty, error }) {
  const [field, setField] = useState(offer?.field || '');
  const [validationError, setValidationError] = useState('');
  const [skillNames, setSkillNames] = useState(offer?.skills.map((item) => item.skill.name) || []);
  function submit(event) {
    event.preventDefault();
    setValidationError('');
    const invalid = Array.from(event.currentTarget.elements).find(
      (element) => element.willValidate && !element.validity.valid,
    );
    if (invalid) {
      const label = invalid.labels?.[0]?.textContent.trim() || 'Fusha';
      setValidationError(`${label}: ${invalid.validationMessage}`);
      invalid.focus();
      return;
    }
    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(form);
    values.skillNames = skillNames;
    values.deadline = values.deadline ? new Date(values.deadline).toISOString() : null;
    onSave(values);
  }
  return (
    <form
      noValidate
      onSubmit={submit}
      onChange={() => {
        onDirty(true);
        setValidationError('');
      }}
    >
      <fieldset disabled={busy || offer?.status === 'closed'}>
        <label className="form-label" htmlFor="offer-field">
          Fusha e pozitës
        </label>
        <select
          id="offer-field"
          className="form-select mb-3"
          name="field"
          required
          value={field}
          onChange={(event) => setField(event.target.value)}
        >
          <option value="">Zgjidh fushën e punës</option>
          {jobFields.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <label className="form-label" htmlFor="offer-work-mode">
          Mënyra e punës
        </label>
        <select
          id="offer-work-mode"
          className="form-select mb-3"
          name="workMode"
          required
          defaultValue={offer?.workMode || ''}
        >
          <option value="">Zgjidh mënyrën e punës</option>
          {Object.entries(workModes).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <label className="form-label" htmlFor="offer-title">
          Titulli
        </label>
        <input
          className="form-control mb-3"
          id="offer-title"
          name="title"
          required
          minLength={3}
          maxLength={200}
          defaultValue={offer?.title || ''}
        />
        <div className="row">
          <div className="col-md-6">
            <label className="form-label" htmlFor="offer-type">
              Lloji
            </label>
            <select
              className="form-select mb-3"
              id="offer-type"
              name="type"
              defaultValue={offer?.type || 'job'}
            >
              <option value="job">Punë</option>
              <option value="internship">Praktikë</option>
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label" htmlFor="offer-employment">
              Angazhimi
            </label>
            <select
              className="form-select mb-3"
              id="offer-employment"
              name="employmentType"
              defaultValue={offer?.employmentType || 'full_time'}
            >
              <option value="full_time">Orar i plotë</option>
              <option value="part_time">Orar i pjesshëm</option>
              <option value="contract">Kontratë</option>
            </select>
          </div>
        </div>
        <label className="form-label" htmlFor="offer-location">
          Lokacioni
        </label>
        <input
          className="form-control mb-3"
          id="offer-location"
          name="location"
          required
          maxLength={150}
          defaultValue={offer?.location || ''}
        />
        <label className="form-label" htmlFor="offer-description">
          Përshkrimi
        </label>
        <textarea
          className="form-control mb-3"
          id="offer-description"
          name="description"
          required
          minLength={10}
          maxLength={15000}
          rows={6}
          defaultValue={offer?.description || ''}
        />
        <label className="form-label" htmlFor="offer-deadline">
          Afati (opsional, sipas orës lokale)
        </label>
        <input
          className="form-control mb-3"
          id="offer-deadline"
          name="deadline"
          type="datetime-local"
          defaultValue={localDate(offer?.deadline)}
        />
        <fieldset>
          <legend className="h5">Aftësitë e kërkuara</legend>
          <SkillInput
            skills={skills}
            field={field}
            value={skillNames}
            onChange={(names) => {
              setSkillNames(names);
              onDirty(true);
            }}
            disabled={busy || offer?.status === 'closed'}
          />
        </fieldset>
        {(validationError || error) && (
          <p className="text-danger mt-3" role="alert">
            {validationError || error}
          </p>
        )}
        {offer?.status !== 'closed' && (
          <button className="btn btn-primary mt-4" type="submit">
            {busy ? 'Po ruhet…' : offer ? 'Ruaj ndryshimet' : 'Krijo draftin'}
          </button>
        )}
      </fieldset>
    </form>
  );
}
