// Config.gs

function createExecutionContext_(jobCode, triggerType, forceDryRun) {
  const props = PropertiesService.getScriptProperties();

  const memberSpreadsheetId = props.getProperty("MEMBER_SPREADSHEET_ID");
  const logSpreadsheetId = props.getProperty("LOG_SPREADSHEET_ID");

  if (!memberSpreadsheetId) throw new Error("Missing script property: MEMBER_SPREADSHEET_ID");
  if (!logSpreadsheetId) throw new Error("Missing script property: LOG_SPREADSHEET_ID");

  const now = new Date();
  const tz = Session.getScriptTimeZone() || "Asia/Tokyo";

  return {
    jobCode,
    triggerType,
    dryRun: forceDryRun === true,
    runId: Utilities.getUuid(),
    runAt: Utilities.formatDate(now, tz, "yyyy/MM/dd HH:mm:ss"),
    targetMonth: Utilities.formatDate(now, tz, "yyyy/MM"),
    now,
    tz,
    memberSs: SpreadsheetApp.openById(memberSpreadsheetId),
    logSs: SpreadsheetApp.openById(logSpreadsheetId)
  };
}

function getRoleJobByCode_(ss, jobCode) {
  const rows = getSheetRecords_(getSheetOrThrow_(ss, "Config_Role_Jobs"));
  return rows.find(r => r.job_code === jobCode && r.enabled === true) || null;
}

function getRoleRulesByGroup_(ss, ruleGroup) {
  return getSheetRecords_(getSheetOrThrow_(ss, "Config_Role_Rules"))
    .filter(r => r.enabled === true && r.rule_group === ruleGroup)
    .sort((a, b) => Number(a.priority || 9999) - Number(b.priority || 9999));
}

function getRoleActionSets_(ss) {
  const rows = getSheetRecords_(getSheetOrThrow_(ss, "Config_Role_ActionSets"))
    .filter(r => r.enabled === true);

  const map = {};
  rows.forEach(r => {
    if (!map[r.action_set_code]) map[r.action_set_code] = [];
    map[r.action_set_code].push(r);
  });

  Object.keys(map).forEach(k => {
    map[k].sort((a, b) => Number(a.action_order || 9999) - Number(b.action_order || 9999));
  });

  return map;
}

function getRoleMappings_(ss) {
  const rows = getSheetRecords_(getSheetOrThrow_(ss, "Config_Role_Mappings"))
    .filter(r => r.enabled === true);

  const map = {};
  rows.forEach(r => {
    const key = `${r.role_kind}__${r.business_code}`;
    map[key] = r;
  });
  return map;
}

function getRoleMasterUpdates_(ss) {
  const rows = getSheetRecords_(getSheetOrThrow_(ss, "Config_Role_MasterUpdates"))
    .filter(r => r.enabled === true);

  const map = {};
  rows.forEach(r => {
    if (!map[r.master_update_set_code]) map[r.master_update_set_code] = [];
    map[r.master_update_set_code].push(r);
  });

  Object.keys(map).forEach(k => {
    map[k].sort((a, b) => Number(a.update_order || 9999) - Number(b.update_order || 9999));
  });

  return map;
}

function getDestinations_(ss) {
  const rows = getSheetRecords_(getSheetOrThrow_(ss, "Config_Destinations"))
    .filter(r => r.enabled === true);

  const map = {};
  rows.forEach(r => {
    map[r.destination_code] = r;
  });
  return map;
}