'use strict';

const { validationResult } = require('express-validator');
const { sendError } = require('../utils/response.util');

/**
 * Runs after express-validator chains.
 * If there are errors, formats and returns them; otherwise calls next().
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formatted = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));
    return sendError(res, {
      message: 'Request validation failed.',
      statusCode: 422,
      errors: formatted,
    });
  }

  next();
};

module.exports = { validate };
