/**
 * TestHarness.gs
 *
 * 目的:
 * - テスト用スプレッドシートを自動生成
 * - テストデータ投入
 * - 本番コードをテストモードで実行
 * - 結果を Test_Results シートへ出力
 *
 */

const TEST_HEADER_CATEGORY_ROW = 1;
const TEST_HEADER_LABEL_ROW = 2;
const TEST_HEADER_KEY_ROW = 3;
const TEST_DATA_START_ROW = 4;
const TEST_SUITE_UNIT_1 = 'UNIT_1';
const TEST_SUITE_UNIT_2 = 'UNIT_2';
const TEST_SUITE_INTEGRATION = 'INTEGRATION';
const TEST_SUITE_SCENARIO = 'SCENARIO';

function runRegressionTestsUnit1() {
  return runRegressionSuiteByName_(TEST_SUITE_UNIT_1);
}

function runRegressionTestsUnit2() {
  return runRegressionSuiteByName_(TEST_SUITE_UNIT_2);
}

function runRegressionTestsIntegration() {
  return runRegressionSuiteByName_(TEST_SUITE_INTEGRATION);
}

function runRegressionTestsScenario() {
  return runRegressionSuiteByName_(TEST_SUITE_SCENARIO);
}

function runAllRegressionTests() {
  return runRegressionSuiteByName_(TEST_SUITE_UNIT_1);
}

