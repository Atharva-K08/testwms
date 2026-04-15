"use strict";

const routeService = require("../services/route.service");
const { sendSuccess, sendCreated } = require("../utils/response.util");

/**
 * POST /api/v1/routes
 * Create a new source-destination route
 */
const createRoute = async (req, res, next) => {
  try {
    const { source, destination, distanceInKm } = req.body;
    const route = await routeService.createRoute({ source, destination, distanceInKm });
    return sendCreated(res, { message: "Route created successfully", data: route });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/routes
 * Get all routes
 */
const getAllRoutes = async (req, res, next) => {
  try {
    const routes = await routeService.getAllRoutes();
    return sendSuccess(res, { message: "Routes retrieved successfully", data: routes });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/routes/:id
 * Update a route
 */
const updateRoute = async (req, res, next) => {
  try {
    const allowed = ["source", "destination", "distanceInKm"];
    const updateData = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) updateData[key] = req.body[key];
    });

    const route = await routeService.updateRoute(req.params.id, updateData);
    return sendSuccess(res, { message: "Route updated successfully", data: route });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/routes/:id
 * Delete a route
 */
const deleteRoute = async (req, res, next) => {
  try {
    await routeService.deleteRoute(req.params.id);
    return sendSuccess(res, { message: "Route deleted successfully" });
  } catch (error) {
    next(error);
  }
};

const getRouteByDestinationName = async (req, res, next) => {
  try {
    const route = await routeService.getRouteByDestinationNameSrv(req.params.destinationName);
    return sendSuccess(res, { message: "Route retrieved successfully", data: route });
  } catch (error) {
    next(error);
  }
}

module.exports = { createRoute, getAllRoutes, updateRoute, deleteRoute, getRouteByDestinationName };
