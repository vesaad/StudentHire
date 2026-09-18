const labels = {
  pending: 'Në pritje',
  approved: 'E aprovuar',
  rejected: 'E refuzuar',
  active: 'Aktive',
  suspended: 'E pezulluar',
};
export function statusLabel(status) {
  return labels[status] || status;
}
export default function CompanyHistory({ history }) {
  return (
    <section className="surface p-4 mt-4">
      <h2 className="h4">Historiku i vendimeve</h2>
      <p className="small text-secondary">50 vendimet më të fundit</p>
      {history.length === 0 ? (
        <p>Ende nuk ka vendime.</p>
      ) : (
        <ol className="list-unstyled mb-0">
          {history.map((item) => (
            <li className="border-top py-3" key={item.id}>
              <p className="mb-1">
                <strong>
                  {statusLabel(item.fromStatus)} → {statusLabel(item.toStatus)}
                </strong>
              </p>
              {item.fromAccountStatus && (
                <p className="mb-1">
                  Llogaria: {statusLabel(item.fromAccountStatus)} →{' '}
                  {statusLabel(item.toAccountStatus)}
                </p>
              )}
              {item.reason && <p className="mb-1 text-break">{item.reason}</p>}
              <small className="text-secondary">
                {new Date(item.createdAt).toLocaleDateString('sq-AL')} · {item.admin.email}
              </small>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

