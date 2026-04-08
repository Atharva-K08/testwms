'use strict';

const Request = require('../models/request.model');
const { getNextQueuePosition } = require('./queue.service');
const { REQUEST_STATUS } = require('../config/constants');
const { AppError } = require('../middlewares/error.middleware');

const submitRequest = async ({ userId, profile, mobileNumber, notes }) => {
  const queuePosition = await getNextQueuePosition();

  const request = await Request.create({
    userId,
    societyName: profile.societyName,
    address: profile.address,
    contactPerson: profile.contactPerson,
    mobileNumber,
    notes: notes || '',
    queuePosition,
  });

  return request;
};

const getMemberRequests = async ({ userId, page = 1, limit = 20 }) => {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Request.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Request.countDocuments({ userId }),
  ]);
  return { items, total, page, limit };
};

const getRequestById = async (requestId) => {
  const request = await Request.findById(requestId).populate('userId', 'mobileNumber profile');
  if (!request) throw new AppError('Request not found.', 404);
  return request;
};

const cancelRequest = async ({ requestId, userId, isManager, cancelReason }) => {
  const query = { _id: requestId };
  if (!isManager) {
    query.userId = userId;
    query.status = REQUEST_STATUS.PENDING; // Members can only cancel pending requests
  }

  const request = await Request.findOneAndUpdate(
    query,
    {
      $set: {
        status: REQUEST_STATUS.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: cancelReason || '',
      },
    },
    { new: true },
  );

  if (!request) {
    throw new AppError('Request not found or cannot be cancelled.', 404);
  }

  return request;
};

const getAllRequests = async ({ status, page = 1, limit = 20 }) => {
  const filter = {};
  if (status) filter.status = status;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Request.find(filter)
      .sort({ queuePosition: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'mobileNumber profile')
      .populate('assignedBy', 'mobileNumber profile')
      .lean(),
    Request.countDocuments(filter),
  ]);
  return { items, total, page, limit };
};

module.exports = { submitRequest, getMemberRequests, getRequestById, cancelRequest, getAllRequests };
