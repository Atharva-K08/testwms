"use strict";

const path    = require("path");
const PDFDocument = require("pdfkit");

const FONT_REGULAR = path.join(__dirname, "..", "assets", "fonts", "NotoSansDevanagari-Regular.ttf");
const FONT_BOLD     = path.join(__dirname, "..", "assets", "fonts", "NotoSansDevanagari-Bold.ttf");

const PAGE_MARGIN = 36;

const COLUMNS = [
  { key: "serialNo",        header: "अ.क्र",                          width: 38,  align: "center" },
  { key: "wardNo",          header: "प्रभाग क्र.",                    width: 60,  align: "center" },
  { key: "societyName",     header: "टँकर घेणाऱ्याचे / सोसायटीचे नाव", width: 150, align: "left"   },
  { key: "address",         header: "पत्ता",                          width: 170, align: "left"   },
  { key: "mobileNo",        header: "फोन नंबर",                       width: 90,  align: "center" },
  { key: "vehicleNo",       header: "टँकर गाडी क्रमांक",               width: 90,  align: "center" },
  { key: "scheduledTrips",  header: "शेड्यूलनुसार खेपा",               width: 58,  align: "center" },
  { key: "occasionalTrips", header: "आवश्यकतेनुसार खेपा",              width: 58,  align: "center" },
  { key: "remarks",         header: "शेरा",                           width: 47,  align: "left"   },
];

const TABLE_WIDTH = COLUMNS.reduce((sum, c) => sum + c.width, 0);

const CELL_PADDING_X = 4;
const CELL_PADDING_Y = 4;
const HEADER_FONT_SIZE = 9;
const BODY_FONT_SIZE   = 9;
const MIN_ROW_HEIGHT   = 20;

const BANNER_LEFT_WIDTH = 180;
const BANNER_BAND_HEIGHT = 26;
const BANNER_HEIGHT = BANNER_BAND_HEIGHT * 3;

const COLOR_RED    = "#FF0000";
const COLOR_GREEN  = "#00CC00";
const COLOR_BLUE   = "#0000FF";
const COLOR_YELLOW = "#FFFF00";
const COLOR_BLACK  = "#000000";
const COLOR_WHITE  = "#FFFFFF";

function registerFonts(doc) {
  doc.registerFont("Marathi", FONT_REGULAR);
  doc.registerFont("Marathi-Bold", FONT_BOLD);
}

function drawHeaderBanner(doc, { stationName, reportDateLabel }) {
  const top = PAGE_MARGIN;
  const rightX = PAGE_MARGIN + BANNER_LEFT_WIDTH;
  const rightWidth = TABLE_WIDTH - BANNER_LEFT_WIDTH;

  // Left block — PMC name (logo placeholder reserved but not drawn)
  doc.rect(PAGE_MARGIN, top, BANNER_LEFT_WIDTH, BANNER_HEIGHT).fillAndStroke(COLOR_RED, COLOR_BLACK);
  doc.fillColor(COLOR_BLACK).font("Marathi-Bold").fontSize(16)
    .text("पुणे महानगरपालिका", PAGE_MARGIN + 6, top + BANNER_HEIGHT / 2 - 12, {
      width: BANNER_LEFT_WIDTH - 12,
      align: "center",
    });

  // Right band 1 — report title (green)
  doc.rect(rightX, top, rightWidth, BANNER_BAND_HEIGHT).fillAndStroke(COLOR_GREEN, COLOR_BLACK);
  doc.fillColor(COLOR_BLACK).font("Marathi-Bold").fontSize(12)
    .text("टँकरने होणाऱ्या दैनंदिन पाणीपुरवठा कामाची माहिती", rightX, top + 7, {
      width: rightWidth,
      align: "center",
    });

  // Right band 2 — station name (blue)
  const band2Top = top + BANNER_BAND_HEIGHT;
  doc.rect(rightX, band2Top, rightWidth, BANNER_BAND_HEIGHT).fillAndStroke(COLOR_BLUE, COLOR_BLACK);
  doc.fillColor(COLOR_WHITE).font("Marathi-Bold").fontSize(12)
    .text(stationName, rightX, band2Top + 7, { width: rightWidth, align: "center" });

  // Right band 3 — date (yellow)
  const band3Top = top + BANNER_BAND_HEIGHT * 2;
  doc.rect(rightX, band3Top, rightWidth, BANNER_BAND_HEIGHT).fillAndStroke(COLOR_YELLOW, COLOR_BLACK);
  doc.fillColor(COLOR_BLACK).font("Marathi-Bold").fontSize(11)
    .text(`दिनांक : ${reportDateLabel}`, rightX, band3Top + 7, { width: rightWidth, align: "center" });

  doc.fillColor(COLOR_BLACK);
  return top + BANNER_HEIGHT + 6;
}

function columnX(index) {
  let x = PAGE_MARGIN;
  for (let i = 0; i < index; i += 1) x += COLUMNS[i].width;
  return x;
}

