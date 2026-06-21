"use strict";

// Recurring scheduler: every day, plans 30 demo requests (request.model.js
// isDemo:true) at random times between 10:00 and 16:00 server time, then
// fires demoTraffic.service.generateDemoRequest() at each planned moment.
// Re-plans itself daily at 00:05 — no external cron dependency needed.
// Started once from server.js after the DB connects.

const { generateDemoRequest } = require("../services/demoTraffic.service");
const { logger } = require("./logger.util");

const DAILY_REQUEST_COUNT = 30;
const WINDOW_START_HOUR = 10;
const WINDOW_END_HOUR = 16;
const PLANNING_HOUR = 0;
const PLANNING_MINUTE = 5;

let scheduledTimeouts = [];

const _clearScheduled = () => {
  scheduledTimeouts.forEach(clearTimeout);
  scheduledTimeouts = [];
};

const _randomTimeInWindow = (baseDate) => {
  const start = new Date(baseDate);
  start.setHours(WINDOW_START_HOUR, 0, 0, 0);
  const end = new Date(baseDate);
  end.setHours(WINDOW_END_HOUR, 0, 0, 0);
  const ms = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(ms);
};

const _scheduleRequestAt = (time) => {
  const delay = time.getTime() - Date.now();
  if (delay <= 0) return;
  const timeout = setTimeout(() => {
    generateDemoRequest(time);
  }, delay);
  scheduledTimeouts.push(timeout);
};

const _planDay = (baseDate) => {
  const times = Array.from({ length: DAILY_REQUEST_COUNT }, () => _randomTimeInWindow(baseDate)).sort(
    (a, b) => a - b,
  );

  let scheduledCount = 0;
  times.forEach((time) => {
    if (time.getTime() > Date.now()) {
      _scheduleRequestAt(time);
      scheduledCount += 1;
    }
  });

  logger.info(
    `[demoTraffic] Planned ${scheduledCount}/${DAILY_REQUEST_COUNT} demo requests for ${baseDate.toDateString()}.`,
  );
};

const _msUntilNextPlanningRun = () => {
  const next = new Date();
  next.setHours(PLANNING_HOUR, PLANNING_MINUTE, 0, 0);
  if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
  return next.getTime() - Date.now();
};

const _scheduleDailyPlanning = () => {
  const delay = _msUntilNextPlanningRun();
  setTimeout(() => {
    _clearScheduled();
    _planDay(new Date());
    _scheduleDailyPlanning(); // reschedule itself for the following day
  }, delay);
};

const startDemoTrafficScheduler = () => {
  // Covers whatever slots remain today, including right after a server restart
  // mid-day (any slot already in the past for today is simply skipped).
  _planDay(new Date());
  _scheduleDailyPlanning();
  logger.info("[demoTraffic] Scheduler started.");
};

module.exports = { startDemoTrafficScheduler };
