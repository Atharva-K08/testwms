'use strict';

const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { sendError } = require('../utils/response.util');

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, { message: 'Access denied. No token provided.', statusCode: 401 });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return sendError(res, { message: 'User associated with this token no longer exists.', statusCode: 401 });
    }

    if (!user.isActive) {
      return sendError(res, { message: 'Your account has been deactivated. Contact administrator.', statusCode: 403 });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, { message: 'Token has expired. Please login again.', statusCode: 401 });
    }
    return sendError(res, { message: 'Invalid token.', statusCode: 401 });
  }
};

module.exports = { protect };
