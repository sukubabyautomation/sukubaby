/****************
 * Main.gs
 *
 * 役割:
 * - メニュー(UI)提供
 * - 実行エントリーポイント（全ルール / 単独ルール）
 * - ルール単位のスケジュール登録（擬似トリガー）
 * - スケジュール実行ディスパッチ（毎分トリガー）
 *
 * 前提:
 * - 各シートは「1行目:日本語」「2行目:英字キー」「3行目以降:データ」
 * - Discord送信/分割、Config読み込み、条件評価は他ファイルに実装済み
 ****************/

const TIMEZONE = 'Asia/Tokyo';

// ---- スケジュール管理（ScriptProperties） ----
const SCHEDULE_KEY_PREFIX = 'SCHEDULE:'; // SCHEDULE:<uuid> = JSON
const DISPATCHER_TRIGGER_HANDLER = 'dispatchScheduledRuns_';
const DISPATCHER_TRIGGER_RATE_MIN = 1;   // 毎分（分まで正確にしたい要件に対応）

/**
 * スプレッドシートを開いた時にメニューを表示
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('会員ステータス通知')
    .addItem('今すぐ実行（全ルール / MANUAL）', 'runMonthlyNoticeManual')
    .addItem('ルールIDを入力して単独実行', 'runMonthlyNoticeByRuleIdPrompt')
    .addSeparator()
    .addItem('トリガー作成（ルールID＋日時指定）', 'createRuleTriggerPrompt')
    .addItem('トリガー一覧表示', 'listMyTriggersUi')
    .addSeparator()
    .addItem('テストモード状態確認', 'showTestModeStatusUi')
    .addItem('テストモード解除', 'clearTestModeUi')
    .addSeparator()
    .addItem('回帰テスト：単体①', 'runRegressionTestsUnit1')
    .addItem('回帰テスト：単体②', 'runRegressionTestsUnit2')
    .addItem('回帰テスト：結合', 'runRegressionTestsIntegration')
    .addItem('回帰テスト：シナリオ/境界値', 'runRegressionTestsScenario')
    .addToUi();
}

/**
 * 本番手動実行前にテストモード残留を解除する
 * 手動実行は常に本番シートを向く、という運用に固定する。
 */
function forceProductionModeForManualRun_() {
  if (isTestMode_()) {
    console.warn('TEST_MODE が残留していたため、手動実行前に解除しました。');
    clearTestMode_();
  }
}

/**
 * 全ルールを手動実行
 */
function runMonthlyNoticeManual() {
  runMonthlyNotice_('MANUAL');
}

/**
 * ---- ルールIDを入力して単独実行 ----
 */
