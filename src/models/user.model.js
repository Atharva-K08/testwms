"use strict";

const mongoose = require("mongoose");
const { ROLES } = require("../config/constants");

const alternativeContactSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 100 },
    mobileNumber: {
      type: String,
      trim: true,
      match: [/^\d{10}$/, "Alternative mobile number must be 10 digits"],
    },
  },
  { _id: false },
);

const profileSchema = new mongoose.Schema(
  {
    societyName: { type: String, trim: true, maxlength: 150 },
    address: { type: String, trim: true, maxlength: 300 },
    contactPerson: { type: String, trim: true, maxlength: 100 },
    alternativeContacts: {
      type: [alternativeContactSchema],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 3,
        message: "At most 3 alternative contacts are allowed.",
      },
    },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    mobileNumber: {
      type: String,
      trim: true,
      match: [/^\d{10}$/, "Mobile number must be 10 digits"],
    },
    username: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
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
    profile: { type: profileSchema },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

userSchema.index({ role: 1 });
userSchema.index({ username: 1 });

userSchema.methods.toPublicJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
