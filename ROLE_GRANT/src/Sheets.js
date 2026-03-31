// Sheets.gs

const SHEET_HEADER_ROW = 3;
const SHEET_DATA_START_ROW = 4;

function getSheetOrThrow_(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error(`Sheet not found: ${sheetName}`);
  return sheet;
}

function getSheetRecords_(sheet) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow < SHEET_DATA_START_ROW || lastCol === 0) return [];

  const headerValues = sheet.getRange(SHEET_HEADER_ROW, 1, 1, lastCol).getValues()[0];
  const headers = headerValues.map(v => String(v).trim());

  const numRows = lastRow - SHEET_DATA_START_ROW + 1;
  if (numRows <= 0) return [];

  const dataValues = sheet.getRange(SHEET_DATA_START_ROW, 1, numRows, lastCol).getValues();

  return dataValues
    .filter(row => !isEmptyRow_(row))
    .map((row, index) => {
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = normalizeCellValue_(row[i]);
      });
      obj.__rowNumber = SHEET_DATA_START_ROW + index;
      return obj;
    });
}

function normalizeCellValue_(value) {
  if (value === "" || value === null || value === undefined) return "";
  if (typeof value === "boolean") return value;
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) return value;

  const str = String(value).trim();
  if (str === "TRUE") return true;
  if (str === "FALSE") return false;
  return str;
}

function isEmptyRow_(row) {
  return row.every(cell => cell === "" || cell === null || cell === undefined);
}

function getHeaderMap_(sheet) {
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) return {};

  const headers = sheet.getRange(SHEET_HEADER_ROW, 1, 1, lastCol).getValues()[0];
  const map = {};
  headers.forEach((h, i) => {
    map[String(h).trim()] = i + 1;
  });
  return map;
}

function applyMemberUpdates_(sheet, rowNumber, member, updateDefs) {
  if (!updateDefs || updateDefs.length === 0) return;

  const headerMap = getHeaderMap_(sheet);

  updateDefs.forEach(def => {
    const col = headerMap[def.target_column];
    if (!col) {
      throw new Error(`Members target column not found: ${def.target_column}`);
    }

    let value = "";
    switch (def.update_type) {
      case "FIXED":
        value = def.update_value;
        break;
      case "EMPTY":
        value = "";
        break;
      default:
        throw new Error(`Unsupported update_type: ${def.update_type}`);
    }

    sheet.getRange(rowNumber, col).setValue(value);
  });
}