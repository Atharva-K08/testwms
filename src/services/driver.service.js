"use strict";

const Driver = require("../models/driver.model");
const { AppError } = require("../middlewares/error.middleware");

/**
 * Create a new driver
 */
const createDriver = async (data) => {
  const driver = new Driver(data);
  await driver.save(); // triggers pre-save auto-increment hook
  return driver;
};

/**
 * Get all drivers with pagination and optional status filter
 * Excludes soft-deleted drivers
 */
const getAllDrivers = async ({ page = 1, limit = 20, status, currentStatus } = {}) => {
  const query = { isDeleted: false };
  if (status) query.status = status;
  if (currentStatus) query.currentStatus = currentStatus;

  const skip = (page - 1) * limit;

  const [drivers, total] = await Promise.all([
    Driver.find(query).sort({ serialNumber: 1 }).skip(skip).limit(limit).lean(),
    Driver.countDocuments(query),
  ]);

  return {
    data: drivers,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get a single driver by ID (excludes deleted)
 */
const getDriverById = async (id) => {

  const driver = await Driver.findOne({ _id: id, isDeleted: false }).lean();
  if (!driver) throw new AppError("Driver not found", 404);
  return driver;
};
const getDriverBySerialNumberSrv = async (serialNumber) => {
  const driver = await Driver.findOne({ serialNumber, isDeleted: false }).lean();
  if (!driver) throw new AppError("Driver not found", 404);
  return driver;
};

/**
 * Update driver fields
 */
const updateDriver = async (id, updateData) => {
  const driver = await Driver.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: updateData },
    { new: true, runValidators: true },
  );
  if (!driver) throw new AppError("Driver not found", 404);
  return driver;
};

/**
 * Soft-delete a driver
 */
const deleteDriver = async (id) => {
  const driver = await Driver.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: { isDeleted: true } },
    { new: true },
  );
  if (!driver) throw new AppError("Driver not found", 404);
  return driver;
};

module.exports = {
  createDriver,
  getAllDrivers,
  getDriverById,
  updateDriver,
  deleteDriver,
  getDriverBySerialNumberSrv,
};
