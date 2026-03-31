// Utils.gs

function menuTest() {
  const result = runSupportEndMonthlyDryRun();
  Logger.log(JSON.stringify(result, null, 2));
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Role Management")
    .addItem("短期集中サポート終了処理（DryRun）", "runSupportEndMonthlyDryRun")
    .addItem("短期集中サポート終了処理（本実行）", "runSupportEndMonthly")
    .addToUi();
}