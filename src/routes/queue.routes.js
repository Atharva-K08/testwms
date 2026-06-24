"use strict";

const express = require("express");
const router  = express.Router();
const { protect }  = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const { validate }  = require("../middlewares/validate.middleware");
const { ROLES }     = require("../config/constants");
const {
  getQueue,
  peekNext,
  assignTanker,
  handoverTanker,
  completeRequest,
  getManagerReport,
  getDailyTankerRegisterPdf,
  getDailyTankerRegisterExcel,
  assignSourceDestination,
} = require("../controllers/queue.controller");
const {
  assignTankerValidator,
  handoverTankerValidator,
  completeRequestValidator,
  paginationValidator,
  managerReportValidator,
  dailyTankerRegisterValidator,
  assignSourceDestinationValidator,
} = require("../validators/request.validator");

// All queue routes require manager or superAdmin
router.use(protect, authorize(ROLES.MANAGER, ROLES.SUPER_ADMIN));

router.get("/",     paginationValidator,    validate, getQueue);
router.get("/next", peekNext);
router.get("/report", managerReportValidator, validate, getManagerReport);
router.get("/report/pdf/daily-register",
  dailyTankerRegisterValidator, validate, getDailyTankerRegisterPdf);
router.get("/report/excel/daily-register",
  dailyTankerRegisterValidator, validate, getDailyTankerRegisterExcel);

router.patch("/:id/assign",
  assignTankerValidator, validate, assignTanker);

router.patch("/:id/handover",
  handoverTankerValidator, validate, handoverTanker);

router.patch("/:id/assign-source-destination",
  assignSourceDestinationValidator, validate, assignSourceDestination);

router.patch("/:id/complete",
  completeRequestValidator, validate, completeRequest);

module.exports = router;
