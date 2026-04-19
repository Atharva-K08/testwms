"use strict";

const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const { validate } = require("../middlewares/validate.middleware");
const { ROLES } = require("../config/constants");
const {
  createDriver,
  getAllDrivers,
  getDriverById,
  updateDriver,
  deleteDriver,
  getDriverBySerialNumber,
} = require("../controllers/driver.controller");
const {
  createDriverValidator,
  updateDriverValidator,
  driverIdValidator,
  driverListValidator,
  driverSerialNumberValidator,
} = require("../validators/driver.validator");

// All driver routes require authentication; managers and super admins can manage drivers
router.use(protect, authorize(ROLES.MANAGER, ROLES.SUPER_ADMIN));

router.post("/", createDriverValidator, validate, createDriver);
router.get("/", driverListValidator, validate, getAllDrivers);
router.get("/:id", driverIdValidator, validate, getDriverById);
router.put("/:id", updateDriverValidator, validate, updateDriver);
router.delete("/:id", driverIdValidator, validate, deleteDriver);
router.get("/serial/:serialNumber", driverSerialNumberValidator, validate, getDriverBySerialNumber);

module.exports = router;
