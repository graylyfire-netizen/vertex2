"use strict";

const vertex = require("../../package.json")
const data = require("../../ext/data.json");

module.exports = {
  name: "version",
  description: "Return version",
  dontUseDB: true, // ONLY USE IF IT DOESN'T REQUIRE ANY DATABASE CHANGES / MINECRAFT OR XBOX RELATED LINK COMMANDS
  execute: async (interaction, args, dbUser, embed) => {
    embed.description = `\`v${vertex.version}\`\n\`${data.version}\` (\`${data.protocol}\`)`;

    return await interaction.createFollowup({ embed });
  }
};