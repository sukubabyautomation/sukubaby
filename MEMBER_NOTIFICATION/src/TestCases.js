
/**
 * TestCases.gs
 * テストケース一覧.csv に合わせた回帰テスト一式
 */
function getRegressionSuite_() {
  return [
    tc_ut_01_eq_match_(),
    tc_ut_02_eq_not_match_(),
    tc_ut_03_is_empty_(),
    tc_ut_04_date_compare_(),
    tc_ut_05_and_group_(),
    tc_ut_06_or_group_(),
    tc_ut_07_next_month_(),
    tc_ut_08_duplicate_skip_(),
    tc_ut_09_different_month_send_(),
    tc_ut_10_count_2_email_job_(),
    tc_ut_11_count_3_admin_job_(),
    tc_ut_12_escalated_true_no_job_(),
    tc_ut_13_invalid_handle_name_(),
    tc_ut_14_invalid_discord_id_(),
    tc_ut_15_invalid_date_format_(),
    tc_ut_16_invalid_date_range_(),
    tc_it_01_discord_success_(),
    tc_it_02_email_success_(),
    tc_it_03_admin_discord_(),
    tc_it_04_count_update_(),
    tc_it_05_same_month_no_resend_(),
    tc_it_06_invalid_member_skipped_(),
    tc_it_07_invalid_summary_(),
    tc_it_08_discord_failed_(),
    tc_it_09_email_failed_(),
    tc_it_10_partial_success_(),
    tc_it_11_email_blank_escalated_(),
    tc_st_01_start_next_(),
    tc_st_02_support_undecided_mail_(),
    tc_st_03_support_undecided_admin_(),
    tc_st_04_invalid_and_normal_mixed_(),
    tc_st_05_rerun_safe_(),
    tc_bv_01_month_end_rollover_(),
    tc_bv_02_year_end_rollover_(),
    tc_bv_03_count_2_boundary_(),
    tc_bv_04_count_3_boundary_(),
    tc_bv_05_escalated_false_(),
    tc_bv_06_escalated_blank_(),
    tc_bv_07_escalated_true_(),
    tc_bv_08_equal_date_ok_(),
    tc_bv_09_same_month_no_resend_(),
    tc_bv_10_next_month_resend_(),
    tc_bv_11_email_blank_(),
    tc_bv_12_discord_id_boundary_(),
  ];
}

function baseSeed_() {
  return {
    destinations: [
      { dest_id: 'DEST_ROOM', dest_name: '通常通知', webhook_url: 'https://fake.discord/room' },
      { dest_id: 'DEST_ADMIN', dest_name: '管理者', webhook_url: 'https://fake.discord/admin' },
      { dest_id: 'DEST_FAIL', dest_name: '失敗通知', webhook_url: 'https://discord.invalid/fail' },
    ],
    system: [
      { config_key: 'admin_dest_id', config_value: 'DEST_ADMIN' },
      { config_key: 'admin_mention', config_value: '<@&ADMIN>' },
      { config_key: 'support_undecided_rule_id', config_value: 'SUPPORT_UNDECIDED' },
      { config_key: 'support_undecided_escalate_after_count', config_value: '3' },
      { config_key: 'mail_sender_name', config_value: '自動テスト' },
      { config_key: 'admin_alert_email', config_value: 'admin@example.com' },
    ],
  };
}

function memberSeed_(overrides) {
  return Object.assign({
    member_key: 'MEM00000001',
    handle_name: 'テスト会員',
    name_kanji: '山田太郎',
    name_kana: 'ヤマダタロウ',
    discord_user_id: '123456789012345',
    is_active: true,
    tel_number: '09012345678',
    email: 'test@example.com',
    email2: '',
    line_name: 'line_test',
    child1_name: 'こども1',
    child1_birthday: '2024/01/01',
    child1_age: '2歳0か月',
    child2_name: '',
    child2_birthday: '',
    child2_age: '',
    child3_name: '',
    child3_birthday: '',
    child3_age: '',
    joining_date: '2025/01/01',
    support_start_date: '2026/03/01',
    support_month: '3',
    support_end_date: '2026/05/31',
    current_class_name: 'STAR',
    class_name1: 'STAR',
    class_name2: '',
    class_name3: '',
    uncontactable_flag: '',
    interview_date: '',
    support_undecided_email_sent_count: 0,
    support_undecided_escalated: '',
    note: '',
  }, overrides || {});
}

function discordRule_(overrides) {
  return Object.assign({
    rule_id: 'START_NEXT',
    rule_name: '開始予定',
    enabled: true,
    priority: 1,
    dest_id: 'DEST_ROOM',
    notify_channel: 'DISCORD',
    email_subject: '',
    message_section_title: '対象者',
    header_text: '',
    preface_text: '',
    include_ops_line: false,
    ops_contact_text: '',
    mention_member: false,
  }, overrides || {});
}

function emailRule_(overrides) {
  return Object.assign({
    rule_id: 'SUPPORT_UNDECIDED',
    rule_name: '未定',
    enabled: true,
    priority: 1,
    dest_id: '',
    notify_channel: 'EMAIL',
    email_subject: 'ご案内 ○月',
    message_section_title: '対象',
    header_text: '',
    preface_text: '',
    include_ops_line: false,
    ops_contact_text: '',
    mention_member: false,
  }, overrides || {});
}

function condition_(overrides) {
  return Object.assign({
    rule_id: 'START_NEXT',
    group_no: 1,
    col: 'current_class_name',
    op: 'EQ',
    value: 'STAR',
    value2: '',
    type: 'STRING',
    enabled: true,
  }, overrides || {});
}

function destinationSeed_(overrides) {
  return Object.assign({
    dest_id: 'DEST_MAIN',
    dest_name: 'テスト通知先',
    webhook_url: 'https://example.com/webhook',
  }, overrides || {});
}

function nextMonthKeyForTest_() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  return Utilities.formatDate(new Date(y, m + 1, 1), Session.getScriptTimeZone(), 'yyyy-MM');
}

function monthKeyFromDate_(ymd) {
  const d = new Date(ymd);
  return Utilities.formatDate(new Date(d.getFullYear(), d.getMonth() + 1, 1), Session.getScriptTimeZone(), 'yyyy-MM');
}

function readSheet_(ss, name) {
  return readDataRowsAsObjects_(ss.getSheetByName(name));
}

function findMember_(ss, memberKey) {
  return readSheet_(ss, 'Members').find(x => String(x.member_key || '') === String(memberKey));
}

