'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { BCRYPT_SALT_ROUNDS, ROLES } = require('../config/constants');
const { AppError } = require('../middlewares/error.middleware');

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });

  return { accessToken, refreshToken };
};

const register = async ({ mobileNumber, password, profile }) => {
  const existing = await User.findOne({ mobileNumber });
  if (existing) {
    throw new AppError('An account with this mobile number already exists.', 409);
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  const user = await User.create({
    mobileNumber,
    password: hashedPassword,
    role: ROLES.MEMBER,
    profile,
  });

  const tokens = generateTokens(user._id);

  return { user: user.toPublicJSON(), ...tokens };
};

const login = async ({ mobileNumber, password }) => {
  const user = await User.findOne({ mobileNumber }).select('+password');
  if (!user) {
    throw new AppError('Invalid mobile number or password.', 401);
  }

  if (!user.isActive) {
    throw new AppError('Your account has been deactivated. Contact administrator.', 403);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AppError('Invalid mobile number or password.', 401);
  }

  user.lastLoginAt = new Date();
  await user.save();

  const tokens = generateTokens(user._id);
  const publicUser = user.toPublicJSON();

  return { user: publicUser, ...tokens };
};

const refreshToken = async (token) => {
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new AppError('Invalid or expired refresh token.', 401);
  }

  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) {
    throw new AppError('User not found or deactivated.', 401);
  }

  const tokens = generateTokens(user._id);
  return { user: user.toPublicJSON(), ...tokens };
};

const getProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found.', 404);
  return user.toPublicJSON();
};

module.exports = { register, login, refreshToken, getProfile };
