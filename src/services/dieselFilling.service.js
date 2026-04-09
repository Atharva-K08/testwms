const DieselFilling = require("../models/dieselFilling.model");
const Request = require("../models/request.model");
const Receipt = require("../models/receipt.model");
const AppError = require("../middlewares/error.middleware");
const { logger } = require("../utils/logger.util");

/**
 * Calculate the number of trips completed by a tanker between two dates
 * A trip is counted when a request has status 'completed' and has a tankerAssignment
 */
const calculateTripsBetweenDates = async (tankerNumber, startDate, endDate) => {
  const tripCount = await Request.countDocuments({
    "tankerAssignment.tankerNumber": tankerNumber,
    status: "completed",
    completedAt: {
      $gt: startDate,
      $lte: endDate,
    },
  });

  return tripCount;
};

/**
 * Get the last diesel filling for a specific tanker
 */
const getLastFillingByTanker = async (tankerNumber) => {
  const lastFilling = await DieselFilling.findOne({ tankerNumber })
    .sort({ dateTime: -1 })
    .lean();

  return lastFilling;
};

/**
 * Record a new diesel filling entry
 * This will:
 * 1. Find the last diesel filling for this tanker
 * 2. Calculate trips completed since last filling
 * 3. Create the new diesel filling record
 */
const recordDieselFilling = async (data, userId) => {
  const { tankerNumber, dateTime, dieselAmount, liters } = data;

  // Start a session for transaction
  const session = await DieselFilling.startSession();
  session.startTransaction();

  try {
    // Get the last diesel filling for this tanker
    const lastFilling = await getLastFillingByTanker(tankerNumber);

    let tripsSinceLastFill = 0;
    let lastFillingDate = null;

    if (lastFilling) {
      lastFillingDate = lastFilling.dateTime;
      // Calculate trips from last filling date to current dateTime
      tripsSinceLastFill = await calculateTripsBetweenDates(
        tankerNumber,
        lastFillingDate,
        dateTime,
      );

      logger.info(
        `Tanker ${tankerNumber}: ${tripsSinceLastFill} trips completed since last diesel filling on ${lastFillingDate}`,
      );
    } else {
      logger.info(`First diesel filling record for tanker ${tankerNumber}`);
    }

    // Create the new diesel filling record
    const newFilling = await DieselFilling.create(
      [
        {
          tankerNumber,
          dateTime,
          dieselAmount,
          liters,
          filledBy: userId,
          tripsSinceLastFill,
          lastFillingDate,
        },
      ],
      { session },
    );

    await session.commitTransaction();

    logger.info(
      `Diesel filling recorded for tanker ${tankerNumber}: ${liters} liters, ${tripsSinceLastFill} trips since last fill`,
    );

    return newFilling[0];
  } catch (error) {
    await session.abortTransaction();
    logger.error(`Error recording diesel filling: ${error.message}`);
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Get all diesel fillings with pagination
 */
const getAllDieselFillings = async (page = 1, limit = 20, filters = {}) => {
  const query = {};

  if (filters.tankerNumber) {
    query.tankerNumber = filters.tankerNumber;
  }

  if (filters.startDate && filters.endDate) {
    query.dateTime = {
      $gte: new Date(filters.startDate),
      $lte: new Date(filters.endDate),
    };
  }

  const skip = (page - 1) * limit;

  const [fillings, total] = await Promise.all([
    DieselFilling.find(query)
      .populate("filledBy", "mobileNumber role profile.name")
      .sort({ dateTime: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    DieselFilling.countDocuments(query),
  ]);

  return {
    data: fillings,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get diesel filling by ID
 */
const getDieselFillingById = async (id) => {
  const filling = await DieselFilling.findById(id).populate(
    "filledBy",
    "mobileNumber role profile.name",
  );

  if (!filling) {
    throw new AppError("Diesel filling not found", 404);
  }

  return filling;
};

/**
 * Update diesel filling entry
 */
const updateDieselFilling = async (id, updateData) => {
  const filling = await DieselFilling.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!filling) {
    throw new AppError("Diesel filling not found", 404);
  }

  return filling;
};

/**
 * Delete diesel filling entry
 */
const deleteDieselFilling = async (id) => {
  const filling = await DieselFilling.findByIdAndDelete(id);

  if (!filling) {
    throw new AppError("Diesel filling not found", 404);
  }

  return filling;
};

/**
 * Generate diesel report with trip analysis
 * Shows each diesel filling along with trips completed since last filling
 */
const generateDieselReport = async (page = 1, limit = 20, filters = {}) => {
  const query = {};

  if (filters.tankerNumber) {
    query.tankerNumber = filters.tankerNumber;
  }

  if (filters.startDate && filters.endDate) {
    query.dateTime = {
      $gte: new Date(filters.startDate),
      $lte: new Date(filters.endDate),
    };
  }

  const skip = (page - 1) * limit;

  const fillings = await DieselFilling.find(query)
    .populate("filledBy", "mobileNumber role profile.name")
    .sort({ dateTime: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  // For each filling, fetch related receipts (trips)
  const reportData = await Promise.all(
    fillings.map(async (filling) => {
      // Find receipts for this tanker up to the current filling date
      const requests = await Request.find({
        "tankerAssignment.tankerNumber": filling.tankerNumber,
        status: "completed",
        completedAt: {
          $gt: filling.lastFillingDate || new Date(0),
          $lte: filling.dateTime,
        },
      })
        .select("tankerAssignment completedAt societyName address")
        .lean();

      return {
        ...filling,
        trips: requests.map((req) => ({
          completedAt: req.completedAt,
          societyName: req.societyName,
          address: req.address,
          tankerNumber: req.tankerAssignment?.tankerNumber,
        })),
        tripCount: requests.length,
      };
    }),
  );

  const total = await DieselFilling.countDocuments(query);

  return {
    data: reportData,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get diesel summary for a specific tanker
 * Shows total diesel consumed, total trips, and efficiency metrics
 */
const getTankerDieselSummary = async (tankerNumber) => {
  const fillings = await DieselFilling.find({ tankerNumber })
    .sort({ dateTime: -1 })
    .lean();

  if (fillings.length === 0) {
    throw new AppError("No diesel records found for this tanker", 404);
  }

  const totalDieselAmount = fillings.reduce(
    (sum, f) => sum + f.dieselAmount,
    0,
  );
  const totalLiters = fillings.reduce((sum, f) => sum + f.liters, 0);
  const totalTrips = fillings.reduce((sum, f) => sum + f.tripsSinceLastFill, 0);

  // Calculate trips from all completed requests for this tanker
  const totalCompletedTrips = await Request.countDocuments({
    "tankerAssignment.tankerNumber": tankerNumber,
    status: "completed",
  });

  return {
    tankerNumber,
    totalFillings: fillings.length,
    totalDieselAmount,
    totalLiters,
    totalTripsRecorded: totalTrips,
    totalCompletedTrips,
    averageLitersPerTrip:
      totalTrips > 0 ? (totalLiters / totalTrips).toFixed(2) : 0,
    lastFillingDate: fillings[0]?.dateTime || null,
    firstFillingDate: fillings[fillings.length - 1]?.dateTime || null,
  };
};

module.exports = {
  recordDieselFilling,
  getAllDieselFillings,
  getDieselFillingById,
  updateDieselFilling,
  deleteDieselFilling,
  generateDieselReport,
  getTankerDieselSummary,
  calculateTripsBetweenDates,
  getLastFillingByTanker,
};
