"use strict";

const mongoose = require("mongoose");

const receiptSchema = new mongoose.Schema(
  {
    receiptNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Request",
      required: true,
      unique: true, // One receipt per request
    },

    // Snapshot data from request/user at time of receipt generation
    societyName: { type: String, required: true },
    address: { type: String, required: true },
    contactPerson: { type: String, required: true },
    mobileNumber: { type: String, required: true },
    tankerNumber: { type: String, required: true },
    driverName: { type: String, required: true },
    driverMobile: { type: String, required: true },
    queuePosition: { type: Number, required: true },

    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    generatedAt: { type: Date, default: Date.now },
    printedAt: { type: Date, default: null },
    printCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

receiptSchema.index({ generatedAt: -1 });

module.exports = mongoose.model("Receipt", receiptSchema);
