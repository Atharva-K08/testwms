"use strict";

const attendanceService = require("../services/attendance.service");
const { sendSuccess } = require("../utils/response.util");

/**
 * GET /api/v1/attendance/drives/:driverName
 * Get all trip records for a specific driver by name
 */
const getDriverAttendance = async (req, res, next) => {
  try {
    const { driverName } = req.params;
    const result = await attendanceService.getDriverAttendance(driverName);
    return sendSuccess(res, {
      message: "Driver attendance retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/attendance/driver/:driverId
 * Get all trip records for a driver by their MongoDB ID
 */
const getDriverAttendanceById = async (req, res, next) => {
  try {
    const { driverId } = req.params;
    const result = await attendanceService.getDriverAttendanceById(driverId);
    return sendSuccess(res, {
      message: "Driver attendance retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDriverAttendance, getDriverAttendanceById };
