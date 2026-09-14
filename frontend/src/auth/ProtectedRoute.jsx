import { Navigate, Outlet, useParams } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { LoadingState, ErrorState } from '../components/States.jsx';

export default function ProtectedRoute() {
  const { role } = useParams();
  const { user, loading, error, restoreSession } = useAuth();
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Lidhja me serverin dështoi." onRetry={restoreSession} />;
  if (!user) return <Navigate to="/login" replace />;
  if (role !== user.role) return <Navigate to={`/dashboard/${user.role}`} replace />;
  return <Outlet />;
}
