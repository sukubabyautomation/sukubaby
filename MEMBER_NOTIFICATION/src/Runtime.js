/**
 * Runtime.js
 * - スプレッドシートの取得、現在日時の取得など、実行環境に依存する処理をまとめる
 */

/**
 * 環境変数から値を取得する。存在しない場合は例外をスローする。
 * @param {string} key - 環境変数のキー
 * @returns {string} 環境変数の値
 * @throws {Error} 環境変数が存在しない場合にスローされる
 */
function getEnvOrThrow_(key) {
  const value = PropertiesService.getScriptProperties().getProperty(key);
  if (!value) {
    throw new Error('ScriptProperties missing: ' + key);
  }
  return String(value).trim();
}

/**
 * 指定IDのスプレッドシートを取得する。
 * アクティブブックが同一IDならそれを優先利用する。
 * @param {string} spreadsheetId
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function openSpreadsheetByIdWithActiveFallback_(spreadsheetId) {
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active && active.getId() === spreadsheetId) {
    return active;
  }
  return SpreadsheetApp.openById(spreadsheetId);
}

/**
 * 実行時のマスタ&設定ブックを取得する
 * - テスト時: TEST_SPREADSHEET_ID
 * - 通常時: MASTER_SPREADSHEET_ID
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function getRuntimeMasterSpreadsheet_() {
  if (isTestMode_()) {
    const testId = PropertiesService.getScriptProperties().getProperty(TEST_SPREADSHEET_ID_KEY);
    if (!testId) {
      throw new Error('TEST_MODE is ON but TEST_SPREADSHEET_ID is not set.');
    }
    return SpreadsheetApp.openById(String(testId).trim());
  }

  const ssId = getEnvOrThrow_('MASTER_SPREADSHEET_ID');
  return openSpreadsheetByIdWithActiveFallback_(ssId);
}

/**
 * 実行時のログブックを取得する
 * - テスト時: TEST_SPREADSHEET_ID
 * - 通常時: LOG_SPREADSHEET_ID
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function getRuntimeLogSpreadsheet_() {
  if (isTestMode_()) {
    const testId = PropertiesService.getScriptProperties().getProperty(TEST_SPREADSHEET_ID_KEY);
    if (!testId) {
      throw new Error('TEST_MODE is ON but TEST_SPREADSHEET_ID is not set.');
    }
    return SpreadsheetApp.openById(String(testId).trim());
  }

  const ssId = getEnvOrThrow_('LOG_SPREADSHEET_ID');
  return openSpreadsheetByIdWithActiveFallback_(ssId);
}

/** 現在日時を取得する。テストモードの場合はテスト用日時を返す
 * @returns {Date} 現在日時
 */
function getRuntimeNow_() {
  if (isTestMode_()) {
    const iso = PropertiesService.getScriptProperties().getProperty(TEST_NOW_ISO_KEY);
    if (iso) {
      const d = new Date(iso);
      if (!isNaN(d.getTime())) {
        return d;
      }
    }
  }
  return new Date();
}