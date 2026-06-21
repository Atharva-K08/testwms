"use strict";

/**
 * NagarJal Backend — End-to-End Test Suite
 * ------------------------------------------------------------------------
 * Spawns the real server (node server.js) as a child process, drives it
 * exclusively over HTTP (no in-process shortcuts), and exercises every
 * route group: auth, requests, queue, receipts, diesel fillings, drivers,
 * routes, tankers, attendance, RBAC, validation, and two known race
 * conditions. Writes a full markdown report to resultReport.md.
 *
 * Run:   node testcases.js
 * Target: MONGO_URI from .env — this repo's .env points at the dedicated
 *         "wmstest" database. Do NOT point this at a production database.
 *
 * Exit code 0 = all tests passed, 1 = at least one failure.
 */

const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

// See testDnsPreload.js — fixes mongodb+srv:// SRV lookups on networks where
// Node's resolver gets handed a broken nameserver. Applied here too since the
// demo-traffic test connects to MongoDB directly from this process.
try {
  require("dns").setServers(["8.8.8.8", "1.1.1.1"]);
} catch (_) {}

const ROOT = __dirname;
const PORT = process.env.PORT || 5050; // isolated port for the test run
const BASE_URL = `http://127.0.0.1:${PORT}/api/v1`;
const HEALTH_URL = `http://127.0.0.1:${PORT}/health`;

// ── tiny test runner ──────────────────────────────────────────────────────────

const results = [];
let currentCategory = "";
const ctx = {}; // shared state across tests (tokens, ids, etc.)

function category(name) {
  currentCategory = name;
  console.log(`\n=== ${name} ===`);
}

async function test(name, fn) {
  const startedAt = Date.now();
  try {
    await fn();
    results.push({ category: currentCategory, name, status: "PASS", durationMs: Date.now() - startedAt });
    console.log(`  PASS  ${name}`);
  } catch (err) {
    results.push({
      category: currentCategory,
      name,
      status: "FAIL",
      durationMs: Date.now() - startedAt,
      error: err.message,
    });
    console.log(`  FAIL  ${name}`);
    console.log(`        -> ${err.message}`);
  }
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg || "Assertion failed"} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`);
  }
}
function assertTrue(value, msg) {
  if (!value) throw new Error(msg || "Expected a truthy value");
}
function assertDefined(value, msg) {
  if (value === undefined || value === null) throw new Error(msg || "Expected value to be defined");
}
function assertIncludes(haystack, needle, msg) {
  if (!haystack || !haystack.includes(needle)) {
    throw new Error(`${msg || "Expected substring not found"} (looked for "${needle}" in "${haystack}")`);
  }
}

// ── HTTP helper ────────────────────────────────────────────────────────────────

async function api(method, pathSuffix, { body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${pathSuffix}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch (_) {
    json = null;
  }
  return { status: res.status, body: json };
}

// ── unique test-data generators ────────────────────────────────────────────────

const RUN_ID = Date.now().toString().slice(-6);
let memberSeq = 0;
let driverSeq = 0;
let tankerSeq = 0;
let routeSeq = 0;

const nextMemberMobile = () => `9${RUN_ID}${String((memberSeq += 1)).padStart(3, "0")}`.slice(0, 10);
const nextDriverMobile = () => `8${RUN_ID}${String((driverSeq += 1)).padStart(3, "0")}`.slice(0, 10);
const nextTankerNumber = () => `TST${RUN_ID}${String((tankerSeq += 1)).padStart(2, "0")}`;
const nextRouteTag = () => `RUN-${RUN_ID}-${String((routeSeq += 1)).padStart(2, "0")}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Creates a brand-new tanker + diesel filling, isolated from whatever earlier
// sections left tanker1/tanker2 doing — several earlier tests deliberately
// leave their tanker "on_trip" forever (the request is never completed), so
// reusing shared tankers in later sections is a recipe for false failures.
async function createFreshTanker() {
  const tankerNumber = nextTankerNumber();
  await api("POST", "/tankers", { token: ctx.manager1.token, body: { tankerNumber } });
  await api("POST", "/diesel-fillings", {
    token: ctx.fuelManager1.token,
    body: { tankerNumber, liters: 500, kilometersTravelledSinceLastTrip: 0 },
  });
  const listRes = await api("GET", "/tankers", { token: ctx.manager1.token });
  const tanker = listRes.body.data.find((t) => t.tankerNumber === tankerNumber);
  return { tankerNumber, id: tanker._id };
}

async function createFreshDriver(name) {
  const mobileNumber = nextDriverMobile();
  const res = await api("POST", "/drivers", {
    token: ctx.manager1.token,
    body: { name, permanentAddress: "Fresh Address, Pune", mobileNumber, status: "ACTIVE" },
  });
  return { id: res.body.data._id, name: res.body.data.name, mobileNumber };
}

// ── server lifecycle ──────────────────────────────────────────────────────────

let serverProcess = null;

function startServer() {
  return new Promise((resolve, reject) => {
    serverProcess = spawn(
      process.execPath,
      ["-r", path.join(ROOT, "testDnsPreload.js"), "server.js"],
      {
        cwd: ROOT,
        env: {
          ...process.env,
          PORT: String(PORT),
          // Comprehensive E2E coverage makes well over 100 requests — raise the
          // limiter ceiling for this run only, without touching .env.
          RATE_LIMIT_WINDOW_MS: "60000",
          RATE_LIMIT_MAX: "100000",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    serverProcess.stdout.on("data", (d) => process.stdout.write(`[server] ${d}`));
    serverProcess.stderr.on("data", (d) => process.stderr.write(`[server] ${d}`));
    serverProcess.on("error", reject);
    serverProcess.on("exit", (code) => {
      if (code !== null && code !== 0) {
        console.error(`[server] exited early with code ${code}`);
      }
    });

    resolve();
  });
}

async function waitForHealth(timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(HEALTH_URL);
      if (res.status === 200) return true;
    } catch (_) {
      // server not up yet
    }
    await sleep(300);
  }
  throw new Error(`Server did not become healthy within ${timeoutMs}ms`);
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill("SIGTERM");
  }
}

// ── test suites ────────────────────────────────────────────────────────────────

