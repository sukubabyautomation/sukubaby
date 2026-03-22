/**
 * TestSupport.gs
 * テストモード制御と Fake 通知記録
 */

const TEST_MODE_KEY = 'TEST_MODE';
const TEST_SPREADSHEET_ID_KEY = 'TEST_SPREADSHEET_ID';
const TEST_NOW_ISO_KEY = 'TEST_NOW_ISO';
const TEST_FAIL_DISCORD_WEBHOOK = '__TEST_FAIL_DISCORD__';
const TEST_FAIL_EMAIL_ADDRESS = '__TEST_FAIL_EMAIL__';

function setTestMode_(isEnabled, testSpreadsheetId, testNowIso) {
  const props = PropertiesService.getScriptProperties();

  if (isEnabled) {
    props.setProperty(TEST_MODE_KEY, '1');
    if (testSpreadsheetId) props.setProperty(TEST_SPREADSHEET_ID_KEY, testSpreadsheetId);
    if (testNowIso) props.setProperty(TEST_NOW_ISO_KEY, testNowIso);
    else props.deleteProperty(TEST_NOW_ISO_KEY);
  } else {
    props.deleteProperty(TEST_MODE_KEY);
    props.deleteProperty(TEST_SPREADSHEET_ID_KEY);
    props.deleteProperty(TEST_NOW_ISO_KEY);
  }
}

function isTestMode_() {
  return PropertiesService.getScriptProperties().getProperty(TEST_MODE_KEY) === '1';
}

/**
 * テストモード残留を完全解除する
 * 手動実行用。ScriptProperties 上のテスト関連キーを全削除する。
 */
function clearTestMode_() {
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty(TEST_MODE_KEY);
  props.deleteProperty(TEST_SPREADSHEET_ID_KEY);
  props.deleteProperty(TEST_NOW_ISO_KEY);
}

/**
 * テストモード状態の確認用
 */
function getTestModeStatus_() {
  const props = PropertiesService.getScriptProperties();
  return {
    isTestMode: isTestMode_(),
    testSpreadsheetId: props.getProperty(TEST_SPREADSHEET_ID_KEY) || '',
    testNowIso: props.getProperty(TEST_NOW_ISO_KEY) || '',
  };
}

/**
 * UIから一発解除するための公開関数
 */
function clearTestModeUi() {
  clearTestMode_();
  const ui = SpreadsheetApp.getUi();
  ui.alert('テストモードを解除しました。');
}

/**
 * 状態確認用UI
 */
function showTestModeStatusUi() {
  const s = getTestModeStatus_();
  SpreadsheetApp.getUi().alert(
    [
      `isTestMode=${s.isTestMode}`,
      `testSpreadsheetId=${s.testSpreadsheetId || '(empty)'}`,
      `testNowIso=${s.testNowIso || '(empty)'}`,
    ].join('\n')
  );
}

function recordFakeDiscordPost_(webhookUrl, content) {
  const ss = getRuntimeMasterSpreadsheet_();
  const sh = ss.getSheetByName('Fake_Discord_Posts');
  if (!sh) return;

  appendRowsByKeys_(sh, [{
    logged_at: new Date(),
    transport_type: 'discord',
    target: webhookUrl,
    subject: '',
    content: String(content || ''),
  }]);
}

function recordFakeEmailPost_(to, subject, body) {
  const ss = getRuntimeMasterSpreadsheet_();
  const sh = ss.getSheetByName('Fake_Email_Posts');
  if (!sh) return;

  appendRowsByKeys_(sh, [{
    logged_at: new Date(),
    transport_type: 'email',
    target: String(to || ''),
    subject: String(subject || ''),
    content: String(body || ''),
  }]);
}

function readDataRowsAsObjects_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < TEST_DATA_START_ROW) return [];

  const header = values[TEST_HEADER_KEY_ROW - 1] || [];
  const rows = values.slice(TEST_DATA_START_ROW - 1);

  return rows
    .filter(r => r.some(v => String(v) !== ''))
    .map(r => {
      const obj = {};
      header.forEach((k, i) => {
        const key = String(k || '').trim();
        if (key) obj[key] = r[i];
      });
      return obj;
    });
}