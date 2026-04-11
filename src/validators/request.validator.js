"use strict";

const { body, param, query } = require("express-validator");

const submitRequestValidator = [
  body("notes")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Notes must not exceed 500 characters."),
];

const assignTankerValidator = [
  param("id").isMongoId().withMessage("Invalid request ID."),

  body("tankerNumber")
    .trim()
    .notEmpty()
    .withMessage("Tanker number is required.")
    .isLength({ max: 20 })
    .withMessage("Tanker number must not exceed 20 characters."),

  body("driverName")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Driver name must not exceed 100 characters."),

  body("driverMobile")
    .optional()
    .trim()
    .isLength({ min: 10, max: 10 })
    .withMessage("Driver mobile number must be exactly 10 digits.")
    .isNumeric()
    .withMessage("Driver mobile number must contain only digits."),

  body("dateTime")
    .notEmpty()
    .withMessage("Date and time is required.")
    .isISO8601()
    .withMessage(
      "Date and time must be in ISO 8601 format (e.g., 2024-01-15T10:30:00Z).",
    ),
];

const completeRequestValidator = [
  param("id").isMongoId().withMessage("Invalid request ID."),
];

const cancelRequestValidator = [
  param("id").isMongoId().withMessage("Invalid request ID."),

  body("cancelReason")
    .trim()
    .notEmpty()
    .withMessage("Cancel reason is required.")
    .isLength({ max: 300 })
    .withMessage("Cancel reason must not exceed 300 characters."),
];

const paginationValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer."),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100."),
];

const managerReportValidator = [
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be in ISO 8601 format (e.g., 2024-01-01)."),

  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be in ISO 8601 format (e.g., 2024-01-31)."),
];

module.exports = {
  submitRequestValidator,
  assignTankerValidator,
  completeRequestValidator,
  cancelRequestValidator,
  paginationValidator,
  managerReportValidator,
};
