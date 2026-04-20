const DieselFilling = require("../models/dieselFilling.model");
const Request = require("../models/request.model");
const { AppError } = require("../middlewares/error.middleware");
const { logger } = require("../utils/logger.util");
const { DIESEL_FILLING_STATUS } = require("../config/constants");

/**
 * Calculate the number of trips completed by a tanker between two dates.
 * A trip is counted when a request has status 'completed' and has a tankerAssignment.
 */
const calculateTripsBetweenDates = async (tankerNumber, startDate, endDate) => {
  const tripCount = await Request.countDocuments({
    "tankerAssignment.tankerNumber": {
      $regex: new RegExp(`^${tankerNumber}$`, "i"),
    },
    status: "completed",
    completedAt: {
      $gt: startDate,
      $lte: new Date(endDate),
    },
  });
  return tripCount;
};

/**
 * Sum of roundTripKilometer for all completed trips of a tanker in a date range.
 * Used for the summary API to report total km since last fill.
 */
const sumRoundTripKmBetweenDates = async (tankerNumber, startDate, endDate) => {
  const result = await Request.aggregate([
    {
      $match: {
        "tankerAssignment.tankerNumber": {
          $regex: new RegExp(`^${tankerNumber}$`, "i"),
        },
        status: "completed",
        completedAt: {
          $gt: startDate || new Date(0),
          $lte: new Date(endDate),
        },
        roundTripKilometer: { $ne: null },
      },
    },
    {
      $group: {
        _id: null,
        totalKm: { $sum: "$roundTripKilometer" },
      },
    },
  ]);
  return result[0]?.totalKm || 0;
};

/**
 * Get the last diesel filling for a specific tanker.
 */
const getLastFillingByTanker = async (tankerNumber) => {
  const lastFilling = await DieselFilling.findOne({ tankerNumber })
    .sort({ dateTime: -1 })
    .lean();
  return lastFilling;
};

/**
 * Record a new diesel filling entry.
 * Calculates trips completed since last filling automatically.
 */
const recordDieselFilling = async (data, userId) => {
  const { tankerNumber, dateTime, liters, kilometersTravelledSinceLastTrip } = data;

  const session = await DieselFilling.startSession();
  session.startTransaction();

  try {
    const lastFilling = await getLastFillingByTanker(tankerNumber);

    let tripsSinceLastFill = 0;
    let lastFillingDate = null;

    if (lastFilling) {
      lastFillingDate = lastFilling.dateTime;
      tripsSinceLastFill = await calculateTripsBetweenDates(
        tankerNumber,
        lastFillingDate,
        new Date(dateTime),
      );
      logger.info(
        `Tanker ${tankerNumber}: ${tripsSinceLastFill} trips completed since last diesel filling on ${lastFillingDate}`,
      );
    } else {
      logger.info(`First diesel filling record for tanker ${tankerNumber}`);
    }

    const newFilling = await DieselFilling.create(
      [
        {
          tankerNumber,
          dateTime,
          liters,
          kilometersTravelledSinceLastTrip,
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
 * Get all diesel fillings with pagination.
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
 * Get diesel filling by ID.
 */
const getDieselFillingById = async (id) => {
  const filling = await DieselFilling.findById(id).populate(
    "filledBy",
    "mobileNumber role profile.name",
  );
  if (!filling) throw new AppError("Diesel filling not found", 404);
  return filling;
};

/**
 * Update diesel filling entry.
 */
const updateDieselFilling = async (id, updateData) => {
  const filling = await DieselFilling.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });
  if (!filling) throw new AppError("Diesel filling not found", 404);
  return filling;
};

/**
 * Delete diesel filling entry.
 */
const deleteDieselFilling = async (id) => {
  const filling = await DieselFilling.findByIdAndDelete(id);
  if (!filling) throw new AppError("Diesel filling not found", 404);
  return filling;
};

/**
 * Generate diesel report with trip analysis.
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

  const reportData = await Promise.all(
    fillings.map(async (filling) => {
      const requests = await Request.find({
        "tankerAssignment.tankerNumber": {
          $regex: new RegExp(`^${filling.tankerNumber}$`, "i"),
        },
        status: "completed",
        completedAt: {
          $gt: filling.lastFillingDate || new Date(0),
          $lte: new Date(filling.dateTime),
        },
      })
        .select("tankerAssignment completedAt societyName address roundTripKilometer")
        .lean();

      return {
        ...filling,
        trips: requests.map((req) => ({
          completedAt: req.completedAt,
          societyName: req.societyName,
          address: req.address,
          tankerNumber: req.tankerAssignment?.tankerNumber,
          roundTripKilometer: req.roundTripKilometer,
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
 * Get diesel summary for a specific tanker.
 * Includes total km travelled since last fill derived from completed trip roundTripKilometers.
 */
const getTankerDieselSummary = async (tankerNumber) => {
  const fillings = await DieselFilling.find({ tankerNumber })
    .sort({ dateTime: -1 })
    .lean();

  if (fillings.length === 0) {
    throw new AppError("No diesel records found for this tanker", 404);
  }

  const totalLiters = fillings.reduce((sum, f) => sum + f.liters, 0);
  const totalTrips = fillings.reduce((sum, f) => sum + f.tripsSinceLastFill, 0);
  const totalKmTravelled = fillings.reduce(
    (sum, f) => sum + (f.kilometersTravelledSinceLastTrip || 0),
    0,
  );

  // Total km from completed roundTrip records since last filling
  const lastFilling = fillings[0];
  const kilometersTravelledSinceLastFill = await sumRoundTripKmBetweenDates(
    tankerNumber,
    lastFilling.lastFillingDate || new Date(0),
    new Date(),
  );

  const totalCompletedTrips = await Request.countDocuments({
    "tankerAssignment.tankerNumber": tankerNumber,
    status: "completed",
  });

  return {
    tankerNumber,
    totalFillings: fillings.length,
    totalLiters,
    totalTripsRecorded: totalTrips,
    totalCompletedTrips,
    totalKmTravelled,
    kilometersTravelledSinceLastFill,
    averageLitersPerTrip:
      totalTrips > 0 ? parseFloat((totalLiters / totalTrips).toFixed(2)) : 0,
    lastFillingDate: fillings[0]?.dateTime || null,
    firstFillingDate: fillings[fillings.length - 1]?.dateTime || null,
  };
};

/**
 * Mark a diesel filling entry as wrong.
 */
const markAsWrongEntry = async (id, reason, userId) => {
  const filling = await DieselFilling.findById(id);
  if (!filling) throw new AppError("Diesel filling not found", 404);

  if (filling.status === DIESEL_FILLING_STATUS.WRONG) {
    throw new AppError("This entry is already marked as wrong", 400);
  }

  filling.status = DIESEL_FILLING_STATUS.WRONG;
  filling.wrongReason = reason || "No reason provided";
  filling.markedWrongBy = userId;
  filling.markedWrongAt = new Date();

  await filling.save();

  logger.info(
    `Diesel filling ${id} marked as wrong by user ${userId}. Reason: ${reason}`,
  );

  return filling;
};

/**
 * Get all wrong entries for super admin.
 */
const getWrongEntries = async (page = 1, limit = 20, filters = {}) => {
  const query = { status: DIESEL_FILLING_STATUS.WRONG };

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
      .populate("markedWrongBy", "mobileNumber role username")
      .sort({ markedWrongAt: -1 })
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
  markAsWrongEntry,
  getWrongEntries,
};
