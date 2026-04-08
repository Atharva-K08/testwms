'use strict';

const { sendError } = require('../utils/response.util');

/**
 * Restrict access to specific roles.
 * Usage: authorize(ROLES.MANAGER) or authorize(ROLES.MEMBER, ROLES.MANAGER)
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, { message: 'Unauthorized.', statusCode: 401 });
    }

    if (!roles.includes(req.user.role)) {
      return sendError(res, {
        message: `Access denied. Required role(s): ${roles.join(', ')}.`,
        statusCode: 403,
      });
    }

    next();
  };
};

module.exports = { authorize };
