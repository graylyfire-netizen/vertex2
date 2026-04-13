"use strict";

const bpClient = require("../../common/Client.js");
const RealmAPI = require("../../common/Realm.js");

const { translateDisconnectMessage, cleanLeftovers } = require("../../common/Util.js");

const CoinHandler = require("../../classes/CoinSystem.js");

const map = new Map();

module.exports = {
  name: "particles",
  description: "Give nearby objects particles",
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
      name: "type",
      description: "Choose the type of particles",
      required: true,
      choices: [
        { name: "Eat Particles", value: 1 },
        { name: "Denied Particles", value: 2 },
      ]
    },
    {
      type: 4,
      name: "object",
      description: "Choose the object",
      required: true,
      choices: [
        { name: "Bot", value: 0 },
        { name: "Player", value: 1 },
        { name: "Entities", value: 2 },
        { name: "All", value: 3 }
      ]
    },
    {
      type: 4,
      name: "time",
      description: "Duration",
      required: true,
      min_value: 1,
      max_value: 180
    },
  ],
  execute: async (interaction, args, dbUser, embed, clearCooldown) => {
    const { input, type, object, time } = args;
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

    if (type === 1 && object !== 0 || type === 2 && object !== 3) {
      embed.description = "Invaild object for this type";

      interaction.createFollowup({ embed })

      return clearCooldown();
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
    })

    map.set(user.id, 1)

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

    let interval, players = [], entities = [], items = [], timeout, interval2 = setInterval(async () => {
      if (map.get(user.id) === 64) {
        cleanLeftovers([interval, interval2], [timeout])
        embed.fields[1].value = ":octagonal_sign:";
        embed.description = `Operation cancelled on **${realm.name}**\nInput: **${input} ${/^\d+$/.test(input) ? "" : `(${realm.id})`}**\nProtocol: **${realmIP.networkProtocol}**`

        client.disconnect();
        map.delete(user.id);

        const reward = await CHandler.reward();

        embed.description += `\nCoins Earned: **${reward}**`;

        return await msg.edit({ embed, components: [] })
      }
    })

    client.on("kick", async (packet) => {
      if (!map.get(user.id)) return;

      cleanLeftovers([interval, interval2], [timeout]);
      map.delete(user.id);

      embed.fields[1].value = ":red_circle:";
      embed.description = `Operation failed on **${realm.name}**\nInput: **${input} ${/^\d+$/.test(input) ? "" : `(${realm.id})`}**\nProtocol: **${realmIP.networkProtocol}**`;

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

      const reward = await CHandler.reward();

      embed.description += `\nCoins Earned: **${reward}**`;

      return await msg.edit({ embed, components: [] });
    })

    client.on("add_player", (packet) => players.push({ rtid: packet.runtime_id, pos: packet.position }));
    client.on("add_entity", (packet) => entities.push({ rtid: packet.runtime_id, pos: packet.position }));
    client.on("add_item_entity", (packet) => entities.push({ rtid: packet.runtime_entity_id, pos: packet.position }));
    client.on("item_registry", (packet) => {
      for (const item of packet.itemstates) items.push(item.runtime_id);
    })

    client.on("remove_entity", (packet) => {
      players = players.filter(p => p.rtid !== packet.runtime_id);
      entities = entities.filter(e => e.rtid !== packet.runtime_id);
    })

    client.on("move_player", (packet) => {
      if (object === 2) return;

      for (const plr of players) {
        if (Number(plr.rtid) === Number(packet.runtime_id)) {
          plr.pos = packet.position;

          players = players;
        }
      }
    })

    client.on("move_entity_delta", (packet) => {
      if (object === 1) return;

      for (const entity of entities) {
        if (Number(entity.rtid) === Number(packet.runtime_entity_id)) {
          entity.pos = { x: packet.x ?? entity.pos.x, y: packet.y ?? entity.pos.y, z: packet.z ?? entity.pos.z };

          entities = entities;
        }
      }
    })

    client.on("move_entity", (packet) => {
      if (object === 1) return;

      for (const entity of entities) {
        if (Number(entity.rtid) === Number(packet.runtime_id)) {
          entity.pos = packet.position

          entities = entities;
        }
      }
    })

    client.once("start_game", (packet) => {
      const particleHandler = (runtime_entity_id, position) => {
        switch (type) {
          case 1:
            client.write("entity_event", {
              runtime_entity_id,
              event_id: "eating_item",
              data: (items[~~(Math.random() * items.length)] << 16) | 41248
            })
            break;
          case 2:
            const radius = 3;
            const centerPosition = position;

            for (let x = -radius; x <= radius; x++) {
              for (let y = -radius; y <= radius; y++) {
                for (let z = -radius; z <= radius; z++) {
                  const position = {
                    x: centerPosition.x + x,
                    y: centerPosition.y + y,
                    z: centerPosition.z + z,
                  };

                  client.write("player_action", {
                    runtime_entity_id: packet.runtime_entity_id,
                    action: "build_denied",
                    position,
                    result_position: position,
                  });
                }
              }
            }
            break;
        }
      }

      interval = setInterval(() => {
        switch (object) {
          case 0:
            particleHandler(packet.runtime_entity_id);
            break;
          case 1:
            for (const p of players) particleHandler(p.rtid, p.pos)
            break;
          case 2:
            for (const e of entities) particleHandler(e.rtid, e.pos)
            break;
          case 3:
            let all = [...entities, ...players, { rtid: packet.runtime_entity_id, pos: client.currentPos }]

            for (const a of all) particleHandler(a.rtid, a.pos)
            break;
        }
      }, 0)

      timeout = setTimeout(async () => {
        client.disconnect();
        map.delete(user.id);
        cleanLeftovers([interval, interval2], [timeout]);

        embed.fields[1].value = ":green_circle:"

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

  map.set(user.id, 64)

  await interaction.acknowledge();
}