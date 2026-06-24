"use strict";

const queueService = require("../services/queue.service");
const { sendSuccess, sendPaginated } = require("../utils/response.util");
const { PAGINATION } = require("../config/constants");
const { AppError } = require("../middlewares/error.middleware");
const { streamPmcDailyRegisterPdf } = require("../utils/pmcDailyRegisterPdf");
const { streamPmcDailyRegisterExcel } = require("../utils/pmcDailyRegisterExcel");

// `date` arrives as a YYYY-MM-DD string, parsed as UTC midnight (same as the
// $gte/$lte day-boundary query in queueService.getDailyTankerRegister), so the
// label must use UTC getters too — local getters would shift the printed date
// by a day on any server not running in the UTC timezone.
const formatReportDateLabel = (date) =>
  [String(date.getUTCDate()).padStart(2, "0"), String(date.getUTCMonth() + 1).padStart(2, "0"), date.getUTCFullYear()].join("/");

const formatGeneratedAtLabel = (date) => {
  const datePart = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Kolkata",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "Asia/Kolkata",
  }).format(date);
  return `${datePart} ${timePart}`;
};

const buildDailyRegisterParams = async (req) => {
  const { date, stationName } = req.query;
  const reportDate = new Date(date);
  const rows = await queueService.getDailyTankerRegister({ date: reportDate });

  return {
    rows,
    reportDate,
    stationName,
    reportDateLabel:  formatReportDateLabel(reportDate),
    generatedBy:      req.user?.username || req.user?.mobileNumber || "-",
    generatedAtLabel: formatGeneratedAtLabel(new Date()),
  };
};

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

// If generation fails after some bytes are already flushed (headers sent),
// the shared error middleware's res.json() would throw ERR_HTTP_HEADERS_SENT
// on top of the original error — destroy the connection instead in that case
// and only let the global handler render a JSON error when nothing was sent yet.
const handleStreamingError = (res, err) => {
  if (res.headersSent) {
    res.destroy(err);
    return;
  }
  throw err;
};

const getDailyTankerRegisterPdf = async (req, res) => {
  const params = await buildDailyRegisterParams(req);
  const filenameDate = params.reportDateLabel.replace(/\//g, "-");

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="daily_tanker_register_${filenameDate}.pdf"`);

  try {
    streamPmcDailyRegisterPdf(res, params);
  } catch (err) {
    handleStreamingError(res, err);
  }
};

const getDailyTankerRegisterExcel = async (req, res) => {
  const params = await buildDailyRegisterParams(req);
  const filenameDate = params.reportDateLabel.replace(/\//g, "-");

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="daily_tanker_register_${filenameDate}.xlsx"`);

  try {
    await streamPmcDailyRegisterExcel(res, params);
  } catch (err) {
    handleStreamingError(res, err);
  }
};

module.exports = {
  getQueue,
  peekNext,
  assignTanker,
  handoverTanker,
  assignSourceDestination,
  completeRequest,
  getManagerReport,
  getDailyTankerRegisterPdf,
  getDailyTankerRegisterExcel,
};
