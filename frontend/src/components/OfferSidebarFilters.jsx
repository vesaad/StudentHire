import { workModes } from '../../../shared/jobFields.js';

export default function OfferSidebarFilters({ filters }) {
  const groups = [
    [
      'employmentType',
      'Angazhimi',
      { full_time: 'Orar i plotë', part_time: 'Orar i pjesshëm', contract: 'Kontratë' },
    ],
    ['workMode', 'Mënyra e punës', workModes],
  ];
  return (
    <section className="offer-sidebar-filters" aria-labelledby="sidebar-filters-heading">
      <h2 id="sidebar-filters-heading">Filtrat</h2>
      {groups.map(([name, label, options]) => (
        <fieldset key={name}>
          <legend>{label}</legend>
          {Object.entries({ '': 'Të gjitha', ...options }).map(([value, text]) => (
            <label className="offer-filter-option" key={value}>
              <input
                type="radio"
                name={name}
                value={value}
                form="opportunity-search"
                defaultChecked={(filters[name] || '') === value}
                onChange={(event) => event.currentTarget.form?.requestSubmit()}
              />
              <span>{text}</span>
            </label>
          ))}
        </fieldset>
      ))}
    </section>
  );
}
