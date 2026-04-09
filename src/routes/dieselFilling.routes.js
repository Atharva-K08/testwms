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
} = require("../controllers/dieselFilling.controller");
const {
  recordDieselFillingValidator,
  updateDieselFillingValidator,
  getDieselFillingValidator,
  deleteDieselFillingValidator,
  dieselReportValidator,
  tankerSummaryValidator,
} = require("../validators/dieselFilling.validator");

// All diesel filling routes are fuelManager-only
router.use(protect, authorize(ROLES.FUEL_MANAGER));

// Report endpoint must come before :id route to avoid conflict
router.get("/report", dieselReportValidator, validate, generateDieselReport);

// Summary endpoint must come before :id route to avoid conflict
router.get(
  "/summary/:tankerNumber",
  tankerSummaryValidator,
  validate,
  getTankerDieselSummary,
);

// CRUD routes
router.post("/", recordDieselFillingValidator, validate, recordDieselFilling);
router.get("/", getAllDieselFillings);
router.get("/:id", getDieselFillingValidator, validate, getDieselFillingById);
router.put("/:id", updateDieselFillingValidator, validate, updateDieselFilling);
router.delete(
  "/:id",
  deleteDieselFillingValidator,
  validate,
  deleteDieselFilling,
);

module.exports = router;
