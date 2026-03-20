// Discord.gs

const DISCORD_CONTENT_LIMIT = 2000;

/** Webhook送信（contentのみ） */
function postDiscordWebhook_(webhookUrl, content) {
  if (!webhookUrl) throw new Error('webhookUrl is empty');

  const payload = { content: String(content || '') };

  const res = UrlFetchApp.fetch(webhookUrl, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  const code = res.getResponseCode();
  const text = res.getContentText();
  if (code < 200 || code >= 300) {
    throw new Error(`Discord webhook failed: ${code} ${text}`);
  }
}

/** 2000文字を超える場合は安全に分割して送信 */
function postDiscordWebhookChunked_(webhookUrl, content) {
  if (isTestMode_()) {
    if (String(webhookUrl || '').indexOf(TEST_FAIL_DISCORD_WEBHOOK) >= 0) {
      throw new Error('Discord webhook failed: simulated failure in test mode');
    }

    recordFakeDiscordPost_(webhookUrl, content);
    return;
  }

  const chunks = splitDiscordContent_(String(content || ''), DISCORD_CONTENT_LIMIT);

  for (const chunk of chunks) {
    postDiscordWebhook_(webhookUrl, chunk);
    Utilities.sleep(350);
  }
}

/**
 * メンション(<@...>)と改行(\n)を壊さずに分割
 * - token: <@123..> or <@!123..> or '\n' or other text
 */
function splitDiscordContent_(text, limit) {
  if (!text) return [''];
  if (text.length <= limit) return [text];

  const tokens = text.match(/<@!?[0-9]+>|\n|[^<\n]+/g) || [];
  const chunks = [];
  let buf = '';

  const pushBuf = () => {
    if (buf.length > 0) {
      chunks.push(buf);
      buf = '';
    }
  };

  for (const token of tokens) {
    if (token.length > limit) {
      // まず起きないが保険
      pushBuf();
      chunks.push(token.slice(0, limit));
      continue;
    }

    const candidate = buf + token;
    if (candidate.length > limit) {
      pushBuf();
      buf = token;
    } else {
      buf = candidate;
    }
  }

  pushBuf();
  return chunks;
}