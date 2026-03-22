// Config.gs

/**
 * Config_System
 *  - config_key
 *  - config_value
 */
function loadSystemConfig_(masterSs) {
  const sh = mustSheet_(masterSs, 'Config_System');
  const { header, rows } = getHeaderAndRows_(sh);

  assertHeaderHasKeys_('Config_System', header, ['config_key', 'config_value']);
  const idx = indexMap_(header);

  const map = {};
  rows.forEach(r => {
    const key = String(r[idx.config_key] || '').trim();
    if (!key) return;
    map[key] = r[idx.config_value];
  });

  return {
    admin_dest_id: String(map.admin_dest_id || '').trim(),
    admin_mention: String(map.admin_mention || '').trim(),
    support_undecided_rule_id: String(map.support_undecided_rule_id || 'SUPPORT_UNDECIDED').trim(),
    support_undecided_escalate_after_count: toSafeNumber_(map.support_undecided_escalate_after_count, 3),
    mail_sender_name: String(map.mail_sender_name || 'すくベビ自動化通知').trim(),
    admin_alert_email: String(map.admin_alert_email || '').trim(),
  };
}

/**
 * Config_Rules:
 *  - rule_id
 *  - rule_name
 *  - enabled
 *  - dest_id
 *  - notify_channel
 *  - email_subject
 *  - priority (任意)
 *  - message_section_title
 *  - header_text
 *  - preface_text
 *  - include_ops_line
 *  - ops_contact_text
 *  - mention_member
 */
function loadRules_(masterSs, destinations) {
  const sh = mustSheet_(masterSs, 'Config_Rules');
  const { header, rows } = getHeaderAndRows_(sh);

  assertHeaderHasKeys_('Config_Rules', header, [
    'rule_id', 'rule_name', 'enabled',
    'notify_channel',
    'message_section_title', 'header_text', 'preface_text',
    'include_ops_line', 'ops_contact_text', 'mention_member'
  ]);

  const idx = indexMap_(header);
  const rules = rows
    .filter(r => (r[idx.enabled] === true) || (normalizeBool_(r[idx.enabled]) === true))
    .map(r => {
      const ruleId = String(r[idx.rule_id] || '').trim();
      const notifyChannel = String(r[idx.notify_channel] || '').trim().toUpperCase();

      if (!ruleId) throw new Error('Config_Rules: rule_id is empty');
      if (!notifyChannel) throw new Error(`Config_Rules: notify_channel is empty for rule_id=${ruleId}`);
      if (!['DISCORD', 'EMAIL'].includes(notifyChannel)) {
        throw new Error(`Config_Rules: unsupported notify_channel=${notifyChannel} (rule_id=${ruleId})`);
      }

      const priority = (typeof idx.priority !== 'undefined') ? Number(r[idx.priority] || 9999) : 9999;

      let destId = '';
      let destName = '';
      let webhookUrl = '';

      if (notifyChannel === 'DISCORD') {
        destId = String(r[idx.dest_id] || '').trim();
        if (!destId) throw new Error(`Config_Rules: dest_id is empty for DISCORD rule_id=${ruleId}`);

        const dest = destinations[destId];
        if (!dest || !dest.webhook_url) {
          throw new Error(`Config_Destinations: webhook_url not found for dest_id=${destId} (rule_id=${ruleId})`);
        }

        destName = dest.dest_name || destId;
        webhookUrl = dest.webhook_url;
      }

      return {
        rule_id: ruleId,
        rule_name: String(r[idx.rule_name] || '').trim(),
        enabled: true,
        priority,

        notify_channel: notifyChannel,

        dest_id: destId,
        dest_name: destName,
        webhook_url: webhookUrl,

        email_subject: (typeof idx.email_subject !== 'undefined')
          ? String(r[idx.email_subject] || '').trim()
          : '',

        message_section_title: String(r[idx.message_section_title] || '').trim(),
        header_text: String(r[idx.header_text] || '').trim(),
        preface_text: String(r[idx.preface_text] || '').trim(),
        include_ops_line: (r[idx.include_ops_line] === true) || (normalizeBool_(r[idx.include_ops_line]) === true),
        ops_contact_text: String(r[idx.ops_contact_text] || '').trim(),
        mention_member: (r[idx.mention_member] === true) || (normalizeBool_(r[idx.mention_member]) === true),
      };
    });

  rules.sort((a, b) => (a.priority - b.priority) || a.rule_id.localeCompare(b.rule_id));
  return rules;
}

/**
 * Config_Conditions:
 *  - rule_id
 *  - group_no   (同じgroup_noはAND / group_no違いはOR)
 *  - col
 *  - op
 *  - value
 *  - value2
 *  - type
 *  - enabled
 */
function loadConditions_(masterSs) {
  const sh = mustSheet_(masterSs, 'Config_Conditions');
  const { header, rows } = getHeaderAndRows_(sh);

  assertHeaderHasKeys_('Config_Conditions', header, [
    'rule_id', 'group_no', 'col', 'op', 'value', 'value2', 'type', 'enabled'
  ]);

  const idx = indexMap_(header);
  const byRule = {};

  rows.forEach(r => {
    if ((r[idx.enabled] !== true) && (normalizeBool_(r[idx.enabled]) !== true)) return;

    const ruleId = String(r[idx.rule_id] || '').trim();
    if (!ruleId) return;

    const groupNo = Number(r[idx.group_no] || 1);
    const col = String(r[idx.col] || '').trim();
    const op = String(r[idx.op] || '').trim().toUpperCase();

    if (!col) throw new Error(`Config_Conditions: col is empty (rule_id=${ruleId})`);
    if (!op) throw new Error(`Config_Conditions: op is empty (rule_id=${ruleId}, col=${col})`);

    const value = r[idx.value];
    const value2 = r[idx.value2];
    const type = String(r[idx.type] || '').trim().toUpperCase();

    if (!byRule[ruleId]) byRule[ruleId] = {};
    if (!byRule[ruleId][groupNo]) byRule[ruleId][groupNo] = [];

    byRule[ruleId][groupNo].push({ col, op, value, value2, type });
  });

  return byRule;
}