async function runAuthTests() {
  category("Auth");

  await test("Health check responds 200", async () => {
    const res = await fetch(HEALTH_URL);
    assertEqual(res.status, 200, "Health check status");
  });

  // --- Member registration ---
  ctx.member1 = { mobileNumber: nextMemberMobile(), password: "111111" };
  await test("Register a new member -> 201", async () => {
    const res = await api("POST", "/auth/register", {
      body: {
        mobileNumber: ctx.member1.mobileNumber,
        password: ctx.member1.password,
        profile: {
          name: "Suresh Jadhav",
          societyName: `E2E Society ${RUN_ID}`,
          address: `E2E Address ${RUN_ID}, Pune`,
          contactPerson: "Suresh Jadhav",
        },
      },
    });
    assertEqual(res.status, 201, "register status");
    assertDefined(res.body?.data?.accessToken, "accessToken present");
    ctx.member1.token = res.body.data.accessToken;
    ctx.member1.id = res.body.data.user?._id || res.body.data.user?.id;
  });

  await test("Register with duplicate mobile -> 409", async () => {
    const res = await api("POST", "/auth/register", {
      body: {
        mobileNumber: ctx.member1.mobileNumber,
        password: "222222",
        profile: {
          name: "Dup",
          societyName: "Dup Society",
          address: "Dup Address",
          contactPerson: "Dup",
        },
      },
    });
    assertEqual(res.status, 409, "duplicate register status");
  });

  await test("Register with non-6-digit password -> 422", async () => {
    const res = await api("POST", "/auth/register", {
      body: {
        mobileNumber: nextMemberMobile(),
        password: "abc123",
        profile: {
          name: "Bad Pass",
          societyName: "X",
          address: "X",
          contactPerson: "X",
        },
      },
    });
    assertEqual(res.status, 422, "invalid password register status");
  });

  await test("Login member with correct credentials -> 200", async () => {
    const res = await api("POST", "/auth/login", {
      body: { mobileNumber: ctx.member1.mobileNumber, password: ctx.member1.password },
    });
    assertEqual(res.status, 200, "login status");
    assertDefined(res.body?.data?.accessToken, "accessToken present");
    ctx.member1.refreshToken = res.body.data.refreshToken;
  });

  await test("Login member with wrong password -> 401", async () => {
    const res = await api("POST", "/auth/login", {
      body: { mobileNumber: ctx.member1.mobileNumber, password: "999999" },
    });
    assertEqual(res.status, 401, "wrong password login status");
  });

  await test("Get profile with valid token -> 200", async () => {
    const res = await api("GET", "/auth/profile", { token: ctx.member1.token });
    assertEqual(res.status, 200, "profile status");
    assertEqual(res.body?.data?.user?.role, "member", "role in profile");
  });

  await test("Get profile without token -> 401", async () => {
    const res = await api("GET", "/auth/profile");
    assertEqual(res.status, 401, "no-token profile status");
  });

  await test("Refresh token -> 200 with new tokens", async () => {
    const res = await api("POST", "/auth/refresh", { body: { refreshToken: ctx.member1.refreshToken } });
    assertEqual(res.status, 200, "refresh status");
    assertDefined(res.body?.data?.accessToken, "new accessToken present");
    ctx.member1.token = res.body.data.accessToken;
  });

  await test("Update own password -> 200, then login with new password", async () => {
    const res = await api("PUT", "/auth/password", {
      token: ctx.member1.token,
      body: { oldPassword: ctx.member1.password, newPassword: "333333" },
    });
    assertEqual(res.status, 200, "update password status");
    const loginRes = await api("POST", "/auth/login", {
      body: { mobileNumber: ctx.member1.mobileNumber, password: "333333" },
    });
    assertEqual(loginRes.status, 200, "login with new password status");
    ctx.member1.password = "333333";
    ctx.member1.token = loginRes.body.data.accessToken;
  });

  // --- Super admin bootstrap ---
  // This database may be a long-lived "wmstest" instance with a superAdmin
  // already created by seed.js (password "000000" — see seed.js's
  // seedUsers()) rather than via the bootstrap-on-first-login path (which
  // would use SUPER_ADMIN_DEFAULT_PASSWORD, default "Admin@1234"). Try both,
  // plus the historical "root" default, so the rest of the suite (which
  // needs a superAdmin token to create isolated manager/fuel manager
  // accounts) isn't blocked by whichever path actually created this DB's
  // admin user.
  await test("Super admin bootstrap login -> 200", async () => {
    const username = process.env.SUPER_ADMIN_USERNAME || "admin";
    const candidates = [
      "000000",
      process.env.SUPER_ADMIN_DEFAULT_PASSWORD || "Admin@1234",
      "root",
    ];
    let lastRes = null;
    for (const password of candidates) {
      lastRes = await api("POST", "/auth/login", { body: { username, password } });
      if (lastRes.status === 200) {
        ctx.superAdmin = { token: lastRes.body.data.accessToken };
        return;
      }
    }
    throw new Error(
      `super admin login status (expected 200, got ${lastRes.status}) — tried ${candidates.length} known default passwords for username "${username}"`,
    );
  });

  await test("Member cannot create a manager -> 403", async () => {
    const res = await api("POST", "/auth/create-manager", {
      token: ctx.member1.token,
      body: {
        mobileNumber: nextMemberMobile(),
        password: "444444",
        role: "manager",
        profile: { name: "X", societyName: "X", address: "X", contactPerson: "X" },
      },
    });
    assertEqual(res.status, 403, "member create-manager status");
  });

  ctx.manager1 = { mobileNumber: nextMemberMobile(), password: "555555" };
  await test("Super admin creates a manager -> 201", async () => {
    if (!ctx.superAdmin?.token) throw new Error("Skipped: super admin bootstrap login failed above, no token to act with.");
    const res = await api("POST", "/auth/create-manager", {
      token: ctx.superAdmin.token,
      body: {
        mobileNumber: ctx.manager1.mobileNumber,
        password: ctx.manager1.password,
        role: "manager",
        profile: {
          name: "E2E Manager",
          societyName: "HQ",
          address: "HQ Address",
          contactPerson: "E2E Manager",
        },
      },
    });
    assertEqual(res.status, 201, "create manager status");
  });

  ctx.fuelManager1 = { mobileNumber: nextMemberMobile(), password: "666666" };
  await test("Super admin creates a fuel manager -> 201", async () => {
    if (!ctx.superAdmin?.token) throw new Error("Skipped: super admin bootstrap login failed above, no token to act with.");
    const res = await api("POST", "/auth/create-manager", {
      token: ctx.superAdmin.token,
      body: {
        mobileNumber: ctx.fuelManager1.mobileNumber,
        password: ctx.fuelManager1.password,
        role: "fuelManager",
        profile: {
          name: "E2E Fuel Manager",
          societyName: "Depot",
          address: "Depot Address",
          contactPerson: "E2E Fuel Manager",
        },
      },
    });
    assertEqual(res.status, 201, "create fuel manager status");
  });

  // Fall back to the manager/fuelManager seeded by `npm run seed` (seed.js)
  // if this run couldn't create fresh isolated accounts above — keeps the
  // rest of the suite (which only needs *a* valid manager/fuelManager token)
  // from cascading into unrelated failures on a shared/stale database.
  await test("Manager login -> 200 (freshly created, or seeded fallback)", async () => {
    let res = await api("POST", "/auth/login", {
      body: { mobileNumber: ctx.manager1.mobileNumber, password: ctx.manager1.password },
    });
    if (res.status !== 200) {
      const fallback = { mobileNumber: "9000000001", password: "111111" };
      res = await api("POST", "/auth/login", { body: fallback });
      if (res.status === 200) ctx.manager1 = { ...fallback };
    }
    assertEqual(res.status, 200, "manager login status");
    ctx.manager1.token = res.body.data.accessToken;
  });

  await test("Fuel manager login -> 200 (freshly created, or seeded fallback)", async () => {
    let res = await api("POST", "/auth/login", {
      body: { mobileNumber: ctx.fuelManager1.mobileNumber, password: ctx.fuelManager1.password },
    });
    if (res.status !== 200) {
      const fallback = { mobileNumber: "9000000010", password: "222222" };
      res = await api("POST", "/auth/login", { body: fallback });
      if (res.status === 200) ctx.fuelManager1 = { ...fallback };
    }
    assertEqual(res.status, 200, "fuel manager login status");
    ctx.fuelManager1.token = res.body.data.accessToken;
  });
}

