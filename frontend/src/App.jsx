import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext.jsx';
import About from './pages/About.jsx';
import AuthPage from './pages/AuthPage.jsx';
export default function App(){return <BrowserRouter><AuthProvider><nav className="container d-flex gap-3 p-3"><Link to="/">StudentHire</Link><Link to="/about">About</Link><Link to="/login">Login</Link></nav><Routes><Route path="/about" element={<About />} /><Route path="/login" element={<AuthPage />} /><Route path="/register" element={<AuthPage register />} /><Route path="/" element={<main><h1>StudentHire</h1></main>} /></Routes></AuthProvider></BrowserRouter>;}
