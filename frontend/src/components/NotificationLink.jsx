import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { api } from '../api/client.js';

export default function NotificationLink({ user }) {
  const [count, setCount] = useState(null);
  const { pathname } = useLocation();
  useEffect(() => {
    const controller = new AbortController();
    let latestRequest = 0;
    async function refresh() {
      const request = ++latestRequest;
      try {
        const { data } = await api.get('/notifications/unread-count', {
          signal: controller.signal,
        });
        if (request === latestRequest && !controller.signal.aborted) setCount(data.data.count);
      } catch {
        if (request === latestRequest && !controller.signal.aborted) setCount(null);
      }
    }
    refresh();
    const timer = setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    window.addEventListener('notifications-read', refresh);
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('notifications-read', refresh);
    };
  }, [user.id, pathname]);
  return (
    <NavLink
      to={`/dashboard/${user.role}/notifications`}
      className="notification-link"
      aria-label={count === null ? 'Njoftimet' : `Njoftimet (${count} të palexuara)`}
      title="Njoftimet"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </svg>
      {count > 0 && (
        <span className="notification-count" aria-hidden="true">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </NavLink>
  );
}
