'use strict';

const { body } = require('express-validator');

const registerValidator = [
  body('mobileNumber')
    .trim()
    .notEmpty().withMessage('Mobile number is required.')
    .isLength({ min: 10, max: 10 }).withMessage('Mobile number must be exactly 10 digits.')
    .isNumeric().withMessage('Mobile number must contain only digits.'),

  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters.')
    .matches(/(?=.*[A-Z])/).withMessage('Password must contain at least one uppercase letter.')
    .matches(/(?=.*\d)/).withMessage('Password must contain at least one number.'),

  body('profile.name')
    .trim()
    .notEmpty().withMessage('Name is required.')
    .isLength({ max: 100 }).withMessage('Name must not exceed 100 characters.'),

  body('profile.societyName')
    .trim()
    .notEmpty().withMessage('Society name is required.')
    .isLength({ max: 150 }).withMessage('Society name must not exceed 150 characters.'),

  body('profile.address')
    .trim()
    .notEmpty().withMessage('Address is required.')
    .isLength({ max: 300 }).withMessage('Address must not exceed 300 characters.'),

  body('profile.contactPerson')
    .trim()
    .notEmpty().withMessage('Contact person is required.')
    .isLength({ max: 100 }).withMessage('Contact person must not exceed 100 characters.'),
];

const loginValidator = [
  body('mobileNumber')
    .trim()
    .notEmpty().withMessage('Mobile number is required.')
    .isLength({ min: 10, max: 10 }).withMessage('Mobile number must be exactly 10 digits.')
    .isNumeric().withMessage('Mobile number must contain only digits.'),

  body('password')
    .notEmpty().withMessage('Password is required.'),
];

module.exports = { registerValidator, loginValidator };
