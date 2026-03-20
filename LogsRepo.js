// LogsRepo.gs

/**
 * Log_Notifications から「既に送った」インデックスを作る
 * key: rule_id|target_month|member_key
 */
/**
 * Log_Notifications から「既に送った」インデックスを作る
 * key: rule_id|target_month|member_key
 */
function buildSentIndex_(ss, targetMonth) {
  const sh = mustSheet_(ss, 'Log_Notifications');
  const { header, rows } = getHeaderAndRows_(sh);

  assertHeaderHasKeys_('Log_Notifications', header, ['status', 'target_month', 'rule_id', 'member_key']);
  const idx = indexMap_(header);

  const set = new Set();
  rows.forEach(r => {
    const status = String(r[idx.status] || '').trim();
    const tm = normalizeTargetMonth_(r[idx.target_month]);

    if (status === 'SENT' && tm === targetMonth) {
      const ruleId = String(r[idx.rule_id] || '').trim();
      const memberKey = String(r[idx.member_key] || '').trim();
      set.add(`${ruleId}|${tm}|${memberKey}`);
    }
  });

  return set;
}

function normalizeTargetMonth_(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM');
  }

  const s = String(v || '').trim();

  // すでに YYYY-MM 形式ならそのまま返す
  if (/^\d{4}-\d{2}$/.test(s)) return s;

  // YYYY/M/D や Date文字列っぽいものを Date 化して救済
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM');
  }

  return s;
}

/**
 * 通知ログ追記
 */
function appendNotificationLogs_(ss, logRows) {
  if (!logRows || logRows.length === 0) return;

  const sh = mustSheet_(ss, 'Log_Notifications');
  const { header } = getHeaderAndRows_(sh);
  const idx = indexMap_(header);

  assertHeaderHasKeys_('Log_Notifications', header, [
    'run_id', 'run_at', 'channel', 'status', 'target_month', 'rule_id', 'member_key', 'detail', 'error'
  ]);

  const values = logRows.map(obj => {
    const row = new Array(header.length).fill('');
    row[idx.run_id] = obj.run_id || '';
    row[idx.run_at] = obj.run_at || '';
    row[idx.channel] = obj.channel || '';
    row[idx.status] = obj.status || '';
    row[idx.target_month] = obj.target_month || '';
    row[idx.rule_id] = obj.rule_id || '';
    row[idx.member_key] = obj.member_key || '';
    row[idx.detail] = obj.detail || '';
    row[idx.error] = obj.error || '';
    return row;
  });

  const startRow = sh.getLastRow() + 1;
  sh.getRange(startRow, 1, values.length, values[0].length).setValues(values);
}

/**
 * Log_Runs に実行ログを追記
 */
function appendRunLog_(ss, obj) {
  const sh = mustSheet_(ss, 'Log_Runs');
  sh.appendRow([
    obj.run_id,
    obj.run_at,
    obj.trigger_type,
    obj.target_month,
    obj.discord_post_status,
    obj.error || '',
  ]);
}

/**
 * データ不備ログ追記
 */
function appendDataIssueLogs_(ss, logRows) {
  if (!logRows || logRows.length === 0) return;

  const sh = mustSheet_(ss, 'Log_DataIssues');
  const { header } = getHeaderAndRows_(sh);
  const idx = indexMap_(header);

  assertHeaderHasKeys_('Log_DataIssues', header, [
    'run_id',
    'run_at',
    'trigger_type',
    'target_month',
    'member_key',
    'handle_name',
    'sheet_row',
    'severity',
    'issue_code',
    'issue_message',
    'field_key',
    'raw_value'
  ]);

  const values = logRows.map(obj => {
    const row = new Array(header.length).fill('');
    row[idx.run_id] = obj.run_id || '';
    row[idx.run_at] = obj.run_at || '';
    row[idx.trigger_type] = obj.trigger_type || '';
    row[idx.target_month] = obj.target_month || '';
    row[idx.member_key] = obj.member_key || '';
    row[idx.handle_name] = obj.handle_name || '';
    row[idx.sheet_row] = obj.sheet_row || '';
    row[idx.severity] = obj.severity || '';
    row[idx.issue_code] = obj.issue_code || '';
    row[idx.issue_message] = obj.issue_message || '';
    row[idx.field_key] = obj.field_key || '';
    row[idx.raw_value] = obj.raw_value || '';
    return row;
  });

  const startRow = sh.getLastRow() + 1;
  sh.getRange(startRow, 1, values.length, values[0].length).setValues(values);
}