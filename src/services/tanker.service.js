"use strict";

const Tanker = require("../models/tanker.model");
const { AppError } = require("../middlewares/error.middleware");

const addTanker = async (tankerNumber, userId) => {
  const existing = await Tanker.findOne({ tankerNumber: tankerNumber.toUpperCase() });
  if (existing) throw new AppError("Tanker number already exists.", 409);
  return Tanker.create({ tankerNumber: tankerNumber.toUpperCase(), addedBy: userId });
};

const getAllTankers = async ({ currentStatus } = {}) => {
  const query = {};
  if (currentStatus) query.currentStatus = currentStatus;
  return Tanker.find(query).sort({ tankerNumber: 1 }).lean();
};

const deleteTanker = async (id) => {
  const tanker = await Tanker.findById(id);
  if (!tanker) throw new AppError("Tanker not found.", 404);
  if (tanker.currentStatus === "on_trip") {
    throw new AppError(
      `Tanker ${tanker.tankerNumber} is currently on a trip and cannot be deleted.`,
      409,
    );
  }
  await tanker.deleteOne();
  return tanker;
};

module.exports = { addTanker, getAllTankers, deleteTanker };
