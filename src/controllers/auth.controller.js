"use strict";

const authService = require("../services/auth.service");
const { sendSuccess, sendCreated } = require("../utils/response.util");

const register = async (req, res) => {
  const { mobileNumber, password, profile } = req.body;
  const result = await authService.register({
    mobileNumber,
    password,
    profile,
  });
  sendCreated(res, {
    message: "Account created successfully.",
    data: result,
  });
};

const login = async (req, res) => {
  const { username, mobileNumber, password } = req.body;
  const result = await authService.login({ username, mobileNumber, password });
  sendSuccess(res, {
    message: "Login successful.",
    data: result,
  });
};

const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  const result = await authService.refreshToken(refreshToken);
  sendSuccess(res, {
    message: "Token refreshed.",
    data: result,
  });
};

const getProfile = async (req, res) => {
  const user = await authService.getProfile(req.user._id);
  sendSuccess(res, { message: "Profile fetched.", data: { user } });
};

const createManager = async (req, res) => {
  const { mobileNumber, password, profile, role } = req.body;
  const result = await authService.createManagerOrFuelManager(
    { mobileNumber, password, profile, role },
    req.user.id,
  );
  sendCreated(res, {
    message: `${role === "manager" ? "Manager" : "Fuel Manager"} created successfully.`,
    data: result,
  });
};

const updatePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  await authService.updatePassword({ oldPassword, newPassword }, req.user.id);
  sendSuccess(res, { message: "Password updated successfully." });
};

const updateSuperAdminPassword = async (req, res) => {
  const { newPassword } = req.body;
  await authService.updateSuperAdminPassword(newPassword, req.user.id);
  sendSuccess(res, { message: "Super admin password updated successfully." });
};

module.exports = { register, login, refresh, getProfile, createManager, updatePassword, updateSuperAdminPassword };
