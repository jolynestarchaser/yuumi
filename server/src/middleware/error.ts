export function notFound(req, res) {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found.' } });
}

export function errorHandler(error, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(error);
  const isValidationError = error.name === 'CastError' || error.name === 'ValidationError' || error.name === 'MulterError';
  const status = Number.isInteger(error.status) ? error.status : isValidationError ? 400 : 500;
  const message = error.name === 'MulterError' && error.code === 'LIMIT_FILE_SIZE' ? 'Files must be 10 MB or smaller.' : error.message || 'Unexpected server error.';
  const code = status === 400 ? 'VALIDATION_ERROR' : status === 404 ? 'NOT_FOUND' : status === 409 ? 'REVISION_CONFLICT' : status === 410 ? 'IN_TRASH' : 'SERVER_ERROR';
  res.status(status).json({ success: false, error: { code, message } });
}
