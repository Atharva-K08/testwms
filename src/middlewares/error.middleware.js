'use strict';

const { logger } = require('../utils/logger.util');
const { sendError } = require('../utils/response.util');

const notFoundHandler = (req, res) => {
  sendError(res, {
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    statusCode: 404,
  });
};

const errorHandler = (err, req, res, _next) => {
  logger.error(`${err.name}: ${err.message}`, { stack: err.stack, url: req.originalUrl });

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return sendError(res, { message: 'Validation failed.', statusCode: 422, errors });
  }

  // Mongoose Duplicate Key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return sendError(res, {
      message: `Duplicate value for field: ${field}.`,
      statusCode: 409,
    });
  }

  // Mongoose Cast Error (invalid ObjectId)
  if (err.name === 'CastError') {
    return sendError(res, { message: `Invalid ${err.path}: ${err.value}`, statusCode: 400 });
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, { message: 'Invalid token.', statusCode: 401 });
  }

  if (err.name === 'TokenExpiredError') {
    return sendError(res, { message: 'Token expired. Please login again.', statusCode: 401 });
  }

  // Custom application errors
  if (err.isOperational) {
    return sendError(res, { message: err.message, statusCode: err.statusCode || 500 });
  }

  // Unknown errors — don't leak details in production
  const statusCode = err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message;

  return sendError(res, { message, statusCode });
};

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = { notFoundHandler, errorHandler, AppError };
