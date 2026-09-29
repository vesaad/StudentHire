import { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../api/client.js';
import { LoadingState, ErrorState } from './States.jsx';
import SkillMatch from './SkillMatch.jsx';

export default function OfferMatch({ id }) {
  const [match, setMatch] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setMatch(null);
    setError('');
    api
      .get(`/recommendations/${id}`, { signal: controller.signal })
      .then(({ data }) => setMatch(data.data))
      .catch((error) => {
        if (!controller.signal.aborted) setError(getErrorMessage(error));
      });
    return () => controller.abort();
  }, [id, attempt]);
  if (error) return <ErrorState message={error} onRetry={() => setAttempt(attempt + 1)} />;
  if (!match) return <LoadingState />;
  return <SkillMatch match={match} />;
}
