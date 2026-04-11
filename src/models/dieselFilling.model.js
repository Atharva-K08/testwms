const mongoose = require("mongoose");
const { DIESEL_FILLING_STATUS } = require("../config/constants");

const dieselFillingSchema = new mongoose.Schema(
  {
    tankerNumber: {
      type: String,
      required: [true, "Tanker number is required"],
      trim: true,
      maxlength: [20, "Tanker number cannot exceed 20 characters"],
    },
    dateTime: {
      type: Date,
      required: [true, "Date and time is required"],
    },
    dieselAmount: {
      type: Number,
      required: [true, "Diesel amount is required"],
      min: [0, "Diesel amount cannot be negative"],
    },
    liters: {
      type: Number,
      required: [true, "Liters is required"],
      min: [0, "Liters cannot be negative"],
    },
    filledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User who filled is required"],
    },
    tripsSinceLastFill: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastFillingDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: [DIESEL_FILLING_STATUS.VALID, DIESEL_FILLING_STATUS.WRONG],
        message: "Invalid status value",
      },
      default: DIESEL_FILLING_STATUS.VALID,
    },
    wrongReason: {
      type: String,
      maxlength: [500, "Reason cannot exceed 500 characters"],
    },
    markedWrongBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    markedWrongAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for efficient queries
dieselFillingSchema.index({ tankerNumber: 1, dateTime: -1 });
dieselFillingSchema.index({ dateTime: -1 });
dieselFillingSchema.index({ status: 1 });

module.exports = mongoose.model("DieselFilling", dieselFillingSchema);
