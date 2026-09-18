import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getErrorMessage } from '../api/client.js';
import { ErrorState, LoadingState } from '../components/States.jsx';
import StudentProfileForm from '../components/StudentProfileForm.jsx';
import StudentCv from '../components/StudentCv.jsx';
import TopRecommendation from '../components/TopRecommendation.jsx';

export default function StudentProfile() {
  const [section, setSection] = useState('profile');
  const [student, setStudent] = useState(null);
  const [skills, setSkills] = useState([]);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setStudent(null);
    setError('');
    Promise.all([
      api.get('/students/me', { signal: controller.signal }),
      api.get('/students/skills', { signal: controller.signal }),
    ])
      .then(([profile, catalog]) => {
        setStudent(profile.data.data);
        setSkills(catalog.data.data);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(getErrorMessage(error));
      });
    return () => controller.abort();
  }, [attempt]);
  if (error) return <ErrorState message={error} onRetry={() => setAttempt(attempt + 1)} />;
  if (!student) return <LoadingState />;
  return (
    <div className="student-workspace">
      <nav className="student-workspace-nav" aria-label="Seksionet e profilit">
        <button
          type="button"
          className={section === 'profile' ? 'is-active' : ''}
          aria-current={section === 'profile' ? 'page' : undefined}
          aria-controls="student-profile-panel"
          onClick={() => setSection('profile')}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
          </svg>
          Profili
        </button>
        <button
          type="button"
          className={section === 'cv' ? 'is-active' : ''}
          aria-current={section === 'cv' ? 'page' : undefined}
          aria-controls="student-cv-panel"
          onClick={() => setSection('cv')}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
          >
            <path d="M14 2H5v20h14V7l-5-5ZM14 2v6h5M8 12h8M8 16h8" />
          </svg>
          CV-të
        </button>
      </nav>
      <div className="student-workspace-panel">
        <div className="student-workspace-content">
          <section
            id="student-profile-panel"
            hidden={section !== 'profile'}
            aria-labelledby="student-profile-heading"
          >
            <h1 id="student-profile-heading" className="h4 mb-4">
              Profili
            </h1>
            <StudentProfileForm student={student} skills={skills} onSaved={setStudent} />
          </section>
          <section id="student-cv-panel" hidden={section !== 'cv'} aria-label="CV-të">
            <StudentCv student={student} onSaved={setStudent} />
          </section>
        </div>
        <aside className="student-workspace-actions" aria-label="Mundësitë dhe aplikimet">
          <TopRecommendation revision={student.revision} />
          <Link className="student-action-card applications" to="/dashboard/student/applications">
            <div className="student-action-heading">
              <span className="student-action-icon" aria-hidden="true">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                >
                  <rect x="4" y="5" width="16" height="17" rx="2" />
                  <path d="M9 5V2h6v3M8 12l3 3 5-6" />
                </svg>
              </span>
              <strong>Aplikimet e mia</strong>
            </div>
            <span>Ndiq ecurinë e aplikimeve dhe hapin tënd të ardhshëm.</span>
            <span className="student-action-cta">
              Shiko aplikimet <span aria-hidden="true">↗</span>
            </span>
          </Link>
        </aside>
      </div>
    </div>
  );
}
