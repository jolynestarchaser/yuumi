export function notFound(req, res) {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found.' } });
}

export function errorHandler(error, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(error);
  const status = error.name === 'CastError' ? 400 : error.name === 'ValidationError' ? 400 : 500;
  res.status(status).json({ success: false, error: { code: status === 400 ? 'VALIDATION_ERROR' : 'SERVER_ERROR', message: error.message || 'Unexpected server error.' } });
}

