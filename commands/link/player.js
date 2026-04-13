"use strict";

const bpClient = require("../../common/Client.js");
const RealmAPI = require("../../common/Realm.js");

const { translateDisconnectMessage, cleanLeftovers } = require("../../common/Util.js");

const CoinHandler = require("../../classes/CoinSystem.js");

const map = new Map();

module.exports = {
  name: "player",
  description: "Retrieve information on a player",
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
      type: 3,
      name: "username",
      description: "The name of the user",
      required: true,
      min_length: 3,
      max_length: 20
    }
  ],
  execute: async (interaction, args, dbUser, embed, clearCooldown) => {
    const { input, username, object } = args;
    const { user } = interaction;

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

    await msg.edit({ embed });

    const CHandler = new CoinHandler(interaction, dbUser);
    CHandler.start();

    let timeout, playerFound = false, victim = {}, interval = setInterval(async () => {
      if (map.get(user.id) === 64) {
        cleanLeftovers([interval], [timeout]);

        embed.fields[1].value = ":octagonal_sign:";
        embed.description = `Operation cancelled on **${realm.name}**\nInput: **${input} ${/^\d+$/.test(input) ? "" : `(${realm.id})`}**\nProtocol: **${realmIP.networkProtocol}**`;

        client.disconnect();
        map.delete(user.id);

        const reward = await CHandler.reward();

        embed.description += `\nCoins Earned: **${reward}**`;

        return await msg.edit({ embed, components: [] })
      }
    })

    client.on("kick", async (packet) => {
      if (!map.get(user.id)) return;

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

      const reward = await CHandler.reward();

      embed.description += `\nCoins Earned: **${reward}**`;

      return await msg.edit({ embed, components: [] });
    })

    client.on("player_list", (packet) => {
      const records = packet.records.records;

      for (const player of records) {
        const { xbox_user_id: xuid } = player;

        if (client.profile.XUID === xuid) continue;
        if (!player.username) continue;

        if (player.username.toLowerCase() === username.toLowerCase()) {
          playerFound = true;

          victim = {
            ...victim,
            entityId: Number(player.entity_unique_id),
            entityIdD: player.entity_unique_id,
            username: player.username,
            uuid: player.uuid,
            xuid: player.xbox_user_id,
            device_os: player.build_platform,
            platform_online_id: player.platform_chat_id
          }
        }
      }
    });

    client.on("add_player", (packet) => {
      if (!playerFound) return;

      if (packet.username === victim.username) {
        victim = {
          ...victim,
          runtime_id: Number(packet.runtime_id),
          position: packet.position,
          gamemode: packet.gamemode,
          permission_level: packet.permission_level,
          device_id: packet.device_id,
          last_death_position: (() => {
            const position = packet.metadata.find(m => m.key === "player_last_death_position")?.value;
            return position ? { x: position.x, y: position.y, z: position.z } : undefined;
          })(),
          player_bed_position: (() => {
            const position = packet.metadata.find(m => m.key === "player_bed_position")?.value;
            return position ? { x: position.x, y: position.y, z: position.z } : undefined;
          })(),
          actions: (() => {
            const flags = packet.metadata.find(m => m.key === "flags")?.value;
            const flags_extended = packet.metadata.find(m => m.key === "flags_extended")?.value;
            const actions = [];

            if (flags) {
              Object.entries(flags).forEach(([key, value]) => {
                if (key === "_value") return;

                if (value) actions.push(key);
              });
            }

            if (flags_extended) {
              Object.entries(flags_extended).forEach(([key, value]) => {
                if (key === "_value") return;

                if (value) actions.push(key);
              });
            }

            return actions;
          })()
        }
      }
    });

    client.on("move_player", (packet) => {
      if (!playerFound) return;

      if (Number(packet.runtime_id) === victim.runtime_id) {
        victim.position = packet.position;
      }
    })

    client.on("player_location", (packet) => {
      if (!playerFound) return;
      if (!victim.entityIdD) return;

      if (packet.entity_unique_id === victim.entityIdD) victim.position = packet.position;
    })

    client.once("start_game", () => {
      timeout = setTimeout(async () => {
        cleanLeftovers([interval], [timeout]);

        if (!playerFound) {
          embed.fields[1].value = ":red_circle:"

          embed.description = `Started a operation on **${realm.name}**\nInput: **${input} ${/^\d+$/.test(input) ? "" : `(${realm.id})`}**\nProtocol: **${realmIP.networkProtocol}**\nNo player named ${username} found.`;

          await msg.edit({ embed, components: [] });
        } else {
          embed.fields[1].value = ":green_circle:"

          if (victim?.device_id?.length > 32) victim.device_id = victim.device_id.slice(0, 32);
          if (String(victim?.device_os)?.length > 2) victim.device_os = String(victim.device_os).slice(0, 2);
          delete victim.entityIdD;

          const reward = await CHandler.reward();

          embed.description += `\nCoins Earned: **${reward}**`;

          await msg.edit({ embed, components: [], file: { file: Buffer.from(JSON.stringify(victim, null, 2)), name: `${username}.json` } });
        }

        client.disconnect();
        map.delete(user.id);
      }, 5000)
    })
  },
  componentPressEvent: cancel
};

async function cancel(interaction) {
  const { user } = interaction;

  map.set(user.id, 64);

  await interaction.acknowledge();
};