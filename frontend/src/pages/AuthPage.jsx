import { useState } from 'react';
import CompanyIntro from '../components/CompanyIntro.jsx';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api, getErrorMessage } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { LoadingState, ErrorState } from '../components/States.jsx';

export default function AuthPage({ register = false, company = false }) {
  const { user, loading, error: sessionError, restoreSession, acceptSession } = useAuth();
  const navigate = useNavigate();
  const role = company ? 'company' : 'student';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (loading) return <LoadingState />;
  if (sessionError)
    return <ErrorState message="Sesioni nuk mund të kontrollohet." onRetry={restoreSession} />;
  if (user) return <Navigate to={`/dashboard/${user.role}`} replace />;

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const fields = new FormData(event.currentTarget);
    const input = { email: fields.get('email'), password: fields.get('password') };
    if (register) {
      if (input.password !== fields.get('confirmPassword')) {
        setError('Fjalëkalimet nuk përputhen.');
        setBusy(false);
        return;
      }
      input.role = role;
      if (role === 'student') {
        input.firstName = fields.get('firstName');
        input.lastName = fields.get('lastName');
      } else input.companyName = fields.get('companyName');
    }
    try {
      const { data } = await api.post(register ? '/auth/register' : '/auth/login', input);
      acceptSession(data.data);
      navigate(`/dashboard/${data.data.user.role}`, { replace: true });
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={`container py-5${company ? ' company-registration' : ''}`}>
      {company && <CompanyIntro />}
      <div className="auth-card surface p-4 p-md-5 mx-auto">
        <p className="eyebrow">STUDENTHIRE</p>
        {company ? (
          <h2>Regjistro kompaninë</h2>
        ) : (
          <h1 className="h2">{register ? 'Krijo llogarinë studentore' : 'Mirë se u ktheve'}</h1>
        )}
        <p className="text-secondary">
          {company
            ? 'Krijo llogarinë e kompanisë dhe gjej talentet e së nesërmes.'
            : register
              ? 'Hapi yt i parë drejt mundësive të reja.'
              : 'Hyr për të vazhduar rrugëtimin tënd.'}
        </p>
        <form onSubmit={submit} aria-busy={busy}>
          <fieldset disabled={busy}>
            {register && (
              <>
                {role === 'student' ? (
                  <div className="row">
                    <div className="col-sm-6">
                      <label className="form-label" htmlFor="firstName">
                        Emri
                      </label>
                      <input
                        className="form-control mb-3"
                        id="firstName"
                        name="firstName"
                        autoComplete="given-name"
                        maxLength={100}
                        required
                      />
                    </div>
                    <div className="col-sm-6">
                      <label className="form-label" htmlFor="lastName">
                        Mbiemri
                      </label>
                      <input
                        className="form-control mb-3"
                        id="lastName"
                        name="lastName"
                        autoComplete="family-name"
                        maxLength={100}
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <label className="form-label" htmlFor="companyName">
                      Emri i kompanisë
                    </label>
                    <input
                      className="form-control mb-3"
                      id="companyName"
                      name="companyName"
                      autoComplete="organization"
                      maxLength={200}
                      required
                    />
                  </>
                )}
              </>
            )}
            <label className="form-label" htmlFor="email">
              Email
            </label>
            <input
              className="form-control mb-3"
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
            />
            <label className="form-label" htmlFor="password">
              Fjalëkalimi
            </label>
            <input
              className="form-control mb-2"
              id="password"
              name="password"
              type="password"
              autoComplete={register ? 'new-password' : 'current-password'}
              minLength={register ? 8 : undefined}
              required
            />
            {register && (
              <>
                <label className="form-label" htmlFor="confirmPassword">
                  Përsërit fjalëkalimin
                </label>
                <input
                  className="form-control mb-3"
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                />
              </>
            )}
            {error && (
              <p className="text-danger mt-3" role="alert">
                {error}
              </p>
            )}
            <button className="btn btn-primary w-100 mt-3" type="submit">
              {busy
                ? 'Po përpunohet…'
                : company
                  ? 'Regjistro kompaninë'
                  : register
                    ? 'Regjistrohu'
                    : 'Kyçu'}
            </button>
          </fieldset>
        </form>
        <p className="mt-4 mb-0">
          {register ? 'Ke llogari? ' : 'Nuk ke llogari? '}
          <Link to={register ? '/login' : '/register'}>
            {register ? 'Hyr këtu' : 'Regjistrohu'}
          </Link>
        </p>
      </div>
    </div>
  );
}
