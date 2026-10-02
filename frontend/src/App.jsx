import CompanyOffers from './pages/CompanyOffers.jsx';
import Notifications from './pages/Notifications.jsx';
import Recommendations from './pages/Recommendations.jsx';
import Applications from './pages/Applications.jsx';
import ApplicationDetails from './pages/ApplicationDetails.jsx';
import Opportunities from './pages/Opportunities.jsx';
import OpportunityDetails from './pages/OpportunityDetails.jsx';
import SavedOffers from './pages/SavedOffers.jsx';
import { AuthProvider } from './auth/AuthContext.jsx';
import ProtectedRoute from './auth/ProtectedRoute.jsx';
import AuthPage from './pages/AuthPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SiteLayout from './layouts/SiteLayout.jsx';
import { LoadingState } from './components/States.jsx';
import NotFound from './pages/NotFound.jsx';

const Home = lazy(() => import('./pages/Home.jsx'));
const About = lazy(() => import('./pages/About.jsx'));

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<LoadingState />}>
          <Routes>
            <Route element={<SiteLayout />}>
              <Route index element={<Home />} />
              <Route path="login" element={<AuthPage key="login" />} />
              <Route path="register" element={<AuthPage key="register" register />} />
              <Route path="companies" element={<AuthPage key="companies" register company />} />
              <Route path="opportunities" element={<Opportunities />} />
              <Route path="opportunities/:id" element={<OpportunityDetails />} />
              <Route path="dashboard/:role" element={<ProtectedRoute />}>
                <Route index element={<Dashboard />} />
                <Route path="offers" element={<CompanyOffers />} />
                <Route path="saved" element={<SavedOffers />} />
                <Route path="recommendations" element={<Recommendations />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="applications" element={<Applications />} />
                <Route path="applications/:id" element={<ApplicationDetails />} />
              </Route>
              <Route path="about" element={<About />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