async function runDriverTests() {
  category("Drivers");

  ctx.driver1 = { mobileNumber: nextDriverMobile() };
  await test("Manager creates a driver -> 201 with auto serial number", async () => {
    const res = await api("POST", "/drivers", {
      token: ctx.manager1.token,
      body: {
        name: "E2E Driver One",
        permanentAddress: "Permanent Address, Pune",
        temporaryAddress: "",
        mobileNumber: ctx.driver1.mobileNumber,
        status: "ACTIVE",
      },
    });
    assertEqual(res.status, 201, "create driver status");
    assertDefined(res.body?.data?.serialNumber, "serialNumber assigned");
    ctx.driver1.id = res.body.data._id;
    ctx.driver1.serialNumber = res.body.data.serialNumber;
    ctx.driver1.name = res.body.data.name;
  });

  ctx.driver2 = { mobileNumber: nextDriverMobile() };
  await test("Manager creates a second driver -> 201", async () => {
    const res = await api("POST", "/drivers", {
      token: ctx.manager1.token,
      body: {
        name: "E2E Driver Two",
        permanentAddress: "Permanent Address 2, Pune",
        mobileNumber: ctx.driver2.mobileNumber,
        status: "ACTIVE",
      },
    });
    assertEqual(res.status, 201, "create second driver status");
    ctx.driver2.id = res.body.data._id;
    ctx.driver2.name = res.body.data.name;
  });

  ctx.driverBlocked = { mobileNumber: nextDriverMobile() };
  await test("Manager creates a BLOCK-status driver -> 201", async () => {
    const res = await api("POST", "/drivers", {
      token: ctx.manager1.token,
      body: {
        name: "E2E Blocked Driver",
        permanentAddress: "Blocked Address",
        mobileNumber: ctx.driverBlocked.mobileNumber,
        status: "BLOCK",
      },
    });
    assertEqual(res.status, 201, "create blocked driver status");
    ctx.driverBlocked.id = res.body.data._id;
  });

  await test("Create driver with duplicate mobile -> 409", async () => {
    const res = await api("POST", "/drivers", {
      token: ctx.manager1.token,
      body: {
        name: "Dup Driver",
        permanentAddress: "X",
        mobileNumber: ctx.driver1.mobileNumber,
        status: "ACTIVE",
      },
    });
    assertEqual(res.status, 409, "duplicate driver mobile status");
  });

  await test("Member cannot create a driver -> 403", async () => {
    const res = await api("POST", "/drivers", {
      token: ctx.member1.token,
      body: { name: "X", permanentAddress: "X", mobileNumber: nextDriverMobile(), status: "ACTIVE" },
    });
    assertEqual(res.status, 403, "member create driver status");
  });

  await test("Get all drivers -> 200 paginated", async () => {
    const res = await api("GET", "/drivers?limit=100", { token: ctx.manager1.token });
    assertEqual(res.status, 200, "get drivers status");
    assertTrue(Array.isArray(res.body?.data), "drivers data is array");
    assertTrue(res.body.data.some((d) => d._id === ctx.driver1.id), "driver1 present in list");
  });

  await test("Get driver by id -> 200", async () => {
    const res = await api("GET", `/drivers/${ctx.driver1.id}`, { token: ctx.manager1.token });
    assertEqual(res.status, 200, "get driver by id status");
    assertEqual(res.body?.data?._id, ctx.driver1.id, "driver id matches");
  });

  await test("Get driver by serial number -> 200", async () => {
    const res = await api("GET", `/drivers/serial/${ctx.driver1.serialNumber}`, { token: ctx.manager1.token });
    assertEqual(res.status, 200, "get driver by serial status");
    assertEqual(res.body?.data?._id, ctx.driver1.id, "driver id matches serial lookup");
  });

  await test("Update driver -> 200", async () => {
    const res = await api("PUT", `/drivers/${ctx.driver2.id}`, {
      token: ctx.manager1.token,
      body: { temporaryAddress: "Updated Temp Address" },
    });
    assertEqual(res.status, 200, "update driver status");
    assertEqual(res.body?.data?.temporaryAddress, "Updated Temp Address", "temp address updated");
  });

  ctx.driverToDelete = { mobileNumber: nextDriverMobile() };
  await test("Soft-delete a driver -> excluded from subsequent list", async () => {
    const createRes = await api("POST", "/drivers", {
      token: ctx.manager1.token,
      body: { name: "Disposable Driver", permanentAddress: "X", mobileNumber: ctx.driverToDelete.mobileNumber, status: "ACTIVE" },
    });
    ctx.driverToDelete.id = createRes.body.data._id;

    const delRes = await api("DELETE", `/drivers/${ctx.driverToDelete.id}`, { token: ctx.manager1.token });
    assertEqual(delRes.status, 200, "delete driver status");

    const getRes = await api("GET", `/drivers/${ctx.driverToDelete.id}`, { token: ctx.manager1.token });
    assertEqual(getRes.status, 404, "soft-deleted driver no longer retrievable");
  });
}

async function runTankerTests() {
  category("Tankers");

  ctx.tanker1 = { tankerNumber: nextTankerNumber() };
  await test("Add a tanker -> 201", async () => {
    const res = await api("POST", "/tankers", { token: ctx.manager1.token, body: { tankerNumber: ctx.tanker1.tankerNumber } });
    assertEqual(res.status, 201, "add tanker status");
    assertEqual(res.body?.data?.currentStatus, "available", "new tanker is available");
    ctx.tanker1.id = res.body.data._id;
  });

  ctx.tanker2 = { tankerNumber: nextTankerNumber() };
  await test("Add a second tanker -> 201 (will be used for handover)", async () => {
    const res = await api("POST", "/tankers", { token: ctx.manager1.token, body: { tankerNumber: ctx.tanker2.tankerNumber } });
    assertEqual(res.status, 201, "add second tanker status");
    ctx.tanker2.id = res.body.data._id;
  });

  ctx.tankerNoFuel = { tankerNumber: nextTankerNumber() };
  await test("Add a third tanker (deliberately never fuelled) -> 201", async () => {
    const res = await api("POST", "/tankers", { token: ctx.manager1.token, body: { tankerNumber: ctx.tankerNoFuel.tankerNumber } });
    assertEqual(res.status, 201, "add third tanker status");
    ctx.tankerNoFuel.id = res.body.data._id;
  });

  await test("Add duplicate tanker number -> 409", async () => {
    const res = await api("POST", "/tankers", { token: ctx.manager1.token, body: { tankerNumber: ctx.tanker1.tankerNumber } });
    assertEqual(res.status, 409, "duplicate tanker status");
  });

  await test("Member cannot add a tanker -> 403", async () => {
    const res = await api("POST", "/tankers", { token: ctx.member1.token, body: { tankerNumber: nextTankerNumber() } });
    assertEqual(res.status, 403, "member add tanker status");
  });

  await test("Get all tankers -> 200", async () => {
    const res = await api("GET", "/tankers", { token: ctx.manager1.token });
    assertEqual(res.status, 200, "get tankers status");
    assertTrue(res.body.data.some((t) => t.tankerNumber === ctx.tanker1.tankerNumber), "tanker1 present");
  });
}

