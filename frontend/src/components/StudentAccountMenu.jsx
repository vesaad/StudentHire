import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../api/client.js';

export default function StudentAccountMenu({ user, logout }) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const root = useRef(null);
  const trigger = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const controller = new AbortController();
    api
      .get('/auth/workspace/student', { signal: controller.signal })
      .then(({ data }) => setProfile(data.data.profile))
      .catch(() => {});
    return () => controller.abort();
  }, [user.id, open]);

  useEffect(() => {
    if (!open) return;
    function dismiss(event) {
      if (!root.current?.contains(event.target)) setOpen(false);
    }
    function escape(event) {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || user.email;
  const initials = profile?.firstName
    ? `${profile.firstName[0]}${profile.lastName?.[0] || ''}`.toLocaleUpperCase('sq')
    : user.email.slice(0, 1).toUpperCase();

  return (
    <div
      className="student-account"
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="user-button student-account-trigger"
        aria-label="Llogaria ime"
        aria-expanded={open}
        aria-controls="student-account-panel"
        onClick={() => setOpen(!open)}
      >
        {initials}
      </button>
      {open && (
        <div id="student-account-panel" className="student-account-panel">
          <div className="student-account-greeting">
            <span className="student-account-avatar" aria-hidden="true">
              {initials}
            </span>
            <div>
              <p>MIRË SE ERDHE</p>
              <strong>{name}</strong>
            </div>
          </div>
          <Link
            className="student-account-profile"
            to="/dashboard/student"
            onClick={() => setOpen(false)}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
            </svg>
            Profili im
          </Link>
          <button
            type="button"
            className="student-account-logout"
            onClick={() => {
              setOpen(false);
              logout();
            }}
          >
            <span aria-hidden="true">↪</span> Dil
          </button>
        </div>
      )}
    </div>
  );
}
