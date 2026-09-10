import { Link } from 'react-router-dom';
import HomeDiscovery from '../components/HomeDiscovery.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const gettingStartedSteps = [
  {
    number: '01',
    category: 'STUDENTËT',
    icon: 'student',
    title: 'Njihu me veten',
    description: 'Një profil që bashkon studimet, aftësitë dhe CV-në tënde.',
  },
  {
    number: '02',
    category: 'MUNDËSITË',
    icon: 'company',
    to: '/opportunities',
    title: 'Zbulo mundësi',
    description: 'Punë dhe praktika që të ndihmojnë të ndërtosh përvojën e parë.',
  },
  {
    number: '03',
    category: 'PLATFORMA',
    icon: 'star',
    to: '/about',
    title: 'Krijo lidhje',
    description: 'Një hapësirë që afron studentët dhe kompanitë.',
  },
];

function PathIcon({ kind }) {
  return (
    <svg
      width="25"
      height="25"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path
        d={
          kind === 'student'
            ? 'm2 8 10-5 10 5-10 5-10-5m4 3v6l6 3 6-3v-6m4-3v8'
            : kind === 'company'
              ? 'M3 21V3h11v18M14 9h7v12H3M7 7h3M7 11h3M7 15h3m7-2h1m-1 4h1M7 21v-3h3v3'
              : 'm12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z'
        }
      />
    </svg>
  );
}

export default function Home() {
  const { user } = useAuth();
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="small-dot" /> NJË FILLIM I RI PËR KARRIERËN TËNDE
            </p>
            <h1>
              Talenti yt.
              <br />
              Mundësia jote.
              <br />
              <em>Hapi yt i parë.</em>
            </h1>
            <p className="hero-description">
              Nga auditorët te përvoja e parë profesionale. StudentHire lidh studentët me kompani që
              besojnë te potenciali i tyre.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary" to="/opportunities">
                Eksploro ofertat <span aria-hidden="true">↗</span>
              </Link>
            </div>
            <p className="hero-note">Punë dhe praktika. Një vend për të filluar.</p>
          </div>
          <div className="hero-art" aria-label="Ilustrim i rrugëtimit nga aftësitë te mundësitë">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <span className="art-star" aria-hidden="true">
              ✳
            </span>
            <div className="career-card">
              <div className="card-topline">
                <span className="mini-logo">sh</span>
                <span>RRUGËTIMI YT</span>
                <span aria-hidden="true">↗</span>
              </div>
              <p className="art-heading">
                E ardhmja fillon
                <br />
                me ty.
              </p>
              <div className="art-tags">
                <span>Aftësitë e tua</span>
                <span>Ambicia jote</span>
              </div>
              <div className="career-line">
                <span>01</span>
                <div>
                  <strong>Ndërto profilin</strong>
                  <small>Trego çfarë të bën ty, ty.</small>
                </div>
                <span aria-hidden="true">↗</span>
              </div>
              <div className="career-line">
                <span>02</span>
                <div>
                  <strong>Gjej drejtimin</strong>
                  <small>Eksploro punë dhe praktika.</small>
                </div>
                <span aria-hidden="true">↗</span>
              </div>
              <div className="career-line">
                <span>03</span>
                <div>
                  <strong>Hidh hapin e parë</strong>
                  <small>Apliko për të ardhmen tënde.</small>
                </div>
                <span aria-hidden="true">↗</span>
              </div>
            </div>
            <div className="floating-note">
              <span aria-hidden="true">✦</span> Potenciali yt ka vend këtu.
            </div>
          </div>
        </div>
      </section>
      <section className="path-section container home-path-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">NGA KU TË FILLOSH</p>
            <h2>Një rrugë më e qartë përpara.</h2>
          </div>
          <p>Çdo përvojë e madhe ka një fillim të vogël.</p>
        </div>
        <div className="path-grid">
          {gettingStartedSteps.map(({ number, category, icon, to, title, description }) => (
            <Link
              className={`path-card home-path-card path-${icon}`}
              key={number}
              to={to || (user ? `/dashboard/${user.role}` : '/register')}
            >
              <div className="home-path-topline">
                <span className="home-path-icon">
                  <PathIcon kind={icon} />
                </span>
                <span className="step-number">
                  {number} / {category}
                </span>
              </div>
              <div className="home-path-title">
                <h3>{title}</h3>
                <span className="home-path-arrow" aria-hidden="true">
                  →
                </span>
              </div>
              <p>{description}</p>
            </Link>
          ))}
        </div>
      </section>
      <HomeDiscovery />
      <section className="container">
        <div className="company-banner">
          <div>
            <p className="eyebrow">PËR KOMPANITË</p>
            <h2>Ide të reja. Perspektiva të reja.</h2>
            <p>Njihuni me gjeneratën që do të ndërtojë të ardhmen.</p>
          </div>
          <Link className="btn btn-light" to="/companies">
            Regjistro kompaninë ↗
          </Link>
        </div>
      </section>
    </>
  );
}
