"use strict";

/**
 * Seeds real tanker records (tanker number only) without touching any
 * other collection. Additive and idempotent — skips any tanker number
 * that already exists, so it's safe to re-run.
 * Run: node src/utils/seed-tankers.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const mongoose = require("mongoose");
const { connectDB } = require("../config/database");
const Tanker = require("../models/tanker.model");

const tankerNumbers = [
  "MH12TV6813",
  "MH12XM1864",
  "MH12VF9782",
  "MH12TY6615",
  "MH12UM0776",
  "MH12HD4503",
  "MH12WJ1935",
  "MH12TX6994",
  "MH12QW5581",
  "MH12SX7401",
  "MH12XM1867",
  "MH12XM1865",
  "MH12UM0781",
  "MH12WJ1933",
  "MH12VF9781",
  "MH12SX5680",
  "MH12QW5582",
  "MH12BF5833",
  "MH12YB3162",
  "MH12WJ1931",
  "MH12XM1861",
  "MH12WJ1934",
  "MH12XM1859",
  "MH12YB0342",
  "MH12QW5586",
  "MH12YB0341",
  "MH12YB3161",
  "MH12QW5584",
  "MH12XM1860",
  "MH12WJ1932",
];

const seedTankers = async () => {
  await connectDB();

  let created = 0;
  let skipped = 0;

  for (const tankerNumber of tankerNumbers) {
    const exists = await Tanker.findOne({ tankerNumber });
    if (exists) {
      skipped += 1;
      continue;
    }
    await Tanker.create({ tankerNumber });
    created += 1;
  }

  console.log(`✅ Tankers seeded: ${created} created, ${skipped} skipped (already existed).`);

  await mongoose.disconnect();
  process.exit(0);
};

seedTankers().catch((err) => {
  console.error("❌ Tanker seed failed:", err.message);
  process.exit(1);
});
