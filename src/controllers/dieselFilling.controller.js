const dieselFillingService = require("../services/dieselFilling.service");
const {
  sendSuccess,
  sendCreated,
  sendPaginated,
} = require("../utils/response.util");
const { logger } = require("../utils/logger.util");

/**
 * POST /api/v1/diesel-fillings
 * Record a new diesel filling entry
 */
const recordDieselFilling = async (req, res, next) => {
  try {
    const fillingData = {
      tankerNumber: req.body.tankerNumber,
      dateTime: req.body.dateTime || new Date(),
      dieselAmount: req.body.dieselAmount,
      liters: req.body.liters,
    };

    const newFilling = await dieselFillingService.recordDieselFilling(
      fillingData,
      req.user.id,
    );

    logger.info(
      `User ${req.user.id} recorded diesel filling for tanker ${fillingData.tankerNumber}`,
    );

    return sendCreated(res, {
      message: "Diesel filling recorded successfully",
      data: newFilling,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/diesel-fillings
 * Get all diesel fillings with pagination and filters
 */
const getAllDieselFillings = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filters = {
      tankerNumber: req.query.tankerNumber,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };

    const result = await dieselFillingService.getAllDieselFillings(
      page,
      limit,
      filters,
    );

    return sendPaginated(res, {
      message: "Diesel fillings retrieved successfully",
      data: result.data,
      page: result.pagination.page,
      limit: result.pagination.limit,
      total: result.pagination.total,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/diesel-fillings/:id
 * Get diesel filling by ID
 */
const getDieselFillingById = async (req, res, next) => {
  try {
    const filling = await dieselFillingService.getDieselFillingById(
      req.params.id,
    );
    return sendSuccess(res, {
      message: "Diesel filling retrieved successfully",
      data: filling,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/diesel-fillings/:id
 * Update diesel filling entry
 */
const updateDieselFilling = async (req, res, next) => {
  try {
    const updateData = {};

    if (req.body.tankerNumber) updateData.tankerNumber = req.body.tankerNumber;
    if (req.body.dateTime) updateData.dateTime = req.body.dateTime;
    if (req.body.dieselAmount !== undefined)
      updateData.dieselAmount = req.body.dieselAmount;
    if (req.body.liters !== undefined) updateData.liters = req.body.liters;

    const updatedFilling = await dieselFillingService.updateDieselFilling(
      req.params.id,
      updateData,
    );

    return sendSuccess(res, {
      message: "Diesel filling updated successfully",
      data: updatedFilling,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/diesel-fillings/:id
 * Delete diesel filling entry
 */
const deleteDieselFilling = async (req, res, next) => {
  try {
    await dieselFillingService.deleteDieselFilling(req.params.id);
    return sendSuccess(res, {
      message: "Diesel filling deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/diesel-fillings/report
 * Generate diesel report with trip analysis
 */
const generateDieselReport = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filters = {
      tankerNumber: req.query.tankerNumber,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };

    const result = await dieselFillingService.generateDieselReport(
      page,
      limit,
      filters,
    );

    return sendPaginated(res, {
      message: "Diesel report generated successfully",
      data: result.data,
      page: result.pagination.page,
      limit: result.pagination.limit,
      total: result.pagination.total,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/diesel-fillings/summary/:tankerNumber
 * Get diesel summary for a specific tanker
 */
const getTankerDieselSummary = async (req, res, next) => {
  try {
    const summary = await dieselFillingService.getTankerDieselSummary(
      req.params.tankerNumber,
    );
    return sendSuccess(res, {
      message: "Tanker diesel summary retrieved successfully",
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/diesel-fillings/:id/wrong
 * Mark a diesel filling entry as wrong
 */
const markAsWrongEntry = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const updatedFilling = await dieselFillingService.markAsWrongEntry(
      req.params.id,
      reason,
      req.user.id,
    );

    logger.info(
      `User ${req.user.id} marked diesel filling ${req.params.id} as wrong`,
    );

    return sendSuccess(res, {
      message: "Diesel filling marked as wrong successfully",
      data: updatedFilling,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/diesel-fillings/wrong-entries
 * Get all wrong entries (for super admin)
 */
const getWrongEntries = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filters = {
      tankerNumber: req.query.tankerNumber,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };

    const result = await dieselFillingService.getWrongEntries(
      page,
      limit,
      filters,
    );

    return sendPaginated(res, {
      message: "Wrong entries retrieved successfully",
      data: result.data,
      page: result.pagination.page,
      limit: result.pagination.limit,
      total: result.pagination.total,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  recordDieselFilling,
  getAllDieselFillings,
  getDieselFillingById,
  updateDieselFilling,
  deleteDieselFilling,
  generateDieselReport,
  getTankerDieselSummary,
  markAsWrongEntry,
  getWrongEntries,
};
