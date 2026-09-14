import { useState } from 'react';

const benefits = [
  {
    title: 'Gjej talent me potencial',
    summary: 'Ide të reja për sfidat e kompanisë tënde.',
    detail:
      'Prezanto ofertat e punës dhe praktikat te studentë që duan të fitojnë përvojë dhe të kontribuojnë në ekipin tënd.',
  },
  {
    title: 'Rekruto më lehtë',
    summary: 'Ofertat dhe aplikimet, në një vend.',
    detail:
      'Publiko mundësitë e kompanisë, shqyrto aplikimet dhe ndiq kandidatët nga hapësira jote e menaxhimit.',
  },
  {
    title: 'Ndërto ekipin e së nesërmes',
    summary: 'Investo sot te njerëzit që rriten me ty.',
    detail:
      'Jepu studentëve një fillim profesional dhe njih nga afër aftësitë e tyre përmes punës dhe praktikave në kompaninë tënde.',
  },
];

export default function CompanyIntro() {
  const [expanded, setExpanded] = useState([]);
  return (
    <section className="company-showcase" aria-labelledby="company-heading">
      <div className="company-showcase-card">
        <h1 id="company-heading" className="company-showcase-heading">
          Suksesi fillon
          <br />
          me ekipin e duhur.
        </h1>
        <div className="company-showcase-tags">
          <span>Talente të reja</span>
          <span>Mundësi për rritje</span>
        </div>

        <div className="company-pitch-benefits">
          {benefits.map((benefit, index) => (
            <div
              className={`company-pitch-benefit${expanded.includes(index) ? ' is-expanded' : ''}`}
              key={benefit.title}
            >
              <button
                type="button"
                className="company-benefit-button"
                aria-expanded={expanded.includes(index)}
                aria-controls={`company-benefit-${index}`}
                onClick={() =>
                  setExpanded((current) =>
                    current.includes(index)
                      ? current.filter((item) => item !== index)
                      : [...current, index],
                  )
                }
              >
                <span aria-hidden="true">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {index === 0 ? (
                      <>
                        <circle cx="10" cy="8" r="3" />
                        <path d="M4 20v-2a6 6 0 0 1 12 0v2M19 5v6m-3-3h6" />
                      </>
                    ) : index === 1 ? (
                      <>
                        <rect x="4" y="6" width="16" height="15" rx="2" />
                        <path d="M9 6V3h6v3M8 13l3 3 5-6" />
                      </>
                    ) : (
                      <>
                        <path d="M4 20h16M7 16v-4m5 4V8m5 8V4M4 8l5-4 4 1 6-3" />
                      </>
                    )}
                  </svg>
                </span>
                <span>
                  <strong>{benefit.title}</strong>
                  <small>{benefit.summary}</small>
                </span>
                <span aria-hidden="true">{expanded.includes(index) ? '−' : '+'}</span>
              </button>
              <p id={`company-benefit-${index}`} hidden={!expanded.includes(index)}>
                {benefit.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="company-showcase-footer">
        <span aria-hidden="true">✦</span> Talenti i ri. Suksesi yt.
      </div>
    </section>
  );
}
