'use strict';

const requestService = require('../services/request.service');
const { sendSuccess, sendCreated, sendPaginated } = require('../utils/response.util');
const { PAGINATION } = require('../config/constants');
const { ROLES } = require('../config/constants');

const submitRequest = async (req, res) => {
  const { notes } = req.body;
  const { user } = req;

  const request = await requestService.submitRequest({
    userId: user._id,
    profile: user.profile,
    mobileNumber: user.mobileNumber,
    notes,
  });

  sendCreated(res, {
    message: 'Water tanker request submitted successfully.',
    data: { request },
  });
};

const getMyRequests = async (req, res) => {
  const page = parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);

  const result = await requestService.getMemberRequests({ userId: req.user._id, page, limit });

  sendPaginated(res, {
    message: 'Requests fetched.',
    data: result.items,
    page,
    limit,
    total: result.total,
  });
};

const getRequestById = async (req, res) => {
  const request = await requestService.getRequestById(req.params.id);
  sendSuccess(res, { message: 'Request fetched.', data: { request } });
};

const getAllRequests = async (req, res) => {
  const page = parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
  const { status } = req.query;

  const result = await requestService.getAllRequests({ status, page, limit });

  sendPaginated(res, {
    message: 'Requests fetched.',
    data: result.items,
    page,
    limit,
    total: result.total,
  });
};

const cancelRequest = async (req, res) => {
  const { cancelReason } = req.body;
  const isManager = req.user.role === ROLES.MANAGER;

  const request = await requestService.cancelRequest({
    requestId: req.params.id,
    userId: req.user._id,
    isManager,
    cancelReason,
  });

  sendSuccess(res, { message: 'Request cancelled.', data: { request } });
};

module.exports = { submitRequest, getMyRequests, getRequestById, getAllRequests, cancelRequest };
