// Logic.gs

/**
 * members × rules を評価し、ルール別bucketを作る
 */
function evaluateMembersByRules_(members, rules, conditionsByRule, runAt, targetMonth, sentIndex) {
  const buckets = {}; // rule_id -> [{member, rule, idemKey}]
  const counts = {};

  const ctx = {
    runAt,
    targetMonth,                  // "YYYY-MM"（実行日基準の翌月）
    monthLabel: toMonthLabel_(targetMonth),
  };

  for (const rule of rules) {
    buckets[rule.rule_id] = [];
    counts[rule.rule_id] = 0;

    const groups = conditionsByRule[rule.rule_id];
    if (!groups || Object.keys(groups).length === 0) {
      // 条件なしルールは誤爆しやすいので対象0
      continue;
    }

    for (const m of members) {
      if (!isRuleMatched_(m, groups, ctx)) continue;

      const idemKey = `${rule.rule_id}|${ctx.targetMonth}|${m.member_key}`;
      if (sentIndex && sentIndex.has(idemKey)) continue;

      buckets[rule.rule_id].push({ member: m, rule, idemKey });
      counts[rule.rule_id] += 1;
    }
  }

  return { buckets, counts, rules };
}

/**
 * groups: {groupNo: [cond,cond], ...}
 * 同じgroupNoはAND、groupNo違いはOR
 */
function isRuleMatched_(member, groups, ctx) {
  const groupNos = Object.keys(groups).map(n => Number(n)).sort((a, b) => a - b);

  for (const g of groupNos) {
    const conds = groups[g] || [];
    let all = true;
    for (const c of conds) {
      if (!evalCondition_(member, c, ctx)) {
        all = false;
        break;
      }
    }
    if (all) return true;
  }
  return false;
}

function evalCondition_(member, cond, ctx) {
  const left = member._row[cond.col];
  const op = cond.op;
  const type = cond.type || inferType_(left, cond.value);

  switch (op) {
    case 'IS_EMPTY':
      return isEmptyValue_(left);

    case 'NOT_EMPTY':
      return !isEmptyValue_(left);

    case 'EQ':
      return compareEq_(left, cond.value, type);

    case 'NEQ':
      return !compareEq_(left, cond.value, type);

    case 'CONTAINS':
      return String(left || '').includes(String(cond.value || ''));

    case 'NOT_CONTAINS':
      return !String(left || '').includes(String(cond.value || ''));

    case 'IN': {
      const list = parseList_(cond.value);
      return list.includes(String(left || '').trim());
    }

    // NUMBER
    case 'GT':
    case 'GTE':
    case 'LT':
    case 'LTE':
    case 'BETWEEN':
      return compareNumber_(left, cond.value, cond.value2, op);

    // BOOL
    case 'IS_TRUE':
      return normalizeBool_(left) === true;
    case 'IS_FALSE':
      return normalizeBool_(left) === false;

    // DATE
    case 'DATE_BEFORE':
    case 'DATE_AFTER':
      return compareDate_(left, cond.value, op);

    case 'MONTH_IS':
      return monthIs_(left, cond.value, ctx);

    default:
      throw new Error(`Unsupported op: ${op} (col=${cond.col})`);
  }
}

function inferType_(left, value) {
  if (left instanceof Date) return 'DATE';
  const b = normalizeBool_(left);
  if (b !== null) return 'BOOL';
  if (!isEmptyValue_(left) && !isNaN(Number(left))) return 'NUMBER';
  const vb = normalizeBool_(value);
  if (vb !== null) return 'BOOL';
  return 'STRING';
}

function compareEq_(left, right, type) {
  if (type === 'BOOL') {
    const lb = normalizeBool_(left);
    const rb = normalizeBool_(right);
    return lb !== null && rb !== null && lb === rb;
  }

  if (type === 'NUMBER') {
    if (isEmptyValue_(left) || isEmptyValue_(right)) return false;
    return Number(left) === Number(right);
  }

  if (type === 'DATE') {
    if (!(left instanceof Date) || isNaN(left.getTime())) return false;
    const r = (right instanceof Date) ? right : new Date(right);
    if (!(r instanceof Date) || isNaN(r.getTime())) return false;
    return left.getFullYear() === r.getFullYear()
      && left.getMonth() === r.getMonth()
      && left.getDate() === r.getDate();
  }

  // STRING
  return String(left || '').trim() === String(right || '').trim();
}

function compareNumber_(left, v1, v2, op) {
  if (isEmptyValue_(left)) return false;
  const n = Number(left);
  if (isNaN(n)) return false;

  const a = Number(v1);
  const b = Number(v2);

  switch (op) {
    case 'GT':  return !isNaN(a) && n > a;
    case 'GTE': return !isNaN(a) && n >= a;
    case 'LT':  return !isNaN(a) && n < a;
    case 'LTE': return !isNaN(a) && n <= a;
    case 'BETWEEN':
      return !isNaN(a) && !isNaN(b) && n >= a && n <= b;
    default:
      return false;
  }
}

function compareDate_(left, right, op) {
  if (!(left instanceof Date) || isNaN(left.getTime())) return false;
  const r = (right instanceof Date) ? right : new Date(right);
  if (!(r instanceof Date) || isNaN(r.getTime())) return false;

  if (op === 'DATE_BEFORE') return left.getTime() < r.getTime();
  if (op === 'DATE_AFTER') return left.getTime() > r.getTime();
  return false;
}

/**
 * MONTH_IS:
 * - value=NEXT_MONTH → ctx.targetMonth に一致
 * - value=THIS_MONTH → 実行月に一致
 * - value="YYYY-MM"  → その月に一致
 */
function monthIs_(left, value, ctx) {
  if (!(left instanceof Date) || isNaN(left.getTime())) return false;

  const key = monthKey_(new Date(left.getFullYear(), left.getMonth(), 1));
  const v = String(value || '').trim().toUpperCase();

  if (v === 'NEXT_MONTH') return key === ctx.targetMonth;
  if (v === 'THIS_MONTH') return key === monthKey_(ctx.runAt);

  if (/^\d{4}-\d{2}$/.test(String(value || '').trim())) {
    return key === String(value).trim();
  }
  return false;
}