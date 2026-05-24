"use strict";

const Request       = require("../models/request.model");
const Tanker        = require("../models/tanker.model");
const Driver        = require("../models/driver.model");
const DieselFilling = require("../models/dieselFilling.model");
const { REQUEST_STATUS, ENTITY_STATUS } = require("../config/constants");
const { AppError } = require("../middlewares/error.middleware");

// ── Helpers ───────────────────────────────────────────────────────────────────

const _freeTankerAndDriver = async (tankerNumber, driverId) => {
  const ops = [];
  if (tankerNumber) {
    ops.push(
      Tanker.updateOne(
        { tankerNumber },
        { currentStatus: ENTITY_STATUS.AVAILABLE, activeRequestId: null },
      ),
    );
  }
  if (driverId) {
    ops.push(
      Driver.updateOne(
        { _id: driverId },
        { currentStatus: ENTITY_STATUS.AVAILABLE, activeRequestId: null },
      ),
    );
  }
  if (ops.length) await Promise.all(ops);
};

const _lockTankerAndDriver = async (tankerNumber, driverId, requestId) => {
  await Promise.all([
    Tanker.updateOne(
      { tankerNumber },
      { currentStatus: ENTITY_STATUS.ON_TRIP, activeRequestId: requestId },
    ),
    Driver.updateOne(
      { _id: driverId },
      { currentStatus: ENTITY_STATUS.ON_TRIP, activeRequestId: requestId },
    ),
  ]);
};

// ── Queue position ─────────────────────────────────────────────────────────────

const getNextQueuePosition = async () => {
  const last = await Request.findOne({}, { queuePosition: 1 })
    .sort({ queuePosition: -1 })
    .lean();
  return last ? last.queuePosition + 1 : 1;
};

// ── Queue read ────────────────────────────────────────────────────────────────

