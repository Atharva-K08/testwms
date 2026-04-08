'use strict';

const express = require('express');
const router = express.Router();
const { register, login, refresh, getProfile } = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { registerValidator, loginValidator } = require('../validators/auth.validator');
const { body } = require('express-validator');

router.post('/register', registerValidator, validate, register);
router.post('/login', loginValidator, validate, login);
router.post(
  '/refresh',
  [body('refreshToken').notEmpty().withMessage('Refresh token is required.')],
  validate,
  refresh,
);
router.get('/profile', protect, getProfile);

module.exports = router;
