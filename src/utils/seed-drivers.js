"use strict";

/**
 * Seeds real driver records (name + mobile number) without touching any
 * other collection. Additive and idempotent — skips any mobile number
 * that already exists, so it's safe to re-run.
 * Run: node src/utils/seed-drivers.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const mongoose = require("mongoose");
const { connectDB } = require("../config/database");
const Driver = require("../models/driver.model");

const driverDefs = [
  { name: "अरुण चाटे",       mobile: "7588650250" },
  { name: "जावेद कोतवाल",     mobile: "8624825066" },
  { name: "नरहरी बडे",       mobile: "8857967679" },
  { name: "अनिकेत केंद्रे",    mobile: "7020642463" },
  { name: "बबन चोरे",        mobile: "9130385462" },
  { name: "सदाशिव चोरे",      mobile: "7499838946" },
  { name: "भानुदास शिंदे",     mobile: "9370766550" },
  { name: "बलाजी चोरे",       mobile: "8805499927" },
  { name: "दीपक केंद्रे",      mobile: "8080281759" },
  { name: "विष्णू गुते",       mobile: "8766983590" },
  { name: "प्रमोद दराडे",      mobile: "9665641941" },
  { name: "नागनाथ दराडे",      mobile: "9284416845" },
  { name: "दत्ता पिलेवाड",     mobile: "9673461816" },
  { name: "प्रकाश सूर्यवंशी",    mobile: "9890094720" },
  { name: "वासू चट्टे",        mobile: "7350667707" },
  { name: "बाबुराव भोरे",      mobile: "9172902591" },
  { name: "शशिकांत सावंत",     mobile: "8055001289" },
  { name: "चंदू सकर",         mobile: "8983634391" },
  { name: "महेश सुरवसे",       mobile: "9307051298" },
  { name: "पप्पू शेडवाड",      mobile: "8888076000" },
  { name: "प्रभाकर गोखले",     mobile: "9688886090" },
  { name: "लाहू सोलघे",       mobile: "9767030450" },
  { name: "बळीराम सुलघे",      mobile: "9834862029" },
  { name: "विशाल नायगिरी",     mobile: "6362268880" },
  { name: "दादा तुपसोडरे",     mobile: "8805006096" },
  { name: "रघुनाथ थोरात",      mobile: "8329898908" },
  { name: "योगेश मंडघे",       mobile: "9975804169" },
  { name: "श्रीराम अल्हार",     mobile: "8208734937" },
  { name: "यश गायकवाड",       mobile: "8080877659" },
  { name: "गणेश भोरे",        mobile: "9284416074" },
  { name: "अक्षय कुतवाल",      mobile: "9156184847" },
  { name: "अतुल टाकभाटे",      mobile: "8330294347" },
  { name: "सोनू केंद्रे",       mobile: "8208871406" },
  { name: "पद्माकर केंद्रे",     mobile: "9130008541" },
  { name: "गोविंद शिरसागर",     mobile: "9665576592" },
  { name: "भागवत सुळगे",      mobile: "8530772658" },
  { name: "रवी चिलेवाड",       mobile: "9782279797" },
  { name: "मारुती",          mobile: "7038102752" },
  { name: "विठ्ठल कोरडे",      mobile: "7498755198" },
  { name: "विक्रम कसबे",       mobile: "9822743858" },
  { name: "विक्रम कांबळे",      mobile: "8806862389" },
];

const seedDrivers = async () => {
  await connectDB();

  let created = 0;
  let skipped = 0;

  for (const def of driverDefs) {
    const exists = await Driver.findOne({ mobileNumber: def.mobile });
    if (exists) {
      skipped += 1;
      continue;
    }
    // Must use Driver.create() one at a time to trigger the pre-save
    // serialNumber counter hook.
    await Driver.create({
      name: def.name,
      mobileNumber: def.mobile,
      permanentAddress: "Not provided",
      status: "ACTIVE",
    });
    created += 1;
  }

  console.log(`✅ Drivers seeded: ${created} created, ${skipped} skipped (already existed).`);

  await mongoose.disconnect();
  process.exit(0);
};

seedDrivers().catch((err) => {
  console.error("❌ Driver seed failed:", err.message);
  process.exit(1);
});
