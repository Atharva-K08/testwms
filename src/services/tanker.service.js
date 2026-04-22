"use strict";

const Tanker = require("../models/tanker.model");
const { AppError } = require("../middlewares/error.middleware");

const addTanker = async (tankerNumber, userId) => {
  const existing = await Tanker.findOne({ tankerNumber: tankerNumber.toUpperCase() });
  if (existing) throw new AppError("Tanker number already exists", 409);

  return Tanker.create({ tankerNumber: tankerNumber.toUpperCase(), addedBy: userId });
};

const getAllTankers = async () => {
  return Tanker.find().sort({ tankerNumber: 1 }).lean();
};

const deleteTanker = async (id) => {
  const tanker = await Tanker.findByIdAndDelete(id);
  if (!tanker) throw new AppError("Tanker not found", 404);
  return tanker;
};

module.exports = { addTanker, getAllTankers, deleteTanker };
