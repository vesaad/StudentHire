export function notFound(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Rruga e kërkuar nuk u gjet.' } });
}
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const invalidJson = err.type === 'entity.parse.failed';
  const tooLarge = err.type === 'entity.too.large';
  const status = invalidJson ? 400 : tooLarge ? 413 : err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({
    error: {
      code:
        err.code && status < 500
          ? err.code
          : invalidJson
            ? 'INVALID_JSON'
            : tooLarge
              ? 'PAYLOAD_TOO_LARGE'
              : 'INTERNAL_ERROR',
      message:
        status < 500 && err.status
          ? err.message
          : invalidJson
            ? 'Formati JSON është i pavlefshëm.'
            : tooLarge
              ? 'Kërkesa është shumë e madhe.'
              : 'Ndodhi një gabim në server.',
    },
  });
}
