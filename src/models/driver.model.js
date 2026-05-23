"use strict";

const mongoose = require("mongoose");

// ── Counter schema for auto-incrementing serialNumber ─────────────────────────
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});
const Counter =
  mongoose.models.Counter || mongoose.model("Counter", counterSchema);

// ── Driver schema ─────────────────────────────────────────────────────────────
const driverSchema = new mongoose.Schema(
  {
    serialNumber: {
      type: Number,
      unique: true,
    },
    name: {
      type: String,
      required: [true, "Driver name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    permanentAddress: {
      type: String,
      required: [true, "Permanent address is required"],
      trim: true,
      maxlength: [300, "Address cannot exceed 300 characters"],
    },
    temporaryAddress: {
      type: String,
      trim: true,
      maxlength: [300, "Address cannot exceed 300 characters"],
      default: "",
    },
    mobileNumber: {
      type: String,
      required: [true, "Mobile number is required"],
      unique: true,
      trim: true,
      match: [/^\d{10}$/, "Mobile number must be exactly 10 digits"],
    },
    status: {
      type: String,
      enum: {
        values: ["ACTIVE", "BLOCK"],
        message: "Status must be ACTIVE or BLOCK",
      },
      default: "ACTIVE",
    },
    // Trip-level availability — separate from permanent ACTIVE/BLOCK status
    currentStatus: {
      type: String,
      enum: ["available", "on_trip"],
      default: "available",
    },
    activeRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Request",
      default: null,
    },
    documents: {
      type: [String],
      default: [],
    },
    // Soft-delete flag
    isDeleted: {
      type: Boolean,
      default: false,
      select: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// ── Auto-increment serialNumber before first save ─────────────────────────────
driverSchema.pre("save", async function (next) {
  if (!this.isNew) return next();
  try {
    const counter = await Counter.findByIdAndUpdate(
      "driverSerialNumber",
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    this.serialNumber = counter.seq;
    next();
  } catch (err) {
    next(err);
  }
});

// ── Indexes ───────────────────────────────────────────────────────────────────
driverSchema.index({ mobileNumber: 1 });
driverSchema.index({ status: 1 });
driverSchema.index({ name: 1 });
driverSchema.index({ currentStatus: 1 });

module.exports = mongoose.model("Driver", driverSchema);
