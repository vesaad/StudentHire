import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext.jsx';
import Home from './pages/Home.jsx';
import About from './pages/About.jsx';
import AuthPage from './pages/AuthPage.jsx';
import CompanyOffers from './pages/CompanyOffers.jsx';
import SavedOffers from './pages/SavedOffers.jsx';
import Applications from './pages/Applications.jsx';
import ApplicationDetails from './pages/ApplicationDetails.jsx';
export default function App(){return <BrowserRouter><AuthProvider><nav className="container d-flex gap-3 p-3"><Link to="/">StudentHire</Link><Link to="/about">About</Link><Link to="/login">Login</Link></nav><Routes><Route path="/" element={<Home />} /><Route path="/about" element={<About />} /><Route path="/login" element={<AuthPage />} /><Route path="/dashboard/company/offers" element={<CompanyOffers />} /><Route path="/dashboard/student/saved" element={<SavedOffers />} /><Route path="/dashboard/:role/applications" element={<Applications />} /><Route path="/dashboard/:role/applications/:id" element={<ApplicationDetails />} /><Route path="/register" element={<AuthPage register />} /></Routes></AuthProvider></BrowserRouter>;}
