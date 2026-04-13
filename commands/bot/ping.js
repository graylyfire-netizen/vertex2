"use strict";

module.exports = {
  name: "ping",
  description: "Return the bot's latency",
  dontUseDB: true, // ONLY USE IF IT DOESN'T REQUIRE ANY DATABASE CHANGES / MINECRAFT OR XBOX RELATED LINK COMMANDS
  execute: async (interaction, args, dbUser, embed) => {
    embed.description = "Getting ping...";

    const currentTime = Date.now();
    const msg = await interaction.createFollowup({ embed });

    embed.description = `\`${Date.now() - currentTime}ms\`\n`;

    return await msg.edit({ embed });
  }
};