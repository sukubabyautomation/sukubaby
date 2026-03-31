// Rules.gs

function checkCommonEligibility_(member) {
  if (member.role_control_flg !== true) {
    return {
      ok: false,
      logIssue: false
    };
  }

  if (member.role_control_stop_flg === true) {
    return {
      ok: false,
      logIssue: false
    };
  }

  return { ok: true };
}

function evaluateRuleConditions_(member, rule, ctx) {
  for (let i = 1; i <= 4; i++) {
    const col = rule[`condition_col_${i}`];
    const op = rule[`condition_op_${i}`];
    const val = rule[`condition_val_${i}`];

    if (!col || !op) continue;

    const actual = member[col];
    const matched = evaluateOperator_(actual, op, val, ctx);
    if (!matched) {
      return { ok: false };
    }
  }
  return { ok: true };
}

function evaluateOperator_(actual, op, expected, ctx) {
  switch (op) {
    case "EQ":
      return String(actual) === String(expected);

    case "NEQ":
      return String(actual) !== String(expected);

    case "IS_EMPTY":
      return actual === "";

    case "NOT_EMPTY":
      return actual !== "";

    case "RUN_MONTH":
      return toYearMonth_(actual, ctx.tz) === ctx.targetMonth;

    default:
      throw new Error(`Unsupported operator: ${op}`);
  }
}

function toYearMonth_(value, tz) {
  if (value === "") return "";

  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, tz, "yyyy/MM");
  }

  const str = String(value).trim();
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(str)) {
    return str.slice(0, 7);
  }

  throw new Error(`Invalid date for RUN_MONTH: ${str}`);
}

function validateSupportEndMember_(member, roleMappings) {
  const issues = [];

  if (member.discord_user_id === "") {
    issues.push({
      severity: "ERROR",
      issue_code: "DISCORD_USER_ID_EMPTY",
      issue_message: "discord_user_id が空です",
      field_key: "discord_user_id",
      raw_value: ""
    });
  }

  if (member.current_class_code === "") {
    issues.push({
      severity: "ERROR",
      issue_code: "CURRENT_CLASS_CODE_EMPTY",
      issue_message: "current_class_code が空です",
      field_key: "current_class_code",
      raw_value: ""
    });
  }

  if (member.support_end_date === "") {
    issues.push({
      severity: "ERROR",
      issue_code: "SUPPORT_END_DATE_EMPTY",
      issue_message: "support_end_date が空です",
      field_key: "support_end_date",
      raw_value: ""
    });
  } else {
    try {
      toYearMonth_(member.support_end_date, Session.getScriptTimeZone() || "Asia/Tokyo");
    } catch (e) {
      issues.push({
        severity: "ERROR",
        issue_code: "SUPPORT_END_DATE_INVALID",
        issue_message: "support_end_date の形式が不正です",
        field_key: "support_end_date",
        raw_value: String(member.support_end_date)
      });
    }
  }

  if (member.current_class_code !== "") {
    const classRoleKey = `CLASS__${member.current_class_code}`;
    if (!roleMappings[classRoleKey]) {
      issues.push({
        severity: "ERROR",
        issue_code: "ROLE_MAPPING_NOT_FOUND",
        issue_message: "current_class_code に対応するロールマッピングがありません",
        field_key: "current_class_code",
        raw_value: String(member.current_class_code)
      });
    }
  }

  const graduateRoleKey = "GRADUATE__GRAD_STANDARD";
  if (!roleMappings[graduateRoleKey]) {
    issues.push({
      severity: "ERROR",
      issue_code: "GRAD_ROLE_MAPPING_NOT_FOUND",
      issue_message: "卒業ロールのマッピングがありません",
      field_key: "Config_Role_Mappings",
      raw_value: "GRADUATE / GRAD_STANDARD"
    });
  }

  return issues;
}

function resolveRoleActions_(member, actionSet, roleMappings) {
  return actionSet.map(action => {
    let businessCode = "";
    if (action.role_source_type === "MEMBER_COLUMN") {
      businessCode = member[action.role_value];
    } else if (action.role_source_type === "FIXED_CODE") {
      businessCode = action.role_value;
    } else {
      throw new Error(`Unsupported role_source_type: ${action.role_source_type}`);
    }

    const mappingKey = `${action.role_kind}__${businessCode}`;
    const mapping = roleMappings[mappingKey];
    if (!mapping) {
      throw new Error(`Role mapping not found: ${mappingKey}`);
    }

    return {
      action_order: action.action_order,
      action_type: action.action_type,
      role_kind: action.role_kind,
      business_code: businessCode,
      discord_role_id: mapping.discord_role_id,
      discord_role_name: mapping.discord_role_name,
      skip_if_not_exists_flg: action.skip_if_not_exists_flg === true,
      skip_if_already_done_flg: action.skip_if_already_done_flg === true
    };
  });
}