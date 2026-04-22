"use strict";

const mongoose = require("mongoose");

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
  },
  { timestamps: true },
);

module.exports = mongoose.model("Tanker", tankerSchema);
