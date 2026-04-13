"use strict";

const { userModel } = require("../../common/Database.js");

module.exports = {
  name: "leaderboard",
  description: "Check who is on the leaderboard",
  // I mean like, our user's database, we're still using it from userModel lol.. (it can be false)
  dontUseDB: false, // ONLY USE IF IT DOESN'T REQUIRE ANY DATABASE CHANGES / MINECRAFT OR XBOX RELATED LINK COMMANDS
  dmsOnly: true,
  execute: async (interaction, args, dbUser, embed) => {
    const [usersCoins, usersAttacks] = await Promise.all([
      userModel.find({ coins: { $exists: true } }, { id: 1, coins: 1 }).sort({ coins: -1 }).limit(20).lean(),
      userModel.find({ attacks: { $exists: true } }, { id: 1, attacks: 1 }).sort({ attacks: -1 }).limit(20).lean()
    ]);

    const [userCoinsIds, userCoins, userAttackIds, userAttacks] = ([
      usersCoins.map(({ id }) => id),
      usersCoins.map(({ coins }) => coins ?? 0),
      usersAttacks.map(({ id }) => id),
      usersAttacks.map(({ attacks }) => attacks ?? 0)
    ]);

    embed.fields = [
      {
        id: 8289320191,
        name: "Coins",
        value: userCoinsIds.map((id, index) => `**${index + 1}.** <@${id}> - **${userCoins[index].toLocaleString()}**`).join('\n'),
        inline: true
      },
      {
        id: 209091209,
        name: "Operations",
        value: userAttackIds.map((id, index) => `**${index + 1}.** <@${id}> - **${userAttacks[index].toLocaleString()}**`).join('\n'),
        inline: true
      }
    ]

    return interaction.createFollowup({ embed });
  }
};