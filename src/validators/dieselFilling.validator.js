const { body, param, query } = require("express-validator");

const recordDieselFillingValidator = [
  body("tankerNumber")
    .trim()
    .notEmpty()
    .withMessage("Tanker number is required.")
    .isLength({ max: 20 })
    .withMessage("Tanker number must not exceed 20 characters."),

  body("dateTime")
    .optional()
    .isISO8601()
    .withMessage("Date time must be a valid ISO 8601 date."),

  body("dieselAmount")
    .isFloat({ min: 0 })
    .withMessage("Diesel amount must be a non-negative number."),

  body("liters")
    .isFloat({ min: 0 })
    .withMessage("Liters must be a non-negative number."),
];

const updateDieselFillingValidator = [
  param("id").isMongoId().withMessage("Invalid diesel filling ID."),

  body("tankerNumber")
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage("Tanker number must not exceed 20 characters."),

  body("dateTime")
    .optional()
    .isISO8601()
    .withMessage("Date time must be a valid ISO 8601 date."),

  body("dieselAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Diesel amount must be a non-negative number."),

  body("liters")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Liters must be a non-negative number."),
];

const getDieselFillingValidator = [
  param("id").isMongoId().withMessage("Invalid diesel filling ID."),
];

const deleteDieselFillingValidator = [
  param("id").isMongoId().withMessage("Invalid diesel filling ID."),
];

const dieselReportValidator = [
  query("tankerNumber").optional().trim(),

  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO 8601 date."),

  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO 8601 date.")
    .custom((value, { req }) => {
      if (
        value &&
        req.query.startDate &&
        new Date(value) < new Date(req.query.startDate)
      ) {
        throw new Error("End date must be after start date.");
      }
      return true;
    }),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer."),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100."),
];

const tankerSummaryValidator = [
  param("tankerNumber")
    .trim()
    .notEmpty()
    .withMessage("Tanker number is required.")
    .isLength({ max: 20 })
    .withMessage("Tanker number must not exceed 20 characters."),
];

const markAsWrongValidator = [
  param("id").isMongoId().withMessage("Invalid diesel filling ID."),

  body("reason")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Reason must not exceed 500 characters."),
];

module.exports = {
  recordDieselFillingValidator,
  updateDieselFillingValidator,
  getDieselFillingValidator,
  deleteDieselFillingValidator,
  dieselReportValidator,
  tankerSummaryValidator,
  markAsWrongValidator,
};
