"use strict";

const express = require("express");
const router = express.Router();
const {
  register,
  login,
  refresh,
  getProfile,
  createManager,
  updatePassword,
  updateSuperAdminPassword,
} = require("../controllers/auth.controller");
const { protect } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const { validate } = require("../middlewares/validate.middleware");
const {
  registerValidator,
  loginValidator,
  createManagerValidator,
  updateSuperAdminPasswordValidator,
  updatePasswordValidator,
} = require("../validators/auth.validator");
const { body } = require("express-validator");
const { ROLES } = require("../config/constants");

router.post("/register", registerValidator, validate, register);
router.post("/login", loginValidator, validate, login);
router.post(
  "/refresh",
  [body("refreshToken").notEmpty().withMessage("Refresh token is required.")],
  validate,
  refresh,
);
router.get("/profile", protect, getProfile);

// Super Admin only: Create Manager or Fuel Manager
router.post(
  "/create-manager",
  protect,
  authorize(ROLES.SUPER_ADMIN),
  createManagerValidator,
  validate,
  createManager,
);

// Any authenticated user: Update own password
router.put(
  "/password",
  protect,
  updatePasswordValidator,
  validate,
  updatePassword,
);

// Super Admin only: Update own password
router.put(
  "/super-admin/password",
  protect,
  authorize(ROLES.SUPER_ADMIN),
  updateSuperAdminPasswordValidator,
  validate,
  updateSuperAdminPassword,
);

module.exports = router;
