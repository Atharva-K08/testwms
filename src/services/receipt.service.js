"use strict";

const mongoose = require("mongoose");
const Receipt = require("../models/receipt.model");
const Request = require("../models/request.model");
const { RECEIPT_PREFIX } = require("../config/constants");
const { AppError } = require("../middlewares/error.middleware");

// Counter schema shared via mongoose.models to avoid re-registration
const counterSchema = new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } });
const Counter = mongoose.models.Counter || mongoose.model("Counter", counterSchema);

// Atomic sequential receipt number per calendar day
const generateReceiptNumber = async () => {
  const today = new Date();
  const datePart = today.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
  const counterId = `receipt-${datePart}`;

  const counter = await Counter.findByIdAndUpdate(
    counterId,
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );

  const seq = String(counter.seq).padStart(4, "0");
  return `${RECEIPT_PREFIX}-${datePart}-${seq}`;
};

const generateReceipt = async ({ requestId, managerId }) => {
  // Return existing receipt idempotently
  const existing = await Receipt.findOne({ requestId });
  if (existing) {
    return existing.populate("generatedBy", "profile");
  }

  const request = await Request.findById(requestId);
  if (!request) throw new AppError("Request not found.", 404);

  if (!request.tankerAssignment) {
    throw new AppError("No tanker assigned to this request.", 422);
  }

  const receiptNumber = await generateReceiptNumber();

  const receipt = await Receipt.create({
    receiptNumber,
    requestId,
    societyName:   request.societyName,
    address:       request.address,
    contactPerson: request.contactPerson,
    mobileNumber:  request.mobileNumber,
    tankerNumber:  request.tankerAssignment.tankerNumber,
    driverName:    request.tankerAssignment.driverName,
    driverMobile:  request.tankerAssignment.driverMobile,
    queuePosition: request.queuePosition,
    generatedBy:   managerId,
    generatedAt:   new Date(),
  });

  return receipt;
};

const getReceiptByRequestId = async (requestId) => {
  const receipt = await Receipt.findOne({ requestId }).populate(
    "generatedBy",
    "profile mobileNumber",
  );
  if (!receipt) throw new AppError("Receipt not found for this request.", 404);
  return receipt;
};

const markPrinted = async (receiptId) => {
  return Receipt.findByIdAndUpdate(
    receiptId,
    { $set: { printedAt: new Date() }, $inc: { printCount: 1 } },
    { new: true },
  );
};

const getAllReceipts = async ({ page = 1, limit = 20 }) => {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Receipt.find()
      .sort({ generatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("generatedBy", "profile mobileNumber")
      .lean(),
    Receipt.countDocuments(),
  ]);
  return { items, total, page, limit };
};

module.exports = { generateReceipt, getReceiptByRequestId, markPrinted, getAllReceipts };
