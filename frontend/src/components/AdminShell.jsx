import { NavLink } from 'react-router-dom';

export function AdminIcon({ kind = 'home' }) {
  const paths = {
    home: 'm3 10 9-7 9 7v11h-6v-8H9v8H3Z',
    users:
      'M16 21v-2a5 5 0 0 0-5-5H7a5 5 0 0 0-5 5v2M13 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0M17 3a4 4 0 0 1 0 8m1 3a5 5 0 0 1 4 5v2',
    companies: 'M3 21V3h11v18M14 9h7v12H3M7 7h3M7 11h3M7 15h3m7-2h1m-1 4h1M7 21v-3h3v3',
    offers: 'M8 7V3h8v4M3 7h18v14H3ZM3 12h18M12 10v4',
    skills: 'm12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z',
    bell: 'M18 8a6 6 0 0 0-12 0c0 8-3 8-3 10h18c0-2-3-2-3-10M10 22h4',
  };
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[kind] || paths.home} />
    </svg>
  );
}

export default function AdminShell({ children }) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <NavLink end to="/dashboard/admin" className="admin-overview-link">
          <AdminIcon />
          Paneli i adminit
        </NavLink>
        <p>MENAXHIMI</p>
        <nav aria-label="Menaxhimi i platformës">
          {[
            ['users', 'Përdoruesit'],
            ['companies', 'Kompanitë'],
            ['skills', 'Aftësitë'],
          ].map(([section, label]) => (
            <NavLink key={section} to={`/dashboard/admin/manage/${section}`}>
              <AdminIcon kind={section} />
              {label}
            </NavLink>
          ))}
          <NavLink to="/dashboard/admin/notifications">
            <AdminIcon kind="bell" />
            Njoftimet
          </NavLink>
        </nav>
        <div className="admin-sidebar-note">
          <span aria-hidden="true">✦</span>
          <strong>Gjithçka në një vend.</strong>
          <p>Menaxho mundësitë që i afrojnë talentet me kompanitë.</p>
        </div>
      </aside>
      <div className="admin-workspace">{children}</div>
    </div>
  );
}
