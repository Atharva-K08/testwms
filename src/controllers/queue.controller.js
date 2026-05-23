"use strict";

const queueService = require("../services/queue.service");
const { sendSuccess, sendPaginated } = require("../utils/response.util");
const { PAGINATION } = require("../config/constants");
const { AppError } = require("../middlewares/error.middleware");

const getQueue = async (req, res) => {
  const page  = parseInt(req.query.page)  || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
  const { status } = req.query;

  const result = await queueService.getPendingQueue({ page, limit, status });

  sendPaginated(res, {
    message: "Queue fetched.",
    data:    result.items,
    page,
    limit,
    total:   result.total,
  });
};

const peekNext = async (req, res) => {
  const next = await queueService.peekNextInQueue();
  sendSuccess(res, {
    message: next ? "Next request in queue." : "Queue is empty.",
    data:    { request: next },
  });
};

const assignTanker = async (req, res) => {
  const { tankerNumber, driverId, dateTime } = req.body;

  const updated = await queueService.assignTanker({
    requestId:   req.params.id,
    tankerNumber,
    driverId,
    dateTime,
    managerId:   req.user._id,
  });

  sendSuccess(res, {
    message: "Tanker assigned successfully.",
    data:    { request: updated },
  });
};

const handoverTanker = async (req, res) => {
  const { tankerNumber, driverId, dateTime, reason } = req.body;

  const updated = await queueService.handoverTanker({
    requestId:   req.params.id,
    tankerNumber,
    driverId,
    dateTime,
    reason,
    managerId:   req.user._id,
  });

  sendSuccess(res, {
    message: "Request handed over to new tanker/driver successfully.",
    data:    { request: updated },
  });
};

const assignSourceDestination = async (req, res) => {
  const { source, destination, kilometers } = req.body;

  const updated = await queueService.assignSourceDestination({
    requestId: req.params.id,
    source,
    destination,
    kilometers,
  });

  if (!updated) throw new AppError("Request not found.", 404);

  sendSuccess(res, {
    message: "Source and destination assigned successfully.",
    data:    { request: updated },
  });
};

const completeRequest = async (req, res) => {
  const completed = await queueService.completeRequest(req.params.id);
  if (!completed) throw new AppError("Request not found or not in pending state.", 404);

  sendSuccess(res, {
    message: "Request marked as completed. Tanker and driver are now available.",
    data:    { request: completed },
  });
};

const getManagerReport = async (req, res) => {
  const page  = parseInt(req.query.page)  || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
  const { startDate, endDate } = req.query;

  const report = await queueService.getManagerReport({ startDate, endDate, page, limit });

  sendPaginated(res, {
    message: "Manager report generated successfully.",
    data:    report.requests,
    page,
    limit,
    total:   report.summary.total,
    meta:    { summary: report.summary },
  });
};

module.exports = {
  getQueue,
  peekNext,
  assignTanker,
  handoverTanker,
  assignSourceDestination,
  completeRequest,
  getManagerReport,
};
