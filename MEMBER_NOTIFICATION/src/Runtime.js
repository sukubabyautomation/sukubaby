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
 * 実行時のスプレッドシートを取得する
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} 実行時のスプレッドシート
 */
function getRuntimeSpreadsheet_() {
  if (isTestMode_()) {
    const testId = PropertiesService.getScriptProperties().getProperty(TEST_SPREADSHEET_ID_KEY);
    if (!testId) {
      throw new Error('TEST_MODE is ON but TEST_SPREADSHEET_ID is not set.');
    }
    return SpreadsheetApp.openById(String(testId).trim());
  }

  const ssId = getEnvOrThrow_('SPREADSHEET_ID');

  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active && active.getId() === ssId) {
    return active;
  }

  return SpreadsheetApp.openById(ssId);
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