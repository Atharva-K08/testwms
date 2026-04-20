"use strict";

const { body } = require("express-validator");
const { ROLES } = require("../config/constants");

const registerValidator = [
  body("mobileNumber")
    .trim()
    .notEmpty()
    .withMessage("Mobile number is required.")
    .isLength({ min: 10, max: 10 })
    .withMessage("Mobile number must be exactly 10 digits.")
    .isNumeric()
    .withMessage("Mobile number must contain only digits."),

  body("password")
    .notEmpty()
    .withMessage("Password is required.")
    .isLength({ min: 6, max: 6 })
    .withMessage("Password must be exactly 6 digits.")
    .isNumeric()
    .withMessage("Password must contain only digits."),

  body("profile.alternativeContacts")
    .optional()
    .isArray({ max: 3 })
    .withMessage("At most 3 alternative contacts are allowed."),

  body("profile.alternativeContacts.*.name")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Contact name must not exceed 100 characters."),

  body("profile.alternativeContacts.*.mobileNumber")
    .optional()
    .trim()
    .isLength({ min: 10, max: 10 })
    .withMessage("Alternative mobile number must be exactly 10 digits.")
    .isNumeric()
    .withMessage("Alternative mobile number must contain only digits."),

  body("profile.name")
    .trim()
    .notEmpty()
    .withMessage("Name is required.")
    .isLength({ max: 100 })
    .withMessage("Name must not exceed 100 characters."),

  body("profile.societyName")
    .trim()
    .notEmpty()
    .withMessage("Society name is required.")
    .isLength({ max: 150 })
    .withMessage("Society name must not exceed 150 characters."),

  body("profile.address")
    .trim()
    .notEmpty()
    .withMessage("Address is required.")
    .isLength({ max: 300 })
    .withMessage("Address must not exceed 300 characters."),

  body("profile.contactPerson")
    .trim()
    .notEmpty()
    .withMessage("Contact person is required.")
    .isLength({ max: 100 })
    .withMessage("Contact person must not exceed 100 characters."),
];

const loginValidator = [
  body("password").notEmpty().withMessage("Password is required."),
];

const createManagerValidator = [
  body("mobileNumber")
    .trim()
    .notEmpty()
    .withMessage("Mobile number is required.")
    .isLength({ min: 10, max: 10 })
    .withMessage("Mobile number must be exactly 10 digits.")
    .isNumeric()
    .withMessage("Mobile number must contain only digits."),

  body("password")
    .notEmpty()
    .withMessage("Password is required.")
    .isLength({ min: 6, max: 6 })
    .withMessage("Password must be exactly 6 digits.")
    .isNumeric()
    .withMessage("Password must contain only digits."),

  body("role")
    .notEmpty()
    .withMessage("Role is required.")
    .isIn([ROLES.MANAGER, ROLES.FUEL_MANAGER])
    .withMessage("Role must be either manager or fuelManager."),

  body("profile.name")
    .trim()
    .notEmpty()
    .withMessage("Name is required.")
    .isLength({ max: 100 })
    .withMessage("Name must not exceed 100 characters."),

  body("profile.societyName")
    .trim()
    .notEmpty()
    .withMessage("Society name is required.")
    .isLength({ max: 150 })
    .withMessage("Society name must not exceed 150 characters."),

  body("profile.address")
    .trim()
    .notEmpty()
    .withMessage("Address is required.")
    .isLength({ max: 300 })
    .withMessage("Address must not exceed 300 characters."),

  body("profile.contactPerson")
    .trim()
    .notEmpty()
    .withMessage("Contact person is required.")
    .isLength({ max: 100 })
    .withMessage("Contact person must not exceed 100 characters."),
];

const updateSuperAdminPasswordValidator = [
  body("newPassword")
    .notEmpty()
    .withMessage("New password is required.")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters."),
];

const updatePasswordValidator = [
  body("oldPassword").notEmpty().withMessage("Current password is required."),
  body("newPassword")
    .notEmpty()
    .withMessage("New password is required.")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters."),
];

module.exports = {
  registerValidator,
  loginValidator,
  createManagerValidator,
  updateSuperAdminPasswordValidator,
  updatePasswordValidator,
};
