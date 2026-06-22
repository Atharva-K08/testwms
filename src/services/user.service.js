"use strict";

const User = require("../models/user.model");
const { ROLES } = require("../config/constants");

const getMembers = async ({ page = 1, limit = 20, search } = {}) => {
  const query = { role: ROLES.MEMBER };

  if (search) {
    const regex = new RegExp(search.trim(), "i");
    query.$or = [
      { mobileNumber: regex },
      { "profile.societyName": regex },
      { "profile.contactPerson": regex },
      { "profile.address": regex },
    ];
  }

  const skip = (page - 1) * limit;

  const [members, total] = await Promise.all([
    User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(query),
  ]);

  return {
    data: members,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

module.exports = { getMembers };
