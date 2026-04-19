"use strict";

const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const { ROLES } = require("../config/constants");
const { getDriverAttendance, getDriverAttendanceById } = require("../controllers/attendance.controller");

// Managers and super admins can view attendance
router.use(protect, authorize(ROLES.MANAGER, ROLES.SUPER_ADMIN));

router.get("/drives/:driverName", getDriverAttendance);
router.get("/driver/:driverId", getDriverAttendanceById);

module.exports = router;