const getPendingQueue = async ({ page = 1, limit = 20, status } = {}) => {
  const skip = (page - 1) * limit;
  const query = status ? { status } : {};
  const [items, total] = await Promise.all([
    Request.find(query)
      .sort({ queuePosition: 1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "mobileNumber profile")
      .lean(),
    Request.countDocuments(query),
  ]);
  return { items, total, page, limit };
};

const peekNextInQueue = async () => {
  return Request.findOne({ status: REQUEST_STATUS.PENDING })
    .sort({ queuePosition: 1 })
    .populate("userId", "mobileNumber profile")
    .lean();
};

// ── Assign tanker (entity-first + busy check) ─────────────────────────────────

const assignTanker = async ({ requestId, tankerNumber, driverId, dateTime, managerId }) => {
  // 1. Validate tanker registered in DB
  const tanker = await Tanker.findOne({ tankerNumber: tankerNumber.toUpperCase() });
  if (!tanker) {
    throw new AppError(`Tanker ${tankerNumber} is not registered. Please register it first.`, 422);
  }

  // 2. Tanker must be available
  if (tanker.currentStatus === ENTITY_STATUS.ON_TRIP) {
    throw new AppError(
      `Tanker ${tanker.tankerNumber} is currently on a trip and cannot be assigned.`,
      409,
    );
  }

  // 2a. Tanker must have at least one diesel filling record
  const hasFilling = await DieselFilling.exists({ tankerNumber: tanker.tankerNumber });
  if (!hasFilling) {
    throw new AppError(
      `Tanker ${tanker.tankerNumber} has no diesel filling record. Ask the Fuel Manager to record a filling before assigning this tanker.`,
      422,
    );
  }

  // 3. Validate driver registered in DB and not soft-deleted
  const driver = await Driver.findOne({ _id: driverId, isDeleted: false });
  if (!driver) {
    throw new AppError("Driver not found. Please register the driver first.", 404);
  }

  // 4. Driver must be ACTIVE (not permanently blocked)
  if (driver.status === "BLOCK") {
    throw new AppError(`Driver ${driver.name} is blocked and cannot be assigned.`, 422);
  }

  // 5. Driver must be available (not already on a trip)
  if (driver.currentStatus === ENTITY_STATUS.ON_TRIP) {
    throw new AppError(`Driver ${driver.name} is currently on a trip and cannot be assigned.`, 409);
  }

  // 6. Assign request atomically (only if still pending)
  const updated = await Request.findOneAndUpdate(
    { _id: requestId, status: REQUEST_STATUS.PENDING },
    {
      $set: {
        tankerAssignment: {
          tankerNumber: tanker.tankerNumber,
          driverId:     driver._id,
          driverName:   driver.name,
          driverMobile: driver.mobileNumber,
          dateTime:     new Date(dateTime),
        },
        assignedAt: new Date(),
        assignedBy: managerId,
      },
    },
    { new: true, runValidators: true },
  ).populate("userId", "mobileNumber profile");

  if (!updated) {
    throw new AppError("Request not found or is not in pending state.", 409);
  }

  // 7. Mark tanker + driver as on_trip
  await _lockTankerAndDriver(tanker.tankerNumber, driver._id, requestId);

  return updated;
};

// ── Handover (swap tanker/driver with reason) ─────────────────────────────────

const handoverTanker = async ({ requestId, tankerNumber, driverId, dateTime, reason, managerId }) => {
  // Load current request — must be pending with an existing assignment
  const request = await Request.findOne({
    _id: requestId,
    status: REQUEST_STATUS.PENDING,
    tankerAssignment: { $ne: null },
  });

  if (!request) {
    throw new AppError(
      "Request not found, not pending, or has no existing assignment to hand over.",
      422,
    );
  }

  // Validate new tanker
  const newTanker = await Tanker.findOne({ tankerNumber: tankerNumber.toUpperCase() });
  if (!newTanker) {
    throw new AppError(`Tanker ${tankerNumber} is not registered.`, 422);
  }

  const isSameTanker = newTanker.tankerNumber === request.tankerAssignment.tankerNumber;
  if (!isSameTanker && newTanker.currentStatus === ENTITY_STATUS.ON_TRIP) {
    throw new AppError(
      `Tanker ${newTanker.tankerNumber} is currently on a trip and cannot be assigned.`,
      409,
    );
  }

  // New tanker must have at least one diesel filling record
  if (!isSameTanker) {
    const hasFilling = await DieselFilling.exists({ tankerNumber: newTanker.tankerNumber });
    if (!hasFilling) {
      throw new AppError(
        `Tanker ${newTanker.tankerNumber} has no diesel filling record. Ask the Fuel Manager to record a filling before using this tanker.`,
        422,
      );
    }
  }

  // Validate new driver
  const newDriver = await Driver.findOne({ _id: driverId, isDeleted: false });
  if (!newDriver) throw new AppError("Driver not found.", 404);
  if (newDriver.status === "BLOCK") {
    throw new AppError(`Driver ${newDriver.name} is blocked.`, 422);
  }

  const isSameDriver = String(newDriver._id) === String(request.tankerAssignment.driverId);
  if (!isSameDriver && newDriver.currentStatus === ENTITY_STATUS.ON_TRIP) {
    throw new AppError(`Driver ${newDriver.name} is currently on a trip.`, 409);
  }

  // Build handover history entry
  const historyEntry = {
    fromTankerNumber:  request.tankerAssignment.tankerNumber,
    fromDriverId:      request.tankerAssignment.driverId,
    fromDriverName:    request.tankerAssignment.driverName,
    fromDriverMobile:  request.tankerAssignment.driverMobile,
    fromDateTime:      request.tankerAssignment.dateTime,
    toTankerNumber:    newTanker.tankerNumber,
    toDriverId:        newDriver._id,
    toDriverName:      newDriver.name,
    toDriverMobile:    newDriver.mobileNumber,
    toDateTime:        new Date(dateTime),
    reason,
    handedOverAt:      new Date(),
    handedOverBy:      managerId,
  };

  // Update request
  const updated = await Request.findByIdAndUpdate(
    requestId,
    {
      $set: {
        tankerAssignment: {
          tankerNumber: newTanker.tankerNumber,
          driverId:     newDriver._id,
          driverName:   newDriver.name,
          driverMobile: newDriver.mobileNumber,
          dateTime:     new Date(dateTime),
        },
        assignedAt: new Date(),
        assignedBy: managerId,
      },
      $push: { handoverHistory: historyEntry },
    },
    { new: true, runValidators: true },
  ).populate("userId", "mobileNumber profile");

  // Swap availability: free old pair, lock new pair
  await _freeTankerAndDriver(
    request.tankerAssignment.tankerNumber,
    request.tankerAssignment.driverId,
  );
  await _lockTankerAndDriver(newTanker.tankerNumber, newDriver._id, requestId);

  return updated;
};

// ── Assign source / destination ───────────────────────────────────────────────

const assignSourceDestination = async ({ requestId, source, destination, kilometers }) => {
  // Only allow on pending requests that have a tanker assigned
  const request = await Request.findOne({ _id: requestId, status: REQUEST_STATUS.PENDING });
  if (!request) throw new AppError("Request not found or not pending.", 404);
  if (!request.tankerAssignment) {
    throw new AppError("Assign a tanker first before setting source and destination.", 422);
  }

  const updated = await Request.findByIdAndUpdate(
    requestId,
    {
      $set: {
        source,
        destination,
        kilometer:          kilometers,
        roundTripKilometer: kilometers * 2,
      },
    },
    { new: true, runValidators: true },
  ).populate("userId", "mobileNumber profile");

  return updated;
};

// ── Complete request (frees tanker + driver) ──────────────────────────────────

const completeRequest = async (requestId) => {
  const request = await Request.findOne({ _id: requestId, status: REQUEST_STATUS.PENDING });
  if (!request) return null;

  // Guard: tanker must be assigned
  if (!request.tankerAssignment) {
    throw new AppError("Cannot complete: no tanker has been assigned to this request.", 422);
  }

  // Guard: source + destination + km must be recorded
  if (!request.source || !request.destination) {
    throw new AppError("Cannot complete: source and destination must be set first.", 422);
  }
  if (!request.kilometer || request.kilometer <= 0) {
    throw new AppError("Cannot complete: kilometer distance must be recorded first.", 422);
  }

  const completed = await Request.findByIdAndUpdate(
    requestId,
    { $set: { status: REQUEST_STATUS.COMPLETED, completedAt: new Date() } },
    { new: true },
  );

  // Free tanker and driver
  await _freeTankerAndDriver(
    request.tankerAssignment.tankerNumber,
    request.tankerAssignment.driverId,
  );

  return completed;
};

// ── Manager report ────────────────────────────────────────────────────────────

const getManagerReport = async ({ startDate, endDate, page = 1, limit = 50 } = {}) => {
  const skip = (page - 1) * limit;
  const matchConditions = {};

  if (startDate || endDate) {
    matchConditions.createdAt = {};
    if (startDate) {
      const s = new Date(startDate);
      s.setUTCHours(0, 0, 0, 0);
      matchConditions.createdAt.$gte = s;
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setUTCHours(23, 59, 59, 999);
      matchConditions.createdAt.$lte = e;
    }
  }

  const [stats, totalRequests, requests] = await Promise.all([
    Request.aggregate([
      { $match: matchConditions },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Request.countDocuments(matchConditions),
    Request.find(matchConditions)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "mobileNumber profile")
      .populate("assignedBy", "username mobileNumber")
      .lean(),
  ]);

  const summary = {
    total:     totalRequests,
    pending:   0,
    completed: 0,
    cancelled: 0,
    byStatus:  stats.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {}),
  };
  stats.forEach((s) => { summary[s._id] = s.count; });

  return {
    summary,
    requests,
    pagination: {
      page,
      limit,
      total:      totalRequests,
      totalPages: Math.ceil(totalRequests / limit),
    },
  };
};

module.exports = {
  getNextQueuePosition,
  getPendingQueue,
  peekNextInQueue,
  assignTanker,
  handoverTanker,
  assignSourceDestination,
  completeRequest,
  getManagerReport,
};