function hasIssue_(issues, memberKey, code) {
  return issues.some(x => String(x.member_key || '') === String(memberKey) && String(x.issue_code || '') === String(code));
}

function splitSummaryAndNormalPosts_(ss) {
  const discord = readSheet_(ss, 'Fake_Discord_Posts');
  return {
    all: discord,
    summary: discord.filter(x => String(x.content || '').indexOf('【要確認】データ不備を検知しました') >= 0),
    normal: discord.filter(x => String(x.content || '').indexOf('【要確認】データ不備を検知しました') < 0),
  };
}

function sentLogs_(ss) {
  return readSheet_(ss, 'Log_Notifications').filter(x => String(x.status || '') === 'SENT');
}

function failedLogs_(ss, channel) {
  return readSheet_(ss, 'Log_Notifications').filter(x => String(x.status || '') === 'FAILED' && (!channel || String(x.channel || '') === channel));
}

function runWithFixedNow_(isoString, fn) {
  const props = PropertiesService.getScriptProperties();
  const old = props.getProperty('TEST_NOW_ISO');
  try {
    props.setProperty('TEST_NOW_ISO', isoString);
    return fn();
  } finally {
    if (old == null) props.deleteProperty('TEST_NOW_ISO');
    else props.setProperty('TEST_NOW_ISO', old);
  }
}

function validateSeedMembers_(members, rules, conditions) {
  return validateMembers_(members, rules, conditions);
}

function tc_ut_01_eq_match_() {
  const seed = baseSeed_();
  seed.members = [memberSeed_({ member_key: 'MEM00000001', current_class_name: 'STAR' })];
  seed.rules = [discordRule_()];
  seed.conditions = [condition_({ col: 'current_class_name', op: 'EQ', value: 'STAR' })];
  return {
    id: 'UT-01', category: '単体', title: 'EQ条件 文字列一致判定確認', expected: '該当と判定される', seed,
    execute: function(ss) {
      const members = loadMembers_(ss); const rules = loadRules_(ss, loadDestinations_(ss)); const conds = loadConditions_(ss);
      this._result = evaluateMembersByRules_(members, rules, conds, new Date(), nextMonthKeyForTest_(), new Set());
    },
    assert: function() {
      const bucket = this._result.buckets.START_NEXT || [];
      return { ok: bucket.length === 1, actualSummary: 'bucket=' + bucket.length, message: 'bucket=' + bucket.length };
    }
  };
}

function tc_ut_02_eq_not_match_() {
  const seed = baseSeed_();
  seed.members = [memberSeed_({ member_key: 'MEM00000002', current_class_name: 'ROSE' })];
  seed.rules = [discordRule_()];
  seed.conditions = [condition_({ col: 'current_class_name', op: 'EQ', value: 'STAR' })];
  return {
    id: 'UT-02', category: '単体', title: 'EQ条件 文字列不一致判定確認', expected: '非該当と判定される', seed,
    execute: function(ss) {
      const members = loadMembers_(ss); const rules = loadRules_(ss, loadDestinations_(ss)); const conds = loadConditions_(ss);
      this._result = evaluateMembersByRules_(members, rules, conds, new Date(), nextMonthKeyForTest_(), new Set());
    },
    assert: function() {
      const bucket = this._result.buckets.START_NEXT || [];
      return { ok: bucket.length === 0, actualSummary: 'bucket=' + bucket.length, message: 'bucket=' + bucket.length };
    }
  };
}

function tc_ut_03_is_empty_() {
  const seed = baseSeed_();
  seed.members = [memberSeed_({ member_key: 'MEM00000003', support_end_date: '' })];
  seed.rules = [discordRule_({ rule_id: 'EMPTY_CHECK', rule_name: '空欄確認' })];
  seed.conditions = [condition_({ rule_id: 'EMPTY_CHECK', col: 'support_end_date', op: 'IS_EMPTY', value: '', type: 'STRING' })];
  return {
    id: 'UT-03', category: '単体', title: 'IS_EMPTY 空欄判定確認', expected: '該当と判定される', seed,
    execute: function(ss) {
      const members = loadMembers_(ss); const rules = loadRules_(ss, loadDestinations_(ss)); const conds = loadConditions_(ss);
      this._result = evaluateMembersByRules_(members, rules, conds, new Date(), nextMonthKeyForTest_(), new Set());
    },
    assert: function() {
      const bucket = this._result.buckets.EMPTY_CHECK || [];
      return { ok: bucket.length === 1, actualSummary: 'bucket=' + bucket.length, message: 'bucket=' + bucket.length };
    }
  };
}

function tc_ut_04_date_compare_() {
  const seed = baseSeed_();
  seed.members = [memberSeed_({ member_key: 'MEM00000004', support_start_date: '2026/03/01' })];
  seed.rules = [discordRule_({ rule_id: 'DATE_EQ', rule_name: '日付確認' })];
  seed.conditions = [condition_({ rule_id: 'DATE_EQ', col: 'support_start_date', op: 'EQ', value: '2026/03/01', type: 'DATE' })];
  return {
    id: 'UT-04', category: '単体', title: 'DATE比較 日付比較確認', expected: '比較結果が正しい', seed,
    execute: function(ss) {
      const members = loadMembers_(ss); const rules = loadRules_(ss, loadDestinations_(ss)); const conds = loadConditions_(ss);
      this._result = evaluateMembersByRules_(members, rules, conds, new Date(), nextMonthKeyForTest_(), new Set());
    },
    assert: function() {
      const bucket = this._result.buckets.DATE_EQ || [];
      return { ok: bucket.length === 1, actualSummary: 'bucket=' + bucket.length, message: 'bucket=' + bucket.length };
    }
  };
}

