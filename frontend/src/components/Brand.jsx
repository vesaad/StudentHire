import { Link } from 'react-router-dom';

export default function Brand() {
  return (
    <Link className="brand" to="/" aria-label="StudentHire — Kryefaqja">
      <span className="brand-mark" aria-hidden="true">
        s<span>h</span>
      </span>
      Student<span>Hire</span>
    </Link>
  );
}
