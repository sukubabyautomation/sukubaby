// Utils.gs

/** ヘッダ行（英字キー）→ indexMap */
function indexMap_(headerRow) {
  const map = {};
  (headerRow || []).forEach((h, i) => {
    const key = String(h || '').trim();
    if (key) map[key] = i;
  });
  return map;
}

/**
 * シート共通構造
 * 1行目: カテゴリ
 * 2行目: 表示名
 * 3行目: 英字キー
 * 4行目〜: データ
 */
function getHeaderAndRows_(sheet) {
  const values = sheet.getDataRange().getValues();
  const header = values[2] || [];
  const rows = values.slice(3);
  return { header, rows };
}

/** シート必須チェック */
function mustSheet_(ss, name) {
  const sh = ss.getSheetByName(name);
  if (!sh) throw new Error(`Sheet not found: "${name}"`);
  return sh;
}

/** "YYYY-MM" */
function monthKey_(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** 実行日基準で翌月の "YYYY-MM" */
function getNextMonthKey_(baseDate) {
  const y = baseDate.getFullYear();
  const m = baseDate.getMonth();
  return monthKey_(new Date(y, m + 1, 1));
}

/** "YYYY-MM" -> "YYYY年MM月" */
function toMonthLabel_(yyyyMm) {
  return String(yyyyMm || '').replace('-', '年') + '月';
}

function isEmptyValue_(v) {
  return v === '' || v === null || typeof v === 'undefined';
}

/** TRUE/FALSE/boolean を正規化。判定できなければ null */
function normalizeBool_(v) {
  if (v === true) return true;
  if (v === false) return false;
  const s = String(v || '').trim().toUpperCase();
  if (s === 'TRUE') return true;
  if (s === 'FALSE') return false;
  return null;
}

/** TRUE 以外なら true（FALSE / 空 / null / undefined を含む） */
function isNotTrue_(v) {
  return normalizeBool_(v) !== true;
}

/** 数値化。空や不正値なら fallback */
function toSafeNumber_(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** カンマ区切り文字を配列化 */
function parseList_(v) {
  return String(v || '')
    .split(',')
    .map(x => x.trim())
    .filter(x => x.length > 0);
}

/** 3行目ヘッダの必須キー検証 */
function assertHeaderHasKeys_(sheetName, headerRow, requiredKeys) {
  const idx = indexMap_(headerRow);
  const missing = requiredKeys.filter(k => typeof idx[k] === 'undefined');
  if (missing.length) {
    throw new Error(`${sheetName}: required header keys missing: ${missing.join(', ')}`);
  }
}