const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

function createSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    scopes: SCOPES
  });

  return google.sheets({ version: 'v4', auth });
}

async function clearSheetRange({ sheets = createSheetsClient(), spreadsheetId, range }) {
  return sheets.spreadsheets.values.clear({
    spreadsheetId,
    range
  });
}

async function updateSheetValues({
  sheets = createSheetsClient(),
  spreadsheetId,
  range,
  values
}) {
  return sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'RAW',
    requestBody: {
      values
    }
  });
}

module.exports = {
  createSheetsClient,
  clearSheetRange,
  updateSheetValues
};