function tc_ut_05_and_group_() {
  const seed = baseSeed_();
  seed.members = [
    memberSeed_({ member_key: 'MEM00000005', current_class_name: 'ROSE', uncontactable_flag: 'N' }),
    memberSeed_({ member_key: 'MEM00000006', current_class_name: 'ROSE', uncontactable_flag: 'M' }),
    memberSeed_({ member_key: 'MEM00000007', current_class_name: 'STAR', uncontactable_flag: 'N' }),
  ];
  seed.rules = [discordRule_({ rule_id: 'RULE_AND_TEST', rule_name: 'AND条件テスト' })];
  seed.conditions = [
    condition_({ rule_id: 'RULE_AND_TEST', group_no: 1, col: 'current_class_name', op: 'EQ', value: 'ROSE' }),
    condition_({ rule_id: 'RULE_AND_TEST', group_no: 1, col: 'uncontactable_flag', op: 'EQ', value: 'N' }),
  ];

  return {
    id: 'UT-05',
    category: '単体',
    title: 'AND条件確認',
    expected: '両条件を満たす1名だけが該当判定される',
    seed,
    execute: function(ss) {
      const members = loadMembers_(ss);
      const rules = loadRules_(ss, loadDestinations_(ss));
      const conds = loadConditions_(ss);
      this._result = evaluateMembersByRules_(members, rules, conds, new Date(), nextMonthKeyForTest_(), new Set());
    },
    assert: function() {
      const bucket = this._result.buckets.RULE_AND_TEST || [];
      const memberKeys = bucket.map(x => x.member.member_key).sort().join(',');
      const ok = bucket.length === 1 && memberKeys === 'MEM00000005';
      return {
        ok,
        actualSummary: `bucket=${bucket.length}, memberKeys=${memberKeys}`,
        message: `bucket=${bucket.length}, memberKeys=${memberKeys}`,
      };
    }
  };
}

function tc_ut_06_or_group_() {
  const seed = baseSeed_();
  seed.members = [
    memberSeed_({ member_key: 'MEM00000006', current_class_name: 'ROSE', uncontactable_flag: 'M' }),
    memberSeed_({ member_key: 'MEM00000007', current_class_name: 'STAR', uncontactable_flag: 'N' }),
  ];
  seed.rules = [discordRule_({ rule_id: 'RULE_OR_TEST', rule_name: 'OR条件テスト' })];
  seed.conditions = [
    condition_({ rule_id: 'RULE_OR_TEST', group_no: 1, col: 'current_class_name', op: 'EQ', value: 'ROSE' }),
    condition_({ rule_id: 'RULE_OR_TEST', group_no: 2, col: 'uncontactable_flag', op: 'EQ', value: 'N' }),
  ];

  return {
    id: 'UT-06',
    category: '単体',
    title: 'OR条件確認',
    expected: '片方の条件だけ満たす2名が該当判定される',
    seed,
    execute: function(ss) {
      const members = loadMembers_(ss);
      const rules = loadRules_(ss, loadDestinations_(ss));
      const conds = loadConditions_(ss);
      this._result = evaluateMembersByRules_(members, rules, conds, new Date(), nextMonthKeyForTest_(), new Set());
    },
    assert: function() {
      const bucket = this._result.buckets.RULE_OR_TEST || [];
      const memberKeys = bucket.map(x => x.member.member_key).sort().join(',');
      const ok = bucket.length === 2 && memberKeys === 'MEM00000006,MEM00000007';
      return {
        ok,
        actualSummary: `bucket=${bucket.length}, memberKeys=${memberKeys}`,
        message: `bucket=${bucket.length}, memberKeys=${memberKeys}`,
      };
    }
  };
}

function tc_ut_07_next_month_() {
  const seed = baseSeed_();
  return {
    id: 'UT-07', category: '単体', title: '翌月算出 targetMonth算出確認', expected: '2026-04になる', seed,
    execute: function() {
      this._month = runWithFixedNow_('2026-03-10T09:00:00+09:00', function() { return getNextMonthKey_(getRuntimeNow_()); });
    },
    assert: function() {
      return { ok: this._month === '2026-04', actualSummary: this._month, message: this._month };
    }
  };
}

function tc_ut_08_duplicate_skip_() {
  const seed = baseSeed_();
  seed.members = [memberSeed_({ member_key: 'MEM00000008' })];
  seed.rules = [discordRule_()];
  seed.conditions = [condition_()];
  seed.notificationLogs = [{ rule_id: 'START_NEXT', target_month: nextMonthKeyForTest_(), member_key: 'MEM00000008', status: 'SENT' }];
  return {
    id: 'UT-08', category: '単体', title: '再通知防止 既送通知除外確認', expected: '通知されない', seed,
    execute: function(ss) {
      const sentIndex = buildSentIndex_(ss, nextMonthKeyForTest_());
      const members = loadMembers_(ss); const rules = loadRules_(ss, loadDestinations_(ss)); const conds = loadConditions_(ss);
      this._result = evaluateMembersByRules_(members, rules, conds, new Date(), nextMonthKeyForTest_(), sentIndex);
    },
    assert: function() {
      const bucket = this._result.buckets.START_NEXT || [];
      return { ok: bucket.length === 0, actualSummary: 'bucket=' + bucket.length, message: 'bucket=' + bucket.length };
    }
  };
}

function tc_ut_09_different_month_send_() {
  const seed = baseSeed_();
  seed.members = [memberSeed_({ member_key: 'MEM00000009' })];
  seed.rules = [discordRule_()];
  seed.conditions = [condition_()];
  seed.notificationLogs = [{ rule_id: 'START_NEXT', target_month: '2099-01', member_key: 'MEM00000009', status: 'SENT' }];
  return {
    id: 'UT-09', category: '単体', title: '再通知防止 別月再送確認', expected: '通知される', seed,
    execute: function(ss) {
      const sentIndex = buildSentIndex_(ss, nextMonthKeyForTest_());
      const members = loadMembers_(ss); const rules = loadRules_(ss, loadDestinations_(ss)); const conds = loadConditions_(ss);
      this._result = evaluateMembersByRules_(members, rules, conds, new Date(), nextMonthKeyForTest_(), sentIndex);
    },
    assert: function() {
      const bucket = this._result.buckets.START_NEXT || [];
      return { ok: bucket.length === 1, actualSummary: 'bucket=' + bucket.length, message: 'bucket=' + bucket.length };
    }
  };
}

function tc_ut_10_count_2_email_job_() {
  const seed = baseSeed_();
  seed.members = [memberSeed_({ member_key: 'MEM00000010', email: 'u10@example.com', support_undecided_email_sent_count: 2 })];
  seed.rules = [emailRule_()];
  seed.conditions = [condition_({ rule_id: 'SUPPORT_UNDECIDED', col: 'member_key', op: 'EQ', value: 'MEM00000010', type: 'STRING' })];
  return {
    id: 'UT-10', category: '単体', title: '未定分岐 count=2確認', expected: 'EMAIL通知生成', seed,
    execute: function(ss) {
      const members = loadMembers_(ss); const rules = loadRules_(ss, loadDestinations_(ss)); const conds = loadConditions_(ss);
      const result = evaluateMembersByRules_(members, rules, conds, new Date(), nextMonthKeyForTest_(), new Set());
      this._jobs = buildSendJobs_(result, nextMonthKeyForTest_(), loadSystemConfig_(ss), loadDestinations_(ss));
    },
    assert: function() {
      const ok = this._jobs.length === 1 && this._jobs[0].type === 'EMAIL';
      return { ok, actualSummary: JSON.stringify(this._jobs.map(x => x.type)), message: JSON.stringify(this._jobs.map(x => x.type)) };
    }
  };
}

