import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

export default function App(){return <BrowserRouter><nav className="container d-flex gap-3 p-3"><Link to="/">StudentHire</Link></nav><Routes><Route path="/" element={<main><h1>StudentHire</h1></main>} /></Routes></BrowserRouter>;}
