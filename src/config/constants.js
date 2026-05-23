"use strict";

module.exports = {
  ROLES: Object.freeze({
    SUPER_ADMIN: "superAdmin",
    MEMBER: "member",
    MANAGER: "manager",
    FUEL_MANAGER: "fuelManager",
  }),

  SUPER_ADMIN_CREDENTIALS: Object.freeze({
    USERNAME: process.env.SUPER_ADMIN_USERNAME || "admin",
    PASSWORD: process.env.SUPER_ADMIN_DEFAULT_PASSWORD || "Admin@1234",
  }),

  REQUEST_STATUS: Object.freeze({
    PENDING: "pending",
    COMPLETED: "completed",
    CANCELLED: "cancelled",
  }),

  DIESEL_FILLING_STATUS: Object.freeze({
    VALID: "valid",
    WRONG: "wrong",
  }),

  ENTITY_STATUS: Object.freeze({
    AVAILABLE: "available",
    ON_TRIP: "on_trip",
  }),

  BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12,

  RECEIPT_PREFIX: process.env.RECEIPT_PREFIX || "WTR",

  PAGINATION: Object.freeze({
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  }),
};
