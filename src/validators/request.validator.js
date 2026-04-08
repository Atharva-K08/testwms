'use strict';

const { body, param, query } = require('express-validator');

const submitRequestValidator = [
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Notes must not exceed 500 characters.'),
];

const assignTankerValidator = [
  param('id')
    .isMongoId().withMessage('Invalid request ID.'),

  body('tankerNumber')
    .trim()
    .notEmpty().withMessage('Tanker number is required.')
    .isLength({ max: 20 }).withMessage('Tanker number must not exceed 20 characters.'),

  body('driverName')
    .trim()
    .notEmpty().withMessage('Driver name is required.')
    .isLength({ max: 100 }).withMessage('Driver name must not exceed 100 characters.'),

  body('driverMobile')
    .trim()
    .notEmpty().withMessage('Driver mobile number is required.')
    .isLength({ min: 10, max: 10 }).withMessage('Driver mobile number must be exactly 10 digits.')
    .isNumeric().withMessage('Driver mobile number must contain only digits.'),
];

const completeRequestValidator = [
  param('id')
    .isMongoId().withMessage('Invalid request ID.'),
];

const cancelRequestValidator = [
  param('id')
    .isMongoId().withMessage('Invalid request ID.'),

  body('cancelReason')
    .optional()
    .trim()
    .isLength({ max: 300 }).withMessage('Cancel reason must not exceed 300 characters.'),
];

const paginationValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer.'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100.'),
];

module.exports = {
  submitRequestValidator,
  assignTankerValidator,
  completeRequestValidator,
  cancelRequestValidator,
  paginationValidator,
};
