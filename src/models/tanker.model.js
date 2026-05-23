"use strict";

const mongoose = require("mongoose");
const { ENTITY_STATUS } = require("../config/constants");

const tankerSchema = new mongoose.Schema(
  {
    tankerNumber: {
      type: String,
      required: [true, "Tanker number is required"],
      trim: true,
      uppercase: true,
      unique: true,
      maxlength: [20, "Tanker number cannot exceed 20 characters"],
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    currentStatus: {
      type: String,
      enum: Object.values(ENTITY_STATUS),
      default: ENTITY_STATUS.AVAILABLE,
    },
    activeRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Request",
      default: null,
    },
  },
  { timestamps: true },
);

tankerSchema.index({ currentStatus: 1 });

module.exports = mongoose.model("Tanker", tankerSchema);
