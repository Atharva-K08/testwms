"use strict";

const Request = require("../models/request.model");
const Driver = require("../models/driver.model");
const { AppError } = require("../middlewares/error.middleware");

/**
 * Get all trips for a specific driver using MongoDB aggregation.
 * Matches queue records where tankerAssignment.driverName equals the given name.
 */
const getDriverAttendance = async (driverName) => {
  const pipeline = [
    // Match all requests assigned to this driver (any status, all time)
    {
      $match: {
        "tankerAssignment.driverName": driverName,
        tankerAssignment: { $ne: null },
      },
    },
    // Project only the fields we need
    {
      $project: {
        requestId: "$_id",
        tankerNumber: "$tankerAssignment.tankerNumber",
        driverName: "$tankerAssignment.driverName",
        driverMobile: "$tankerAssignment.driverMobile",
        source: 1,
        destination: 1,
        kilometer: 1,
        roundTripKilometer: 1,
        dateTime: "$tankerAssignment.dateTime",
        date: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$tankerAssignment.dateTime",
          },
        },
      },
    },
    // Sort by most recent first
    { $sort: { dateTime: -1 } },
  ];

  const trips = await Request.aggregate(pipeline);

  if (trips.length === 0) {
    throw new AppError(`No trips found for driver: ${driverName}`, 404);
  }

  // Pull driverMobile from the first record (consistent across all trips)
  const driverMobile = trips[0].driverMobile || "";

  const formattedTrips = trips.map((t) => ({
    requestId: t.requestId,
    tankerNumber: t.tankerNumber,
    source: t.source || "",
    destination: t.destination || "",
    kilometer: t.kilometer || null,
    roundTripKilometer: t.roundTripKilometer || null,
    date: t.date || null,
    dateTime: t.dateTime || null,
  }));

  return {
    driverName,
    driverMobile,
    totalTrips: trips.length,
    trips: formattedTrips,
  };
};

/**
 * Get attendance by driver ID.
 * Looks up the driver's name, then delegates to getDriverAttendance.
 */
const getDriverAttendanceById = async (driverId) => {
  const driver = await Driver.findOne({ _id: driverId, isDeleted: false }).lean();
  if (!driver) throw new AppError("Driver not found", 404);
  return getDriverAttendance(driver.name);
};

module.exports = { getDriverAttendance, getDriverAttendanceById };
