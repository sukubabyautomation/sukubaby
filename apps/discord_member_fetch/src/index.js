const {
  clearSheetRange,
  createHttpServer,
  createSheetsClient,
  fetchGuildMembers,
  requireEnv,
  updateSheetValues
} = require('@sukubaby/common');

const REQUIRED_ENV = ['BOT_TOKEN', 'GUILD_ID', 'SPREADSHEET_ID'];
const SHEET_NAME = 'Discord_ID';

async function syncDiscordMembers() {
  const {
    BOT_TOKEN: botToken,
    GUILD_ID: guildId,
    SPREADSHEET_ID: spreadsheetId
  } = requireEnv(REQUIRED_ENV);

  const members = await fetchGuildMembers({ botToken, guildId });
  const values = members.map((member) => [
    member.discordUserId,
    member.displayName
  ]);

  const sheets = createSheetsClient();

  await clearSheetRange({
    sheets,
    spreadsheetId,
    range: `${SHEET_NAME}!A2:B`
  });

  await updateSheetValues({
    sheets,
    spreadsheetId,
    range: `${SHEET_NAME}!A2`,
    values
  });

  return 'スプレッドシート更新完了（Discord_IDシート）';
}

if (require.main === module) {
  createHttpServer(syncDiscordMembers);
}

module.exports = {
  syncDiscordMembers
};
