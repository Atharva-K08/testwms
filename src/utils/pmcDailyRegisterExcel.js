"use strict";

const ExcelJS = require("exceljs");
const { COLUMNS } = require("./pmcDailyRegisterPdf");

const THIN_BORDER = {
  top:    { style: "thin" },
  left:   { style: "thin" },
  bottom: { style: "thin" },
  right:  { style: "thin" },
};

const EXCEL_ALIGN = { left: "left", center: "center", right: "right" };

function buildPmcDailyRegisterWorkbook({ stationName, reportDateLabel, rows, generatedBy, generatedAtLabel }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Water Tanker Supply Management System";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Daily Register", {
    views: [{ rightToLeft: false }],
  });

  const colCount = COLUMNS.length;
  sheet.columns = COLUMNS.map((col) => ({ width: Math.max(10, Math.round(col.width / 6)) }));

  const mergeAndCenterTitle = (rowIndex, text, bold, size) => {
    sheet.mergeCells(rowIndex, 1, rowIndex, colCount);
    const cell = sheet.getCell(rowIndex, 1);
    cell.value = text;
    cell.font = { name: "Noto Sans Devanagari", bold, size };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  };

  mergeAndCenterTitle(1, "पुणे महानगरपालिका", true, 14);
  mergeAndCenterTitle(2, "टँकरने होणाऱ्या दैनंदिन पाणीपुरवठा कामाची माहिती", true, 12);
  mergeAndCenterTitle(3, stationName, true, 11);
  mergeAndCenterTitle(4, `दिनांक : ${reportDateLabel}`, false, 10);

  const headerRowIndex = 6;
  const headerRow = sheet.getRow(headerRowIndex);
  COLUMNS.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    cell.font = { name: "Noto Sans Devanagari", bold: true, size: 10 };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = THIN_BORDER;
  });
  headerRow.height = 28;

  let rowIndex = headerRowIndex + 1;
  rows.forEach((row, i) => {
    const excelRow = sheet.getRow(rowIndex);
    COLUMNS.forEach((col, colIdx) => {
      const value = col.key === "serialNo" ? i + 1 : row[col.key] ?? "-";
      const cell = excelRow.getCell(colIdx + 1);
      cell.value = value;
      cell.font = { name: "Noto Sans Devanagari", size: 10 };
      cell.alignment = {
        horizontal: EXCEL_ALIGN[col.align] || "left",
        vertical:   "middle",
        wrapText:   true,
      };
      cell.border = THIN_BORDER;
    });
    rowIndex += 1;
  });

  rowIndex += 1;
  const addFooterLine = (text) => {
    sheet.mergeCells(rowIndex, 1, rowIndex, colCount);
    const cell = sheet.getCell(rowIndex, 1);
    cell.value = text;
    cell.font = { name: "Noto Sans Devanagari", size: 10 };
    cell.alignment = { horizontal: "left", vertical: "middle" };
    rowIndex += 1;
  };
  addFooterLine(`एकूण नोंदी : ${rows.length}`);
  addFooterLine(`अहवाल तयार करणारे : ${generatedBy}`);
  addFooterLine(`तयार दिनांक : ${generatedAtLabel}`);

  sheet.pageSetup = {
    paperSize: 9, // A4
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
  };

  return workbook;
}

async function streamPmcDailyRegisterExcel(res, params) {
  const workbook = buildPmcDailyRegisterWorkbook(params);
  await workbook.xlsx.write(res);
  res.end();
}

module.exports = { streamPmcDailyRegisterExcel, buildPmcDailyRegisterWorkbook };
