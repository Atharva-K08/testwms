"use strict";

const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const { validate } = require("../middlewares/validate.middleware");
const { ROLES } = require("../config/constants");
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

// All route management requires authentication; managers and super admins only
router.use(protect, authorize(ROLES.MANAGER, ROLES.SUPER_ADMIN));

router.post("/", createRouteValidator, validate, createRoute);
router.get("/", getAllRoutes);
router.put("/:id", updateRouteValidator, validate, updateRoute);
router.delete("/:id", routeIdValidator, validate, deleteRoute);
router.get("/destination/:destinationName", getRouteByDestinationName);

module.exports = router;
