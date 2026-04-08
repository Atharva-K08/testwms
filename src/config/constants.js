'use strict';

module.exports = {
  ROLES: Object.freeze({
    MEMBER: 'member',
    MANAGER: 'manager',
  }),

  REQUEST_STATUS: Object.freeze({
    PENDING: 'pending',
    ASSIGNED: 'assigned',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
  }),

  BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12,

  RECEIPT_PREFIX: process.env.RECEIPT_PREFIX || 'WTR',

  PAGINATION: Object.freeze({
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  }),
};
