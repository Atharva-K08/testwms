"use strict";

const queueService = require("../services/queue.service");
const { sendSuccess, sendPaginated } = require("../utils/response.util");
const { PAGINATION } = require("../config/constants");
const { AppError } = require("../middlewares/error.middleware");

const getQueue = async (req, res) => {
  const page = parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(
    parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT,
    PAGINATION.MAX_LIMIT,
  );

  const result = await queueService.getPendingQueue({ page, limit });

  sendPaginated(res, {
    message: "Queue fetched.",
    data: result.items,
    page,
    limit,
    total: result.total,
  });
};

const peekNext = async (req, res) => {
  const next = await queueService.peekNextInQueue();
  sendSuccess(res, {
    message: next ? "Next request in queue." : "Queue is empty.",
    data: { request: next },
  });
};

const assignTanker = async (req, res) => {
  const { tankerNumber, driverName, driverMobile, dateTime } = req.body;

  const updated = await queueService.assignTanker({
    requestId: req.params.id,
    tankerAssignment: { tankerNumber, driverName, driverMobile, dateTime },
    managerId: req.user._id,
  });

  if (!updated) {
    throw new AppError(
      "Request could not be assigned. It may already be assigned or does not exist.",
      409,
    );
  }

  sendSuccess(res, {
    message: "Tanker assigned successfully.",
    data: { request: updated },
  });
};

const completeRequest = async (req, res) => {
  const completed = await queueService.completeRequest(req.params.id);
  if (!completed) {
    throw new AppError("Request not found or not in assigned state.", 404);
  }
  sendSuccess(res, {
    message: "Request marked as completed.",
    data: { request: completed },
  });
};

const getManagerReport = async (req, res) => {
  const page = parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(
    parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT,
    PAGINATION.MAX_LIMIT,
  );

  const { startDate, endDate } = req.query;

  const report = await queueService.getManagerReport({
    startDate,
    endDate,
    page,
    limit,
  });

  sendPaginated(res, {
    message: "Manager report generated successfully.",
    data: report.requests,
    page,
    limit,
    total: report.summary.total,
    meta: {
      summary: report.summary,
    },
  });
};

module.exports = {
  getQueue,
  peekNext,
  assignTanker,
  completeRequest,
  getManagerReport,
};