function tc_ut_11_count_3_admin_job_() {
  const seed = baseSeed_();
  seed.members = [memberSeed_({ member_key: 'MEM00000011', email: 'u11@example.com', support_undecided_email_sent_count: 3 })];
  seed.rules = [emailRule_()];
  seed.conditions = [condition_({ rule_id: 'SUPPORT_UNDECIDED', col: 'member_key', op: 'EQ', value: 'MEM00000011', type: 'STRING' })];
  return {
    id: 'UT-11', category: '単体', title: '未定分岐 count=3確認', expected: '管理者通知生成', seed,
    execute: function(ss) {
      const members = loadMembers_(ss); const rules = loadRules_(ss, loadDestinations_(ss)); const conds = loadConditions_(ss);
      const result = evaluateMembersByRules_(members, rules, conds, new Date(), nextMonthKeyForTest_(), new Set());
      this._jobs = buildSendJobs_(result, nextMonthKeyForTest_(), loadSystemConfig_(ss), loadDestinations_(ss));
    },
    assert: function() {
      const ok = this._jobs.length === 1 && this._jobs[0].type === 'ADMIN_DISCORD';
      return { ok, actualSummary: JSON.stringify(this._jobs.map(x => x.type)), message: JSON.stringify(this._jobs.map(x => x.type)) };
    }
  };
}

function tc_ut_12_escalated_true_no_job_() {
  const seed = baseSeed_();
  seed.members = [memberSeed_({ member_key: 'MEM00000012', email: 'u12@example.com', support_undecided_email_sent_count: 3, support_undecided_escalated: true })];
  seed.rules = [emailRule_()];
  seed.conditions = [condition_({ rule_id: 'SUPPORT_UNDECIDED', col: 'member_key', op: 'EQ', value: 'MEM00000012', type: 'STRING' })];
  return {
    id: 'UT-12', category: '単体', title: '未定分岐 escalated確認', expected: '通知なし', seed,
    execute: function(ss) {
      const members = loadMembers_(ss); const rules = loadRules_(ss, loadDestinations_(ss)); const conds = loadConditions_(ss);
      const result = evaluateMembersByRules_(members, rules, conds, new Date(), nextMonthKeyForTest_(), new Set());
      this._jobs = buildSendJobs_(result, nextMonthKeyForTest_(), loadSystemConfig_(ss), loadDestinations_(ss));
    },
    assert: function() {
      return { ok: this._jobs.length === 0, actualSummary: 'jobs=' + this._jobs.length, message: 'jobs=' + this._jobs.length };
    }
  };
}

function tc_ut_13_invalid_handle_name_() {
  const seed = baseSeed_();
  seed.members = [memberSeed_({ member_key: 'MEM00000013', handle_name: '' })];
  seed.rules = [discordRule_()];
  seed.conditions = [condition_()];
  return {
    id: 'UT-13', category: '単体', title: 'データ不備 handle_name未入力検知', expected: '不備ログ出力', seed,
    execute: function(ss) { runMonthlyNotice_('TEST'); },
    assert: function(ss) {
      const issues = readSheet_(ss, 'Log_DataIssues');
      const posts = splitSummaryAndNormalPosts_(ss);
      const sent = sentLogs_(ss);
      const ok = hasIssue_(issues, 'MEM00000013', 'HANDLE_NAME_EMPTY') && posts.summary.length === 1 && posts.normal.length === 0 && sent.length === 0;
      return { ok, actualSummary: `issues=${issues.length},summary=${posts.summary.length},normal=${posts.normal.length},sent=${sent.length}`, message: `issues=${issues.length},summary=${posts.summary.length},normal=${posts.normal.length},sent=${sent.length}` };
    }
  };
}

function tc_ut_14_invalid_discord_id_() {
  const seed = baseSeed_();
  seed.members = [memberSeed_({ member_key: 'MEM00000014', discord_user_id: 'abc' })];
  seed.rules = [discordRule_({ mention_member: true })];
  seed.conditions = [condition_()];
  return {
    id: 'UT-14', category: '単体', title: 'データ不備 discord_user_id不正検知', expected: '不備ログ出力', seed,
    execute: function(ss) { runMonthlyNotice_('TEST'); },
    assert: function(ss) {
      const issues = readSheet_(ss, 'Log_DataIssues');
      const ok = hasIssue_(issues, 'MEM00000014', 'DISCORD_USER_ID_INVALID');
      return { ok, actualSummary: JSON.stringify(issues.map(x => x.issue_code)), message: JSON.stringify(issues.map(x => x.issue_code)) };
    }
  };
}

function tc_ut_15_invalid_date_format_() {
  const seed = baseSeed_();
  seed.members = [memberSeed_({ member_key: 'MEM00000015', support_start_date: '2026/13/40' })];
  seed.rules = [discordRule_({ rule_id: 'DATE_BAD' })];
  seed.conditions = [condition_({ rule_id: 'DATE_BAD', col: 'support_start_date', op: 'EQ', value: '2026/03/01', type: 'DATE' })];
  return {
    id: 'UT-15', category: '単体', title: 'データ不備 日付フォーマット不正', expected: 'DATE_FORMAT_INVALID', seed,
    execute: function(ss) { runMonthlyNotice_('TEST'); },
    assert: function(ss) {
      const issues = readSheet_(ss, 'Log_DataIssues');
      const ok = hasIssue_(issues, 'MEM00000015', 'DATE_FORMAT_INVALID');
      return { ok, actualSummary: JSON.stringify(issues.map(x => x.issue_code)), message: JSON.stringify(issues.map(x => x.issue_code)) };
    }
  };
}

function tc_ut_16_invalid_date_range_() {
  const seed = baseSeed_();
  seed.members = [memberSeed_({ member_key: 'MEM00000016', support_start_date: '2026/05/02', support_end_date: '2026/05/01' })];
  seed.rules = [discordRule_({ rule_id: 'DATE_RANGE' })];
  seed.conditions = [condition_({ rule_id: 'DATE_RANGE', col: 'support_start_date', op: 'EQ', value: '2026/05/02', type: 'DATE' })];
  return {
    id: 'UT-16', category: '単体', title: 'データ不備 日付矛盾検知', expected: 'DATE_RANGE_INVALID', seed,
    execute: function(ss) { runMonthlyNotice_('TEST'); },
    assert: function(ss) {
      const issues = readSheet_(ss, 'Log_DataIssues');
      const ok = hasIssue_(issues, 'MEM00000016', 'DATE_RANGE_INVALID');
      return { ok, actualSummary: JSON.stringify(issues.map(x => x.issue_code)), message: JSON.stringify(issues.map(x => x.issue_code)) };
    }
  };
}

function tc_it_01_discord_success_() {
  const seed = baseSeed_();
  seed.members = [memberSeed_({ member_key: 'MEM00000017' })];
  seed.rules = [discordRule_()];
  seed.conditions = [condition_()];
  return {
    id: 'IT-01', category: '結合', title: 'Discord通知成功確認', expected: 'Discord送信成功', seed,
    execute: function() { runMonthlyNotice_('TEST'); },
    assert: function(ss) {
      const posts = splitSummaryAndNormalPosts_(ss);
      const sent = sentLogs_(ss);
      const ok = posts.normal.length === 1 && sent.length === 1 && sent[0].channel === 'DISCORD_ROOM';
      return { ok, actualSummary: `normal=${posts.normal.length},sent=${sent.length}`, message: `normal=${posts.normal.length},sent=${sent.length}` };
    }
  };
}

function tc_it_02_email_success_() {
  const seed = baseSeed_();
  seed.members = [memberSeed_({ member_key: 'MEM00000018', email: 'u18@example.com' })];
  seed.rules = [emailRule_()];
  seed.conditions = [condition_({ rule_id: 'SUPPORT_UNDECIDED', col: 'member_key', op: 'EQ', value: 'MEM00000018', type: 'STRING' })];
  return {
    id: 'IT-02', category: '結合', title: 'メール通知成功確認', expected: 'メール送信成功', seed,
    execute: function() { runMonthlyNotice_('TEST'); },
    assert: function(ss) {
      const emails = readSheet_(ss, 'Fake_Email_Posts');
      const sent = sentLogs_(ss);
      const ok = emails.length === 1 && sent.length === 1 && sent[0].channel === 'EMAIL';
      return { ok, actualSummary: `emails=${emails.length},sent=${sent.length}`, message: `emails=${emails.length},sent=${sent.length}` };
    }
  };
}

function tc_it_03_admin_discord_() {
  const seed = baseSeed_();
  seed.members = [memberSeed_({ member_key: 'MEM00000019', email: 'u19@example.com', support_undecided_email_sent_count: 3 })];
  seed.rules = [emailRule_()];
  seed.conditions = [condition_({ rule_id: 'SUPPORT_UNDECIDED', col: 'member_key', op: 'EQ', value: 'MEM00000019', type: 'STRING' })];
  return {
    id: 'IT-03', category: '結合', title: 'count=3エスカレーション確認', expected: '管理者Discord通知', seed,
    execute: function() { runMonthlyNotice_('TEST'); },
    assert: function(ss) {
      const posts = readSheet_(ss, 'Fake_Discord_Posts');
      const member = findMember_(ss, 'MEM00000019');
      const ok = posts.length === 1 && String(member.support_undecided_escalated).toUpperCase() === 'TRUE';
      return { ok, actualSummary: `discord=${posts.length},escalated=${member.support_undecided_escalated}`, message: `discord=${posts.length},escalated=${member.support_undecided_escalated}` };
    }
  };
}

function tc_it_04_count_update_() {
  const seed = baseSeed_();
  seed.members = [memberSeed_({ member_key: 'MEM00000020', email: 'u20@example.com', support_undecided_email_sent_count: 1 })];
  seed.rules = [emailRule_()];
  seed.conditions = [condition_({ rule_id: 'SUPPORT_UNDECIDED', col: 'member_key', op: 'EQ', value: 'MEM00000020', type: 'STRING' })];
  return {
    id: 'IT-04', category: '結合', title: 'count更新確認', expected: 'count=2更新', seed,
    execute: function() { runMonthlyNotice_('TEST'); },
    assert: function(ss) {
      const member = findMember_(ss, 'MEM00000020');
      return { ok: String(member.support_undecided_email_sent_count) === '2', actualSummary: 'count=' + member.support_undecided_email_sent_count, message: 'count=' + member.support_undecided_email_sent_count };
    }
  };
}

function tc_it_05_same_month_no_resend_() {
  const seed = baseSeed_();
  seed.members = [memberSeed_({ member_key: 'MEM00000021' })];
  seed.rules = [discordRule_()];
  seed.conditions = [condition_()];
  seed.notificationLogs = [{ rule_id: 'START_NEXT', target_month: nextMonthKeyForTest_(), member_key: 'MEM00000021', status: 'SENT' }];
  return {
    id: 'IT-05', category: '結合', title: '同月再実行確認', expected: '再通知なし', seed,
    execute: function() { runMonthlyNotice_('TEST'); },
    assert: function(ss) {
      const posts = readSheet_(ss, 'Fake_Discord_Posts');
      return { ok: posts.length === 0, actualSummary: 'discord=' + posts.length, message: 'discord=' + posts.length };
    }
  };
}

function tc_it_06_invalid_member_skipped_() {
  const seed = baseSeed_();
  seed.members = [
    memberSeed_({ member_key: 'MEM00000022', handle_name: '', discord_user_id: '123456789012367' }),
    memberSeed_({ member_key: 'MEM00000023', handle_name: 'OK会員', discord_user_id: '123456789012368' }),
  ];
  seed.rules = [discordRule_()];
  seed.conditions = [condition_()];
  return {
    id: 'IT-06', category: '結合', title: '不備会員除外確認', expected: '正常のみ通知', seed,
    execute: function() { runMonthlyNotice_('TEST'); },
    assert: function(ss) {
      const issues = readSheet_(ss, 'Log_DataIssues');
      const sent = sentLogs_(ss).map(x => x.member_key).join(',');
      const ok = issues.length === 1 && sent.indexOf('MEM00000023') >= 0 && sent.indexOf('MEM00000022') < 0;
      return { ok, actualSummary: `issues=${issues.length},sent=${sent}`, message: `issues=${issues.length},sent=${sent}` };
    }
  };
}

