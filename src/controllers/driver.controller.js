"use strict";

const driverService = require("../services/driver.service");
const {
  sendSuccess,
  sendCreated,
  sendPaginated,
} = require("../utils/response.util");
const { PAGINATION } = require("../config/constants");

/**
 * POST /api/v1/drivers
 * Create a new driver
 */
const createDriver = async (req, res, next) => {
  try {
    const { name, permanentAddress, temporaryAddress, mobileNumber, status, documents } =
      req.body;

    const driver = await driverService.createDriver({
      name,
      permanentAddress,
      temporaryAddress,
      mobileNumber,
      status,
      documents,
    });

    return sendCreated(res, {
      message: "Driver created successfully",
      data: driver,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/drivers
 * Get all drivers with pagination
 */
const getAllDrivers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE;
    const limit = Math.min(
      parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT,
      PAGINATION.MAX_LIMIT,
    );
    const { status, currentStatus } = req.query;

    const result = await driverService.getAllDrivers({ page, limit, status, currentStatus });

    return sendPaginated(res, {
      message: "Drivers retrieved successfully",
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
 * GET /api/v1/drivers/:id
 * Get a single driver by ID
 */
const getDriverById = async (req, res, next) => {
  try {
    const driver = await driverService.getDriverById(req.params.id);
    return sendSuccess(res, {
      message: "Driver retrieved successfully",
      data: driver,
    });
  } catch (error) {
    next(error);
  }
};
/**
 * GET /api/v1/drivers/:serialNumber
 * Get a single driver by serial number 
 */
const getDriverBySerialNumber = async (req, res, next) => {
  try {
    const driver = await driverService.getDriverBySerialNumberSrv(req.params.serialNumber);
    return sendSuccess(res, {
      message: "Driver retrieved successfully",
      data: driver,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/drivers/:id
 * Update a driver
 */
const updateDriver = async (req, res, next) => {
  try {
    const allowed = [
      "name",
      "permanentAddress",
      "temporaryAddress",
      "mobileNumber",
      "status",
      "documents",
    ];
    const updateData = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) updateData[key] = req.body[key];
    });

    const driver = await driverService.updateDriver(req.params.id, updateData);
    return sendSuccess(res, {
      message: "Driver updated successfully",
      data: driver,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/drivers/:id
 * Soft-delete a driver
 */
const deleteDriver = async (req, res, next) => {
  try {
    await driverService.deleteDriver(req.params.id);
    return sendSuccess(res, { message: "Driver deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createDriver,
  getAllDrivers,
  getDriverById,
  updateDriver,
  deleteDriver,
  getDriverBySerialNumber,
};
