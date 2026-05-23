"use strict";

/**
 * Full system seed — drops and repopulates every collection for a clean demo state.
 * Run: node src/utils/seed.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const mongoose  = require("mongoose");
const bcrypt    = require("bcryptjs");
const { connectDB } = require("../config/database");
const { BCRYPT_SALT_ROUNDS, ROLES, REQUEST_STATUS, ENTITY_STATUS } = require("../config/constants");

const User         = require("../models/user.model");
const Driver       = require("../models/driver.model");
const Tanker       = require("../models/tanker.model");
const Request      = require("../models/request.model");
const Receipt      = require("../models/receipt.model");
const DieselFilling = require("../models/dieselFilling.model");
const Route        = require("../models/route.model");

// Counter model (shared with driver + receipt services)
const counterSchema = new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } });
const Counter = mongoose.models.Counter || mongoose.model("Counter", counterSchema);

// ── Helpers ───────────────────────────────────────────────────────────────────

const hash = (pw) => bcrypt.hash(pw, BCRYPT_SALT_ROUNDS);

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

// ── Clear ─────────────────────────────────────────────────────────────────────

const clearAll = async () => {
  await Promise.all([
    User.deleteMany({}),
    Driver.deleteMany({}),
    Tanker.deleteMany({}),
    Request.deleteMany({}),
    Receipt.deleteMany({}),
    DieselFilling.deleteMany({}),
    Route.deleteMany({}),
    Counter.deleteMany({}),
  ]);
  console.log("🗑️  Cleared all collections.");
};

// ── Users ─────────────────────────────────────────────────────────────────────

const seedUsers = async () => {
  const [managerPw, fuelPw, memberPw, adminPw] = await Promise.all([
    hash("Manager@123"),
    hash("Fuel@1234"),
    hash("Member@123"),
    hash("Admin@1234"),
  ]);

  // SuperAdmin
  const superAdmin = await User.create({
    username: process.env.SUPER_ADMIN_USERNAME || "admin",
    password: adminPw,
    role: ROLES.SUPER_ADMIN,
    isActive: true,
  });

  // Managers
  const [mgr1, mgr2] = await User.create([
    {
      mobileNumber: "9000000001",
      password: managerPw,
      role: ROLES.MANAGER,
      profile: { name: "Rajesh Patil", societyName: "NagarJal HQ", address: "Station Road, Pune", contactPerson: "Rajesh Patil" },
      isActive: true,
    },
    {
      mobileNumber: "9000000003",
      password: managerPw,
      role: ROLES.MANAGER,
      profile: { name: "Sanjay More", societyName: "Zone 2 Office", address: "Kothrud, Pune", contactPerson: "Sanjay More" },
      isActive: true,
    },
  ]);

  // Fuel Managers
  const [fuel1, fuel2] = await User.create([
    {
      mobileNumber: "9000000010",
      password: fuelPw,
      role: ROLES.FUEL_MANAGER,
      profile: { name: "Vikram Desai", societyName: "Fuel Depot", address: "Hadapsar, Pune", contactPerson: "Vikram Desai" },
      isActive: true,
    },
    {
      mobileNumber: "9000000011",
      password: fuelPw,
      role: ROLES.FUEL_MANAGER,
      profile: { name: "Anita Shinde", societyName: "Sub Depot", address: "Bibwewadi, Pune", contactPerson: "Anita Shinde" },
      isActive: true,
    },
  ]);

  // Members
  const memberDefs = [
    { mobile: "9000000020", name: "Suresh Jadhav",    society: "Sai Krupa Society",      address: "Katraj, Pune - 411046" },
    { mobile: "9000000021", name: "Priya Kulkarni",   society: "Green Valley CHS",        address: "Warje, Pune - 411058" },
    { mobile: "9000000022", name: "Amit Sharma",      society: "Shivaji Nagar Colony",    address: "Shivaji Nagar, Pune - 411005" },
    { mobile: "9000000023", name: "Meena Deshmukh",   society: "Parvati Darshan",         address: "Parvati, Pune - 411009" },
    { mobile: "9000000024", name: "Ravi Bhosale",     society: "Erandwane Society",       address: "Erandwane, Pune - 411038" },
    { mobile: "9000000025", name: "Kavita Wagh",      society: "Kothrud Residency",       address: "Kothrud, Pune - 411038" },
    { mobile: "9000000026", name: "Dinesh Pawar",     society: "Hadapsar Heights",        address: "Hadapsar, Pune - 411028" },
    { mobile: "9000000027", name: "Sunita Gaikwad",   society: "Wagholi Gardens",         address: "Wagholi, Pune - 412207" },
  ];

  const members = await User.create(
    memberDefs.map((m) => ({
      mobileNumber: m.mobile,
      password: memberPw,
      role: ROLES.MEMBER,
      profile: { name: m.name, societyName: m.society, address: m.address, contactPerson: m.name },
      isActive: true,
    })),
  );

  return { superAdmin, managers: [mgr1, mgr2], fuelManagers: [fuel1, fuel2], members };
};

// ── Drivers ───────────────────────────────────────────────────────────────────

const seedDrivers = async () => {
  const driverDefs = [
    { name: "Mahesh Kamble",   mobile: "8800000001", addr: "Katraj, Pune",    status: "ACTIVE" },
    { name: "Ganesh Thorat",   mobile: "8800000002", addr: "Warje, Pune",     status: "ACTIVE" },
    { name: "Santosh Mane",    mobile: "8800000003", addr: "Bibwewadi, Pune", status: "ACTIVE" },
    { name: "Rajendra Salve",  mobile: "8800000004", addr: "Dhanori, Pune",   status: "ACTIVE" },
    { name: "Arun Patole",     mobile: "8800000005", addr: "Kharadi, Pune",   status: "ACTIVE" },
    { name: "Vilas Raut",      mobile: "8800000006", addr: "Yerawada, Pune",  status: "BLOCK"  },
  ];

  // Must use Driver.create() one at a time to trigger pre-save serial counter
  const drivers = [];
  for (const def of driverDefs) {
    const d = await Driver.create({
      name: def.name,
      mobileNumber: def.mobile,
      permanentAddress: def.addr,
      status: def.status,
    });
    drivers.push(d);
  }
  return drivers;
};

// ── Tankers ───────────────────────────────────────────────────────────────────

const seedTankers = async (addedByUser) => {
  const numbers = ["MH14XX1234", "MH14XX5678", "MH12AB3456", "MH14XY7890", "MH12GH1122"];
  return Tanker.create(numbers.map((n) => ({ tankerNumber: n, addedBy: addedByUser._id })));
};

// ── Routes ────────────────────────────────────────────────────────────────────

const seedRoutes = async () => {
  return Route.create([
    { source: "Katraj Water Tank",    destination: "Sai Krupa Society, Katraj",    distanceInKm: 3.2  },
    { source: "Khadakwasla Dam",      destination: "Green Valley CHS, Warje",      distanceInKm: 7.5  },
    { source: "Parvati Reservoir",    destination: "Shivaji Nagar Colony",         distanceInKm: 4.8  },
    { source: "Temghar Dam",          destination: "Parvati Darshan",              distanceInKm: 12.0 },
    { source: "Khadakwasla Dam",      destination: "Erandwane Society",            distanceInKm: 8.2  },
    { source: "Katraj Water Tank",    destination: "Kothrud Residency",            distanceInKm: 5.5  },
  ]);
};

// ── Requests ──────────────────────────────────────────────────────────────────

const seedRequests = async (users, tankers, drivers, managers) => {
  const mgr = managers[0];

  const makeAssignment = (tanker, driver, daysBack) => ({
    tankerNumber:  tanker.tankerNumber,
    driverId:      driver._id,
    driverName:    driver.name,
    driverMobile:  driver.mobileNumber,
    dateTime:      daysAgo(daysBack),
  });

  const requestDefs = [
    // Pending — no assignment (fresh in queue)
    {
      userId: users.members[0]._id, societyName: users.members[0].profile.societyName,
      address: users.members[0].profile.address, contactPerson: users.members[0].profile.contactPerson,
      mobileNumber: "9000000020", queuePosition: 1, status: REQUEST_STATUS.PENDING,
    },
    {
      userId: users.members[1]._id, societyName: users.members[1].profile.societyName,
      address: users.members[1].profile.address, contactPerson: users.members[1].profile.contactPerson,
      mobileNumber: "9000000021", queuePosition: 2, status: REQUEST_STATUS.PENDING,
    },
    {
      userId: users.members[7]._id, societyName: users.members[7].profile.societyName,
      address: users.members[7].profile.address, contactPerson: users.members[7].profile.contactPerson,
      mobileNumber: "9000000027", queuePosition: 3, status: REQUEST_STATUS.PENDING,
    },

    // Pending — tanker assigned (tankers[0] + drivers[0] locked)
    {
      userId: users.members[2]._id, societyName: users.members[2].profile.societyName,
      address: users.members[2].profile.address, contactPerson: users.members[2].profile.contactPerson,
      mobileNumber: "9000000022", queuePosition: 4, status: REQUEST_STATUS.PENDING,
      tankerAssignment: makeAssignment(tankers[0], drivers[0], 0),
      assignedAt: new Date(), assignedBy: mgr._id,
    },

    // Pending — tanker assigned + source/destination set (ready to mark complete)
    {
      userId: users.members[3]._id, societyName: users.members[3].profile.societyName,
      address: users.members[3].profile.address, contactPerson: users.members[3].profile.contactPerson,
      mobileNumber: "9000000023", queuePosition: 5, status: REQUEST_STATUS.PENDING,
      tankerAssignment: makeAssignment(tankers[1], drivers[1], 0),
      assignedAt: new Date(), assignedBy: mgr._id,
      source: "Katraj Water Tank", destination: "Parvati Darshan",
      kilometer: 3.2, roundTripKilometer: 6.4,
    },

    // Completed requests
    {
      userId: users.members[4]._id, societyName: users.members[4].profile.societyName,
      address: users.members[4].profile.address, contactPerson: users.members[4].profile.contactPerson,
      mobileNumber: "9000000024", queuePosition: 6, status: REQUEST_STATUS.COMPLETED,
      tankerAssignment: makeAssignment(tankers[2], drivers[2], 5),
      assignedAt: daysAgo(5), assignedBy: mgr._id,
      source: "Khadakwasla Dam", destination: "Green Valley CHS, Warje",
      kilometer: 7.5, roundTripKilometer: 15.0, completedAt: daysAgo(4),
    },
    {
      userId: users.members[5]._id, societyName: users.members[5].profile.societyName,
      address: users.members[5].profile.address, contactPerson: users.members[5].profile.contactPerson,
      mobileNumber: "9000000025", queuePosition: 7, status: REQUEST_STATUS.COMPLETED,
      tankerAssignment: makeAssignment(tankers[3], drivers[3], 8),
      assignedAt: daysAgo(8), assignedBy: mgr._id,
      source: "Parvati Reservoir", destination: "Shivaji Nagar Colony",
      kilometer: 4.8, roundTripKilometer: 9.6, completedAt: daysAgo(7),
    },
    {
      userId: users.members[6]._id, societyName: users.members[6].profile.societyName,
      address: users.members[6].profile.address, contactPerson: users.members[6].profile.contactPerson,
      mobileNumber: "9000000026", queuePosition: 8, status: REQUEST_STATUS.COMPLETED,
      tankerAssignment: makeAssignment(tankers[4], drivers[4], 12),
      assignedAt: daysAgo(12), assignedBy: mgr._id,
      source: "Temghar Dam", destination: "Parvati Darshan",
      kilometer: 12.0, roundTripKilometer: 24.0, completedAt: daysAgo(11),
    },
    {
      userId: users.members[0]._id, societyName: users.members[0].profile.societyName,
      address: users.members[0].profile.address, contactPerson: users.members[0].profile.contactPerson,
      mobileNumber: "9000000020", queuePosition: 9, status: REQUEST_STATUS.COMPLETED,
      tankerAssignment: makeAssignment(tankers[0], drivers[0], 20),
      assignedAt: daysAgo(20), assignedBy: mgr._id,
      source: "Katraj Water Tank", destination: "Sai Krupa Society, Katraj",
      kilometer: 3.2, roundTripKilometer: 6.4, completedAt: daysAgo(19),
    },

    // Cancelled requests
    {
      userId: users.members[1]._id, societyName: users.members[1].profile.societyName,
      address: users.members[1].profile.address, contactPerson: users.members[1].profile.contactPerson,
      mobileNumber: "9000000021", queuePosition: 10, status: REQUEST_STATUS.CANCELLED,
      cancelledAt: daysAgo(3), cancelReason: "Member cancelled — water supply restored",
    },
    {
      userId: users.members[2]._id, societyName: users.members[2].profile.societyName,
      address: users.members[2].profile.address, contactPerson: users.members[2].profile.contactPerson,
      mobileNumber: "9000000022", queuePosition: 11, status: REQUEST_STATUS.CANCELLED,
      tankerAssignment: makeAssignment(tankers[2], drivers[2], 15),
      cancelledAt: daysAgo(14), cancelReason: "Tanker breakdown — request rescheduled",
    },
  ];

  const requests = await Request.create(requestDefs);

  // Mark tankers + drivers that are currently on active trips as on_trip
  // Request index 3: tankers[0] + drivers[0] (assigned, no route yet)
  // Request index 4: tankers[1] + drivers[1] (assigned + route set)
  await Promise.all([
    Tanker.updateOne({ tankerNumber: tankers[0].tankerNumber }, { currentStatus: ENTITY_STATUS.ON_TRIP, activeRequestId: requests[3]._id }),
    Driver.updateOne({ _id: drivers[0]._id },                  { currentStatus: ENTITY_STATUS.ON_TRIP, activeRequestId: requests[3]._id }),
    Tanker.updateOne({ tankerNumber: tankers[1].tankerNumber }, { currentStatus: ENTITY_STATUS.ON_TRIP, activeRequestId: requests[4]._id }),
    Driver.updateOne({ _id: drivers[1]._id },                  { currentStatus: ENTITY_STATUS.ON_TRIP, activeRequestId: requests[4]._id }),
  ]);

  return requests;
};

// ── Receipts ──────────────────────────────────────────────────────────────────

const seedReceipts = async (requests, manager) => {
  // Generate receipts for completed requests (indices 5,6,7,8)
  const completed = requests.filter((r) => r.status === REQUEST_STATUS.COMPLETED);
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  const receipts = await Receipt.create(
    completed.map((req, i) => ({
      receiptNumber:  `WTR-${today}-${String(i + 1).padStart(4, "0")}`,
      requestId:      req._id,
      societyName:    req.societyName,
      address:        req.address,
      contactPerson:  req.contactPerson,
      mobileNumber:   req.mobileNumber,
      tankerNumber:   req.tankerAssignment.tankerNumber,
      driverName:     req.tankerAssignment.driverName,
      driverMobile:   req.tankerAssignment.driverMobile,
      queuePosition:  req.queuePosition,
      generatedBy:    manager._id,
      generatedAt:    req.completedAt,
      printedAt:      i < 2 ? req.completedAt : null, // first 2 are printed
      printCount:     i < 2 ? 1 : 0,
    })),
  );

  // Sync receipt counter for today so future generates pick up correctly
  await Counter.findByIdAndUpdate(
    `receipt-${today}`,
    { seq: completed.length },
    { upsert: true },
  );

  return receipts;
};

// ── Diesel Fillings ───────────────────────────────────────────────────────────

const seedDieselFillings = async (tankers, fuelManager) => {
  const fillings = [
    // MH14XX1234
    { tankerNumber: tankers[0].tankerNumber, dateTime: daysAgo(21), liters: 1200, km: 45.6, status: "valid" },
    { tankerNumber: tankers[0].tankerNumber, dateTime: daysAgo(14), liters: 980,  km: 38.4, status: "valid" },
    { tankerNumber: tankers[0].tankerNumber, dateTime: daysAgo(5),  liters: 1500, km: 62.0, status: "valid" },
    // MH14XX5678
    { tankerNumber: tankers[1].tankerNumber, dateTime: daysAgo(22), liters: 800,  km: 30.0, status: "valid" },
    { tankerNumber: tankers[1].tankerNumber, dateTime: daysAgo(10), liters: 1100, km: 42.5, status: "wrong" },
    { tankerNumber: tankers[1].tankerNumber, dateTime: daysAgo(3),  liters: 950,  km: 36.0, status: "valid" },
    // MH12AB3456
    { tankerNumber: tankers[2].tankerNumber, dateTime: daysAgo(15), liters: 1300, km: 55.0, status: "valid" },
    { tankerNumber: tankers[2].tankerNumber, dateTime: daysAgo(7),  liters: 1050, km: 44.0, status: "valid" },
    // MH14XY7890
    { tankerNumber: tankers[3].tankerNumber, dateTime: daysAgo(16), liters: 700,  km: 28.5, status: "valid" },
    { tankerNumber: tankers[3].tankerNumber, dateTime: daysAgo(4),  liters: 1200, km: 50.0, status: "valid" },
    // MH12GH1122
    { tankerNumber: tankers[4].tankerNumber, dateTime: daysAgo(20), liters: 900,  km: 35.0, status: "valid" },
    { tankerNumber: tankers[4].tankerNumber, dateTime: daysAgo(8),  liters: 1100, km: 46.0, status: "valid" },
  ];

  return DieselFilling.create(
    fillings.map((f) => ({
      tankerNumber: f.tankerNumber,
      dateTime:     f.dateTime,
      liters:       f.liters,
      kilometersTravelledSinceLastTrip: f.km,
      filledBy:     fuelManager._id,
      status:       f.status,
      ...(f.status === "wrong" && {
        wrongReason:   "Incorrect meter reading entered",
        markedWrongBy: fuelManager._id,
        markedWrongAt: new Date(),
      }),
    })),
  );
};

// ── Print credentials table ───────────────────────────────────────────────────

const printTable = (users, drivers, tankers) => {
  const line = "═".repeat(62);
  console.log(`\n${line}`);
  console.log("  NagarJal Seed Credentials");
  console.log(line);
  console.log(`  SUPER ADMIN   username: admin             password: Admin@1234`);
  console.log(`  MANAGER       mobile:   9000000001        password: Manager@123`);
  console.log(`  MANAGER       mobile:   9000000003        password: Manager@123`);
  console.log(`  FUEL MANAGER  mobile:   9000000010        password: Fuel@1234`);
  console.log(`  FUEL MANAGER  mobile:   9000000011        password: Fuel@1234`);
  console.log(`  MEMBER        mobile:   9000000020–27     password: Member@123`);
  console.log(line);
  console.log(`  Tankers  : ${tankers.map((t) => t.tankerNumber).join(", ")}`);
  console.log(`  Drivers  : ${drivers.length} seeded (serials 1–${drivers.length}; serial 6 BLOCKED)`);
  console.log(`  Requests : 11 seeded (3 pending, 2 assigned/ready, 4 completed, 2 cancelled)`);
  console.log(`  Receipts : 4 seeded (2 printed, 2 unprinted)`);
  console.log(`  Diesel   : 12 fillings (1 marked wrong)`);
  console.log(`${line}\n`);
};

// ── Main ──────────────────────────────────────────────────────────────────────

const seed = async () => {
  await connectDB();
  await clearAll();

  const users   = await seedUsers();
  console.log(`✅ Users seeded (${1 + 2 + 2 + 8} total)`);

  const drivers = await seedDrivers();
  console.log(`✅ Drivers seeded (${drivers.length} total)`);

  const tankers = await seedTankers(users.managers[0]);
  console.log(`✅ Tankers seeded (${tankers.length} total)`);

  await seedRoutes();
  console.log("✅ Routes seeded (6 total)");

  const requests = await seedRequests(users, tankers, drivers, users.managers);
  console.log(`✅ Requests seeded (${requests.length} total)`);

  await seedReceipts(requests, users.managers[0]);
  console.log("✅ Receipts seeded (4 total)");

  await seedDieselFillings(tankers, users.fuelManagers[0]);
  console.log("✅ Diesel fillings seeded (12 total)");

  printTable(users, drivers, tankers);

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});
