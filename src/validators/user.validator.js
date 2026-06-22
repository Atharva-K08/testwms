"use strict";

const { query } = require("express-validator");

const memberListValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer."),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100."),

  query("search")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Search must not exceed 100 characters."),
];

module.exports = { memberListValidator };
