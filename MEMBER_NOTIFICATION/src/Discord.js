// Discord.js

const DISCORD_CONTENT_LIMIT = 2000;
const DISCORD_MAX_RETRY = 5;
const DISCORD_POST_INTERVAL_MS = 1500;

/** Webhook送信（contentのみ） */
function postDiscordWebhook_(webhookUrl, content) {
  if (!webhookUrl) throw new Error('webhookUrl is empty');

  const payload = { content: String(content || '') };

  for (let attempt = 1; attempt <= DISCORD_MAX_RETRY; attempt++) {
    const res = UrlFetchApp.fetch(webhookUrl, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });

    const code = res.getResponseCode();
    const text = res.getContentText();

    if (code >= 200 && code < 300) return;

    if (code === 429) {
      const waitMs = getDiscordRetryAfterMs_(res, text);
      Utilities.sleep(waitMs);
      continue;
    }

    throw new Error(`Discord webhook failed: ${code} ${text}`);
  }

  throw new Error(`Discord webhook failed: 429 retry exhausted`);
}

function getDiscordRetryAfterMs_(res, text) {
  const headers = res.getAllHeaders ? res.getAllHeaders() : {};
  const retryAfter =
    headers['Retry-After'] ||
    headers['retry-after'] ||
    headers['X-RateLimit-Reset-After'] ||
    headers['x-ratelimit-reset-after'];

  if (retryAfter) {
    return Math.ceil(Number(retryAfter) * 1000) + 500;
  }

  try {
    const json = JSON.parse(text || '{}');
    if (json.retry_after) {
      return Math.ceil(Number(json.retry_after) * 1000) + 500;
    }
  } catch (e) {}

  return 5000;
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
    Utilities.sleep(DISCORD_POST_INTERVAL_MS);
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