function runMonthlyNoticeByRuleIdPrompt() {
  const ui = SpreadsheetApp.getUi();
  const res = ui.prompt('ルールID指定で実行', '実行したい rule_id を入力してください（例：START_NEXT）', ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;

  const ruleId = String(res.getResponseText() || '').trim();
  if (!ruleId) {
    ui.alert('rule_id が空です。');
    return;
  }

  runMonthlyNotice_('MANUAL_RULE', ruleId);
}

/**
 * ---- トリガー作成（ルールID＋日時指定） ----
 */
function createRuleTriggerPrompt() {
  const ui = SpreadsheetApp.getUi();

  const r1 = ui.prompt('トリガー作成', '実行したい rule_id を入力してください（例：START_NEXT）', ui.ButtonSet.OK_CANCEL);
  if (r1.getSelectedButton() !== ui.Button.OK) return;
  const ruleId = String(r1.getResponseText() || '').trim();
  if (!ruleId) return ui.alert('rule_id が空です。');

  const r2 = ui.prompt('トリガー作成', '初回実行日時（JST）を入力してください。\n形式: YYYY-MM-DD HH:MM\n例: 2026-03-20 10:00', ui.ButtonSet.OK_CANCEL);
  if (r2.getSelectedButton() !== ui.Button.OK) return;
  const firstRunStr = String(r2.getResponseText() || '').trim();

  const firstRunAt = parseJstDateTime_(firstRunStr);
  if (!firstRunAt) return ui.alert('日時形式が不正です。例: 2026-03-20 10:00');

  const r3 = ui.prompt('トリガー作成', '毎月の実行日（1〜28推奨）を入力してください（例: 20）', ui.ButtonSet.OK_CANCEL);
  if (r3.getSelectedButton() !== ui.Button.OK) return;
  const day = Number(String(r3.getResponseText() || '').trim());
  if (!Number.isFinite(day) || day < 1 || day > 28) return ui.alert('日付は 1〜28 で入力してください');

  const r4 = ui.prompt('トリガー作成', '毎月の実行時刻（0〜23）を入力してください（例: 10）', ui.ButtonSet.OK_CANCEL);
  if (r4.getSelectedButton() !== ui.Button.OK) return;
  const hour = Number(String(r4.getResponseText() || '').trim());
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return ui.alert('hour は 0〜23');

  const r5 = ui.prompt('トリガー作成', '毎月の実行分（0〜59）を入力してください（例: 0）', ui.ButtonSet.OK_CANCEL);
  if (r5.getSelectedButton() !== ui.Button.OK) return;
  const minute = Number(String(r5.getResponseText() || '').trim());
  if (!Number.isFinite(minute) || minute < 0 || minute > 59) return ui.alert('minute は 0〜59');

  // ルール存在チェック（※この関数がある前提。無ければ削ってもOK）
  if (typeof assertRuleExists_ === 'function') {
    assertRuleExists_(ruleId);
  }

  const scheduleId = registerSchedule_({
    rule_id: ruleId,
    first_run_at: firstRunAt.toISOString(),
    monthly_day: day,
    monthly_hour: hour,
    monthly_minute: minute,
    enabled: true,
    created_at: new Date().toISOString(),
    first_run_done: false,
    last_monthly_run: '',
  });

  ensureDispatcherTrigger_();

  ui.alert(`登録しました。\nschedule_id=${scheduleId}\nrule_id=${ruleId}\n毎月${day}日 ${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`);
}

/**
 * HTMLダイアログから呼ばれる：スケジュール登録
 *
 * @param {string} ruleId 実行するrule_id
 * @param {string} firstRunStr "YYYY-MM-DD HH:MM" (JST)
 * @param {number} day 毎月何日(1-28推奨)
 * @param {number} hour 毎月何時(0-23)
 * @param {number} minute 毎月何分(0-59)
 * @return {{schedule_id: string}}
 */
function createMonthlyRuleTriggerFromUi_(ruleId, firstRunStr, day, hour, minute) {
  // ルールが存在するかを早めにチェック
  assertRuleExists_(ruleId);

  const firstRunAt = parseJstDateTime_(firstRunStr);
  if (!firstRunAt) throw new Error('初回実行日時の形式が不正です。例: 2026-03-20 10:00');

  const d = Number(day);
  const h = Number(hour);
  const m = Number(minute);

  if (!Number.isFinite(d) || d < 1 || d > 28) throw new Error('day は 1〜28 で入力してください');
  if (!Number.isFinite(h) || h < 0 || h > 23) throw new Error('hour は 0〜23 で入力してください');
  if (!Number.isFinite(m) || m < 0 || m > 59) throw new Error('minute は 0〜59 で入力してください');

  const scheduleId = registerSchedule_({
    rule_id: ruleId,
    first_run_at: firstRunAt.toISOString(),
    monthly_day: d,
    monthly_hour: h,
    monthly_minute: m,
    enabled: true,
    created_at: new Date().toISOString(),
    // 実行管理
    first_run_done: false,
    last_monthly_run: '', // "YYYY-MM"
  });

  // ディスパッチトリガーが無ければ作成
  ensureDispatcherTrigger_();

  return { schedule_id: scheduleId };
}

/**
 * ---- 実行エンジン（全ルール / 単独ルール） ----
 *
 * @param {string} triggerType "MANUAL" | "MANUAL_RULE" | "SCHEDULE_RULE" など
 * @param {string=} onlyRuleId 指定時、そのrule_idだけ実行
 */
function runMonthlyNotice_(triggerType, onlyRuleId) {
  const ss = getRuntimeSpreadsheet_();

  const runAt = getRuntimeNow_();
  const runId = Utilities.formatDate(runAt, TIMEZONE, 'yyyyMMdd-HHmmss');
  const targetMonth = getNextMonthKey_(runAt);

  const systemConfig = loadSystemConfig_(ss);
  const destinations = loadDestinations_(ss);
  let rules = loadRules_(ss, destinations);
  const conditionsByRule = loadConditions_(ss);
  const members = loadMembers_(ss);

  if (onlyRuleId) {
    Logger.log('isTestMode=' + isTestMode_());
    Logger.log('runtimeSpreadsheetId=' + getRuntimeSpreadsheet_().getId());
    rules = rules.filter(r => r.rule_id === onlyRuleId);
    if (rules.length === 0) throw new Error(`指定した rule_id が見つかりません: ${onlyRuleId}`);
  }

  // ---- データ検証 ----
  const validationResult = validateMembers_(members, rules, conditionsByRule);
  const validMembers = validationResult.validMembers;
  const dataIssues = validationResult.issues || [];

  if (dataIssues.length > 0) {
    appendDataIssueLogs_(ss, dataIssues.map(issue => ({
      run_id: runId,
      run_at: runAt,
      trigger_type: onlyRuleId ? `${triggerType}(${onlyRuleId})` : triggerType,
      target_month: targetMonth,
      member_key: issue.member_key,
      handle_name: issue.handle_name,
      sheet_row: issue.sheet_row,
      severity: issue.severity,
      issue_code: issue.issue_code,
      issue_message: issue.issue_message,
      field_key: issue.field_key,
      raw_value: issue.raw_value,
    })));

    const adminDest = destinations[systemConfig.admin_dest_id];
    if (adminDest && adminDest.webhook_url) {
      const summary = buildDataIssueSummaryMessage_(dataIssues, targetMonth, systemConfig);
      if (summary) {
        try {
          postDiscordWebhookChunked_(adminDest.webhook_url, summary);
        } catch (e) {
          console.error(`Data issue summary post failed: ${e && e.stack ? e.stack : e}`);
        }
      }
    }
  }

  const sentIndex = buildSentIndex_(ss, targetMonth);
  const result = evaluateMembersByRules_(validMembers, rules, conditionsByRule, runAt, targetMonth, sentIndex);
  const jobs = buildSendJobs_(result, targetMonth, systemConfig, destinations);

  let discordOk = true;
  let err = '';
  const notificationLogs = [];
  const memberPatches = {};

  const queueMemberPatch_ = (memberKey, patch) => {
    if (!memberKey) return;
    if (!memberPatches[memberKey]) memberPatches[memberKey] = {};
    Object.assign(memberPatches[memberKey], patch);
  };

  jobs.forEach(job => {
    try {
      if (job.type === 'DISCORD_ROOM') {
        postDiscordWebhookChunked_(job.webhook_url, job.content);

        (job.member_keys || []).forEach(memberKey => {
          notificationLogs.push({
            run_id: runId,
            run_at: runAt,
            channel: 'DISCORD_ROOM',
            status: 'SENT',
            target_month: targetMonth,
            rule_id: job.rule_id,
            member_key: memberKey,
            detail: 'room notify',
            error: '',
          });
        });
        return;
      }

      if (job.type === 'EMAIL') {
        sendEmail_(job.to, job.subject, job.body, systemConfig.mail_sender_name);

        notificationLogs.push({
          run_id: runId,
          run_at: runAt,
          channel: 'EMAIL',
          status: 'SENT',
          target_month: targetMonth,
          rule_id: job.rule_id,
          member_key: job.member_key,
          detail: job.to,
          error: '',
        });

        if (job.rule_id === systemConfig.support_undecided_rule_id) {
          const member = validMembers.find(m => m.member_key === job.member_key);
          const currentCount = member ? toSafeNumber_(member.support_undecided_email_sent_count, 0) : 0;

          queueMemberPatch_(job.member_key, {
            support_undecided_email_sent_count: currentCount + 1
          });
        }
        return;
      }

            if (job.type === 'EMAIL_MISSING') {
        notificationLogs.push({
          run_id: runId,
          run_at: runAt,
          channel: 'EMAIL',
          status: 'FAILED',
          target_month: targetMonth,
          rule_id: job.rule_id,
          member_key: job.member_key,
          detail: job.detail || 'email missing',
          error: 'メールアドレス未設定のため送信不可',
        });

        postDiscordWebhookChunked_(job.webhook_url, job.content);

        notificationLogs.push({
          run_id: runId,
          run_at: runAt,
          channel: 'ADMIN_DISCORD',
          status: 'SENT',
          target_month: targetMonth,
          rule_id: job.rule_id,
          member_key: job.member_key,
          detail: 'email missing escalated',
          error: '',
        });

        return;
      }

      if (job.type === 'ADMIN_DISCORD') {
        postDiscordWebhookChunked_(job.webhook_url, job.content);

        notificationLogs.push({
          run_id: runId,
          run_at: runAt,
          channel: 'ADMIN_DISCORD',
          status: 'SENT',
          target_month: targetMonth,
          rule_id: job.rule_id,
          member_key: job.member_key,
          detail: 'support_undecided escalated',
          error: '',
        });

        queueMemberPatch_(job.member_key, {
          support_undecided_escalated: true
        });
        return;
      }

      throw new Error(`Unknown job type: ${job.type}`);

    } catch (e) {
      const errorText = String(e && e.stack ? e.stack : e);

      // Discord系失敗
      if (job.type === 'DISCORD_ROOM' || job.type === 'ADMIN_DISCORD') {
        discordOk = false;
        if (!err) err = errorText;

        if (job.type === 'DISCORD_ROOM') {
          (job.member_keys || []).forEach(memberKey => {
            notificationLogs.push({
              run_id: runId,
              run_at: runAt,
              channel: 'DISCORD_ROOM',
              status: 'FAILED',
              target_month: targetMonth,
              rule_id: job.rule_id,
              member_key: memberKey,
              detail: 'room notify',
              error: errorText,
            });
          });
        } else {
          notificationLogs.push({
            run_id: runId,
            run_at: runAt,
            channel: 'ADMIN_DISCORD',
            status: 'FAILED',
            target_month: targetMonth,
            rule_id: job.rule_id,
            member_key: job.member_key || '',
            detail: 'support_undecided escalated',
            error: errorText,
          });
        }

        // 管理者へメール通知
        try {
          if (systemConfig.admin_alert_email) {
            const subject = `[障害通知] Discord送信失敗 (${job.rule_id || 'unknown'})`;
            const body = [
              'Discord送信失敗を検知しました。',
              '',
              `run_id: ${runId}`,
              `run_at: ${Utilities.formatDate(runAt, TIMEZONE, 'yyyy-MM-dd HH:mm:ss')}`,
              `trigger_type: ${onlyRuleId ? `${triggerType}(${onlyRuleId})` : triggerType}`,
              `target_month: ${targetMonth}`,
              `job_type: ${job.type}`,
              `rule_id: ${job.rule_id || ''}`,
              `member_key: ${job.member_key || (job.member_keys || []).join(',')}`,
              '',
              'error:',
              errorText
            ].join('\n');

            sendAdminAlertEmail_(
              systemConfig.admin_alert_email,
              subject,
              body,
              systemConfig.mail_sender_name
            );
          }
        } catch (mailErr) {
          console.error(`Admin alert mail failed: ${mailErr && mailErr.stack ? mailErr.stack : mailErr}`);
        }

        return;
      }

      // メール失敗
      if (job.type === 'EMAIL') {
        if (!err) err = errorText;

        notificationLogs.push({
          run_id: runId,
          run_at: runAt,
          channel: 'EMAIL',
          status: 'FAILED',
          target_month: targetMonth,
          rule_id: job.rule_id,
          member_key: job.member_key,
          detail: job.to,
          error: errorText,
        });

        return;
      }

      // その他
      if (!err) err = errorText;
    }
  });

  if (notificationLogs.length > 0) {
    appendNotificationLogs_(ss, notificationLogs);
  }

  if (Object.keys(memberPatches).length > 0) {
    updateMembersByMemberKey_(ss, memberPatches);
  }

  appendRunLog_(ss, {
    run_id: runId,
    run_at: runAt,
    trigger_type: onlyRuleId ? `${triggerType}(${onlyRuleId})` : triggerType,
    target_month: targetMonth,
    discord_post_status: discordOk ? 'OK' : 'NG',
    error: err,
  });

  SpreadsheetApp.flush();
}

/**
 * ---- スケジュール実行ディスパッチ（毎分トリガー）----
 * ScriptPropertiesに登録されたスケジュールを走査し、
 * - 初回実行日時(first_run_at)に到達したら一度だけ実行
 * - 以降は毎月指定日・指定時刻・指定分に一致したら実行（同月二重実行防止）
 */
function dispatchScheduledRuns_() {
  const lock = LockService.getScriptLock();
  // すでに別実行が動いているなら即終了（UI詰まりを防ぐ）
  if (!lock.tryLock(1000)) return;

  try {
    // ここから既存処理
    const now = new Date();
    const yyyyMm = Utilities.formatDate(now, TIMEZONE, 'yyyy-MM');

    const schedules = listSchedules_();

    schedules.forEach(s => {
      if (!s.enabled) return;

      if (!s.first_run_done) {
        const firstRunAt = new Date(s.first_run_at);
        if (!isNaN(firstRunAt.getTime()) && now.getTime() >= firstRunAt.getTime()) {
          safeRunRule_(s.rule_id, `SCHEDULE_RULE:first(${s.schedule_id})`);
          s.first_run_done = true;
        }
      }

      const day = Number(s.monthly_day);
      const hour = Number(s.monthly_hour);
      const minute = Number(s.monthly_minute);

      const nowDay = Number(Utilities.formatDate(now, TIMEZONE, 'd'));
      const nowHour = Number(Utilities.formatDate(now, TIMEZONE, 'H'));
      const nowMin = Number(Utilities.formatDate(now, TIMEZONE, 'm'));

      const alreadyRanThisMonth = (s.last_monthly_run === yyyyMm);

      if (!alreadyRanThisMonth && nowDay === day && nowHour === hour && nowMin === minute) {
        safeRunRule_(s.rule_id, `SCHEDULE_RULE:monthly(${s.schedule_id})`);
        s.last_monthly_run = yyyyMm;
      }

      saveSchedule_(s);
    });

  } finally {
    lock.releaseLock();
  }
}

/**
 * スケジュール登録（ScriptProperties）
 * @param {Object} schedule
 * @return {string} schedule_id
 */
function registerSchedule_(schedule) {
  const scheduleId = Utilities.getUuid();
  schedule.schedule_id = scheduleId;

  const props = PropertiesService.getScriptProperties();
  props.setProperty(SCHEDULE_KEY_PREFIX + scheduleId, JSON.stringify(schedule));
  return scheduleId;
}

/**
 * スケジュール一覧取得
 * @return {Array<Object>}
 */
function listSchedules_() {
  const props = PropertiesService.getScriptProperties();
  const keys = props.getKeys().filter(k => k.startsWith(SCHEDULE_KEY_PREFIX));

  return keys.map(k => {
    const raw = props.getProperty(k);
    return JSON.parse(raw);
  });
}

/**
 * スケジュール保存（上書き）
 * @param {Object} schedule
 */
function saveSchedule_(schedule) {
  const props = PropertiesService.getScriptProperties();
  props.setProperty(SCHEDULE_KEY_PREFIX + schedule.schedule_id, JSON.stringify(schedule));
}

/**
 * メニューからスケジュール一覧表示（運用確認用）
 */
function listMyTriggersUi() {
  const ui = SpreadsheetApp.getUi();
  const schedules = listSchedules_();

  if (schedules.length === 0) {
    ui.alert('登録されているスケジュールはありません。');
    return;
  }

  const lines = schedules.map(s => {
    const first = s.first_run_at ? s.first_run_at.replace('T', ' ').slice(0, 16) : '';
    const enabled = s.enabled ? 'ON' : 'OFF';
    const last = s.last_monthly_run || '-';
    return [
      `schedule_id=${s.schedule_id} [${enabled}]`,
      `  rule_id=${s.rule_id}`,
      `  first_run_at=${first} (done=${s.first_run_done})`,
      `  monthly=${s.monthly_day}日 ${String(s.monthly_hour).padStart(2,'0')}:${String(s.monthly_minute).padStart(2,'0')}`,
      `  last_monthly_run=${last}`,
    ].join('\n');
  });

  ui.alert(lines.join('\n\n'));
}

/**
 * ディスパッチ用トリガーが無ければ作成（毎分）
 */
function ensureDispatcherTrigger_() {
  const triggers = ScriptApp.getProjectTriggers();
  const exists = triggers.some(t => t.getHandlerFunction() === DISPATCHER_TRIGGER_HANDLER);
  if (exists) return;

  ScriptApp.newTrigger(DISPATCHER_TRIGGER_HANDLER)
    .timeBased()
    .everyMinutes(DISPATCHER_TRIGGER_RATE_MIN)
    .create();
}

/**
 * 指定 rule_id が Config_Rules に存在するかチェック
 */
function assertRuleExists_(ruleId) {
  const ss = getRuntimeSpreadsheet_();
  const destinations = loadDestinations_(ss);
  const rules = loadRules_(ss, destinations);

  if (!rules.some(r => r.rule_id === ruleId)) {
    throw new Error(`指定した rule_id が見つかりません: ${ruleId}`);
  }
}

/**
 * 例外でディスパッチ全体が止まらないように、ルール実行は安全にラップ
 */
function safeRunRule_(ruleId, triggerType) {
  try {
    runMonthlyNotice_(triggerType, ruleId);
  } catch (e) {
    console.error(`Scheduled run failed: rule_id=${ruleId} err=${e && e.stack ? e.stack : e}`);
  }
}

/**
 * "YYYY-MM-DD HH:MM" (JST) を Date に変換
 * ※プロジェクトのタイムゾーンを Asia/Tokyo にしておくこと
 */
function parseJstDateTime_(s) {
  const m = String(s || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);
  if (!m) return null;

  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const h = Number(m[4]);
  const mi = Number(m[5]);

  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h < 0 || h > 23 || mi < 0 || mi > 59) return null;

  return new Date(y, mo - 1, d, h, mi, 0);
}

function getTargetSs_() {
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) {
    // 今開いているシートがターゲットならそれを使う（最速＆権限問題が起きにくい）
    if (active.getId() === SPREADSHEET_ID) return active;
    // もし違っても、とりあえず active を返す（デバッグ用）
    // return active;
  }
  // 最後の手段として openById
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}
