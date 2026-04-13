"use strict";

const bpClient = require("../../common/Client.js");
const RealmAPI = require("../../common/Realm.js");

const { translateDisconnectMessage } = require("../../common/Util.js");

const map = new Map();

module.exports = {
  name: "test",
  description: "Test client for developers.",
  dontUseDB: false, // ONLY USE IF IT DOESN'T REQUIRE ANY DATABASE CHANGES / MINECRAFT OR XBOX RELATED LINK COMMANDS
  staffOnly: true,
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

    let address = {};

    switch (map.get(user.id)) {
      default:
        if (map.get(user.id)) {
          embed.description = `You're already doing this.`;
          interaction.createFollowup({ embed });
          return clearCooldown();
        }
        break;
    }

    let RAPI = new RealmAPI(user.id);
    let realm = /^\d+$/.test(input) ? await RAPI.getRealmInfoByID(input) : await RAPI.getRealmInfo(input);

    embed.title = "Operation";
    embed.description = `Realm Name: **${realm.name}**\nInput: **${input}**`;
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

    const msg = await interaction.createFollowup({ embed });

    map.set(user.id, 1);

    if (realm.status) {
      switch (realm.status) {
        case 403:
          embed.description = `Operation failed\nInput: **${input}**\n${realm?.body?.errorMsg} (${realm?.body?.errorCode})`;
          break;
        case 404:
          embed.description = `Operation failed\nInput: **${input}**\n${realm?.body?.errorMsg} (${realm?.body?.errorCode})`;
          break;
        case 429:
          embed.description = `Operation failed\nInput: **${input}**\n${realm?.body?.errorMsg} (${realm?.body?.errorCode})`;
          break;
        case 500:
          embed.description = `Operation failed\nInput: **${input}**\n${realmIP?.body?.errorMsg} (${realmIP?.body?.errorCode})`;
          break;
        case 502:
        case 504:
          embed.description = `Operation failed\nInput: **${input}**\nRealms API is currently undergoing a outage.`;
          break;
        case 1403:
          embed.description = `Operation failed\nInput: **${input}**\n${realm?.body?.errorMsg} (${realm?.body?.errorCode})`;
          break;
        case 1429:
          embed.description = `Operation failed\nInput: **${input}**\n${realm?.body?.errorMsg} (${realm?.body?.errorCode})`;
          break;
        default:
          embed.description = `Operation failed\nInput: **${input}**\nTry again later or contact support. (Status ${realm.status})`;
          break;
      }

      map.delete(user.id);

      embed.fields[0].value = ":red_circle:";

      return await msg.edit({ embed });
    }

    if (realm.expired || realm.state === "CLOSED") {
      embed.description = `Operation failed on **${realm.name}**\nInput: **${input} ${/^\d+$/.test(input) ? "" : `(${realm.id})`}**\nRealm is ${realm.expired ? "expired" : "closed"}.`;

      map.delete(user.id);

      embed.fields[0].value = ":red_circle:";

      return await msg.edit({ embed });
    }

    let realmIP = await RAPI.getRealmIP(realm.id);

    if (realmIP.status) {
      switch (realmIP.status) {
        case 403:
        case 404:
        case 500:
        case 1429:
          embed.description = `Operation failed\nInput: **${input}**\n${realmIP?.body?.errorMsg} (${realmIP?.body?.errorCode})`;
          break;
        case 502:
        case 504:
          embed.description = `Operation failed\nInput: **${input}**\nRealms API is currently undergoing a outage.`;
          break;
        default:
          embed.description = `Operation failed\nInput: **${input}**\nTry again later or contact support. (Status ${realmIP.status})`;
          break;
      }

      map.delete(user.id);

      embed.fields[0].value = ":red_circle:";

      return await msg.edit({ embed });
    }

    switch (realmIP.networkProtocol) {
      case "NETHERNET":
      case "NETHERNET_JSONRPC":
        address.networkId = realmIP.address;
        break;
      case "DEFAULT":
        address.ip = realmIP.address?.substring(0, realmIP.address.indexOf(':'));
        address.port = Number(realmIP.address?.substring(realmIP.address.indexOf(':') + 1));
        break;
      default:
        embed.description = `Operation failed\nInput: **${input}**\nUnsupported Network Protocol: **${realmIP.networkProtocol}**`;

        map.delete(user.id);

        embed.fields[0].value = ":red_circle:";

        return await msg.edit({ embed });
    }

    let configuration = {
      ssbp: { enabled: false, type: NaN },
      transport: realmIP.networkProtocol
    };

    const client = new bpClient(address, dbUser, realm, configuration);
    await client.connect();

    embed.fields[0].value = ":green_circle:";
    embed.fields[1].value = ":yellow_circle:";

    embed.description = `Started a operation on **${realm.name}**\nInput: **${input} ${/^\d+$/.test(input) ? "" : `(${realm.id})`}**\nProtocol: **${realmIP.networkProtocol}**`;

    msg.edit({ embed })

    client.on("kick", async (packet) => {
      if (!map.get(user.id)) return;

      client.disconnect();
      map.delete(user.id);

      embed.fields[1].value = ":red_circle:";

      embed.description = `Operation failed on **${realm.name}**\nInput: **${input} ${/^\d+$/.test(input) ? "" : `(${realm.id})`}**\nProtocol: **${realmIP.networkProtocol}**`;

      if (packet.message.includes("/multiplayer/bedrock/authentication")) {
        packet.message = "Banned from Minecraft Multiplayer";
        await RAPI.cleanLinkData("Banned from Minecraft Multiplayer", false);
      }

      // I don't want to have multiple embed.fields = []s again
      embed.fields.push({
        id: 2,
        name: "Reason",
        value: translateDisconnectMessage(packet),
        inline: true
      })

      return await msg.edit({ embed });
    })

    client.once("start_game", async (packet) => {
      console.log("Start Game");

      map.delete(user.id);

      embed.fields[1].value = ":green_circle:"

      return await msg.edit({ embed });
    })
  }
};