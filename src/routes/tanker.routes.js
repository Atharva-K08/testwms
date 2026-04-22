"use strict";

const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const { ROLES } = require("../config/constants");
const { addTanker, getAllTankers, deleteTanker } = require("../controllers/tanker.controller");

router.get(
  "/",
  protect,
  authorize(ROLES.MANAGER, ROLES.FUEL_MANAGER, ROLES.SUPER_ADMIN),
  getAllTankers,
);

router.post(
  "/",
  protect,
  authorize(ROLES.MANAGER, ROLES.SUPER_ADMIN),
  addTanker,
);

router.delete(
  "/:id",
  protect,
  authorize(ROLES.MANAGER, ROLES.SUPER_ADMIN),
  deleteTanker,
);

module.exports = router;
