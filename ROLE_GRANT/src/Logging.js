// Logging.gs

function appendLogRuns_(logSs, rows) {
  const sheet = getSheetOrThrow_(logSs, "Log_Runs");
  appendObjectsToStructuredSheet_(sheet, rows);
}

function appendRoleGrantDetails_(logSs, rows) {
  const sheet = getSheetOrThrow_(logSs, "Log_RoleGrantDetail");
  appendObjectsToStructuredSheet_(sheet, rows);
}

function appendDataIssues_(logSs, rows) {
  const sheet = getSheetOrThrow_(logSs, "Log_DataIssues");
  appendObjectsToStructuredSheet_(sheet, rows);
}

function appendObjectsToStructuredSheet_(sheet, rows) {
  if (!rows || rows.length === 0) return;

  const headerRow = SHEET_HEADER_ROW;       // 3
  const dataStartRow = SHEET_DATA_START_ROW; // 4

  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) {
    throw new Error(`Sheet has no columns: ${sheet.getName()}`);
  }

  const headers = sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0]
    .map(h => String(h).trim());

  const values = rows.map(row =>
    headers.map(h => row[h] !== undefined && row[h] !== null ? row[h] : "")
  );

  const writeRow = Math.max(sheet.getLastRow() + 1, dataStartRow);
  sheet.getRange(writeRow, 1, values.length, headers.length).setValues(values);
}

function buildDataIssueRow_(ctx, triggerType, member, rowNumber, issue) {
  return {
    run_id: ctx.runId,
    run_at: ctx.runAt,
    trigger_type: triggerType,
    target_month: ctx.targetMonth,
    member_key: member.member_key || "",
    handle_name: member.handle_name || "",
    sheet_row: rowNumber,
    severity: issue.severity || "ERROR",
    issue_code: issue.issue_code || "",
    issue_message: issue.issue_message || "",
    field_key: issue.field_key || "",
    raw_value: issue.raw_value || ""
  };
}

function buildRoleGrantDetailRow_(ctx, triggerType, jobName, ruleCode, member, rowNumber, actionResult, memberUpdateResult, successNotifyResult, adminNotifyResult, errorMessage) {
  return {
    run_id: ctx.runId,
    run_at: ctx.runAt,
    trigger_type: triggerType,
    job_name: jobName,
    rule_code: ruleCode,
    member_key: member.member_key || "",
    handle_name: member.handle_name || "",
    sheet_row: rowNumber,
    discord_user_id: member.discord_user_id || "",
    action_order: actionResult.action_order || "",
    action_type: actionResult.action_type || "",
    role_kind: actionResult.role_kind || "",
    business_code: actionResult.business_code || "",
    discord_role_id: actionResult.discord_role_id || "",
    action_result: actionResult.result || "",
    member_update_result: memberUpdateResult || "",
    success_notify_result: successNotifyResult || "",
    admin_notify_result: adminNotifyResult || "",
    error_code: actionResult.error_code || "",
    error_message: actionResult.error_message || errorMessage || ""
  };
}

function decideSummaryStatus_(targetCount, failedCount, hasAnyFailure, dryRun) {
  if (dryRun) return "SKIPPED_DRY_RUN";
  if (targetCount === 0) return "NO_TARGET";
  if (failedCount > 0 || hasAnyFailure) return "PARTIAL_OR_FAILED";
  return "SUCCESS";
}