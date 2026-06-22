"use strict";

const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const { validate } = require("../middlewares/validate.middleware");
const { ROLES } = require("../config/constants");
const { getMembers } = require("../controllers/user.controller");
const { memberListValidator } = require("../validators/user.validator");

// Super Admin only: list society member accounts
router.get(
  "/members",
  protect,
  authorize(ROLES.SUPER_ADMIN),
  memberListValidator,
  validate,
  getMembers,
);

module.exports = router;
