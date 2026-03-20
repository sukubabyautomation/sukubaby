// Validation.gs

/**
 * 開始日 > 終了日 の矛盾をチェックしたい列ペア
 * 必要に応じて追加してください
 */
const VALIDATION_DATE_RANGE_PAIRS = [
  ['support_start_date', 'support_end_date'],
];

/**
 * 会員データを一括検証
 * 戻り値:
 * {
 *   validMembers: [],
 *   invalidMembers: [],
 *   issues: []
 * }
 */
function validateMembers_(members, rules, conditionsByRule) {
  const dateColumns = collectDateColumnsFromConditions_(conditionsByRule);

  const hasDiscordRule = (rules || []).some(r => r.notify_channel === 'DISCORD');
  const hasMentionDiscordRule = (rules || []).some(
    r => r.notify_channel === 'DISCORD' && r.mention_member === true
  );

  const validMembers = [];
  const invalidMembers = [];
  const issues = [];

  (members || []).forEach(member => {
    const memberIssues = validateMemberData_(member, {
      hasDiscordRule,
      hasMentionDiscordRule,
      dateColumns,
      dateRangePairs: VALIDATION_DATE_RANGE_PAIRS,
    });

    if (memberIssues.length > 0) {
      invalidMembers.push(member);
      issues.push(...memberIssues);
    } else {
      validMembers.push(member);
    }
  });

  return {
    validMembers,
    invalidMembers,
    issues,
  };
}

/**
 * 会員1件分の検証
 */
function validateMemberData_(member, ctx) {
  const issues = [];
  const row = member._row || {};

  // 1) Discordハンドルネーム未入力
  if (ctx.hasDiscordRule && !String(member.handle_name || '').trim()) {
    issues.push(makeDataIssue_(member, {
      severity: 'ERROR',
      issue_code: 'HANDLE_NAME_EMPTY',
      issue_message: 'Discordハンドルネーム未入力',
      field_key: 'handle_name',
      raw_value: member.handle_name,
    }));
  }

  // 参考: mentionを使うルールがあるなら discord_user_id も検証
  if (ctx.hasMentionDiscordRule) {
    const id = String(member.discord_user_id || '').trim();
    if (!/^\d{15,21}$/.test(id)) {
      issues.push(makeDataIssue_(member, {
        severity: 'ERROR',
        issue_code: 'DISCORD_USER_ID_INVALID',
        issue_message: 'DiscordユーザーID未入力または形式不正',
        field_key: 'discord_user_id',
        raw_value: member.discord_user_id,
      }));
    }
  }

  // 2) 日付フォーマット不正
  (ctx.dateColumns || []).forEach(col => {
    const raw = row[col];
    if (isEmptyValue_(raw)) return;

    const d = tryParseSheetDate_(raw);
    if (!d) {
      issues.push(makeDataIssue_(member, {
        severity: 'ERROR',
        issue_code: 'DATE_FORMAT_INVALID',
        issue_message: '日付フォーマット不正',
        field_key: col,
        raw_value: raw,
      }));
    }
  });

  // 3) 開始日 > 終了日の矛盾
  (ctx.dateRangePairs || []).forEach(pair => {
    const startCol = pair[0];
    const endCol = pair[1];

    if (!(startCol in row) || !(endCol in row)) return;

    const startRaw = row[startCol];
    const endRaw = row[endCol];

    if (isEmptyValue_(startRaw) || isEmptyValue_(endRaw)) return;

    const startDate = tryParseSheetDate_(startRaw);
    const endDate = tryParseSheetDate_(endRaw);

    // 片方でも不正なら、このチェックではなく DATE_FORMAT_INVALID 側で拾う
    if (!startDate || !endDate) return;

    if (startDate.getTime() > endDate.getTime()) {
      issues.push(makeDataIssue_(member, {
        severity: 'ERROR',
        issue_code: 'DATE_RANGE_INVALID',
        issue_message: `開始日 > 終了日の矛盾データ (${startCol} > ${endCol})`,
        field_key: `${startCol},${endCol}`,
        raw_value: `${stringifyRawValue_(startRaw)} | ${stringifyRawValue_(endRaw)}`,
      }));
    }
  });

  return issues;
}

/**
 * Config_Conditions で type=DATE の列を収集
 */
function collectDateColumnsFromConditions_(conditionsByRule) {
  const set = new Set();

  Object.keys(conditionsByRule || {}).forEach(ruleId => {
    const groupMap = conditionsByRule[ruleId] || {};
    Object.keys(groupMap).forEach(groupNo => {
      (groupMap[groupNo] || []).forEach(cond => {
        const type = String(cond.type || '').trim().toUpperCase();
        const col = String(cond.col || '').trim();
        if (type === 'DATE' && col) {
          set.add(col);
        }
      });
    });
  });

  return Array.from(set);
}

/**
 * 管理者向けサマリ文面
 */
function buildDataIssueSummaryMessage_(issues, targetMonth, systemConfig) {
  if (!issues || issues.length === 0) return '';

  const countByCode = {};
  issues.forEach(issue => {
    countByCode[issue.issue_code] = (countByCode[issue.issue_code] || 0) + 1;
  });

  const lines = [];
  if (systemConfig.admin_mention) {
    lines.push(systemConfig.admin_mention);
  }

  lines.push(`【要確認】データ不備を検知しました`);
  lines.push(`対象月: ${toMonthLabel_(targetMonth)}`);
  lines.push(`不備件数: ${issues.length}件`);
  lines.push('');

  Object.keys(countByCode).sort().forEach(code => {
    lines.push(`- ${code}: ${countByCode[code]}件`);
  });

  lines.push('');
  lines.push('詳細は Log_DataIssues シートを確認してください。');

  return lines.join('\n');
}

/**
 * issue オブジェクト生成
 */
function makeDataIssue_(member, params) {
  return {
    member_key: member.member_key || '',
    handle_name: member.handle_name || '',
    sheet_row: member._sheet_row || '',
    severity: params.severity || 'ERROR',
    issue_code: params.issue_code || '',
    issue_message: params.issue_message || '',
    field_key: params.field_key || '',
    raw_value: stringifyRawValue_(params.raw_value),
  };
}

/**
 * シート値の日付パース
 * - Date型
 * - シリアル値
 * - 文字列 yyyy/MM/dd, yyyy-MM-dd, yyyy/MM, yyyy-MM などを救済
 */
function tryParseSheetDate_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    // Google Sheets serial date
    const millis = Math.round((value - 25569) * 86400 * 1000);
    const d = new Date(millis);
    if (!isNaN(d.getTime())) {
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
  }

  const s = String(value || '').trim();
  if (!s) return null;

  let m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d) {
      return dt;
    }
    return null;
  }

  // 月だけが入る運用を救済したい場合
  m = s.match(/^(\d{4})[-\/](\d{1,2})$/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const dt = new Date(y, mo - 1, 1);
    if (dt.getFullYear() === y && dt.getMonth() === mo - 1) {
      return dt;
    }
    return null;
  }

  const d2 = new Date(s);
  if (!isNaN(d2.getTime())) {
    return new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
  }

  return null;
}

function stringifyRawValue_(v) {
  if (v instanceof Date && !isNaN(v.getTime())) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(v == null ? '' : v);
}