function tc_it_07_invalid_summary_() {
  const seed = baseSeed_();
  seed.members = [memberSeed_({ member_key: 'MEM00000024', handle_name: '' })];
  seed.rules = [discordRule_()];
  seed.conditions = [condition_()];
  return {
    id: 'IT-07', category: '結合', title: '不備サマリ通知確認', expected: '管理者サマリ通知', seed,
    execute: function() { runMonthlyNotice_('TEST'); },
    assert: function(ss) {
      const posts = splitSummaryAndNormalPosts_(ss);
      return { ok: posts.summary.length === 1, actualSummary: `summary=${posts.summary.length},normal=${posts.normal.length}`, message: `summary=${posts.summary.length},normal=${posts.normal.length}` };
    }
  };
}

function tc_it_08_discord_failed_() {
  const seed = baseSeed_();
  seed.members = [memberSeed_({ member_key: 'MEM00000025' })];
  seed.rules = [discordRule_({ rule_id: 'IT08_FAIL', rule_name: 'Discord障害確認', dest_id: 'DEST_FAIL' })];
  seed.conditions = [condition_({ rule_id: 'IT08_FAIL' })];
  seed.destinations = [
    destinationSeed_({
      dest_id: 'DEST_FAIL',
      dest_name: '失敗用Discord',
      webhook_url: TEST_FAIL_DISCORD_WEBHOOK,
    }),
    destinationSeed_({
      dest_id: 'DEST_ADMIN',
      dest_name: '管理者通知先',
      webhook_url: 'https://example.com/admin-webhook',
    }),
  ];

  return {
    id: 'IT-08',
    category: '結合',
    title: 'Discord障害処理確認',
    expected: 'FAILED記録',
    seed,
    execute: function() {
      runMonthlyNotice_('TEST');
    },
    assert: function(ss) {
      const failed = failedLogs_(ss, 'DISCORD_ROOM').filter(x => String(x.rule_id || '') === 'IT08_FAIL');
      return {
        ok: failed.length >= 1,
        actualSummary: 'failed=' + failed.length,
        message: 'failed=' + failed.length,
      };
    }
  };
}

function tc_it_09_email_failed_() {
  const seed = baseSeed_();
  seed.members = [
    memberSeed_({
      member_key: 'MEM00000026',
      email: TEST_FAIL_EMAIL_ADDRESS,
    })
  ];
  seed.rules = [emailRule_({ rule_id: 'IT09_FAIL', rule_name: 'メール障害確認' })];
  seed.conditions = [condition_({ rule_id: 'IT09_FAIL' })];

  return {
    id: 'IT-09',
    category: '結合',
    title: 'メール障害処理確認',
    expected: 'FAILED記録',
    seed,
    execute: function() {
      runMonthlyNotice_('TEST');
    },
    assert: function(ss) {
      const failed = failedLogs_(ss, 'EMAIL').filter(x => String(x.rule_id || '') === 'IT09_FAIL');
      return {
        ok: failed.length >= 1,
        actualSummary: 'failed=' + failed.length,
        message: 'failed=' + failed.length,
      };
    }
  };
}
function tc_it_10_partial_success_() {
  const seed = baseSeed_();

  seed.members = [
    memberSeed_({
      member_key: 'MEM00000027',
      current_class_name: 'STAR',
      handle_name: 'Discord失敗対象',
      discord_user_id: '123456789012345678',
      email: 'ok1@example.com',
    }),
    memberSeed_({
      member_key: 'MEM00000028',
      current_class_name: 'ROSE',
      handle_name: 'Email成功対象',
      discord_user_id: '223456789012345678',
      email: 'ok2@example.com',
    }),
  ];

  seed.rules = [
    discordRule_({
      rule_id: 'IT10_FAIL_DISCORD',
      rule_name: '部分成功_失敗側',
      dest_id: 'DEST_FAIL',
    }),
    emailRule_({
      rule_id: 'IT10_OK_EMAIL',
      rule_name: '部分成功_成功側',
    }),
  ];

  seed.conditions = [
    condition_({
      rule_id: 'IT10_FAIL_DISCORD',
      col: 'current_class_name',
      op: 'EQ',
      value: 'STAR',
    }),
    condition_({
      rule_id: 'IT10_OK_EMAIL',
      col: 'current_class_name',
      op: 'EQ',
      value: 'ROSE',
    }),
  ];

  seed.destinations = [
    destinationSeed_({
      dest_id: 'DEST_FAIL',
      dest_name: '失敗用Discord',
      webhook_url: TEST_FAIL_DISCORD_WEBHOOK,
    }),
    destinationSeed_({
      dest_id: 'DEST_ADMIN',
      dest_name: '管理者通知先',
      webhook_url: 'https://example.com/admin-webhook',
    }),
  ];

  return {
    id: 'IT-10',
    category: '結合',
    title: '一部失敗でも継続確認',
    expected: '成功分はSENT、失敗分はFAILED',
    seed,
    execute: function() {
      runMonthlyNotice_('TEST');
    },
    assert: function(ss) {
      const notifLogs = readDataRowsAsObjects_(ss.getSheetByName('Log_Notifications'));

      const sent = notifLogs.filter(x =>
        String(x.status || '') === 'SENT' &&
        String(x.rule_id || '') === 'IT10_OK_EMAIL'
      );

      const failed = notifLogs.filter(x =>
        String(x.status || '') === 'FAILED' &&
        String(x.rule_id || '') === 'IT10_FAIL_DISCORD'
      );

      const ok = sent.length >= 1 && failed.length >= 1;

      return {
        ok,
        actualSummary: `sent=${sent.length},failed=${failed.length}`,
        message: `sent=${sent.length},failed=${failed.length}`,
      };
    }
  };
}

function tc_st_01_start_next_() {
  const seed = baseSeed_();
  seed.members = [memberSeed_({ member_key: 'MEM00000029' })];
  seed.rules = [discordRule_()];
  seed.conditions = [condition_()];
  return {
    id: 'ST-01', category: 'シナリオ', title: '通常通知確認', expected: 'Discord通知成功', seed,
    execute: function() { runMonthlyNotice_('TEST'); },
    assert: function(ss) {
      const posts = splitSummaryAndNormalPosts_(ss);
      return { ok: posts.normal.length === 1, actualSummary: 'normal=' + posts.normal.length, message: 'normal=' + posts.normal.length };
    }
  };
}

function tc_it_11_email_blank_escalated_() {
  const seed = baseSeed_();
  seed.members = [
    memberSeed_({
      member_key: 'MEM00000027',
      email: '',
      handle_name: 'メール空会員',
    })
  ];
  seed.rules = [emailRule_({ rule_id: 'IT11_BLANK', rule_name: 'メール空欄確認' })];
  seed.conditions = [condition_({ rule_id: 'IT11_BLANK', col: 'member_key', op: 'EQ', value: 'MEM00000027', type: 'STRING' })];

  return {
    id: 'IT-11',
    category: '結合',
    title: 'メール空欄時 管理者通知確認',
    expected: 'EMAIL failed記録 + ADMIN_DISCORD送信',
    seed,
    execute: function() {
      runMonthlyNotice_('TEST');
    },
    assert: function(ss) {
      const failed = failedLogs_(ss, 'EMAIL').filter(x => String(x.rule_id || '') === 'IT11_BLANK');
      const adminPosts = readSheet_(ss, 'Fake_Discord_Posts').filter(x => String(x.content || '').indexOf('メールアドレス未設定のため送信できませんでした') >= 0);

      const ok = failed.length === 1 && adminPosts.length === 1;
      return {
        ok,
        actualSummary: `email_failed=${failed.length},admin_posts=${adminPosts.length}`,
        message: `email_failed=${failed.length},admin_posts=${adminPosts.length}`,
      };
    }
  };
}

function tc_st_02_support_undecided_mail_() {
  const seed = baseSeed_();
  seed.members = [memberSeed_({ member_key: 'MEM00000030', email: 'u30@example.com', support_undecided_email_sent_count: 0 })];
  seed.rules = [emailRule_()];
  seed.conditions = [condition_({ rule_id: 'SUPPORT_UNDECIDED', col: 'member_key', op: 'EQ', value: 'MEM00000030', type: 'STRING' })];
  return {
    id: 'ST-02', category: 'シナリオ', title: '未定メール送信確認', expected: 'メール送信', seed,
    execute: function() { runMonthlyNotice_('TEST'); },
    assert: function(ss) {
      const emails = readSheet_(ss, 'Fake_Email_Posts');
      return { ok: emails.length === 1, actualSummary: 'emails=' + emails.length, message: 'emails=' + emails.length };
    }
  };
}

function tc_st_03_support_undecided_admin_() {
  const seed = baseSeed_();
  seed.members = [memberSeed_({ member_key: 'MEM00000031', email: 'u31@example.com', support_undecided_email_sent_count: 3 })];
  seed.rules = [emailRule_()];
  seed.conditions = [condition_({ rule_id: 'SUPPORT_UNDECIDED', col: 'member_key', op: 'EQ', value: 'MEM00000031', type: 'STRING' })];
  return {
    id: 'ST-03', category: 'シナリオ', title: 'エスカレーション確認', expected: '管理者通知', seed,
    execute: function() { runMonthlyNotice_('TEST'); },
    assert: function(ss) {
      const posts = readSheet_(ss, 'Fake_Discord_Posts');
      return { ok: posts.length === 1, actualSummary: 'discord=' + posts.length, message: 'discord=' + posts.length };
    }
  };
}

function tc_st_04_invalid_and_normal_mixed_() {
  const seed = baseSeed_();
  seed.members = [
    memberSeed_({ member_key: 'MEM00000032', handle_name: '正常会員', discord_user_id: '123456789012372' }),
    memberSeed_({ member_key: 'MEM00000033', handle_name: '異常会員', discord_user_id: '123456789012373', support_start_date: '2026/13/40' }),
  ];
  seed.rules = [discordRule_({ rule_id: 'DATE_MIX' })];
  seed.conditions = [condition_({ rule_id: 'DATE_MIX', col: 'support_start_date', op: 'NOT_EMPTY', value: '', type: 'DATE' })];
  return {
    id: 'ST-04', category: 'シナリオ', title: '不備混在確認', expected: '正常通知+不備ログ', seed,
    execute: function() { runMonthlyNotice_('TEST'); },
    assert: function(ss) {
      const issues = readSheet_(ss, 'Log_DataIssues');
      const posts = splitSummaryAndNormalPosts_(ss);
      const sent = sentLogs_(ss).map(x => x.member_key).join(',');
      const ok = issues.length === 1 && posts.summary.length === 1 && posts.normal.length === 1 && sent.indexOf('MEM00000032') >= 0 && sent.indexOf('MEM00000033') < 0;
      return { ok, actualSummary: `issues=${issues.length},summary=${posts.summary.length},normal=${posts.normal.length},sent=${sent}`, message: `issues=${issues.length},summary=${posts.summary.length},normal=${posts.normal.length},sent=${sent}` };
    }
  };
}

function tc_st_05_rerun_safe_() {
  const seed = baseSeed_();
  seed.members = [memberSeed_({ member_key: 'MEM00000034' })];
  seed.rules = [discordRule_()];
  seed.conditions = [condition_()];
  return {
    id: 'ST-05', category: 'シナリオ', title: '再実行安全確認', expected: '二重送信なし', seed,
    execute: function(ss) {
      runMonthlyNotice_('TEST');
      runMonthlyNotice_('TEST');
    },
    assert: function(ss) {
      const posts = readSheet_(ss, 'Fake_Discord_Posts');
      return { ok: posts.length === 1, actualSummary: 'discord=' + posts.length, message: 'discord=' + posts.length };
    }
  };
}

function tc_bv_01_month_end_rollover_() {
  const seed = baseSeed_();
  return {
    id: 'BV-01', category: '境界値', title: '月末実行時の翌月算出確認', expected: 'target_month=2026-02', seed,
    execute: function() { this._month = runWithFixedNow_('2026-01-31T10:00:00+09:00', function() { return getNextMonthKey_(getRuntimeNow_()); }); },
    assert: function() { return { ok: this._month === '2026-02', actualSummary: this._month, message: this._month }; }
  };
}

function tc_bv_02_year_end_rollover_() {
  const seed = baseSeed_();
  return {
    id: 'BV-02', category: '境界値', title: '年末実行時の年跨ぎ確認', expected: 'target_month=2027-01', seed,
    execute: function() { this._month = runWithFixedNow_('2026-12-31T10:00:00+09:00', function() { return getNextMonthKey_(getRuntimeNow_()); }); },
    assert: function() { return { ok: this._month === '2027-01', actualSummary: this._month, message: this._month }; }
  };
}

function tc_bv_03_count_2_boundary_() { return tc_supportBoundary_('BV-03', 'count=2の確認', 2, '', 'EMAIL'); }
function tc_bv_04_count_3_boundary_() { return tc_supportBoundary_('BV-04', 'count=3の切替確認', 3, '', 'ADMIN_DISCORD'); }
function tc_bv_05_escalated_false_() { return tc_supportBoundary_('BV-05', 'FALSE時のエスカレーション確認', 3, 'FALSE', 'ADMIN_DISCORD'); }
function tc_bv_06_escalated_blank_() { return tc_supportBoundary_('BV-06', '空欄時のエスカレーション確認', 3, '', 'ADMIN_DISCORD'); }
function tc_bv_07_escalated_true_() { return tc_supportBoundary_('BV-07', 'TRUE時の再通知抑止確認', 3, true, 'NONE'); }

function tc_supportBoundary_(id, title, count, escalated, expectedType) {
  const seed = baseSeed_();
  seed.members = [memberSeed_({ member_key: 'MEM' + id.replace(/\D/g, '').padStart(8,'0'), email: 'boundary@example.com', support_undecided_email_sent_count: count, support_undecided_escalated: escalated })];
  const memberKey = seed.members[0].member_key;
  seed.rules = [emailRule_()];
  seed.conditions = [condition_({ rule_id: 'SUPPORT_UNDECIDED', col: 'member_key', op: 'EQ', value: memberKey, type: 'STRING' })];
  return {
    id, category: '境界値', title, expected: expectedType, seed,
    execute: function(ss) {
      const members = loadMembers_(ss); const rules = loadRules_(ss, loadDestinations_(ss)); const conds = loadConditions_(ss);
      const result = evaluateMembersByRules_(members, rules, conds, new Date(), nextMonthKeyForTest_(), new Set());
      this._jobs = buildSendJobs_(result, nextMonthKeyForTest_(), loadSystemConfig_(ss), loadDestinations_(ss));
    },
    assert: function() {
      const types = this._jobs.map(x => x.type);
      const ok = expectedType === 'NONE' ? types.length === 0 : (types.length === 1 && types[0] === expectedType);
      return { ok, actualSummary: JSON.stringify(types), message: JSON.stringify(types) };
    }
  };
}

function tc_bv_08_equal_date_ok_() {
  const seed = baseSeed_();
  seed.members = [memberSeed_({ member_key: 'MEM00000038', support_start_date: '2026/05/01', support_end_date: '2026/05/01' })];
  seed.rules = [discordRule_({ rule_id: 'DATE_EQUAL_OK' })];
  seed.conditions = [condition_({ rule_id: 'DATE_EQUAL_OK', col: 'support_start_date', op: 'EQ', value: '2026/05/01', type: 'DATE' })];
  return {
    id: 'BV-08', category: '境界値', title: '開始日と終了日が同日の確認', expected: 'DATE_RANGE_INVALIDにならない', seed,
    execute: function(ss) { runMonthlyNotice_('TEST'); },
    assert: function(ss) {
      const issues = readSheet_(ss, 'Log_DataIssues');
      const codes = issues.map(x => x.issue_code).join(',');
      return { ok: codes.indexOf('DATE_RANGE_INVALID') < 0, actualSummary: codes, message: codes };
    }
  };
}

function tc_bv_09_same_month_no_resend_() {
  const seed = baseSeed_();
  seed.members = [memberSeed_({ member_key: 'MEM00000039' })];
  seed.rules = [discordRule_()];
  seed.conditions = [condition_()];
  seed.notificationLogs = [{ rule_id: 'START_NEXT', target_month: nextMonthKeyForTest_(), member_key: 'MEM00000039', status: 'SENT' }];
  return {
    id: 'BV-09', category: '境界値', title: '同月再実行確認', expected: '再通知されない', seed,
    execute: function() { runMonthlyNotice_('TEST'); },
    assert: function(ss) {
      const posts = readSheet_(ss, 'Fake_Discord_Posts');
      return { ok: posts.length === 0, actualSummary: 'discord=' + posts.length, message: 'discord=' + posts.length };
    }
  };
}

function tc_bv_10_next_month_resend_() {
  const seed = baseSeed_();
  seed.members = [memberSeed_({ member_key: 'MEM00000040' })];
  seed.rules = [discordRule_()];
  seed.conditions = [condition_()];
  seed.notificationLogs = [{ rule_id: 'START_NEXT', target_month: '2099-01', member_key: 'MEM00000040', status: 'SENT' }];
  return {
    id: 'BV-10', category: '境界値', title: '月跨ぎ再通知確認', expected: '再通知される', seed,
    execute: function() { runMonthlyNotice_('TEST'); },
    assert: function(ss) {
      const posts = readSheet_(ss, 'Fake_Discord_Posts');
      return { ok: posts.length === 1, actualSummary: 'discord=' + posts.length, message: 'discord=' + posts.length };
    }
  };
}

function tc_bv_11_email_blank_() {
  const seed = baseSeed_();
  seed.members = [memberSeed_({ member_key: 'MEM00000041', email: '' })];
  seed.rules = [emailRule_()];
  seed.conditions = [condition_({ rule_id: 'SUPPORT_UNDECIDED', col: 'member_key', op: 'EQ', value: 'MEM00000041', type: 'STRING' })];
  return {
    id: 'BV-11', category: '境界値', title: 'email空欄の確認', expected: '送信されず必要に応じて除外される', seed,
    execute: function() { runMonthlyNotice_('TEST'); },
    assert: function(ss) {
      const emails = readSheet_(ss, 'Fake_Email_Posts');
      const failed = failedLogs_(ss, 'EMAIL');
      const ok = emails.length === 0 && failed.length === 0;
      return { ok, actualSummary: `emails=${emails.length},failed=${failed.length}`, message: `emails=${emails.length},failed=${failed.length}` };
    }
  };
}

function tc_bv_12_discord_id_boundary_() {
  const seed = baseSeed_();
  seed.members = [
    memberSeed_({ member_key: 'MEM00000042', discord_user_id: '123456789012345' }),
    memberSeed_({ member_key: 'MEM00000043', discord_user_id: '12345678901234' }),
  ];
  seed.rules = [discordRule_({ mention_member: true })];
  seed.conditions = [condition_()];
  return {
    id: 'BV-12', category: '境界値', title: 'discord_user_id桁数境界確認', expected: '15桁はOK 14桁は不備', seed,
    execute: function(ss) { runMonthlyNotice_('TEST'); },
    assert: function(ss) {
      const issues = readSheet_(ss, 'Log_DataIssues');
      const has15 = !hasIssue_(issues, 'MEM00000042', 'DISCORD_USER_ID_INVALID');
      const has14 = hasIssue_(issues, 'MEM00000043', 'DISCORD_USER_ID_INVALID');
      return { ok: has15 && has14, actualSummary: JSON.stringify(issues.map(x => `${x.member_key}:${x.issue_code}`)), message: JSON.stringify(issues.map(x => `${x.member_key}:${x.issue_code}`)) };
    }
  };
}
