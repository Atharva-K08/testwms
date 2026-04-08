'use strict';

const sendSuccess = (res, { message = 'Success', data = null, statusCode = 200, meta = null } = {}) => {
  const payload = { success: true, message };
  if (data !== null) payload.data = data;
  if (meta !== null) payload.meta = meta;
  return res.status(statusCode).json(payload);
};

const sendError = (res, { message = 'An error occurred', statusCode = 500, errors = null } = {}) => {
  const payload = { success: false, message };
  if (errors !== null) payload.errors = errors;
  return res.status(statusCode).json(payload);
};

const sendCreated = (res, { message = 'Created successfully', data = null } = {}) =>
  sendSuccess(res, { message, data, statusCode: 201 });

const sendPaginated = (res, { message = 'Success', data, page, limit, total } = {}) =>
  sendSuccess(res, {
    message,
    data,
    meta: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  });

module.exports = { sendSuccess, sendError, sendCreated, sendPaginated };
