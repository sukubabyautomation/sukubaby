// MessageBuilder.gs

function formatMemberLine_(member, rule) {
  const isValidDiscordId = (v) => /^[0-9]{15,21}$/.test(String(v || '').trim());

  if (rule.mention_member && isValidDiscordId(member.discord_user_id)) {
    return `<@${String(member.discord_user_id).trim()}>`;
  }
  return member.handle_name || null;
}

function replaceMonthLabel_(text, targetMonth) {
  return String(text || '').replace(/○月/g, toMonthLabel_(targetMonth));
}

function buildDiscordRoomMessage_(rule, members, targetMonth) {
  const items = (members || [])
    .map(m => formatMemberLine_(m, rule))
    .filter(Boolean);

  const lines = [];

  if (rule.header_text) {
    lines.push(replaceMonthLabel_(rule.header_text, targetMonth));
    lines.push('');
  }

  if (rule.preface_text) {
    lines.push(...replaceMonthLabel_(rule.preface_text, targetMonth).split('\n'));
    lines.push('');
  }

  const title = replaceMonthLabel_(rule.message_section_title, targetMonth);
  if (title) lines.push(title);

  if (items.length === 0) {
    lines.push('（該当者なし）');
  } else {
    lines.push(...items);
  }

  if (rule.include_ops_line && rule.ops_contact_text) {
    lines.push('');
    lines.push(replaceMonthLabel_(rule.ops_contact_text, targetMonth));
  }

  return lines.join('\n');
}

function buildEmailSubject_(rule, member, targetMonth) {
  const base = rule.email_subject || rule.rule_name || '会員通知';
  return replaceMonthLabel_(base, targetMonth);
}

function buildEmailBody_(rule, member, targetMonth) {
  const lines = [];

  if (member.handle_name) {
    lines.push(`${member.handle_name} 様`);
    lines.push('');
  }

  if (rule.header_text) {
    lines.push(replaceMonthLabel_(rule.header_text, targetMonth));
    lines.push('');
  }

  if (rule.preface_text) {
    lines.push(...replaceMonthLabel_(rule.preface_text, targetMonth).split('\n'));
    lines.push('');
  }

  const title = replaceMonthLabel_(rule.message_section_title, targetMonth);
  if (title) lines.push(title);

  if (rule.include_ops_line && rule.ops_contact_text) {
    lines.push('');
    lines.push(replaceMonthLabel_(rule.ops_contact_text, targetMonth));
  }

  return lines.join('\n');
}

function buildAdminEscalationMessage_(rule, member, targetMonth, systemConfig) {
  const lines = [];

  if (systemConfig.admin_mention) {
    lines.push(systemConfig.admin_mention);
  }

  lines.push(`【要対応】${rule.rule_name || rule.rule_id}`);
  lines.push(`${toMonthLabel_(targetMonth)}の通知で、下記会員へのメール送信回数が上限に達しました。`);
  lines.push('運営側で個別対応をお願いします。');
  lines.push('');

  lines.push(`会員キー: ${member.member_key || ''}`);
  lines.push(`Discord表示名: ${member.handle_name || ''}`);
  lines.push(`メールアドレス: ${member.email || ''}`);
  lines.push(`メールアドレス②: ${member.email2 || ''}`);
  lines.push(`電話番号: ${member.tel_number || ''}`);
  lines.push(`LINE名: ${member.line_name || ''}`);

  return lines.join('\n');
}

/**
 * 送信ジョブ一覧を作る
 * type:
 *  - DISCORD_ROOM
 *  - EMAIL
 *  - ADMIN_DISCORD
 */
function buildSendJobs_(result, targetMonth, systemConfig, destinations) {
  const jobs = [];
  const supportRuleId = systemConfig.support_undecided_rule_id;
  const escalateAfter = toSafeNumber_(systemConfig.support_undecided_escalate_after_count, 3);

  const adminDest = destinations[systemConfig.admin_dest_id];
  if (!adminDest || !adminDest.webhook_url) {
    throw new Error(`Config_System.admin_dest_id に対応する webhook_url が見つかりません: ${systemConfig.admin_dest_id}`);
  }

  for (const rule of result.rules) {
    const bucket = result.buckets[rule.rule_id] || [];
    if (bucket.length === 0) continue;

    if (rule.notify_channel === 'DISCORD') {
      const members = bucket.map(x => x.member);
      jobs.push({
        type: 'DISCORD_ROOM',
        rule_id: rule.rule_id,
        webhook_url: rule.webhook_url,
        content: buildDiscordRoomMessage_(rule, members, targetMonth),
        member_keys: bucket.map(x => x.member.member_key),
      });
      continue;
    }

    if (rule.notify_channel === 'EMAIL') {
      bucket.forEach(x => {
        const member = x.member;

        if (rule.rule_id === supportRuleId) {
          const count = toSafeNumber_(member.support_undecided_email_sent_count, 0);
          const escalated = member.support_undecided_escalated;

          if (count >= escalateAfter) {
            if (isNotTrue_(escalated)) {
              jobs.push({
                type: 'ADMIN_DISCORD',
                rule_id: rule.rule_id,
                member_key: member.member_key,
                webhook_url: adminDest.webhook_url,
                content: buildAdminEscalationMessage_(rule, member, targetMonth, systemConfig),
              });
            }
            return;
          }
        }

        if (!member.email) return;

        jobs.push({
          type: 'EMAIL',
          rule_id: rule.rule_id,
          member_key: member.member_key,
          to: member.email,
          subject: buildEmailSubject_(rule, member, targetMonth),
          body: buildEmailBody_(rule, member, targetMonth),
        });
      });
    }
  }

  return jobs;
}