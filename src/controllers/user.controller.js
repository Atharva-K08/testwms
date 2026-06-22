"use strict";

const userService = require("../services/user.service");
const { sendPaginated } = require("../utils/response.util");
const { PAGINATION } = require("../config/constants");

/**
 * GET /api/v1/users/members
 * Super Admin: list society member accounts, with search + pagination
 */
const getMembers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE;
    const limit = Math.min(
      parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT,
      PAGINATION.MAX_LIMIT,
    );
    const { search } = req.query;

    const result = await userService.getMembers({ page, limit, search });

    return sendPaginated(res, {
      message: "Members retrieved successfully",
      data: result.data,
      page: result.pagination.page,
      limit: result.pagination.limit,
      total: result.pagination.total,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMembers };
