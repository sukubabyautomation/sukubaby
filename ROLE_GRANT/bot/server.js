const express = require("express");
const { Client, GatewayIntentBits } = require("discord.js");

const APP_CONFIG_JSON = process.env.APP_CONFIG_JSON;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_ROLE_API_TOKEN = process.env.DISCORD_ROLE_API_TOKEN;
const PORT = process.env.PORT || 8080;

if (!APP_CONFIG_JSON) throw new Error("APP_CONFIG_JSON is not set");
if (!DISCORD_BOT_TOKEN) throw new Error("DISCORD_BOT_TOKEN is not set");
if (!DISCORD_ROLE_API_TOKEN) throw new Error("DISCORD_ROLE_API_TOKEN is not set");

const config = JSON.parse(APP_CONFIG_JSON);

const GUILD_ID = config.guild_id;
const DEFAULT_SUCCESS_NOTIFY_CHANNEL_ID = config.success_notify_channel_id || "";
const DEFAULT_ADMIN_CHANNEL_ID = config.admin_channel_id || "";

const app = express();
app.use(express.json());

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const expected = `Bearer ${DISCORD_ROLE_API_TOKEN}`;

  if (auth !== expected) {
    return res.status(401).json({ status: "FAILED", error: "Unauthorized" });
  }
  next();
}

function validatePayload(body) {
  const errors = [];
  if (!body.runId) errors.push("runId is required");
  if (!body.jobCode) errors.push("jobCode is required");
  if (!body.ruleCode) errors.push("ruleCode is required");
  if (!body.memberKey) errors.push("memberKey is required");
  if (!body.discordUserId) errors.push("discordUserId is required");
  if (!Array.isArray(body.actions)) errors.push("actions must be array");
  return errors;
}

function renderTemplate(template, variables, discordUserId, mentionMemberFlg) {
  let message = template || "";
  const merged = {
    ...variables,
    mention: mentionMemberFlg ? `<@${discordUserId}>` : ""
  };

  Object.keys(merged).forEach((key) => {
    const value = merged[key] == null ? "" : String(merged[key]);
    const pattern = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    message = message.replace(pattern, value);
  });

  return message.trim();
}

async function applySingleAction(member, action) {
  try {
    const roleId = action.discord_role_id;
    if (!roleId) {
      return {
        action_order: action.action_order,
        action_type: action.action_type,
        role_kind: action.role_kind,
        business_code: action.business_code,
        discord_role_id: "",
        result: "FAILED",
        error_code: "ROLE_ID_EMPTY",
        error_message: "discord_role_id is empty"
      };
    }

    const hasRole = member.roles.cache.has(roleId);

    if (action.action_type === "REVOKE") {
      if (!hasRole && action.skip_if_not_exists_flg === true) {
        return {
          action_order: action.action_order,
          action_type: action.action_type,
          role_kind: action.role_kind,
          business_code: action.business_code,
          discord_role_id: roleId,
          result: "SKIPPED_ALREADY_NOT_ASSIGNED",
          error_code: "",
          error_message: ""
        };
      }

      await member.roles.remove(roleId);

      return {
        action_order: action.action_order,
        action_type: action.action_type,
        role_kind: action.role_kind,
        business_code: action.business_code,
        discord_role_id: roleId,
        result: "SUCCESS",
        error_code: "",
        error_message: ""
      };
    }

    if (action.action_type === "GRANT") {
      if (hasRole && action.skip_if_already_done_flg === true) {
        return {
          action_order: action.action_order,
          action_type: action.action_type,
          role_kind: action.role_kind,
          business_code: action.business_code,
          discord_role_id: roleId,
          result: "SKIPPED_ALREADY_ASSIGNED",
          error_code: "",
          error_message: ""
        };
      }

      await member.roles.add(roleId);

      return {
        action_order: action.action_order,
        action_type: action.action_type,
        role_kind: action.role_kind,
        business_code: action.business_code,
        discord_role_id: roleId,
        result: "SUCCESS",
        error_code: "",
        error_message: ""
      };
    }

    return {
      action_order: action.action_order,
      action_type: action.action_type,
      role_kind: action.role_kind,
      business_code: action.business_code,
      discord_role_id: roleId,
      result: "FAILED",
      error_code: "UNSUPPORTED_ACTION_TYPE",
      error_message: `Unsupported action_type: ${action.action_type}`
    };
  } catch (err) {
    return {
      action_order: action.action_order,
      action_type: action.action_type,
      role_kind: action.role_kind,
      business_code: action.business_code,
      discord_role_id: action.discord_role_id || "",
      result: "FAILED",
      error_code: "DISCORD_ROLE_OPERATION_FAILED",
      error_message: err?.message || String(err)
    };
  }
}

async function postNotification(guild, destination, message) {
  const channelId = destination?.dest_id || DEFAULT_SUCCESS_NOTIFY_CHANNEL_ID;
  if (!channelId || !message) return "SKIPPED";

  try {
    const channel = await guild.channels.fetch(channelId);
    if (!channel || typeof channel.send !== "function") return "FAILED";
    await channel.send({ content: message });
    return "SUCCESS";
  } catch (err) {
    console.error("Notification failed:", err);
    return "FAILED";
  }
}

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    botReady: client.isReady()
  });
});

app.post("/api/roles/apply", requireAuth, async (req, res) => {
  try {
    if (!client.isReady()) {
      return res.status(503).json({
        status: "FAILED",
        error: "Discord client is not ready"
      });
    }

    const errors = validatePayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({
        status: "FAILED",
        error: errors.join(", ")
      });
    }

    const payload = req.body;
    const guild = await client.guilds.fetch(GUILD_ID);
    const member = await guild.members.fetch(payload.discordUserId);

    const actions = [...payload.actions].sort(
      (a, b) => Number(a.action_order || 9999) - Number(b.action_order || 9999)
    );

    const actionResults = [];
    let hasFailure = false;

    for (const action of actions) {
      const result = await applySingleAction(member, action);
      actionResults.push(result);

      if (result.result === "FAILED") {
        hasFailure = true;
        break;
      }
    }

    let notifyStatus = "SKIPPED";
    if (!hasFailure) {
      const message = renderTemplate(
        payload.messageTemplate,
        payload.messageVariables || {},
        payload.discordUserId,
        payload.mentionMemberFlg === true
      );
      notifyStatus = await postNotification(
        guild,
        payload.destination,
        message
      );
    }

    return res.json({
      status: hasFailure ? "PARTIAL_SUCCESS" : "SUCCESS",
      actions: actionResults,
      notify_status: notifyStatus
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "FAILED",
      error: err?.message || String(err),
      actions: [],
      notify_status: "FAILED"
    });
  }
});

client.once("ready", () => {
  console.log(`Bot logged in as ${client.user.tag}`);
});

client.login(DISCORD_BOT_TOKEN)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to login bot:", err);
    process.exit(1);
  });