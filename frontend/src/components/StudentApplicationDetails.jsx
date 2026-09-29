import ApplicationActions from './ApplicationActions.jsx';
import { ApplicationArtwork } from './StudentApplicationCard.jsx';
import { applicationStatuses } from '../data/applicationStatuses.js';

function Icon({ type }) {
  const paths = {
    person: 'M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
    education: 'm2 8 10-5 10 5-10 5-10-5m4 3v6l6 3 6-3v-6m4-3v8',
    pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    code: 'm7 6-5 6 5 6m10-12 5 6-5 6M14 3l-4 18',
    document: 'M14 2H5v20h14V7l-5-5v5h5M9 12h6m-6 4h6',
    message: 'M21 11a8 8 0 0 1-8 8H7l-5 3 2-6a8 8 0 0 1-1-5 9 9 0 0 1 18 0M8 10h8m-8 4h5',
    history: 'M3 11a9 9 0 1 1 2 7M3 4v7h7m2-5v6l4 2',
    work: 'M8 7V3h8v4M3 12h18M12 10v4M3 7h18v14H3Z',
  };
  return (
    <span className={`application-section-icon icon-${type}`}>
      <svg
        width="23"
        height="23"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={paths[type]} />
      </svg>
    </span>
  );
}
function Panel({ title, type, children, className = '' }) {
  return (
    <section className={`application-detail-panel ${className}`}>
      <h2>
        <Icon type={type} />
        {title}
      </h2>
      <div className="application-panel-content">{children}</div>
    </section>
  );
}
export default function StudentApplicationDetails({
  application: app,
  download,
  downloading,
  downloadError,
  onChanged,
}) {
  const student = app.student;
  const education = [student.university, student.fieldOfStudy, student.graduationYear]
    .filter(Boolean)
    .join(' · ');
  return (
    <div className="application-detail-layout">
      <header className="application-detail-hero">
        <Icon type="work" />
        <div className="application-detail-title">
          <h1>{app.opportunity.title}</h1>
          <p>{app.opportunity.company.name}</p>
          <div className="application-detail-status">
            <span className={`application-status-pill status-${app.status}`}>
              <span className="application-status-dot" />
              {applicationStatuses[app.status]}
            </span>
            <span>·</span>
            <time dateTime={app.createdAt}>
              {new Date(app.createdAt).toLocaleDateString('sq-AL')}
            </time>
          </div>
        </div>
        <ApplicationArtwork />
      </header>
      <div className="application-detail-columns">
        <div className="application-detail-stack">
          <Panel title="Të dhënat personale" type="person">
            <strong>
              {student.firstName} {student.lastName}
            </strong>
            <div className="application-contact">
              <span>{student.user.email}</span>
              {student.phone && <span>{student.phone}</span>}
            </div>
            {student.bio && <p className="application-preserve-text">{student.bio}</p>}
          </Panel>
          <Panel title="Arsimi" type="education">
            <p>{education || 'Nuk është plotësuar ende.'}</p>
          </Panel>
          <Panel title="Lokacioni" type="pin">
            <p>{student.location || 'Nuk është plotësuar ende.'}</p>
          </Panel>
          <Panel title="Aftësitë" type="code">
            <div className="application-detail-skills">
              {student.skills.length ? (
                student.skills.map(({ skill }) => <span key={skill.id}>{skill.name}</span>)
              ) : (
                <p>Nuk janë shtuar ende aftësi.</p>
              )}
            </div>
          </Panel>
        </div>
        <div className="application-detail-stack">
          <Panel title="CV-ja e dërguar" type="document" className="application-cv-panel">
            <div className="application-cv-file">
              <span className="application-pdf-icon" aria-hidden="true">
                PDF
              </span>
              <div>
                <strong>{app.cvOriginalName || 'CV-aplikimi.pdf'}</strong>
                <small>{Math.ceil(app.cvSizeBytes / 1024)} KB</small>
              </div>
              <button className="btn btn-primary" onClick={download} disabled={downloading}>
                {downloading ? 'Po shkarkohet…' : '↓ Shkarko'}
              </button>
            </div>
            {downloadError && (
              <p className="text-danger mt-3" role="alert">
                {downloadError}
              </p>
            )}
          </Panel>
          <Panel title="Mesazhi i aplikimit" type="message" className="application-message-panel">
            <div className="application-message-body application-preserve-text">
              {app.message || 'Pa mesazh shtesë.'}
              <span aria-hidden="true" className="application-message-decoration">
                ✉
              </span>
            </div>
            <ApplicationActions
              key={app.status}
              application={app}
              role="student"
              onChanged={onChanged}
            />
          </Panel>
        </div>
      </div>
      <Panel title="Historia e aplikimit" type="history" className="application-history-panel">
        <ol className="application-timeline">
          {app.history.map((item) => (
            <li key={item.id}>
              <div>
                <strong>{applicationStatuses[item.toStatus]}</strong>
                <span> · {item.actor.role === 'student' ? 'Studenti' : 'Kompania'} · </span>
                <time dateTime={item.createdAt}>
                  {new Date(item.createdAt).toLocaleDateString('sq-AL')}
                </time>
              </div>
              {item.note && <p className="application-preserve-text">{item.note}</p>}
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  );
}
