"use strict";

const tankerService = require("../services/tanker.service");
const { sendSuccess, sendCreated } = require("../utils/response.util");

const addTanker = async (req, res, next) => {
  try {
    const tanker = await tankerService.addTanker(req.body.tankerNumber, req.user.id);
    return sendCreated(res, { message: "Tanker added successfully", data: tanker });
  } catch (error) {
    next(error);
  }
};

const getAllTankers = async (req, res, next) => {
  try {
    const tankers = await tankerService.getAllTankers();
    return sendSuccess(res, { message: "Tankers retrieved successfully", data: tankers });
  } catch (error) {
    next(error);
  }
};

const deleteTanker = async (req, res, next) => {
  try {
    await tankerService.deleteTanker(req.params.id);
    return sendSuccess(res, { message: "Tanker deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = { addTanker, getAllTankers, deleteTanker };
