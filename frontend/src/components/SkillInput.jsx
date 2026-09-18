import { useId, useState } from 'react';
import { jobFields, normalizeSkillName, skillKey } from '../../../shared/jobFields.js';

export default function SkillInput({ value, onChange, skills, field, disabled = false }) {
  const id = useId();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const suggested = field
    ? jobFields.find((item) => item.value === field)?.skills || []
    : jobFields.flatMap((item) => item.skills);
  const catalog = [
    ...new Map(
      [...skills.map((item) => item.name), ...suggested].map((name) => [skillKey(name), name]),
    ).values(),
  ];
  function add(raw) {
    const name = normalizeSkillName(raw);
    if (!name) return;
    if (name.length > 100 || value.length >= 100) {
      setError('Lejohen deri në 100 aftësi, me jo më shumë se 100 karaktere secila.');
      return;
    }
    const canonical = catalog.find((item) => skillKey(item) === skillKey(name)) || name;
    if (!value.some((item) => skillKey(item) === skillKey(canonical)))
      onChange([...value, canonical]);
    setText('');
    setError('');
  }
  return (
    <div className="skill-input">
      <label className="form-label" htmlFor={id}>
        Shkruaj një aftësi
      </label>
      <div className="d-flex gap-2">
        <input
          id={id}
          className="form-control"
          value={text}
          disabled={disabled}
          maxLength={100}
          placeholder="P.sh. Excel, SEO, komunikim…"
          autoComplete="off"
          aria-describedby={`${id}-hint`}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
              event.preventDefault();
              add(text);
            }
          }}
        />
        <button
          type="button"
          className="btn btn-outline-primary"
          disabled={disabled || !text.trim()}
          onClick={() => add(text)}
        >
          Shto
        </button>
      </div>

      <p id={`${id}-hint`} className="small text-secondary mt-2">
        Zgjidh një sugjerim ose shtyp Enter / Shto për një aftësi të re, pastaj ruaj ndryshimet.
      </p>
      {text.trim() && (
        <div className="d-flex gap-2 flex-wrap mb-3" aria-label="Sugjerime aftësish">
          {catalog
            .filter(
              (name) =>
                skillKey(name).includes(skillKey(text)) &&
                !value.some((item) => skillKey(item) === skillKey(name)),
            )
            .slice(0, 8)
            .map((name) => (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                disabled={disabled}
                key={name}
                onClick={() => add(name)}
              >
                {name}
              </button>
            ))}
        </div>
      )}
      <div className="d-flex gap-2 flex-wrap" aria-live="polite">
        {value.map((name) => (
          <span className="skill-tag" key={skillKey(name)}>
            {name}
            <button
              type="button"
              disabled={disabled}
              aria-label={`Largo ${name}`}
              onClick={() => onChange(value.filter((item) => item !== name))}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      {text.trim() && (
        <p className="small text-secondary mt-2">“{text.trim()}” ende nuk është shtuar.</p>
      )}
      {error && (
        <p className="text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
