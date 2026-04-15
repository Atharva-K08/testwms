"use strict";

const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const { validate } = require("../middlewares/validate.middleware");
const { ROLES } = require("../config/constants");
const {
  recordDieselFilling,
  getAllDieselFillings,
  getDieselFillingById,
  updateDieselFilling,
  deleteDieselFilling,
  generateDieselReport,
  getTankerDieselSummary,
  markAsWrongEntry,
  getWrongEntries,
} = require("../controllers/dieselFilling.controller");
const {
  recordDieselFillingValidator,
  updateDieselFillingValidator,
  getDieselFillingValidator,
  deleteDieselFillingValidator,
  dieselReportValidator,
  tankerSummaryValidator,
  markAsWrongValidator,
} = require("../validators/dieselFilling.validator");

// Report endpoint
router.get(
  "/report",
  protect,
  authorize(ROLES.FUEL_MANAGER, ROLES.SUPER_ADMIN),
  dieselReportValidator,
  validate,
  generateDieselReport,
);

// Summary endpoint
router.get(
  "/summary/:tankerNumber",
  protect,
  authorize(ROLES.FUEL_MANAGER, ROLES.SUPER_ADMIN),
  tankerSummaryValidator,
  validate,
  getTankerDieselSummary,
);

// Wrong entries route - superAdmin only (must come before :id)
router.get(
  "/wrong-entries",
  protect,
  authorize(ROLES.SUPER_ADMIN),
  getWrongEntries,
);

// CRUD routes - fuelManager and superAdmin
router.post(
  "/",
  protect,
  // authorize(ROLES.FUEL_MANAGER, ROLES.SUPER_ADMIN),
  recordDieselFillingValidator,
  validate,
  recordDieselFilling,
);
router.get(
  "/",
  protect,
  authorize(ROLES.FUEL_MANAGER, ROLES.SUPER_ADMIN),
  getAllDieselFillings,
);
router.get(
  "/:id",
  protect,
  authorize(ROLES.FUEL_MANAGER, ROLES.SUPER_ADMIN),
  getDieselFillingValidator,
  validate,
  getDieselFillingById,
);
router.put(
  "/:id",
  protect,
  authorize(ROLES.FUEL_MANAGER, ROLES.SUPER_ADMIN),
  updateDieselFillingValidator,
  validate,
  updateDieselFilling,
);
router.delete(
  "/:id",
  protect,
  authorize(ROLES.FUEL_MANAGER, ROLES.SUPER_ADMIN),
  deleteDieselFillingValidator,
  validate,
  deleteDieselFilling,
);

// Mark as wrong route - fuelManager and superAdmin (must come before :id)
router.put(
  "/:id/wrong",
  protect,
  authorize(ROLES.FUEL_MANAGER, ROLES.SUPER_ADMIN),
  markAsWrongValidator,
  validate,
  markAsWrongEntry,
);

module.exports = router;
