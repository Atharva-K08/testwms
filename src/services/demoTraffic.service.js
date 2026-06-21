"use strict";

// Generates a single realistic, already-completed water-tanker request using only
// real, already-registered members/tankers/drivers/routes. Used by
// utils/demoTrafficScheduler.js to simulate daily delivery volume for testing and
// demos. Every record is tagged isDemo:true (request.model.js) so it can always be
// filtered, audited, or purged — it is never hidden from the database or the app.

const User           = require("../models/user.model");
const Tanker          = require("../models/tanker.model");
const Driver           = require("../models/driver.model");
const DieselFilling     = require("../models/dieselFilling.model");
const RouteModel         = require("../models/route.model");
const Request             = require("../models/request.model");
const { getNextQueuePosition } = require("./queue.service");
const { ROLES, REQUEST_STATUS } = require("../config/constants");
const { logger } = require("../utils/logger.util");

const _randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const _randomMinutes = (min, max) => Math.floor(min + Math.random() * (max - min));

// Human-readable local time for terminal logs, e.g. "21 Jun 2026, 03:52 PM"
// — toISOString() prints UTC with a 'T'/'Z' separator, which is hard to
// scan at a glance in a running server's console.
const _readable = (date) =>
  date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

// Picks a random available tanker that already has at least one diesel filling
// record — mirrors the same eligibility rule enforced on manual assignment
// (queue.service.js assignTanker) so demo data never violates real invariants.
const _pickEligibleTanker = async () => {
  const tankers = await Tanker.find({ currentStatus: "available" }).lean();
  const shuffled = tankers.sort(() => Math.random() - 0.5);
  for (const tanker of shuffled) {
    const hasFilling = await DieselFilling.exists({ tankerNumber: tanker.tankerNumber });
    if (hasFilling) return tanker;
  }
  return null;
};

/**
 * Creates one demo Request, already in "completed" status, dated around
 * `scheduledTime`. Returns the created Request, or null if it had to skip
 * (e.g. no eligible tanker/driver/member exists yet).
 */
const generateDemoRequest = async (scheduledTime) => {
  try {
    const [member] = await User.aggregate([
      { $match: { role: ROLES.MEMBER, isActive: true } },
      { $sample: { size: 1 } },
    ]);
    if (!member) {
      logger.warn("[demoTraffic] Skipped: no member accounts found.");
      return null;
    }

    const tanker = await _pickEligibleTanker();
    if (!tanker) {
      logger.warn("[demoTraffic] Skipped: no available tanker with a diesel filling record.");
      return null;
    }

    const drivers = await Driver.find({
      status: "ACTIVE",
      currentStatus: "available",
      isDeleted: false,
    }).lean();
    if (!drivers.length) {
      logger.warn("[demoTraffic] Skipped: no available active driver.");
      return null;
    }
    const driver = _randomItem(drivers);

    const routes = await RouteModel.find().lean();
    const [manager] = await User.aggregate([
      { $match: { role: ROLES.MANAGER, isActive: true } },
      { $sample: { size: 1 } },
    ]);

    // Backdate the lifecycle so it reads like a real delivery: submitted, then
    // assigned a bit later, then completed at the scheduler's chosen slot.
    const completedAt = new Date(scheduledTime);
    const assignedAt  = new Date(completedAt.getTime() - _randomMinutes(15, 45) * 60000);
    const createdAt   = new Date(assignedAt.getTime() - _randomMinutes(5, 20) * 60000);

    let source      = "Water Tanker Filling Station";
    let destination = member.profile?.address || "";
    let kilometer   = member.profile?.distanceInKm || 1;
    if (routes.length) {
      const route = _randomItem(routes);
      source      = route.source;
      destination = route.destination;
      kilometer   = route.distanceInKm;
    }

    const queuePosition = await getNextQueuePosition();

    const request = await Request.create({
      userId:        member._id,
      societyName:   member.profile?.societyName || "",
      address:       member.profile?.address || "",
      contactPerson: member.profile?.contactPerson || "",
      mobileNumber:  member.mobileNumber || "",
      notes:         "",
      status:        REQUEST_STATUS.COMPLETED,
      queuePosition,
      tankerAssignment: {
        tankerNumber: tanker.tankerNumber,
        driverId:     driver._id,
        driverName:   driver.name,
        driverMobile: driver.mobileNumber,
        dateTime:     assignedAt,
      },
      assignedAt,
      assignedBy: manager ? manager._id : null,
      source,
      destination,
      kilometer,
      roundTripKilometer: kilometer * 2,
      completedAt,
      isDemo: true,
      createdAt,
    });

    logger.info(
      `[demoTraffic] Generated demo request ${request._id} for "${request.societyName}" ` +
        `(tanker ${tanker.tankerNumber}, driver ${driver.name}) at ${_readable(completedAt)}`,
    );
    return request;
  } catch (err) {
    logger.error(`[demoTraffic] Failed to generate demo request: ${err.message}`);
    return null;
  }
};

module.exports = { generateDemoRequest };
