"use strict";

const { body, param, query } = require("express-validator");

const createDriverValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Driver name is required.")
    .isLength({ max: 100 })
    .withMessage("Name cannot exceed 100 characters."),

  body("permanentAddress")
    .trim()
    .notEmpty()
    .withMessage("Permanent address is required.")
    .isLength({ max: 300 })
    .withMessage("Permanent address cannot exceed 300 characters."),

  body("temporaryAddress")
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage("Temporary address cannot exceed 300 characters."),

  body("mobileNumber")
    .trim()
    .notEmpty()
    .withMessage("Mobile number is required.")
    .matches(/^\d{10}$/)
    .withMessage("Mobile number must be exactly 10 digits."),

  body("status")
    .optional()
    .isIn(["ACTIVE", "BLOCK"])
    .withMessage("Status must be ACTIVE or BLOCK."),

  body("documents")
    .optional()
    .isArray()
    .withMessage("Documents must be an array of strings."),
];

const updateDriverValidator = [
  param("id").isMongoId().withMessage("Invalid driver ID."),

  body("name")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Name cannot exceed 100 characters."),

  body("permanentAddress")
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage("Permanent address cannot exceed 300 characters."),

  body("temporaryAddress")
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage("Temporary address cannot exceed 300 characters."),

  body("mobileNumber")
    .optional()
    .trim()
    .matches(/^\d{10}$/)
    .withMessage("Mobile number must be exactly 10 digits."),

  body("status")
    .optional()
    .isIn(["ACTIVE", "BLOCK"])
    .withMessage("Status must be ACTIVE or BLOCK."),

  body("documents")
    .optional()
    .isArray()
    .withMessage("Documents must be an array of strings."),
];

const driverIdValidator = [
  param("id").isMongoId().withMessage("Invalid driver ID."),
];

const driverListValidator = [
  query("status")
    .optional()
    .isIn(["ACTIVE", "BLOCK"])
    .withMessage("Status filter must be ACTIVE or BLOCK."),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer."),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100."),
];

const driverSerialNumberValidator = [
  param("serialNumber")
    .isInt({ min: 1 })
    .withMessage("Serial number must be a positive integer."),
];

module.exports = {
  createDriverValidator,
  updateDriverValidator,
  driverIdValidator,
  driverListValidator,
  driverSerialNumberValidator,
};
