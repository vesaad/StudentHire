import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

export default function TopRecommendation({ revision }) {
  const [result, setResult] = useState(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    setFailed(false);
    api
      .get('/recommendations?page=1', { signal: controller.signal })
      .then(({ data }) => setResult(data.data))
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [revision, attempt]);
  const offer = result?.items[0];
  const percentage = offer?.match.matchScore ?? offer?.match.percentage;
  return (
    <section className="student-action-card recommendations" aria-label="Rekomandimet">
      <div className="student-action-heading">
        <span className="student-action-icon" aria-hidden="true">
          ✦
        </span>
        <strong>Rekomandimet</strong>
      </div>
      {failed ? (
        <div>
          <p className="small">Oferta nuk mund të ngarkohet.</p>
          <button
            className="btn btn-outline-primary btn-sm"
            onClick={() => setAttempt(attempt + 1)}
          >
            Provo përsëri
          </button>
        </div>
      ) : !result ? (
        <p className="small mb-0" role="status">
          Po kërkojmë përputhjen më të mirë…
        </p>
      ) : !offer ? (
        <p className="small mb-0">Nuk ka oferta të disponueshme për momentin.</p>
      ) : (
        <div className="top-recommendation">
          <p className="top-recommendation-label">PËRPUTHJA MË E MIRË</p>
          <h2>
            <Link to={`/opportunities/${offer.id}`}>{offer.title}</Link>
          </h2>
          <p className="small text-secondary">
            {offer.company.name} · {offer.location}
          </p>
          {percentage !== null ? (
            <>
              <div className="top-recommendation-score">
                <span>Përputhja e përgjithshme</span>
                <strong>{percentage}%</strong>
              </div>
              <div className="top-recommendation-track">
                <progress
                  className="top-recommendation-progress"
                  value={percentage}
                  max="100"
                  aria-label="Përputhja e përgjithshme"
                />
                <span
                  className="top-recommendation-star"
                  style={{ left: `${Math.min(100, Math.max(0, percentage))}%` }}
                  aria-hidden="true"
                >
                  ★
                </span>
              </div>
              <p className="small text-secondary mt-2 mb-0">
                {offer.match.matchedCount} nga {offer.match.requiredCount} aftësi të kërkuara
              </p>
            </>
          ) : (
            <p className="small">Përputhja nuk llogaritet: oferta nuk ka aftësi të kërkuara.</p>
          )}
          {result.studentSkillCount === 0 && (
            <p className="small mt-2 mb-0">
              Shto aftësitë në profil për rekomandime më të përshtatshme.
            </p>
          )}
        </div>
      )}
      <Link className="student-action-cta" to="/dashboard/student/recommendations">
        Të gjitha rekomandimet <span aria-hidden="true">↗</span>
      </Link>
    </section>
  );
}
