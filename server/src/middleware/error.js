import { env } from '../config/env.js';

export const notFound = (req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
};

// Central error handler: converts any error into a clean JSON response, without leaking internals.
export const errorHandler = (err, req, res, next) => {
  let status = err.statusCode || 500;
  let message = err.message || 'Server error';
  let errors = err.errors;

  if (err.name === 'ValidationError' && err.errors && !Array.isArray(err.errors)) {
    status = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.code === 11000) {
    status = 409;
    message = 'A record with this value already exists';
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid identifier';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Invalid JSON in request body';
  }

  if (status >= 500) {
    console.error(err);
    if (env.isProduction) message = 'Server error';
  }
  res.status(status).json({ success: false, message, ...(errors ? { errors } : {}) });
};