async function runRouteTests() {
  category("Routes (source/destination)");

  ctx.route1 = { source: `Filling Station ${nextRouteTag()}`, destination: `Society ${nextRouteTag()}`, distanceInKm: 5.4 };
  await test("Manager creates a route -> 201", async () => {
    const res = await api("POST", "/routes", { token: ctx.manager1.token, body: ctx.route1 });
    assertEqual(res.status, 201, "create route status");
    ctx.route1.id = res.body.data._id;
  });

  await test("Fuel manager cannot create a route -> 403", async () => {
    const res = await api("POST", "/routes", {
      token: ctx.fuelManager1.token,
      body: { source: "X", destination: "Y", distanceInKm: 1 },
    });
    assertEqual(res.status, 403, "fuel manager create route status");
  });

  await test("Get all routes -> 200", async () => {
    const res = await api("GET", "/routes", { token: ctx.fuelManager1.token });
    assertEqual(res.status, 200, "get routes status");
    assertTrue(res.body.data.some((r) => r._id === ctx.route1.id), "route1 present");
  });

  await test("Get route by destination name -> 200", async () => {
    const res = await api("GET", `/routes/destination/${encodeURIComponent(ctx.route1.destination)}`, { token: ctx.manager1.token });
    assertEqual(res.status, 200, "get route by destination status");
    assertEqual(res.body?.data?.destination, ctx.route1.destination, "destination matches");
  });

  await test("Update route -> 200", async () => {
    const res = await api("PUT", `/routes/${ctx.route1.id}`, { token: ctx.manager1.token, body: { distanceInKm: 6.1 } });
    assertEqual(res.status, 200, "update route status");
    assertEqual(res.body?.data?.distanceInKm, 6.1, "distance updated");
  });

  await test("Delete route -> 200", async () => {
    const res = await api("DELETE", `/routes/${ctx.route1.id}`, { token: ctx.manager1.token });
    assertEqual(res.status, 200, "delete route status");
  });
}

async function runDieselTests() {
  category("Diesel Fillings");

  await test("Fuel manager records a filling for tanker1 -> 201, 0 trips so far", async () => {
    const res = await api("POST", "/diesel-fillings", {
      token: ctx.fuelManager1.token,
      body: { tankerNumber: ctx.tanker1.tankerNumber, liters: 800, kilometersTravelledSinceLastTrip: 0 },
    });
    assertEqual(res.status, 201, "record filling status");
    assertEqual(res.body?.data?.tripsSinceLastFill, 0, "no prior trips");
    ctx.filling1 = { id: res.body.data._id };
  });

  await test("Fuel manager records a filling for tanker2 (handover target) -> 201", async () => {
    const res = await api("POST", "/diesel-fillings", {
      token: ctx.fuelManager1.token,
      body: { tankerNumber: ctx.tanker2.tankerNumber, liters: 750, kilometersTravelledSinceLastTrip: 0 },
    });
    assertEqual(res.status, 201, "record filling for tanker2 status");
  });

  await test("Member cannot record a diesel filling -> 403", async () => {
    const res = await api("POST", "/diesel-fillings", {
      token: ctx.member1.token,
      body: { tankerNumber: ctx.tanker1.tankerNumber, liters: 100, kilometersTravelledSinceLastTrip: 0 },
    });
    assertEqual(res.status, 403, "member record filling status");
  });

  await test("Manager (read-only role here) cannot record a diesel filling -> 403", async () => {
    const res = await api("POST", "/diesel-fillings", {
      token: ctx.manager1.token,
      body: { tankerNumber: ctx.tanker1.tankerNumber, liters: 100, kilometersTravelledSinceLastTrip: 0 },
    });
    assertEqual(res.status, 403, "manager record filling status");
  });

  await test("Get all diesel fillings -> 200 paginated", async () => {
    const res = await api("GET", "/diesel-fillings?limit=100", { token: ctx.fuelManager1.token });
    assertEqual(res.status, 200, "get fillings status");
    assertTrue(Array.isArray(res.body?.data), "fillings data is array");
  });

  await test("Get diesel filling by id -> 200", async () => {
    const res = await api("GET", `/diesel-fillings/${ctx.filling1.id}`, { token: ctx.fuelManager1.token });
    assertEqual(res.status, 200, "get filling by id status");
  });

  await test("Update diesel filling -> 200", async () => {
    const res = await api("PUT", `/diesel-fillings/${ctx.filling1.id}`, {
      token: ctx.fuelManager1.token,
      body: { liters: 820 },
    });
    assertEqual(res.status, 200, "update filling status");
    assertEqual(res.body?.data?.liters, 820, "liters updated");
  });

  await test("Mark filling as wrong -> 200", async () => {
    const res = await api("PUT", `/diesel-fillings/${ctx.filling1.id}/wrong`, {
      token: ctx.fuelManager1.token,
      body: { reason: "Entered liters incorrectly" },
    });
    assertEqual(res.status, 200, "mark wrong status");
    assertEqual(res.body?.data?.status, "wrong", "status is wrong");
  });

  await test("Marking an already-wrong filling again -> 400", async () => {
    const res = await api("PUT", `/diesel-fillings/${ctx.filling1.id}/wrong`, {
      token: ctx.fuelManager1.token,
      body: { reason: "Again" },
    });
    assertEqual(res.status, 400, "double mark-wrong status");
  });

  await test("Super admin views wrong entries -> 200, includes filling1", async () => {
    const res = await api("GET", "/diesel-fillings/wrong-entries", { token: ctx.superAdmin.token });
    assertEqual(res.status, 200, "get wrong entries status");
    assertTrue(res.body.data.some((f) => f._id === ctx.filling1.id), "filling1 present in wrong entries");
  });

  await test("Fuel manager cannot view wrong entries (superAdmin only) -> 403", async () => {
    const res = await api("GET", "/diesel-fillings/wrong-entries", { token: ctx.fuelManager1.token });
    assertEqual(res.status, 403, "fuel manager wrong entries status");
  });

  await test("Generate diesel report -> 200", async () => {
    const res = await api("GET", "/diesel-fillings/report?limit=100", { token: ctx.manager1.token });
    assertEqual(res.status, 200, "diesel report status");
  });

  await test("Get tanker diesel summary -> 200", async () => {
    const res = await api("GET", `/diesel-fillings/summary/${ctx.tanker1.tankerNumber}`, { token: ctx.fuelManager1.token });
    assertEqual(res.status, 200, "tanker summary status");
    assertEqual(res.body?.data?.tankerNumber, ctx.tanker1.tankerNumber, "summary tanker matches");
  });

  await test("Delete diesel filling -> 200", async () => {
    const res = await api("DELETE", `/diesel-fillings/${ctx.filling1.id}`, { token: ctx.fuelManager1.token });
    assertEqual(res.status, 200, "delete filling status");
  });

  // Re-add a clean filling for tanker1 so the assignment tests below have an
  // eligible (fuelled) tanker again.
  await test("Re-record a valid filling for tanker1 (setup for assignment tests)", async () => {
    const res = await api("POST", "/diesel-fillings", {
      token: ctx.fuelManager1.token,
      body: { tankerNumber: ctx.tanker1.tankerNumber, liters: 900, kilometersTravelledSinceLastTrip: 0 },
    });
    assertEqual(res.status, 201, "re-record filling status");
  });
}

