import CompanyProfile from './CompanyProfile.jsx';
import AdminCompanies from './AdminCompanies.jsx';
import StudentProfile from './StudentProfile.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import DashboardOverview from '../components/DashboardOverview.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  if (user.role === 'student') return <StudentProfile />;
  if (user.role === 'company')
    return <CompanyProfile overview={<DashboardOverview key={user.id} user={user} />} />;
  return (
    <>
      <DashboardOverview key={user.id} user={user} />
      {user.role === 'company' ? (
        <CompanyProfile />
      ) : user.role === 'admin' ? (
        <AdminCompanies />
      ) : (
        <StudentProfile />
      )}
    </>
  );
}
