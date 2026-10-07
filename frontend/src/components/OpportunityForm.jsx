import { useState } from 'react';
import { jobFields, workModes, skillKey } from '../../../shared/jobFields.js';
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
  const [requirements, setRequirements] = useState(() =>
    Object.fromEntries(
      (offer?.skills || []).map((item) => [
        skillKey(item.skill.name),
        { requirementType: item.requirementType || 'required', weight: item.weight || 1 },
      ]),
    ),
  );
  const settings = (name) =>
    requirements[skillKey(name)] || { requirementType: 'required', weight: 1 };
  function changeRequirement(name, key, value) {
    setRequirements((previous) => ({
      ...previous,
      [skillKey(name)]: { ...settings(name), [key]: value },
    }));
    onDirty(true);
  }
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
    values.skillRequirements = skillNames.map((name) => ({ name, ...settings(name) }));
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
          <p className="small text-secondary mt-3">
            Aftësitë e detyrueshme vlejnë dyfish. Pesha 3 për një aftësi të detyrueshme e shënon atë
            si kritike.
          </p>
          {skillNames.map((name, index) => (
            <div className="row g-2 align-items-center mb-3" key={skillKey(name)}>
              <strong className="col-md-4">{name}</strong>
              <div className="col-md-4">
                <label className="form-label" htmlFor={`requirement-${index}`}>
                  Kërkesa për {name}
                </label>
                <select
                  id={`requirement-${index}`}
                  className="form-select"
                  value={settings(name).requirementType}
                  onChange={(event) =>
                    changeRequirement(name, 'requirementType', event.target.value)
                  }
                >
                  <option value="required">E detyrueshme</option>
                  <option value="preferred">E preferuar</option>
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label" htmlFor={`weight-${index}`}>
                  Rëndësia e {name}
                </label>
                <select
                  id={`weight-${index}`}
                  className="form-select"
                  value={settings(name).weight}
                  onChange={(event) =>
                    changeRequirement(name, 'weight', Number(event.target.value))
                  }
                >
                  <option value={1}>1 — Bazë</option>
                  <option value={2}>2 — E rëndësishme</option>
                  <option value={3}>3 — Shumë e rëndësishme</option>
                </select>
              </div>
            </div>
          ))}
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
