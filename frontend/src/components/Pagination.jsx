export default function Pagination({ page, total, onPage, disabled = false }) {
  if (!total) return null;
  return (
    <nav className="d-flex gap-3 align-items-center my-4" aria-label="Faqëzimi">
      <button
        className="btn btn-outline-primary"
        disabled={disabled || page <= 1}
        onClick={() => onPage(page - 1)}
      >
        Mbrapa
      </button>
      <span>
        Faqja {page} · {total} rezultate
      </span>
      <button
        className="btn btn-outline-primary"
        disabled={disabled || page * 10 >= total}
        onClick={() => onPage(page + 1)}
      >
        Përpara
      </button>
    </nav>
  );
}