function drawTableHeader(doc, startY) {
  doc.font("Marathi-Bold").fontSize(HEADER_FONT_SIZE);

  const heights = COLUMNS.map((col) =>
    doc.heightOfString(col.header, { width: col.width - CELL_PADDING_X * 2, align: "center" }),
  );
  const rowHeight = Math.max(MIN_ROW_HEIGHT, ...heights.map((h) => h + CELL_PADDING_Y * 2));

  COLUMNS.forEach((col, i) => {
    const x = columnX(i);
    doc.rect(x, startY, col.width, rowHeight).fillAndStroke(COLOR_BLUE, COLOR_BLACK);
    doc.fillColor(COLOR_BLACK).font("Marathi-Bold").fontSize(HEADER_FONT_SIZE);
    doc.text(col.header, x + CELL_PADDING_X, startY + CELL_PADDING_Y, {
      width: col.width - CELL_PADDING_X * 2,
      align: "center",
    });
  });

  doc.fillColor(COLOR_BLACK);
  return startY + rowHeight;
}

function rowHeight(doc, row) {
  doc.font("Marathi").fontSize(BODY_FONT_SIZE);
  const heights = COLUMNS.map((col) =>
    doc.heightOfString(String(row[col.key] ?? ""), {
      width: col.width - CELL_PADDING_X * 2,
      align: col.align,
    }),
  );
  return Math.max(MIN_ROW_HEIGHT, ...heights.map((h) => h + CELL_PADDING_Y * 2));
}

function drawTableRow(doc, row, startY, height) {
  doc.font("Marathi").fontSize(BODY_FONT_SIZE);

  COLUMNS.forEach((col, i) => {
    const x = columnX(i);
    doc.rect(x, startY, col.width, height).stroke();
    doc.text(String(row[col.key] ?? ""), x + CELL_PADDING_X, startY + CELL_PADDING_Y, {
      width: col.width - CELL_PADDING_X * 2,
      align: col.align,
    });
  });

  return startY + height;
}

function drawPageFooter(doc, pageNumber, totalPages) {
  const bottom = doc.page.height - PAGE_MARGIN + 10;
  doc.font("Marathi").fontSize(8)
    .text(`पृष्ठ ${pageNumber} / ${totalPages}`, PAGE_MARGIN, bottom, {
      width: TABLE_WIDTH,
      align: "right",
    });
}

function drawReportFooter(doc, startY, { totalRecords, generatedBy, generatedAtLabel }) {
  doc.font("Marathi").fontSize(10);
  let y = startY + 16;
  doc.text(`एकूण नोंदी : ${totalRecords}`, PAGE_MARGIN, y);
  y = doc.y + 6;
  doc.text(`अहवाल तयार करणारे : ${generatedBy}`, PAGE_MARGIN, y);
  y = doc.y + 6;
  doc.text(`तयार दिनांक : ${generatedAtLabel}`, PAGE_MARGIN, y);
}

/**
 * Streams a PMC-style "Daily Tanker Supply Register" PDF to `res`.
 * `rows` must already be sorted by ward number and carry plain string/number values
 * for every key in COLUMNS (serialNo is assigned here).
 */
function streamPmcDailyRegisterPdf(res, { stationName, reportDateLabel, rows, generatedBy, generatedAtLabel }) {
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margins: { top: PAGE_MARGIN, bottom: PAGE_MARGIN, left: PAGE_MARGIN, right: PAGE_MARGIN },
    bufferPages: true,
  });

  registerFonts(doc);
  // Without this, an 'error' event from the readable PDF stream (e.g. the
  // client aborting mid-download) is an unhandled EventEmitter error and
  // crashes the whole Node process.
  doc.on("error", (err) => res.destroy(err));
  doc.pipe(res);

  const bottomLimit = doc.page.height - PAGE_MARGIN - 20;

  let y = drawHeaderBanner(doc, { stationName, reportDateLabel });
  y = drawTableHeader(doc, y);

  rows.forEach((row, index) => {
    const height = rowHeight(doc, row);

    if (y + height > bottomLimit) {
      doc.addPage();
      y = drawHeaderBanner(doc, { stationName, reportDateLabel });
      y = drawTableHeader(doc, y);
    }

    y = drawTableRow(doc, { ...row, serialNo: index + 1 }, y, height);
  });

  if (y + 70 > bottomLimit) {
    doc.addPage();
    y = PAGE_MARGIN;
  }
  drawReportFooter(doc, y, { totalRecords: rows.length, generatedBy, generatedAtLabel });

  const range = doc.bufferedPageRange();
  const totalPages = range.count;
  for (let i = 0; i < totalPages; i += 1) {
    doc.switchToPage(range.start + i);
    drawPageFooter(doc, i + 1, totalPages);
  }

  doc.end();
}

module.exports = { streamPmcDailyRegisterPdf, COLUMNS };
