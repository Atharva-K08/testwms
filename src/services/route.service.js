"use strict";

const Route = require("../models/route.model");
const { AppError } = require("../middlewares/error.middleware");

/**
 * Create a new source-destination route
 */
const createRoute = async (data) => {
  const route = await Route.create(data);
  return route;
};

/**
 * Get all routes
 */
const getAllRoutes = async () => {
  return Route.find().sort({ createdAt: -1 }).lean();
};

/**
 * Update a route by ID
 */
const updateRoute = async (id, data) => {
  const route = await Route.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
  if (!route) throw new AppError("Route not found", 404);
  return route;
};

/**
 * Delete a route by ID
 */
const deleteRoute = async (id) => {
  const route = await Route.findByIdAndDelete(id);
  if (!route) throw new AppError("Route not found", 404);
  return route;
};

const getRouteByDestinationNameSrv = async (destinationName) => {
  const route = await Route.findOne({ destination: destinationName }).lean();
  if (!route) throw new AppError("Route not found", 404);
  return route;
}

module.exports = { createRoute, getAllRoutes, updateRoute, deleteRoute, getRouteByDestinationNameSrv };
