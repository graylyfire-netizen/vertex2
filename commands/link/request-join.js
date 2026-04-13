"use strict";

const RealmAPI = require("../../common/Realm.js");

const map = new Map();

module.exports = {
  name: "request-join",
  description: "Request a join to the realm",
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
    },
    {
      type: 4,
      name: "amount",
      description: "Amount of requests for you to join",
      required: true,
      min_value: 1,
      max_value: 100
    }
  ],
  execute: async (interaction, args, dbUser, embed, clearCooldown) => {
    const { input, amount } = args;
    const { user } = interaction;

    switch (map.get(user.id)) {
      default:
        if (map.get(user.id)) {
          embed.description = `You're already doing this.`;
          interaction.createFollowup({ embed });
          return clearCooldown();
        }
        break;
    }

    let RAPI = new RealmAPI(user.id, true);
    let realm = /^\d+$/.test(input) ? await RAPI.getRealmInfoByID(input) : await RAPI.getRealmInfo(input, false);

    embed.description = `Please wait...`;

    const msg = await interaction.createFollowup({ embed });

    embed.title = "Operation";
    embed.fields = [
      {
        id: 0,
        name: "Connection",
        value: ":yellow_circle:",
        inline: true
      },
      {
        id: 1,
        name: "Operation",
        value: ":red_circle:",
        inline: true
      }
    ];

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

      embed.title = "";
      embed.fields = [];

      map.delete(user.id)

      return await msg.edit({ embed });
    }

    if (realm.expired || realm.state === "CLOSED") {
      embed.description = `Operation failed on **${realm.name}**\nInput: **${input} ${/^\d+$/.test(input) ? "" : `(${realm.id})`}**\nRealm is ${realm.expired ? "expired" : "closed"}.`;

      map.delete(user.id);

      embed.fields[0].value = ":red_circle:";

      return await msg.edit({ embed });
    }

    let num = 0;

    embed.description = `Operation started on **${realm.name}**\nInput: **${input} ${/^\d+$/.test(input) ? "" : `(${realm.id})`}**\nAttempt: **${num}**/**${amount}**`;
    embed.fields[0].value = ":green_circle:";
    embed.fields[1].value = ":yellow_circle:";

    await msg.edit({ embed });

    map.set(user.id, 1);

    // Don't need to risk hitting the retry limit on just getting realm info :/
    // Also it has to be before or else it will just do it 9 times by default, which we don't want
    RAPI.maxRetries = amount;

    const realmIP = await RAPI.getRealmIP(realm.id, async (count) => {
      num = count;

      if (count >= amount) num = amount;

      embed.description = `Operation started on **${realm.name}**\nInput: **${input}** ${/^\d+$/.test(input) ? "" : `(**${realm.id}**)`}\nAttempt: **${num}**/**${amount}**`;
      embed.fields[1].value = ":yellow_circle:";

      return await msg.edit({ embed });
    });

    if (realmIP.status) {
      switch (realmIP.status) {
        case 403:
        case 404:
        case 500:
          embed.description = `${realmIP?.body?.errorMsg} (${realmIP?.body?.errorCode})`;
          break;
        case 1429:
          if (num >= amount) num = amount;

          embed.description = `Operation started on **${realm.name}**\nInput: **${input}** ${/^\d+$/.test(input) ? "" : `(**${realm.id}**)`}\nAttempt: **${num}**/**${amount}**`;
          embed.fields[1].value = ":green_circle:";
          break;
        case 502:
        case 504:
          embed.description = `Realms API is currently undergoing a outage.`;
          break;
        default:
          embed.description = `Try again later or contact support. (Status ${realmIP.status})`;
          break;
      }

      map.delete(user.id)

      return await msg.edit({ embed });
    }

    map.delete(user.id)
  }
};