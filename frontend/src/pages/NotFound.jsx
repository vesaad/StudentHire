import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container not-found">
      <p className="eyebrow">404 / FAQJA NUK U GJET</p>
      <h1>Kjo rrugë nuk të çon askund.</h1>
      <p>Adresa mund të jetë e gabuar. Le të kthehemi te fillimi.</p>
      <Link to="/" className="btn btn-primary">
        Kthehu në kryefaqe →
      </Link>
    </div>
  );
}
