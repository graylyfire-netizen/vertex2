"use strict";

const CoinHandler = require("../../classes/CoinSystem.js");

module.exports = {
  name: "season",
  description: "Return current season",
  dontUseDB: true, // ONLY USE IF IT DOESN'T REQUIRE ANY DATABASE CHANGES / MINECRAFT OR XBOX RELATED LINK COMMANDS
  execute: async (interaction, args, dbUser, embed) => {
    const CHandler = new CoinHandler(interaction, dbUser);
    const seasonInfo = CHandler.getSeason();

    embed.description = `**${seasonInfo.season.toUpperCase()}** (**${seasonInfo.multiplier}x**)`;

    return interaction.createFollowup({ embed });
  }
};