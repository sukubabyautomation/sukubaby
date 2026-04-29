const { Client, GatewayIntentBits } = require('discord.js');

async function fetchGuildMembers({ botToken, guildId }) {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers
    ]
  });

  try {
    await client.login(botToken);

    const guild = await client.guilds.fetch(guildId);
    const members = await guild.members.fetch();

    return members.map((member) => ({
      discordUserId: member.user.id,
      displayName: member.user.globalName ?? member.user.username,
      username: member.user.username
    }));
  } finally {
    client.destroy();
  }
}

module.exports = {
  fetchGuildMembers
};
