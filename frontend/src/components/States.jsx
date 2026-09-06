export function LoadingState() {
  return (
    <div className="state" role="status">
      <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
      Po ngarkohet…
    </div>
  );
}

export function EmptyState({ title = 'Ende nuk ka të dhëna', children }) {
  return (
    <div className="state">
      <span className="state-symbol" aria-hidden="true">
        ＋
      </span>
      <h2 className="h5">{title}</h2>
      <p className="text-secondary mb-0">{children}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="state" role="alert">
      <h2 className="h5">Nuk mund të ngarkohet</h2>
      <p>{message}</p>
      {onRetry && (
        <button className="btn btn-outline-primary" onClick={onRetry}>
          Provo përsëri
        </button>
      )}
    </div>
  );
}
