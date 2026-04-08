"use strict";

const mongoose = require("mongoose");
const { ROLES } = require("../config/constants");

const profileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    societyName: { type: String, required: true, trim: true, maxlength: 150 },
    address: { type: String, required: true, trim: true, maxlength: 300 },
    contactPerson: { type: String, required: true, trim: true, maxlength: 100 },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    mobileNumber: {
      type: String,
      required: [true, "Mobile number is required"],
      unique: true,
      trim: true,
      match: [/^\d{10}$/, "Mobile number must be 10 digits"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.MEMBER,
    },
    profile: { type: profileSchema, required: true },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

userSchema.index({ role: 1 });

userSchema.methods.toPublicJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
