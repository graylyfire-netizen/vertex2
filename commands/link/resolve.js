"use strict";

const RealmAPI = require("../../common/Realm.js");

module.exports = {
  name: "resolve",
  description: "Resolve information on a realm",
  dontUseDB: false, // ONLY USE IF IT DOESN'T REQUIRE ANY DATABASE CHANGES / MINECRAFT OR XBOX RELATED LINK COMMANDS
  requireLink: true,
  cooldown: 10000,
  options: [
    {
      type: 3,
      name: "input",
      description: "Realm Code or ID",
      required: true,
      min_length: 5,
      max_length: 15
    }
  ],
  execute: async (interaction, args, dbUser, embed, clearCooldown) => {
    const { input } = args;
    const { user } = interaction;

    let RAPI = new RealmAPI(user.id);
    let realm = /^\d+$/.test(input) ? await RAPI.getRealmInfoByID(input) : await RAPI.getRealmInfo(input, false);

    embed.description = "Please wait...";
    const msg = await interaction.createFollowup({ embed });

    if (realm.status) {
      switch (realm.status) {
        case 403:
        case 404:
        case 429:
        case 500:
        case 1403:
        case 1429:
        case 1500:
          embed.description = `${realm?.body?.errorMsg} (${realm?.body?.errorCode})`;
          break;
        case 502:
        case 504:
          embed.description = `Realms API is currently undergoing a outage.`;
          break;
        default:
          embed.description = `Try again later or contact support. (Status ${realm.status})`;
          break;
      }

      return await msg.edit({ embed });
    }

    const realmIP = await RAPI.getRealmIP(realm.id);

    if (realmIP.status) {
      switch (realmIP.status) {
        case 403:
        case 404:
        case 500:
        case 1429:
          embed.description = `${realmIP?.body?.errorMsg} (${realmIP?.body?.errorCode})`;
          break;
        case 502:
        case 504:
          embed.description = `Realms API is currently undergoing a outage.`;
          break;
        default:
          embed.description = `Try again later or contact support. (Status ${realmIP.status})`;
          break;
      }

      return await msg.edit({ embed });
    }

    embed.description = `\`\`\`json\n${JSON.stringify(realmIP, null, 2)}\`\`\``;

    return await msg.edit({ embed })
  }
};