async function runRequestLifecycleTests() {
  category("Request Lifecycle: submit -> assign -> route -> complete -> receipt");

  await test("Member submits a water tanker request -> 201 with queue position", async () => {
    const res = await api("POST", "/requests", { token: ctx.member1.token, body: { notes: "E2E test request" } });
    assertEqual(res.status, 201, "submit request status");
    assertDefined(res.body?.data?.request?.queuePosition, "queuePosition assigned");
    assertEqual(res.body?.data?.request?.status, "pending", "status is pending");
    ctx.request1 = { id: res.body.data.request._id, queuePosition: res.body.data.request.queuePosition };
  });

  await test("Member views own requests -> 200, includes request1", async () => {
    const res = await api("GET", "/requests/my", { token: ctx.member1.token });
    assertEqual(res.status, 200, "get my requests status");
    assertTrue(res.body.data.some((r) => r._id === ctx.request1.id), "request1 present");
  });

  await test("Member cannot view the manager queue -> 403", async () => {
    const res = await api("GET", "/queue", { token: ctx.member1.token });
    assertEqual(res.status, 403, "member queue access status");
  });

  await test("Manager views the queue -> 200, includes request1", async () => {
    const res = await api("GET", "/queue?limit=100", { token: ctx.manager1.token });
    assertEqual(res.status, 200, "get queue status");
    assertTrue(res.body.data.some((r) => r._id === ctx.request1.id), "request1 present in queue");
  });

  await test("Manager peeks next in queue -> 200", async () => {
    const res = await api("GET", "/queue/next", { token: ctx.manager1.token });
    assertEqual(res.status, 200, "peek next status");
  });

  await test("Assigning an un-fuelled tanker is rejected -> 422", async () => {
    const res = await api("PATCH", `/queue/${ctx.request1.id}/assign`, {
      token: ctx.manager1.token,
      body: { tankerNumber: ctx.tankerNoFuel.tankerNumber, driverId: ctx.driver1.id, dateTime: new Date().toISOString() },
    });
    assertEqual(res.status, 422, "unfuelled tanker assign status");
  });

  await test("Assigning a blocked driver is rejected -> 422", async () => {
    const res = await api("PATCH", `/queue/${ctx.request1.id}/assign`, {
      token: ctx.manager1.token,
      body: { tankerNumber: ctx.tanker1.tankerNumber, driverId: ctx.driverBlocked.id, dateTime: new Date().toISOString() },
    });
    assertEqual(res.status, 422, "blocked driver assign status");
  });

  await test("Assign tanker + driver to request1 -> 200, both locked on_trip", async () => {
    const res = await api("PATCH", `/queue/${ctx.request1.id}/assign`, {
      token: ctx.manager1.token,
      body: { tankerNumber: ctx.tanker1.tankerNumber, driverId: ctx.driver1.id, dateTime: new Date().toISOString() },
    });
    assertEqual(res.status, 200, "assign tanker status");
    assertEqual(res.body?.data?.request?.tankerAssignment?.tankerNumber, ctx.tanker1.tankerNumber, "tanker assigned");

    const tankersRes = await api("GET", "/tankers", { token: ctx.manager1.token });
    const tanker = tankersRes.body.data.find((t) => t._id === ctx.tanker1.id);
    assertEqual(tanker.currentStatus, "on_trip", "tanker locked on_trip");
  });

  await test("Assigning the same (now-busy) tanker to a second request -> 409", async () => {
    const submitRes = await api("POST", "/requests", { token: ctx.member1.token, body: { notes: "second" } });
    ctx.request2 = { id: submitRes.body.data.request._id };
    const res = await api("PATCH", `/queue/${ctx.request2.id}/assign`, {
      token: ctx.manager1.token,
      body: { tankerNumber: ctx.tanker1.tankerNumber, driverId: ctx.driver2.id, dateTime: new Date().toISOString() },
    });
    assertEqual(res.status, 409, "busy tanker assign status");
  });

  await test("Cannot set source/destination before a tanker is assigned -> 422", async () => {
    const res = await api("PATCH", `/queue/${ctx.request2.id}/assign-source-destination`, {
      token: ctx.manager1.token,
      body: { source: "A", destination: "B", kilometers: 1 },
    });
    assertEqual(res.status, 422, "route before assign status");
  });

  await test("Cannot complete request1 before source/destination/km are set -> 422", async () => {
    const res = await api("PATCH", `/queue/${ctx.request1.id}/complete`, { token: ctx.manager1.token });
    assertEqual(res.status, 422, "complete before route status");
  });

  await test("Assign source/destination/km to request1 -> 200, round-trip auto-doubled", async () => {
    const res = await api("PATCH", `/queue/${ctx.request1.id}/assign-source-destination`, {
      token: ctx.manager1.token,
      body: { source: "Filling Station", destination: "E2E Society", kilometers: 4.5 },
    });
    assertEqual(res.status, 200, "assign route status");
    assertEqual(res.body?.data?.request?.kilometer, 4.5, "one-way km stored as sent");
    assertEqual(res.body?.data?.request?.roundTripKilometer, 9, "round trip is double one-way");
  });

  await test("Complete request1 -> 200, tanker + driver freed back to available", async () => {
    const res = await api("PATCH", `/queue/${ctx.request1.id}/complete`, { token: ctx.manager1.token });
    assertEqual(res.status, 200, "complete request status");
    assertEqual(res.body?.data?.request?.status, "completed", "status completed");

    const tankersRes = await api("GET", "/tankers", { token: ctx.manager1.token });
    const tanker = tankersRes.body.data.find((t) => t._id === ctx.tanker1.id);
    assertEqual(tanker.currentStatus, "available", "tanker freed after completion");

    const driversRes = await api("GET", "/drivers?limit=100", { token: ctx.manager1.token });
    const driver = driversRes.body.data.find((d) => d._id === ctx.driver1.id);
    assertEqual(driver.currentStatus, "available", "driver freed after completion");
  });

  await test("Now the second request can take the freed tanker -> 200", async () => {
    const res = await api("PATCH", `/queue/${ctx.request2.id}/assign`, {
      token: ctx.manager1.token,
      body: { tankerNumber: ctx.tanker1.tankerNumber, driverId: ctx.driver2.id, dateTime: new Date().toISOString() },
    });
    assertEqual(res.status, 200, "reassign freed tanker status");
  });

  await test("Generate a receipt for request1 -> 201 with WTR-formatted number", async () => {
    const res = await api("POST", `/receipts/request/${ctx.request1.id}`, { token: ctx.manager1.token });
    assertEqual(res.status, 201, "generate receipt status");
    assertIncludes(res.body?.data?.receipt?.receiptNumber, "WTR-", "receipt number format");
    ctx.receipt1 = { id: res.body.data.receipt._id, number: res.body.data.receipt.receiptNumber };
  });

  await test("Generating the same receipt again is idempotent -> same receipt number", async () => {
    const res = await api("POST", `/receipts/request/${ctx.request1.id}`, { token: ctx.manager1.token });
    assertTrue(res.status === 200 || res.status === 201, "idempotent receipt status");
    assertEqual(res.body?.data?.receipt?.receiptNumber, ctx.receipt1.number, "same receipt number returned");
  });

  await test("Fetch receipt by request id -> 200", async () => {
    const res = await api("GET", `/receipts/request/${ctx.request1.id}`, { token: ctx.manager1.token });
    assertEqual(res.status, 200, "get receipt by request status");
  });

  await test("Mark receipt as printed -> 200, printCount incremented", async () => {
    const res = await api("PATCH", `/receipts/${ctx.receipt1.id}/printed`, { token: ctx.manager1.token });
    assertEqual(res.status, 200, "mark printed status");
    assertEqual(res.body?.data?.receipt?.printCount, 1, "print count is 1");
  });

  await test("Get all receipts -> 200, includes receipt1", async () => {
    const res = await api("GET", "/receipts?limit=100", { token: ctx.manager1.token });
    assertEqual(res.status, 200, "get all receipts status");
    assertTrue(res.body.data.some((r) => r._id === ctx.receipt1.id), "receipt1 present");
  });

  await test("Driver attendance shows the completed trip -> 200", async () => {
    const res = await api("GET", `/attendance/driver/${ctx.driver1.id}`, { token: ctx.manager1.token });
    assertEqual(res.status, 200, "driver attendance status");
    assertTrue(res.body?.data?.totalTrips >= 1, "at least one trip recorded");
  });
}

