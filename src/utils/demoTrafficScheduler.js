"use strict";

// Recurring scheduler: every day, ensures exactly 30 demo requests
// (request.model.js isDemo:true) exist for that calendar day, completed at
// random times between 10:00 and 16:00 server time. Re-plans itself daily at
// 00:05 — no external cron dependency needed. Started once from server.js
// after the DB connects.
//
// Tops up rather than blindly re-planning: it counts how many demo requests
// already exist for "today" (completedAt within today's range) and only
// schedules the shortfall. This guarantees the daily total always reaches
// 30 — covering both a mid-day server restart (which previously caused
// already-passed slots to be silently skipped, undercounting the day) and
// multiple restarts in the same day (which would otherwise double-seed).

const Request = require("../models/request.model");
const { generateDemoRequest } = require("../services/demoTraffic.service");
const { logger } = require("./logger.util");

const DAILY_REQUEST_COUNT = 30;
const WINDOW_START_HOUR = 10;
const WINDOW_END_HOUR = 16;
const PLANNING_HOUR = 0;
const PLANNING_MINUTE = 5;
const CATCH_UP_STAGGER_MS = 2000;

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
  const ms =
    start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(ms);
};

const _countDemoRequestsToday = async (baseDate) => {
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(baseDate);
  end.setHours(23, 59, 59, 999);
  return Request.countDocuments({
    isDemo: true,
    completedAt: { $gte: start, $lte: end },
  });
};

const _scheduleRequestAt = (time) => {
  const delay = time.getTime() - Date.now();
  const timeout = setTimeout(
    () => {
      generateDemoRequest(time);
    },
    Math.max(delay, 0),
  );
  scheduledTimeouts.push(timeout);
};

const _planDay = async (baseDate) => {
  const alreadyToday = await _countDemoRequestsToday(baseDate);
  const remaining = DAILY_REQUEST_COUNT - alreadyToday;

  if (remaining <= 0) {
    logger.info(
      `[demoTraffic] ${alreadyToday}/${DAILY_REQUEST_COUNT} demo requests already exist for ${baseDate.toDateString()} — nothing more to plan.`,
    );
    return;
  }

  const times = Array.from({ length: remaining }, () =>
    _randomTimeInWindow(baseDate),
  ).sort((a, b) => a - b);

  let scheduledCount = 0;
  let catchUpCount = 0;

  times.forEach((time) => {
    if (time.getTime() > Date.now()) {
      _scheduleRequestAt(time);
      scheduledCount += 1;
    } else {
      // This slot's randomly chosen time has already passed (e.g. the
      // server started mid-day, after the window opened) — fire it almost
      // immediately instead of skipping it, staggered so catch-up requests
      // don't all hit the DB in the same instant. generateDemoRequest still
      // receives the original planned `time` so the record is backdated
      // correctly (completedAt/createdAt reflect the planned slot, not the
      // moment it actually ran).
      catchUpCount += 1;
      const timeout = setTimeout(
        () => generateDemoRequest(time),
        catchUpCount * CATCH_UP_STAGGER_MS,
      );
      scheduledTimeouts.push(timeout);
    }
  });

  logger.info(
    `[demoTraffic] ${alreadyToday} already done; planned ${scheduledCount} future + ${catchUpCount} catch-up ` +
      `= ${alreadyToday + scheduledCount + catchUpCount}/${DAILY_REQUEST_COUNT} demo requests for ${baseDate.toDateString()}.`,
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
  // Tops up whatever's missing for today, including right after a server
  // restart (mid-day or otherwise) — never re-seeds requests that already
  // exist, and never leaves the day short of the daily target.
  _planDay(new Date());
  _scheduleDailyPlanning();
  logger.info("[demoTraffic] Scheduler started.");
};

module.exports = { startDemoTrafficScheduler };
