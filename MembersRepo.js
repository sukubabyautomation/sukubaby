// MembersRepo.gs

/**
 * Members:
 *  - member_key
 *  - handle_name
 *  - discord_user_id
 *  - is_active
 *  - email
 *  - email2
 *  - tel_number
 *  - line_name
 *  - support_undecided_email_sent_count
 *  - support_undecided_escalated
 */
function loadMembers_(ss) {
  const sh = mustSheet_(ss, 'Members');
  const { header, rows } = getHeaderAndRows_(sh);

  assertHeaderHasKeys_('Members', header, ['member_key', 'handle_name', 'discord_user_id', 'is_active']);
  const idx = indexMap_(header);

  const members = rows.map((r, i) => {
    const isActive = (r[idx.is_active] === true) || (normalizeBool_(r[idx.is_active]) === true);

    return {
      member_key: String(r[idx.member_key] || '').trim(),
      handle_name: String(r[idx.handle_name] || '').trim(),
      discord_user_id: String(r[idx.discord_user_id] || '').trim(),
      is_active: isActive,

      // 既存
      email: (typeof idx.email !== 'undefined') ? String(r[idx.email] || '').trim() : '',

      // ★追加：管理者通知で使う連絡先情報
      email2: (typeof idx.email2 !== 'undefined') ? String(r[idx.email2] || '').trim() : '',
      tel_number: (typeof idx.tel_number !== 'undefined') ? String(r[idx.tel_number] || '').trim() : '',
      line_name: (typeof idx.line_name !== 'undefined') ? String(r[idx.line_name] || '').trim() : '',

      support_undecided_email_sent_count:
        (typeof idx.support_undecided_email_sent_count !== 'undefined')
          ? toSafeNumber_(r[idx.support_undecided_email_sent_count], 0)
          : 0,

      support_undecided_escalated:
        (typeof idx.support_undecided_escalated !== 'undefined')
          ? normalizeBool_(r[idx.support_undecided_escalated])
          : null,

      _sheet_row: i + 4,
      _row: buildRowObject_(header, r),
    };
  }).filter(m => m.is_active);

  return members;
}

function buildRowObject_(header, row) {
  const obj = {};
  (header || []).forEach((k, i) => {
    const key = String(k || '').trim();
    if (key) obj[key] = row[i];
  });
  return obj;
}

/**
 * member_key ごとに列更新
 * patches = {
 *   "MEM001": { support_undecided_email_sent_count: 2, support_undecided_escalated: true },
 *   ...
 * }
 */
function updateMembersByMemberKey_(ss, patches) {
  const keys = Object.keys(patches || {});
  if (keys.length === 0) return;

  const sh = mustSheet_(ss, 'Members');
  const { header, rows } = getHeaderAndRows_(sh);
  const idx = indexMap_(header);

  assertHeaderHasKeys_('Members', header, ['member_key']);

  const rowNumByMemberKey = {};
  rows.forEach((r, i) => {
    const memberKey = String(r[idx.member_key] || '').trim();
    if (!memberKey) return;
    rowNumByMemberKey[memberKey] = i + 4; // データ開始行は4行目
  });

  keys.forEach(memberKey => {
    const rowNum = rowNumByMemberKey[memberKey];
    if (!rowNum) return;

    const patch = patches[memberKey] || {};
    Object.keys(patch).forEach(fieldKey => {
      if (typeof idx[fieldKey] === 'undefined') {
        throw new Error(`Members: update target column not found: ${fieldKey}`);
      }
      sh.getRange(rowNum, idx[fieldKey] + 1).setValue(patch[fieldKey]);
    });
  });
}