async function runHandoverTests() {
  category("Handover");

  // Dedicated tankers/drivers — never shared with earlier sections, several of
  // which intentionally leave tanker1/driver1/driver2 permanently "on_trip".
  const tankerA = await createFreshTanker();
  const tankerB = await createFreshTanker();
  const driverA = await createFreshDriver("E2E Handover Driver A");
  const driverB = await createFreshDriver("E2E Handover Driver B");

  await test("Submit + assign a request, then hand it over to a different tanker/driver with a reason -> 200", async () => {
    const submitRes = await api("POST", "/requests", { token: ctx.member1.token, body: { notes: "handover test" } });
    const requestId = submitRes.body.data.request._id;

    const assignRes = await api("PATCH", `/queue/${requestId}/assign`, {
      token: ctx.manager1.token,
      body: { tankerNumber: tankerA.tankerNumber, driverId: driverA.id, dateTime: new Date().toISOString() },
    });
    assertEqual(assignRes.status, 200, "initial assign for handover status");

    const handoverRes = await api("PATCH", `/queue/${requestId}/handover`, {
      token: ctx.manager1.token,
      body: {
        tankerNumber: tankerB.tankerNumber,
        driverId: driverB.id,
        dateTime: new Date().toISOString(),
        reason: "Original tanker broke down en route",
      },
    });
    assertEqual(handoverRes.status, 200, "handover status");
    const updated = handoverRes.body.data.request;
    assertEqual(updated.tankerAssignment.tankerNumber, tankerB.tankerNumber, "new tanker assigned after handover");
    assertEqual(updated.handoverHistory.length, 1, "handover history has one entry");
    assertEqual(updated.handoverHistory[0].fromTankerNumber, tankerA.tankerNumber, "history records old tanker");
    assertEqual(updated.handoverHistory[0].reason, "Original tanker broke down en route", "reason recorded");

    // old tanker (tankerA) should now be free again
    const tankersRes = await api("GET", "/tankers", { token: ctx.manager1.token });
    const oldTanker = tankersRes.body.data.find((t) => t._id === tankerA.id);
    assertEqual(oldTanker.currentStatus, "available", "old tanker freed after handover");

    ctx.handoverRequestId = requestId;
    ctx.handoverTankerA = tankerA;
    ctx.handoverDriverA = driverA;
  });

  await test("Handover without a reason is rejected -> 422", async () => {
    const res = await api("PATCH", `/queue/${ctx.handoverRequestId}/handover`, {
      token: ctx.manager1.token,
      body: { tankerNumber: ctx.handoverTankerA.tankerNumber, driverId: ctx.handoverDriverA.id, dateTime: new Date().toISOString() },
    });
    assertEqual(res.status, 422, "handover missing reason status");
  });

  await test("Receipt generated before a handover picks up the new tanker/driver afterward", async () => {
    // Generate a receipt while the request still holds tankerB (current
    // assignment from the test above) — generateReceipt has no status
    // restriction, so this is allowed even though the request is still
    // pending, mirroring a manager who prints a receipt before delivery.
    const firstReceiptRes = await api("POST", `/receipts/request/${ctx.handoverRequestId}`, {
      token: ctx.manager1.token,
    });
    assertEqual(firstReceiptRes.status, 201, "pre-handover receipt generation status");
    assertEqual(
      firstReceiptRes.body.data.receipt.tankerNumber,
      tankerB.tankerNumber,
      "receipt initially shows tankerB",
    );

    // A second breakdown — hand the same request over again, to a third pair.
    const tankerC = await createFreshTanker();
    const driverC = await createFreshDriver("E2E Handover Driver C");
    const secondHandoverRes = await api("PATCH", `/queue/${ctx.handoverRequestId}/handover`, {
      token: ctx.manager1.token,
      body: {
        tankerNumber: tankerC.tankerNumber,
        driverId: driverC.id,
        dateTime: new Date().toISOString(),
        reason: "Second tanker also broke down",
      },
    });
    assertEqual(secondHandoverRes.status, 200, "second handover status");

    // Re-fetching the receipt must now reflect tankerC/driverC, not the
    // stale tankerB snapshot from when it was first generated.
    const refetchedRes = await api("GET", `/receipts/request/${ctx.handoverRequestId}`, {
      token: ctx.manager1.token,
    });
    assertEqual(refetchedRes.status, 200, "refetch receipt status");
    assertEqual(
      refetchedRes.body.data.receipt.tankerNumber,
      tankerC.tankerNumber,
      "receipt synced to tankerC after second handover",
    );
    assertEqual(
      refetchedRes.body.data.receipt.driverName,
      driverC.name,
      "receipt synced to driverC after second handover",
    );

    // Calling generateReceipt again (idempotent path) must also return the
    // synced version, not the originally-cached tankerB snapshot.
    const regenRes = await api("POST", `/receipts/request/${ctx.handoverRequestId}`, {
      token: ctx.manager1.token,
    });
    assertEqual(
      regenRes.body.data.receipt.tankerNumber,
      tankerC.tankerNumber,
      "idempotent generateReceipt also returns the synced tankerC",
    );
  });
}

