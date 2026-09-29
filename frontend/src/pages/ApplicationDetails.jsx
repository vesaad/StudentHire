import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { api, getErrorMessage } from '../api/client.js';
import { LoadingState, ErrorState } from '../components/States.jsx';
import ApplicationActions from '../components/ApplicationActions.jsx';
import { applicationStatuses } from '../data/applicationStatuses.js';
import StudentApplicationDetails from '../components/StudentApplicationDetails.jsx';

export default function ApplicationDetails() {
  const { user } = useAuth();
  const { id } = useParams();
  if (!['student', 'company'].includes(user.role))
    return <Navigate to={`/dashboard/${user.role}`} replace />;
  return <Details key={`${id}-${user.id}`} id={id} user={user} />;
}
function Details({ id, user }) {
  const [application, setApplication] = useState(null);
  const [error, setError] = useState('');
  const [downloadError, setDownloadError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setApplication(null);
    setError('');
    api
      .get(`/applications/${id}`, { signal: controller.signal })
      .then(({ data }) => setApplication(data.data))
      .catch((error) => {
        if (!controller.signal.aborted) setError(getErrorMessage(error));
      });
    return () => controller.abort();
  }, [id, attempt]);
  async function download() {
    setDownloading(true);
    setDownloadError('');
    try {
      const { data } = await api.get(`/applications/${id}/cv`, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = application.cvOriginalName || 'CV-aplikimi.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setDownloadError('CV-ja nuk mund të shkarkohet. Rifresko faqen dhe provo përsëri.');
    } finally {
      setDownloading(false);
    }
  }
  return (
    <div
      className={`container py-5${user.role === 'student' ? ' student-application-details' : ''}`}
    >
      <Link
        className={user.role === 'student' ? 'applications-back' : undefined}
        to={`/dashboard/${user.role}/applications`}
      >
        ← Lista e aplikimeve
      </Link>
      {error ? (
        <ErrorState message={error} onRetry={() => setAttempt(attempt + 1)} />
      ) : !application ? (
        <LoadingState />
      ) : user.role === 'student' ? (
        <StudentApplicationDetails
          application={application}
          download={download}
          downloading={downloading}
          downloadError={downloadError}
          onChanged={() => setAttempt((value) => value + 1)}
        />
      ) : (
        <article className="surface p-4 mt-4 text-break">
          <h1 className="h2">{application.opportunity.title}</h1>
          <p>{application.opportunity.company.name}</p>
          <p>
            Statusi: <strong>{applicationStatuses[application.status]}</strong> ·{' '}
            {new Date(application.createdAt).toLocaleDateString('sq-AL')}
          </p>
          <h2 className="h4 mt-4">
            {application.student.firstName} {application.student.lastName}
          </h2>
          <p>
            {application.student.user.email}
            {application.student.phone && ` · ${application.student.phone}`}
          </p>
          <p>
            {[
              application.student.university,
              application.student.fieldOfStudy,
              application.student.graduationYear,
              application.student.location,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {application.student.bio && (
            <p style={{ whiteSpace: 'pre-wrap' }}>{application.student.bio}</p>
          )}
          <p>{application.student.skills.map(({ skill }) => skill.name).join(' · ')}</p>
          <h2 className="h4 mt-4">Mesazhi i aplikimit</h2>
          <p style={{ whiteSpace: 'pre-wrap' }}>{application.message || 'Pa mesazh shtesë.'}</p>
          <h2 className="h4 mt-4">CV-ja e dërguar</h2>
          <p>
            {application.cvOriginalName} · {Math.ceil(application.cvSizeBytes / 1024)} KB
          </p>
          <p className="text-secondary">Kjo është kopja e ruajtur në momentin e aplikimit.</p>
          <button className="btn btn-outline-primary" disabled={downloading} onClick={download}>
            {downloading ? 'Po shkarkohet…' : 'Shkarko CV-në e aplikimit'}
          </button>
          {downloadError && (
            <p className="text-danger" role="alert">
              {downloadError}
            </p>
          )}
          <ApplicationActions
            key={application.status}
            application={application}
            role={user.role}
            onChanged={() => setAttempt((value) => value + 1)}
          />
          <h2 className="h4 mt-4">Historiku i aplikimit</h2>
          <ol className="ps-3">
            {application.history.map((item) => (
              <li className="mb-3" key={item.id}>
                <strong>{applicationStatuses[item.toStatus]}</strong> ·{' '}
                {item.actor.role === 'student' ? 'Studenti' : 'Kompania'} ·{' '}
                {new Date(item.createdAt).toLocaleDateString('sq-AL')}
                {item.note && <p style={{ whiteSpace: 'pre-wrap' }}>{item.note}</p>}
              </li>
            ))}
          </ol>
          <button className="btn btn-outline-primary" onClick={() => setAttempt(attempt + 1)}>
            Rifresko aplikimin
          </button>
        </article>
      )}
    </div>
  );
}
