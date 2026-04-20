"use strict";

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const {
  BCRYPT_SALT_ROUNDS,
  ROLES,
  SUPER_ADMIN_CREDENTIALS,
} = require("../config/constants");
const { AppError } = require("../middlewares/error.middleware");

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

  const refreshToken = jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
    },
  );

  return { accessToken, refreshToken };
};

const register = async ({ mobileNumber, password, profile }) => {
  const existing = await User.findOne({ mobileNumber });
  if (existing) {
    throw new AppError(
      "An account with this mobile number already exists.",
      409,
    );
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  const user = await User.create({
    mobileNumber,
    password: hashedPassword,
    role: ROLES.MEMBER,
    profile,
  });

  const tokens = generateTokens(user._id);

  return { user: user.toPublicJSON(), ...tokens };
};

const login = async ({ username, mobileNumber, password }) => {
  let user;

  // Check if it's Super Admin login
  if (username === SUPER_ADMIN_CREDENTIALS.USERNAME) {
    user = await User.findOne({ username: SUPER_ADMIN_CREDENTIALS.USERNAME }).select("+password");

    if (!user) {
      // First-time setup: validate against hardcoded default and create the DB record
      if (password !== SUPER_ADMIN_CREDENTIALS.PASSWORD) {
        throw new AppError("Invalid username or password.", 401);
      }
      const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
      user = await User.create({
        username: SUPER_ADMIN_CREDENTIALS.USERNAME,
        password: hashedPassword,
        role: ROLES.SUPER_ADMIN,
        profile: {
          name: "Super Administrator",
          societyName: "System",
          address: "System",
          contactPerson: "Super Administrator",
        },
      });
      // Re-fetch with password selected after create
      user = await User.findById(user._id).select("+password");
    } else {
      // Subsequent logins: compare against stored hash (supports password changes)
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        throw new AppError("Invalid username or password.", 401);
      }
    }
  } else {
    // Regular user login with mobile number
    if (!mobileNumber) {
      throw new AppError("Mobile number is required.", 400);
    }

    user = await User.findOne({ mobileNumber }).select("+password");
    if (!user) {
      throw new AppError("Invalid mobile number or password.", 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError("Invalid mobile number or password.", 401);
    }
  }

  if (!user.isActive) {
    throw new AppError(
      "Your account has been deactivated. Contact administrator.",
      403,
    );
  }

  user.lastLoginAt = new Date();
  await user.save();

  const tokens = generateTokens(user._id);
  const publicUser = user.toPublicJSON();

  return { user: publicUser, ...tokens };
};

const createManagerOrFuelManager = async (
  { mobileNumber, password, profile, role },
  adminUserId,
) => {
  const admin = await User.findById(adminUserId);
  if (!admin || admin.role !== ROLES.SUPER_ADMIN) {
    throw new AppError(
      "Unauthorized. Only Super Admin can create managers.",
      403,
    );
  }

  if (![ROLES.MANAGER, ROLES.FUEL_MANAGER].includes(role)) {
    throw new AppError("Can only create Manager or Fuel Manager roles.", 400);
  }

  const existing = await User.findOne({ mobileNumber });
  if (existing) {
    throw new AppError(
      "An account with this mobile number already exists.",
      409,
    );
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  const user = await User.create({
    mobileNumber,
    password: hashedPassword,
    role,
    profile,
  });

  return user.toPublicJSON();
};

const refreshToken = async (token) => {
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new AppError("Invalid or expired refresh token.", 401);
  }

  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) {
    throw new AppError("User not found or deactivated.", 401);
  }

  const tokens = generateTokens(user._id);
  return { user: user.toPublicJSON(), ...tokens };
};

const getProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found.", 404);
  return user.toPublicJSON();
};

const updatePassword = async ({ oldPassword, newPassword }, userId) => {
  const user = await User.findById(userId).select("+password");
  if (!user) throw new AppError("User not found.", 404);

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) throw new AppError("Current password is incorrect.", 401);

  user.password = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
  await user.save();
};

const updateSuperAdminPassword = async (newPassword, adminUserId) => {
  const user = await User.findById(adminUserId);
  if (!user || user.role !== ROLES.SUPER_ADMIN) {
    throw new AppError("Unauthorized.", 403);
  }
  user.password = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
  await user.save();
};

module.exports = {
  register,
  login,
  refreshToken,
  getProfile,
  createManagerOrFuelManager,
  updatePassword,
  updateSuperAdminPassword,
};