async function runCancelTests() {
  category("Cancel");

  await test("Member cancels their own pending request -> 200", async () => {
    const submitRes = await api("POST", "/requests", { token: ctx.member1.token, body: { notes: "to cancel" } });
    const requestId = submitRes.body.data.request._id;
    const res = await api("PATCH", `/requests/${requestId}/cancel`, {
      token: ctx.member1.token,
      body: { cancelReason: "Changed my mind" },
    });
    assertEqual(res.status, 200, "member cancel status");
    assertEqual(res.body?.data?.request?.status, "cancelled", "status cancelled");
  });

  await test("Cancelling an already-cancelled request again -> 404", async () => {
    const submitRes = await api("POST", "/requests", { token: ctx.member1.token, body: {} });
    const requestId = submitRes.body.data.request._id;
    await api("PATCH", `/requests/${requestId}/cancel`, { token: ctx.member1.token, body: {} });
    const res = await api("PATCH", `/requests/${requestId}/cancel`, { token: ctx.member1.token, body: {} });
    assertEqual(res.status, 404, "double cancel status");
  });

  await test("Manager cancels a tanker-assigned request -> frees tanker + driver", async () => {
    // Dedicated tanker + driver — earlier sections leave their shared tanker1/
    // driver1 permanently "on_trip", so this must not reuse them.
    const tanker = await createFreshTanker();
    const driver = await createFreshDriver("E2E Cancel-Assigned Driver");

    const submitRes = await api("POST", "/requests", { token: ctx.member1.token, body: {} });
    const requestId = submitRes.body.data.request._id;
    const assignRes = await api("PATCH", `/queue/${requestId}/assign`, {
      token: ctx.manager1.token,
      body: { tankerNumber: tanker.tankerNumber, driverId: driver.id, dateTime: new Date().toISOString() },
    });
    assertEqual(assignRes.status, 200, "setup assign before cancel status");

    const res = await api("PATCH", `/requests/${requestId}/cancel`, {
      token: ctx.manager1.token,
      body: { cancelReason: "Manager cancelled" },
    });
    assertEqual(res.status, 200, "manager cancel assigned request status");

    const tankersRes = await api("GET", "/tankers", { token: ctx.manager1.token });
    const refreshedTanker = tankersRes.body.data.find((t) => t._id === tanker.id);
    assertEqual(refreshedTanker.currentStatus, "available", "tanker freed after cancel");
  });

  await test("Get cancelled requests list -> 200", async () => {
    const res = await api("GET", "/requests/cancelled?limit=100", { token: ctx.manager1.token });
    assertEqual(res.status, 200, "get cancelled requests status");
    assertTrue(res.body.data.length > 0, "at least one cancelled request");
  });
}

async function runReportTests() {
  category("Reports");

  await test("Manager report -> 200 with summary counts", async () => {
    const res = await api("GET", "/queue/report", { token: ctx.manager1.token });
    assertEqual(res.status, 200, "manager report status");
    assertDefined(res.body?.meta?.summary, "summary present");
    assertTrue(res.body.meta.summary.total >= 1, "summary total non-zero");
  });
}

async function runValidationAndRbacTests() {
  category("Validation & RBAC edge cases");

  await test("Invalid MongoId in param -> 400/422/404 (not a 500)", async () => {
    const res = await api("GET", "/requests/not-a-valid-id", { token: ctx.manager1.token });
    assertTrue([400, 404, 422].includes(res.status), `expected client error, got ${res.status}`);
  });

  await test("Assign-source-destination with kilometers below minimum -> 422", async () => {
    const submitRes = await api("POST", "/requests", { token: ctx.member1.token, body: {} });
    const requestId = submitRes.body.data.request._id;
    await api("PATCH", `/queue/${requestId}/assign`, {
      token: ctx.manager1.token,
      body: { tankerNumber: ctx.tanker1.tankerNumber, driverId: ctx.driver1.id, dateTime: new Date().toISOString() },
    });
    const res = await api("PATCH", `/queue/${requestId}/assign-source-destination`, {
      token: ctx.manager1.token,
      body: { source: "A", destination: "B", kilometers: 0.01 },
    });
    assertEqual(res.status, 422, "kilometers below minimum status");
    // cleanup: complete this leftover assignment's tanker lock isn't required for wmstest, left as-is.
  });

  await test("Fuel manager cannot access driver management -> 403", async () => {
    const res = await api("GET", "/drivers", { token: ctx.fuelManager1.token });
    assertEqual(res.status, 403, "fuel manager drivers access status");
  });

  await test("Request without auth token -> 401", async () => {
    const res = await api("GET", "/requests/my");
    assertEqual(res.status, 401, "no token status");
  });

  await test("Malformed Authorization header -> 401", async () => {
    const res = await fetch(`${BASE_URL}/auth/profile`, { headers: { Authorization: "NotBearer abc" } });
    assertEqual(res.status, 401, "malformed auth header status");
  });
}

async function runConcurrencyTests() {
  category("Concurrency (race-condition checks)");

  await test("Two simultaneous request submissions get unique queue positions", async () => {
    const [r1, r2] = await Promise.all([
      api("POST", "/requests", { token: ctx.member1.token, body: { notes: "concurrent A" } }),
      api("POST", "/requests", { token: ctx.member1.token, body: { notes: "concurrent B" } }),
    ]);
    assertEqual(r1.status, 201, "concurrent submit A status");
    assertEqual(r2.status, 201, "concurrent submit B status");
    const posA = r1.body.data.request.queuePosition;
    const posB = r2.body.data.request.queuePosition;
    if (posA === posB) {
      throw new Error(
        `Race condition reproduced: both concurrent submissions received queuePosition ${posA}. ` +
          `getNextQueuePosition() (queue.service.js) is read-then-write, not atomic.`,
      );
    }
  });

  await test("Two simultaneous assigns of the SAME tanker to two different pending requests — at most one should win", async () => {
    const tankerNumber = nextTankerNumber();
    await api("POST", "/tankers", { token: ctx.manager1.token, body: { tankerNumber } });
    await api("POST", "/diesel-fillings", {
      token: ctx.fuelManager1.token,
      body: { tankerNumber, liters: 500, kilometersTravelledSinceLastTrip: 0 },
    });

    const [s1, s2] = await Promise.all([
      api("POST", "/requests", { token: ctx.member1.token, body: { notes: "race A" } }),
      api("POST", "/requests", { token: ctx.member1.token, body: { notes: "race B" } }),
    ]);
    const reqA = s1.body.data.request._id;
    const reqB = s2.body.data.request._id;

    const [a1, a2] = await Promise.all([
      api("PATCH", `/queue/${reqA}/assign`, {
        token: ctx.manager1.token,
        body: { tankerNumber, driverId: ctx.driver1.id, dateTime: new Date().toISOString() },
      }),
      api("PATCH", `/queue/${reqB}/assign`, {
        token: ctx.manager1.token,
        body: { tankerNumber, driverId: ctx.driver2.id, dateTime: new Date().toISOString() },
      }),
    ]);

    const successCount = [a1, a2].filter((r) => r.status === 200).length;
    if (successCount > 1) {
      throw new Error(
        `Race condition reproduced: tanker ${tankerNumber} was assigned to both request ${reqA} and ${reqB} ` +
          `simultaneously. assignTanker() (queue.service.js) checks tanker.currentStatus before locking it, ` +
          `leaving a read-then-write gap.`,
      );
    }
    assertEqual(successCount, 1, "exactly one concurrent assign should succeed");
  });
}

