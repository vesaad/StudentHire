import { useAuth } from '../auth/AuthContext.jsx';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import Brand from '../components/Brand.jsx';
import NotificationLink from '../components/NotificationLink.jsx';
import StudentAccountMenu from '../components/StudentAccountMenu.jsx';

export default function SiteLayout() {
  const { user, loading, error, logout } = useAuth();
  const [isMenuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <a className="skip-link" href="#content">
        Kalo te përmbajtja
      </a>
      <header className="site-header">
        <div className="container header-inner">
          <Brand />
          <button
            className="menu-toggle btn btn-outline-primary"
            aria-expanded={isMenuOpen}
            aria-controls="main-nav"
            onClick={() => setMenuOpen(!isMenuOpen)}
          >
            Menu
          </button>
          <nav
            id="main-nav"
            className={isMenuOpen ? 'main-nav is-open' : 'main-nav'}
            aria-label="Navigimi kryesor"
          >
            <div className="nav-pill">
              <NavLink to="/about">Rreth nesh</NavLink>
              <NavLink to="/opportunities">Ofertat</NavLink>
              {!user && !loading && !error && <NavLink to="/companies">Për Kompanitë</NavLink>}
            </div>
            {user ? (
              <>
                <NotificationLink key={user.id} user={user} />
                {user.role !== 'student' && (
                  <button className="btn btn-outline-primary" onClick={logout}>
                    Dil
                  </button>
                )}
                {user.role === 'student' && (
                  <NavLink
                    to="/dashboard/student/saved"
                    className="saved-offers-link"
                    aria-label="Ofertat e ruajtura"
                    title="Ofertat e ruajtura"
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
                      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
                    </svg>
                  </NavLink>
                )}
              </>
            ) : !loading && !error ? (
              <>
                <div className="nav-auth-actions">
                  <NavLink to="/login">Kyçu</NavLink>
                  <NavLink className="nav-register" to="/register">
                    Regjistrohu
                  </NavLink>
                </div>
              </>
            ) : null}
          </nav>
          {user?.role === 'student' ? (
            <StudentAccountMenu key={user.id} user={user} logout={logout} />
          ) : (
            user && (
              <NavLink
                to={`/dashboard/${user.role}`}
                className="user-button"
                aria-label="Llogaria ime"
                title="Llogaria ime"
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
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
                </svg>
              </NavLink>
            )
          )}
        </div>
      </header>
      <main id="content" tabIndex="-1">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container footer-inner">
          <Brand />
          <p>Hapi yt i parë drejt karrierës.</p>
        </div>
      </footer>
    </>
  );
}