function runRegressionSuiteByName_(suiteName) {
  const startedAt = new Date();
  const runId = Utilities.formatDate(startedAt, Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');

  const suite = getRegressionSuiteByName_(suiteName);
  const tempSs = createRegressionTestSpreadsheet_(`会員通知_自動テスト_${suiteName}_${runId}`);

  const props = PropertiesService.getScriptProperties();
  const oldTestMode = props.getProperty(TEST_MODE_KEY);
  const oldTestSpreadsheetId = props.getProperty(TEST_SPREADSHEET_ID_KEY);
  const oldTestNowIso = props.getProperty(TEST_NOW_ISO_KEY);

  try {
    setTestMode_(true, tempSs.getId(), startedAt.toISOString());

    initializeTestWorkbook_(tempSs);

    const results = [];
    suite.forEach(tc => {
      resetTestWorkbookData_(tempSs);
      seedTestCase_(tempSs, tc);
      clearFakeTransportLogs_();

      let ok = false;
      let errorText = '';
      let actual = '';

      try {
        tc.execute(tempSs);
        const assertion = tc.assert(tempSs);
        ok = !!assertion.ok;
        actual = assertion.actualSummary || '';
        errorText = assertion.message || '';
      } catch (e) {
        ok = false;
        errorText = String(e && e.stack ? e.stack : e);
      }

      results.push({
        run_id: runId,
        executed_at: new Date(),
        test_id: tc.id,
        category: tc.category,
        title: tc.title,
        expected: tc.expected,
        actual: actual,
        result: ok ? 'PASS' : 'FAIL',
        message: errorText,
      });
    });

    writeTestResults_(tempSs, results);
    summarizeTestRun_(tempSs, runId, startedAt, results, suiteName);

    SpreadsheetApp.flush();

    SpreadsheetApp.getUi().alert(
      `自動回帰テスト完了 [${suiteName}]\nPASS=${results.filter(x => x.result === 'PASS').length}\nFAIL=${results.filter(x => x.result === 'FAIL').length}\n\n${tempSs.getUrl()}`
    );

    return {
      spreadsheetId: tempSs.getId(),
      spreadsheetUrl: tempSs.getUrl(),
      suiteName,
      total: results.length,
      passed: results.filter(x => x.result === 'PASS').length,
      failed: results.filter(x => x.result === 'FAIL').length,
    };

  } finally {
    if (oldTestMode == null) props.deleteProperty(TEST_MODE_KEY);
    else props.setProperty(TEST_MODE_KEY, oldTestMode);

    if (oldTestSpreadsheetId == null) props.deleteProperty(TEST_SPREADSHEET_ID_KEY);
    else props.setProperty(TEST_SPREADSHEET_ID_KEY, oldTestSpreadsheetId);

    if (oldTestNowIso == null) props.deleteProperty(TEST_NOW_ISO_KEY);
    else props.setProperty(TEST_NOW_ISO_KEY, oldTestNowIso);
  }
}

function getRegressionSuiteByName_(suiteName) {
  const all = getRegressionSuite_();

  switch (suiteName) {
    case TEST_SUITE_UNIT_1:
      return all.filter(tc => [
        'UT-01','UT-02','UT-03','UT-04','UT-05','UT-06','UT-07','UT-08'
      ].includes(tc.id));

    case TEST_SUITE_UNIT_2:
      return all.filter(tc => [
        'UT-09','UT-10','UT-11','UT-12','UT-13','UT-14','UT-15','UT-16'
      ].includes(tc.id));

    case TEST_SUITE_INTEGRATION:
      return all.filter(tc => [
        'IT-01','IT-02','IT-03','IT-04','IT-05','IT-06','IT-07','IT-08','IT-09','IT-10'
      ].includes(tc.id));

    case TEST_SUITE_SCENARIO:
      return all.filter(tc => [
        'ST-01','ST-02','ST-03','ST-04','ST-05',
        'BV-01','BV-02','BV-03','BV-04','BV-05','BV-06','BV-07','BV-08','BV-09','BV-10','BV-11','BV-12'
      ].includes(tc.id));

    default:
      throw new Error(`Unknown suiteName: ${suiteName}`);
  }
}

function createRegressionTestSpreadsheet_(name) {
  const folderName = 'GAS_TEST_RESULTS';

  let folder;
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = DriveApp.createFolder(folderName);
  }

  const ss = SpreadsheetApp.create(name);
  const file = DriveApp.getFileById(ss.getId());

  folder.addFile(file);
  DriveApp.getRootFolder().removeFile(file);

  return ss;
}
function initializeTestWorkbook_(ss) {
  const sheetNames = [
    'Members',
    'Config_Rules',
    'Config_Conditions',
    'Config_Destinations',
    'Config_System',
    'Log_Runs',
    'Log_Notifications',
    'Log_DataIssues',
    'Test_Results',
    'Test_Summary',
    'Fake_Discord_Posts',
    'Fake_Email_Posts',
  ];

  const existing = ss.getSheets();
  sheetNames.forEach((name, idx) => {
    let sh = ss.getSheetByName(name);
    if (!sh) {
      sh = (idx === 0 && existing.length > 0) ? existing[0].setName(name) : ss.insertSheet(name);
    }
  });

  setupMembersSheet_(ss.getSheetByName('Members'));
  setupConfigRulesSheet_(ss.getSheetByName('Config_Rules'));
  setupConfigConditionsSheet_(ss.getSheetByName('Config_Conditions'));
  setupConfigDestinationsSheet_(ss.getSheetByName('Config_Destinations'));
  setupConfigSystemSheet_(ss.getSheetByName('Config_System'));
  setupLogRunsSheet_(ss.getSheetByName('Log_Runs'));
  setupLogNotificationsSheet_(ss.getSheetByName('Log_Notifications'));
  setupLogDataIssuesSheet_(ss.getSheetByName('Log_DataIssues'));
  setupTestResultsSheet_(ss.getSheetByName('Test_Results'));
  setupTestSummarySheet_(ss.getSheetByName('Test_Summary'));
  setupFakeTransportSheet_(ss.getSheetByName('Fake_Discord_Posts'), 'discord');
  setupFakeTransportSheet_(ss.getSheetByName('Fake_Email_Posts'), 'email');
}

function resetTestWorkbookData_(ss) {
  ['Members','Config_Rules','Config_Conditions','Config_Destinations','Config_System','Log_Runs','Log_Notifications','Log_DataIssues','Fake_Discord_Posts','Fake_Email_Posts'].forEach(name => {
    const sh = ss.getSheetByName(name);
    const maxRows = sh.getMaxRows();
    const maxCols = sh.getMaxColumns();
    if (maxRows >= TEST_DATA_START_ROW) {
      sh.getRange(TEST_DATA_START_ROW, 1, maxRows - TEST_DATA_START_ROW + 1, maxCols).clearContent();
    }
  });
}

function clearFakeTransportLogs_() {
  // no-op. シートクリアで十分。
}

function seedTestCase_(ss, tc) {
  appendRowsByKeys_(ss.getSheetByName('Members'), tc.seed.members || []);
  appendRowsByKeys_(ss.getSheetByName('Config_Rules'), tc.seed.rules || []);
  appendRowsByKeys_(ss.getSheetByName('Config_Conditions'), tc.seed.conditions || []);
  appendRowsByKeys_(ss.getSheetByName('Config_Destinations'), tc.seed.destinations || []);
  appendRowsByKeys_(ss.getSheetByName('Config_System'), tc.seed.system || []);
  appendRowsByKeys_(ss.getSheetByName('Log_Notifications'), tc.seed.notificationLogs || []);
  appendRowsByKeys_(ss.getSheetByName('Log_Runs'), tc.seed.runLogs || []);
  appendRowsByKeys_(ss.getSheetByName('Log_DataIssues'), tc.seed.dataIssues || []);
}