async function runDemoTrafficTest() {
  category("Demo Traffic Generator (direct service test)");

  await test("generateDemoRequest() creates a tagged, completed request without disturbing the live queue", async () => {
    // Imported lazily so this process's own mongoose connection (separate from
    // the spawned server's) is only opened if this test actually runs.
    const mongoose = require("mongoose");
    require("dotenv").config({ path: path.join(ROOT, ".env") });
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }
    const { generateDemoRequest } = require("./src/services/demoTraffic.service");
    const Request = require("./src/models/request.model");

    const pendingCountBefore = await Request.countDocuments({ status: "pending" });
    const demoRequest = await generateDemoRequest(new Date());

    if (!demoRequest) {
      throw new Error(
        "generateDemoRequest() returned null — likely no eligible member/tanker(with fuel)/driver existed yet. " +
          "This is expected on a brand-new empty database; re-run after the suite above has created test data.",
      );
    }
    assertEqual(demoRequest.isDemo, true, "isDemo flag set");
    assertEqual(demoRequest.status, "completed", "demo request created already completed");

    const pendingCountAfter = await Request.countDocuments({ status: "pending" });
    assertEqual(pendingCountAfter, pendingCountBefore, "live pending queue count unchanged");

    await mongoose.disconnect();
  });
}

// ── report generation ──────────────────────────────────────────────────────────

function generateReport() {
  const total = results.length;
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = total - passed;
  const passRate = total ? ((passed / total) * 100).toFixed(1) : "0.0";

  const categories = [...new Set(results.map((r) => r.category))];

  let md = `# NagarJal Backend — End-to-End Test Result Report\n\n`;
  md += `**Run date:** ${new Date().toISOString()}\n`;
  md += `**Target:** \`${BASE_URL}\` (server spawned from \`server.js\`, MONGO_URI from \`.env\` — \`wmstest\` database)\n`;
  md += `**Test script:** \`testcases.js\`\n`;
  md += `**Scope:** Backend REST API only (auth, requests, queue, receipts, diesel fillings, drivers, routes, tankers, attendance, RBAC, validation, concurrency, demo-traffic generator). The Flutter UI is not covered — see Notes.\n\n`;

  md += `## Summary\n\n`;
  md += `| Metric | Value |\n|---|---|\n`;
  md += `| Total test cases | ${total} |\n`;
  md += `| Passed | ${passed} |\n`;
  md += `| Failed | ${failed} |\n`;
  md += `| Pass rate | ${passRate}% |\n\n`;

  md += `## Results by Category\n\n`;
  md += `| Category | Total | Passed | Failed |\n|---|---|---|---|\n`;
  categories.forEach((cat) => {
    const inCat = results.filter((r) => r.category === cat);
    const p = inCat.filter((r) => r.status === "PASS").length;
    md += `| ${cat} | ${inCat.length} | ${p} | ${inCat.length - p} |\n`;
  });
  md += `\n`;

  categories.forEach((cat) => {
    md += `## ${cat}\n\n`;
    md += `| # | Test Case | Status | Duration (ms) |\n|---|---|---|---|\n`;
    results
      .filter((r) => r.category === cat)
      .forEach((r, i) => {
        md += `| ${i + 1} | ${r.name} | ${r.status === "PASS" ? "PASS" : "**FAIL**"} | ${r.durationMs} |\n`;
      });
    md += `\n`;
  });

  if (failed > 0) {
    md += `## Failure Details\n\n`;
    results
      .filter((r) => r.status === "FAIL")
      .forEach((r, i) => {
        md += `### ${i + 1}. [${r.category}] ${r.name}\n\n`;
        md += `\`\`\`\n${r.error}\n\`\`\`\n\n`;
      });
  }

  md += `## Notes & Recommendations\n\n`;
  md += `- This run targets the \`wmstest\` MongoDB database configured in \`.env\`. Test data (members, drivers, tankers, routes) created by this run is tagged with run id \`${RUN_ID}\` and is left in place — \`wmstest\` is a disposable test database, so no cleanup step was run.\n`;
  md += `- The rate limiter was raised for this run only (\`RATE_LIMIT_MAX=100000\`, via spawned-process env) since full E2E coverage exceeds the default 100 requests / 15 min production limit. Production \`.env\` was not modified.\n`;
  md += `- Two concurrency tests intentionally probe known read-then-write race windows (\`getNextQueuePosition()\` and the tanker-availability check inside \`assignTanker()\`). If either is listed as FAIL above, that confirms the race is reproducible under real concurrent load, not just a theoretical concern.\n`;
  md += `- Flutter app UI/UX, Bluetooth receipt printing, and GPS/geocoding flows are **not** covered by this script — they require a device/emulator and are out of scope for an HTTP-level API test suite. Manual or widget-test coverage is recommended separately.\n`;
  md += `- Re-running this script is safe and idempotent: every mobile number, tanker number, and route uses a fresh run-id suffix, so it never collides with data from a previous run.\n`;

  fs.writeFileSync(path.join(ROOT, "resultReport.md"), md, "utf8");
  console.log(`\nReport written to ${path.join(ROOT, "resultReport.md")}`);
}

// ── main ───────────────────────────────────────────────────────────────────────

(async () => {
  try {
    console.log(`Starting server on port ${PORT} ...`);
    await startServer();
    await waitForHealth();
    console.log("Server is healthy. Running test suite...\n");

    await runAuthTests();
    await runDriverTests();
    await runTankerTests();
    await runRouteTests();
    await runDieselTests();
    await runRequestLifecycleTests();
    await runHandoverTests();
    await runCancelTests();
    await runReportTests();
    await runValidationAndRbacTests();
    await runConcurrencyTests();
    await runDemoTrafficTest();
  } catch (err) {
    console.error("Fatal error running test suite:", err);
    results.push({ category: "Fatal", name: "Test suite execution", status: "FAIL", durationMs: 0, error: err.message });
  } finally {
    generateReport();
    stopServer();
    const failed = results.filter((r) => r.status === "FAIL").length;
    const total = results.length;
    console.log(`\n${total - failed}/${total} passed.`);
    setTimeout(() => process.exit(failed > 0 ? 1 : 0), 500);
  }
})();
