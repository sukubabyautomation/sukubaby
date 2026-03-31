// RuleApi.gs

function callDiscordRoleApi_(payload) {
  const props = PropertiesService.getScriptProperties();
  const apiUrl = props.getProperty("DISCORD_ROLE_API_URL");
  const apiToken = props.getProperty("DISCORD_ROLE_API_TOKEN");

  if (!apiUrl) throw new Error("Missing script property: DISCORD_ROLE_API_URL");
  if (!apiToken) throw new Error("Missing script property: DISCORD_ROLE_API_TOKEN");

  const response = UrlFetchApp.fetch(apiUrl, {
    method: "post",
    contentType: "application/json",
    muteHttpExceptions: true,
    headers: {
      Authorization: `Bearer ${apiToken}`
    },
    payload: JSON.stringify(payload)
  });

  const statusCode = response.getResponseCode();
  const bodyText = response.getContentText();

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`Discord role API error: status=${statusCode}, body=${bodyText}`);
  }

  const json = JSON.parse(bodyText);
  return json;
}