function appendRowsByKeys_(sheet, rows) {
  if (!rows || rows.length === 0) return;
  const header = sheet.getRange(TEST_HEADER_KEY_ROW, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idx = {};
  header.forEach((k, i) => { if (k) idx[k] = i; });

  const values = rows.map(obj => {
    const row = new Array(header.length).fill('');
    Object.keys(obj).forEach(k => {
      if (typeof idx[k] !== 'undefined') row[idx[k]] = obj[k];
    });
    return row;
  });

  const start = Math.max(sheet.getLastRow() + 1, TEST_DATA_START_ROW);
  sheet.getRange(start, 1, values.length, header.length).setValues(values);
}

function writeTestResults_(ss, rows) {
  appendRowsByKeys_(ss.getSheetByName('Test_Results'), rows);
}

function summarizeTestRun_(ss, runId, startedAt, results, suiteName) {
  const sh = ss.getSheetByName('Test_Summary');
  const passed = results.filter(x => x.result === 'PASS').length;
  const failed = results.filter(x => x.result === 'FAIL').length;

  appendRowsByKeys_(sh, [{
    run_id: runId,
    executed_at: startedAt,
    suite_name: suiteName || '',
    total_count: results.length,
    pass_count: passed,
    fail_count: failed,
  }]);
}

function setupMembersSheet_(sh) {
  setupSheetByHeaders_(sh, [
    ['必須','会員キー','member_key'],
    ['必須','Discord表示名','handle_name'],
    ['任意','お名前','name_kanji'],
    ['任意','フリガナ','name_kana'],
    ['必須','DiscordID','discord_user_id'],
    ['必須','有効','is_active'],
    ['任意','電話番号','tel_number'],
    ['任意','メールアドレス','email'],
    ['任意','メールアドレス②','email2'],
    ['任意','LINE名','line_name'],
    ['任意','郵便番号','post_code'],
    ['任意','住所','address'],

    ['任意','お子様名前①','child1_name'],
    ['任意','お子様誕生日①','child1_birthday'],
    ['任意','お子様年齢①','child1_age'],

    ['任意','お子様名前②','child2_name'],
    ['任意','お子様誕生日②','child2_birthday'],
    ['任意','お子様年齢②','child2_age'],

    ['任意','お子様名前③','child3_name'],
    ['任意','お子様誕生日③','child3_birthday'],
    ['任意','お子様年齢③','child3_age'],

    ['任意','入会日時','joining_date'],
    ['任意','集中サポート開始日','support_start_date'],
    ['任意','集中サポート期間(月)','support_month'],
    ['任意','集中サポート終了日','support_end_date'],

    ['任意','所属クラス名','current_class_name'],
    ['任意','クラス名①','class_name1'],
    ['任意','クラス名②','class_name2'],
    ['任意','クラス名③','class_name3'],

    ['任意','連絡取れないフラグ','uncontactable_flag'],
    ['任意','対談インタビュー実施日','interview_date'],

    ['システム更新','未定通知メール送信回数','support_undecided_email_sent_count'],
    ['システム更新','未定通知エスカレーション済','support_undecided_escalated'],

    ['任意','備考','note'],
  ]);
}

function setupConfigRulesSheet_(sh) {
  setupSheetByHeaders_(sh, [
    ['必須','ルールID','rule_id'],
    ['必須','ルール名','rule_name'],
    ['必須','有効','enabled'],
    ['任意','優先度','priority'],
    ['任意','通知先コード','destination_code'],
    ['必須','通知チャネル','notify_channel'],
    ['任意','メール件名','email_subject'],
    ['任意','セクションタイトル','message_section_title'],
    ['任意','ヘッダ文','header_text'],
    ['任意','前置き','preface_text'],
    ['任意','運営連絡表示','include_ops_line'],
    ['任意','運営連絡文','ops_contact_text'],
    ['任意','メンションする','mention_member'],
  ]);
}

function setupConfigConditionsSheet_(sh) {
  setupSheetByHeaders_(sh, [
    ['必須','ルールID','rule_id'],
    ['必須','グループ番号','group_no'],
    ['必須','列','col'],
    ['必須','演算子','op'],
    ['任意','値1','value'],
    ['任意','値2','value2'],
    ['任意','型','type'],
    ['必須','有効','enabled'],
  ]);
}

function setupConfigDestinationsSheet_(sh) {
  setupSheetByHeaders_(sh, [
    ['必須','通知先コード','destination_code'],
    ['任意','通知先名','dest_name'],
    ['必須','WebhookURL','webhook_url'],
  ]);
}

function setupConfigSystemSheet_(sh) {
  setupSheetByHeaders_(sh, [
    ['必須','キー','config_key'],
    ['必須','値','config_value'],
  ]);
}

function setupLogRunsSheet_(sh) {
  setupSheetByHeaders_(sh, [
    ['システム更新','実行ID','run_id'],
    ['システム更新','実行日時','run_at'],
    ['システム更新','トリガー種別','trigger_type'],
    ['システム更新','対象月','target_month'],
    ['システム更新','Discord成否','discord_post_status'],
    ['システム更新','エラー','error'],
  ]);
}

function setupLogNotificationsSheet_(sh) {
  setupSheetByHeaders_(sh, [
    ['システム更新','実行ID','run_id'],
    ['システム更新','実行日時','run_at'],
    ['システム更新','チャネル','channel'],
    ['システム更新','トリガー種別','trigger_type'],
    ['システム更新','ルールID','rule_id'],
    ['システム更新','対象月','target_month'],
    ['システム更新','会員キー','member_key'],
    ['システム更新','表示名','handle_name'],
    ['システム更新','ステータス','status'],
    ['システム更新','詳細','detail'],
    ['システム更新','エラー','error'],
    ['システム更新','Discord応答','discord_response'],
  ]);
}

function setupLogDataIssuesSheet_(sh) {
  setupSheetByHeaders_(sh, [
    ['システム更新','実行ID','run_id'],
    ['システム更新','実行日時','run_at'],
    ['システム更新','トリガー種別','trigger_type'],
    ['システム更新','対象月','target_month'],
    ['システム更新','会員キー','member_key'],
    ['システム更新','表示名','handle_name'],
    ['システム更新','シート行','sheet_row'],
    ['システム更新','重要度','severity'],
    ['システム更新','不備コード','issue_code'],
    ['システム更新','不備内容','issue_message'],
    ['システム更新','項目キー','field_key'],
    ['システム更新','生値','raw_value'],
  ]);
}

function setupTestResultsSheet_(sh) {
  setupSheetByHeaders_(sh, [
    ['システム更新','RunID','run_id'],
    ['システム更新','実行日時','executed_at'],
    ['システム更新','テストID','test_id'],
    ['システム更新','分類','category'],
    ['システム更新','タイトル','title'],
    ['システム更新','期待値','expected'],
    ['システム更新','実測値','actual'],
    ['システム更新','結果','result'],
    ['システム更新','メッセージ','message'],
  ]);
}

function setupTestSummarySheet_(sh) {
  setupSheetByHeaders_(sh, [
    ['システム更新','実行ID','run_id'],
    ['システム更新','実行日時','executed_at'],
    ['システム更新','スイート名','suite_name'],
    ['システム更新','総件数','total_count'],
    ['システム更新','PASS件数','pass_count'],
    ['システム更新','FAIL件数','fail_count'],
  ]);
}

function setupFakeTransportSheet_(sh, type) {
  setupSheetByHeaders_(sh, [
    ['システム更新','記録日時','logged_at'],
    ['システム更新','種別','transport_type'],
    ['システム更新','宛先','target'],
    ['システム更新','件名','subject'],
    ['システム更新','本文','content'],
  ]);
  sh.getRange(TEST_DATA_START_ROW, 2).setValue(type);
  sh.getRange(TEST_DATA_START_ROW, 2).clearContent();
}

function setupSheetByHeaders_(sh, defs) {
  sh.clear();
  const categories = defs.map(x => x[0]);
  const labels = defs.map(x => x[1]);
  const keys = defs.map(x => x[2]);
  sh.getRange(TEST_HEADER_CATEGORY_ROW, 1, 1, defs.length).setValues([categories]);
  sh.getRange(TEST_HEADER_LABEL_ROW, 1, 1, defs.length).setValues([labels]);
  sh.getRange(TEST_HEADER_KEY_ROW, 1, 1, defs.length).setValues([keys]);
}
