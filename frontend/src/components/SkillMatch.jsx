export default function SkillMatch({ match }) {
  const score = match.matchScore ?? match.percentage;
  const heading =
    score === null
      ? 'Përputhja e aftësive'
      : score >= 80
        ? 'Përshtatje shumë e mirë!'
        : score >= 50
          ? 'Një mundësi për ty!'
          : score > 0
            ? 'Një hap drejt mundësisë së re'
            : 'Zbulo aftësitë e kësaj pozite';
  return (
    <section className="skill-match-banner">
      <span className="skill-match-target" aria-hidden="true">
        ◎
      </span>
      <div className="skill-match-content">
        <div className="skill-match-heading">
          <h2>{heading}</h2>
          {score !== null && (
            <span className="skill-match-badge">
              <strong>{score}%</strong> Përputhje e përgjithshme
            </span>
          )}
        </div>
        <p>
          {score === null
            ? 'Oferta nuk ka aftësi të kërkuara; përputhja nuk mund të llogaritet.'
            : 'Bazuar në aftësitë, rëndësinë e tyre dhe preferencat e profilit tënd.'}
        </p>
        {score !== null && (
          <>
            <div className="skill-match-count">
              <span aria-hidden="true">✓</span>
              {match.matchedCount} nga {match.requiredCount} aftësi të kërkuara
            </div>
            <details className="skill-match-breakdown">
              <summary>Shiko përputhjen e aftësive</summary>
              <p>
                <strong>Të përbashkëta:</strong>{' '}
                {match.common.map((skill) => skill.name).join(', ') || 'Asnjë'}
              </p>
              <p>
                <strong>Për t’u zhvilluar:</strong>{' '}
                {match.missing.map((skill) => skill.name).join(', ') ||
                  'Asnjë — i ke të gjitha aftësitë e kërkuara.'}
              </p>
              {match.missingImportantSkills?.length > 0 && (
                <p>
                  <strong>Aftësi të detyrueshme pa përputhje të plotë:</strong>{' '}
                  {match.missingImportantSkills
                    .map((skill) => `${skill.name}${skill.weight === 3 ? ' (kritike)' : ''}`)
                    .join(', ')}
                </p>
              )}
              {match.relatedSkills?.length > 0 && (
                <div>
                  <strong>Përputhje të pjesshme:</strong>
                  <ul>
                    {match.relatedSkills.map((item) => (
                      <li key={item.requiredSkill}>
                        {item.studentSkill} → {item.requiredSkill}:{' '}
                        {Math.round(item.similarityWeight * 100)}% e pikëve të kësaj aftësie
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </details>
            {match.reasons && (
              <details className="skill-match-breakdown">
                <summary>Pse ky rekomandim?</summary>
                <ul>
                  {match.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
                <p>Përputhja e aftësive me peshë: {match.skillScore}%.</p>
              </details>
            )}
          </>
        )}
      </div>
      <svg
        className="skill-match-rocket"
        width="110"
        height="130"
        viewBox="0 0 110 130"
        aria-hidden="true"
      >
        <path
          d="M10 119c45-7 54-38 34-40-25-2-13 44 14 16"
          fill="none"
          stroke="#f3bf35"
          strokeDasharray="5 5"
          strokeLinecap="round"
        />
        <g transform="rotate(30 74 40)">
          <path d="m62 64 12 27 12-27" fill="#ffce32" />
          <path d="m58 46-14 20 17-3m27-17 14 20-17-3" fill="#2459a6" />
          <path d="M74 3C56 18 55 39 60 67h28c5-28 4-49-14-64" fill="#dceaff" />
          <path d="M74 3c-8 7-12 15-14 23h28c-2-8-6-16-14-23" fill="#2464dc" />
          <circle cx="74" cy="38" r="9" fill="white" stroke="#ffc529" strokeWidth="4" />
          <path d="M74 56v19" stroke="#2459a6" strokeWidth="6" strokeLinecap="round" />
        </g>
        <path d="m17 20 3 6 6 3-6 3-3 6-3-6-6-3 6-3Z" fill="#ffce32" />
      </svg>
    </section>
  );
}
