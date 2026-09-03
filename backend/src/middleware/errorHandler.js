/**
 * FinRecon AI - Global Express Error Handling Middleware
 * Ensures all API errors return a uniform, developer-friendly JSON format
 * without exposing sensitive stack traces in production.
 */
export default function errorHandler(err, req, res, _next) {
  const statusCode = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  // Log error details to console
  console.error(`[FinRecon API Error] ${req.method} ${req.originalUrl} (${statusCode}):`, err.message);
  if (!isProd && err.stack) {
    console.error(err.stack);
  }

  return res.status(statusCode).json({
    success: false,
    error: err.message || 'An unexpected server error occurred.',
    statusCode,
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
    ...(isProd ? {} : { stack: err.stack }),
  });
}
