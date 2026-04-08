'use strict';

const authService = require('../services/auth.service');
const { sendSuccess, sendCreated } = require('../utils/response.util');

const register = async (req, res) => {
  const { mobileNumber, password, profile } = req.body;
  const result = await authService.register({ mobileNumber, password, profile });
  sendCreated(res, {
    message: 'Account created successfully.',
    data: result,
  });
};

const login = async (req, res) => {
  const { mobileNumber, password } = req.body;
  const result = await authService.login({ mobileNumber, password });
  sendSuccess(res, {
    message: 'Login successful.',
    data: result,
  });
};

const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  const result = await authService.refreshToken(refreshToken);
  sendSuccess(res, {
    message: 'Token refreshed.',
    data: result,
  });
};

const getProfile = async (req, res) => {
  const user = await authService.getProfile(req.user._id);
  sendSuccess(res, { message: 'Profile fetched.', data: { user } });
};

module.exports = { register, login, refresh, getProfile };
