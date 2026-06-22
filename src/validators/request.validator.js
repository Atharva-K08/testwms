"use strict";

const { body, param, query } = require("express-validator");

const submitRequestValidator = [
  body("notes")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Notes must not exceed 500 characters."),

  // Super Admin only: raise the request on behalf of this society member.
  body("memberId")
    .optional()
    .isMongoId()
    .withMessage("Invalid member ID."),
];

const assignTankerValidator = [
  param("id").isMongoId().withMessage("Invalid request ID."),

  body("tankerNumber")
    .trim()
    .notEmpty()
    .withMessage("Tanker number is required.")
    .isLength({ max: 20 })
    .withMessage("Tanker number must not exceed 20 characters."),

  body("driverId")
    .notEmpty()
    .withMessage("Driver ID is required.")
    .isMongoId()
    .withMessage("Driver ID must be a valid ID."),

  body("dateTime")
    .notEmpty()
    .withMessage("Date and time is required.")
    .isISO8601()
    .withMessage("Date and time must be in ISO 8601 format (e.g., 2024-01-15T10:30:00Z)."),
];

const handoverTankerValidator = [
  param("id").isMongoId().withMessage("Invalid request ID."),

  body("tankerNumber")
    .trim()
    .notEmpty()
    .withMessage("New tanker number is required.")
    .isLength({ max: 20 })
    .withMessage("Tanker number must not exceed 20 characters."),

  body("driverId")
    .notEmpty()
    .withMessage("New driver ID is required.")
    .isMongoId()
    .withMessage("Driver ID must be a valid ID."),

  body("dateTime")
    .notEmpty()
    .withMessage("Date and time is required.")
    .isISO8601()
    .withMessage("Date and time must be in ISO 8601 format."),

  body("reason")
    .trim()
    .notEmpty()
    .withMessage("Handover reason is required.")
    .isLength({ max: 500 })
    .withMessage("Reason must not exceed 500 characters."),
];

const completeRequestValidator = [
  param("id").isMongoId().withMessage("Invalid request ID."),
];

const cancelRequestValidator = [
  param("id").isMongoId().withMessage("Invalid request ID."),

  body("cancelReason")
    .optional({ checkFalsy: true })
    .trim()
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

  query("status")
    .optional()
    .isIn(["pending", "completed", "cancelled"])
    .withMessage("Status must be pending, completed, or cancelled."),
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

const assignSourceDestinationValidator = [
  param("id").isMongoId().withMessage("Invalid request ID."),

  body("source")
    .trim()
    .notEmpty()
    .withMessage("Source is required.")
    .isLength({ max: 200 })
    .withMessage("Source cannot exceed 200 characters."),

  body("destination")
    .trim()
    .notEmpty()
    .withMessage("Destination is required.")
    .isLength({ max: 200 })
    .withMessage("Destination cannot exceed 200 characters."),

  body("kilometers")
    .notEmpty()
    .withMessage("Kilometers is required.")
    .isFloat({ min: 0.1 })
    .withMessage("Kilometers must be greater than 0."),
];

module.exports = {
  submitRequestValidator,
  assignTankerValidator,
  handoverTankerValidator,
  completeRequestValidator,
  cancelRequestValidator,
  paginationValidator,
  managerReportValidator,
  assignSourceDestinationValidator,
};
