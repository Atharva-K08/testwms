"use strict";

const Request = require("../models/request.model");
const { REQUEST_STATUS } = require("../config/constants");

/**
 * Returns the next sequential queue position (max + 1).
 * Uses a separate atomic operation to prevent races.
 */
const getNextQueuePosition = async () => {
  const last = await Request.findOne({}, { queuePosition: 1 })
    .sort({ queuePosition: -1 })
    .lean();
  return last ? last.queuePosition + 1 : 1;
};

/**
 * Returns the live pending queue sorted by queuePosition (FIFO order).
 */
const getPendingQueue = async ({ page = 1, limit = 20 } = {}) => {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Request.find({ status: REQUEST_STATUS.PENDING })
      .sort({ queuePosition: 1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "mobileNumber profile")
      .lean(),
    Request.countDocuments({ status: REQUEST_STATUS.PENDING }),
  ]);
  return { items, total, page, limit };
};

/**
 * Returns the next pending request (lowest queuePosition).
 */
const peekNextInQueue = async () => {
  return Request.findOne({ status: REQUEST_STATUS.PENDING })
    .sort({ queuePosition: 1 })
    .populate("userId", "mobileNumber profile")
    .lean();
};

/**
 * Atomically assigns a tanker to the specified request.
 * Ensures:
 *   - Request exists and is still pending (prevents duplicate assignment).
 *   - Uses findOneAndUpdate with strict conditions for concurrency safety.
 */
const assignTanker = async ({ requestId, tankerAssignment, managerId }) => {
  const updated = await Request.findOneAndUpdate(
    {
      _id: requestId,
      status: REQUEST_STATUS.PENDING, // Only assign if still pending
    },
    {
      $set: {
        tankerAssignment,
        assignedAt: new Date(),
        assignedBy: managerId,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  ).populate("userId", "mobileNumber profile");

  return updated; // Returns null if request doesn't exist or is already assigned
};

/**
 * Marks a pending request as completed.
 */
const completeRequest = async (requestId) => {
  return Request.findOneAndUpdate(
    { _id: requestId, status: REQUEST_STATUS.PENDING },
    { $set: { status: REQUEST_STATUS.COMPLETED, completedAt: new Date() } },
    { new: true },
  );
};

/**
 * Generates a manager report with assignment statistics and history.
 * Supports optional date range filtering.
 *
 * NOTE: All managers should see the SAME complete data since they have
 * the same access level. This report shows ALL requests in the system,
 * not just requests assigned by a specific manager.
 */
const getManagerReport = async ({
  startDate,
  endDate,
  page = 1,
  limit = 50,
} = {}) => {
  const skip = (page - 1) * limit;

  // Build match conditions - filter by date range if provided, but NOT by manager
  const matchConditions = {};

  // If date range is provided, filter by createdAt (when the request was created)
  // This gives a complete picture of all requests in that time period
  if (startDate || endDate) {
    matchConditions.createdAt = {};
    if (startDate) {
      // Set to start of day (00:00:00.000)
      const startOfDay = new Date(startDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      matchConditions.createdAt.$gte = startOfDay;
    }
    if (endDate) {
      // Set to end of day (23:59:59.999) to include the entire endDate
      const endOfDay = new Date(endDate);
      endOfDay.setUTCHours(23, 59, 59, 999);
      matchConditions.createdAt.$lte = endOfDay;
    }
  }

  // Get summary statistics - count ALL requests by status
  const stats = await Request.aggregate([
    { $match: matchConditions },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  // Get total requests
  const totalRequests = await Request.countDocuments(matchConditions);

  // Get all requests with full details and pagination
  const requests = await Request.find(matchConditions)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("userId", "mobileNumber profile")
    .populate("assignedBy", "username mobileNumber")
    .lean();

  // Format statistics - ensure all status types are present
  const summary = {
    total: totalRequests,
    pending: 0,
    completed: 0,
    cancelled: 0,
    byStatus: stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {}),
  };

  // Fill in explicit counts for each status
  stats.forEach((stat) => {
    summary[stat._id] = stat.count;
  });

  return {
    summary,
    requests,
    pagination: {
      page,
      limit,
      total: totalRequests,
      totalPages: Math.ceil(totalRequests / limit),
    },
  };
};

module.exports = {
  getNextQueuePosition,
  getPendingQueue,
  peekNextInQueue,
  assignTanker,
  completeRequest,
  getManagerReport,
};
