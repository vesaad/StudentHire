import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import About from './pages/About.jsx';
export default function App(){return <BrowserRouter><nav className="container d-flex gap-3 p-3"><Link to="/">StudentHire</Link><Link to="/about">About</Link></nav><Routes><Route path="/about" element={<About />} /><Route path="/" element={<main><h1>StudentHire</h1></main>} /></Routes></BrowserRouter>;}
