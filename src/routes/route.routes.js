"use strict";

const express = require("express");
const router  = express.Router();
const { protect }   = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const { validate }  = require("../middlewares/validate.middleware");
const { ROLES }     = require("../config/constants");
const {
  createRoute,
  getAllRoutes,
  updateRoute,
  deleteRoute,
  getRouteByDestinationName,
} = require("../controllers/route.controller");
const {
  createRouteValidator,
  updateRouteValidator,
  routeIdValidator,
} = require("../validators/route.validator");

// Read routes — any authenticated user (manager, superAdmin, fuelManager)
router.get("/",
  protect, authorize(ROLES.MANAGER, ROLES.FUEL_MANAGER, ROLES.SUPER_ADMIN),
  getAllRoutes);

router.get("/destination/:destinationName",
  protect, authorize(ROLES.MANAGER, ROLES.FUEL_MANAGER, ROLES.SUPER_ADMIN),
  getRouteByDestinationName);

// Write routes — manager and superAdmin only
router.post("/",
  protect, authorize(ROLES.MANAGER, ROLES.SUPER_ADMIN),
  createRouteValidator, validate, createRoute);

router.put("/:id",
  protect, authorize(ROLES.MANAGER, ROLES.SUPER_ADMIN),
  updateRouteValidator, validate, updateRoute);

router.delete("/:id",
  protect, authorize(ROLES.MANAGER, ROLES.SUPER_ADMIN),
  routeIdValidator, validate, deleteRoute);

module.exports = router;
