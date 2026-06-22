"use strict";

const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const { ROLES } = require("../config/constants");
const {
  generateReceipt,
  getReceiptByRequest,
  refreshReceipt,
  markPrinted,
  getAllReceipts,
} = require("../controllers/receipt.controller");

// All receipt routes are manager and superAdmin-only
router.use(protect, authorize(ROLES.MANAGER, ROLES.SUPER_ADMIN));

router.get("/", getAllReceipts);
router.post("/request/:requestId", generateReceipt);
router.get("/request/:requestId", getReceiptByRequest);
router.put("/request/:requestId", refreshReceipt);
router.patch("/:id/printed", markPrinted);

module.exports = router;
