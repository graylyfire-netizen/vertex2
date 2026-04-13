"use strict";

const bpClient = require("../../common/Client.js");
const RealmAPI = require("../../common/Realm.js");

const { translateDisconnectMessage, cleanLeftovers, delay } = require("../../common/Util.js");
const { v4fast: v4 } = require('uuid-1345');

const CoinHandler = require("../../classes/CoinSystem.js");

const map = new Map();

module.exports = {
  name: "chat",
  description: "Speak in chat",
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
      description: "Choose type",
      required: true,
      choices: [
        { name: "Big Text", value: 1 },
        { name: "Big Text [SUB]", value: 2 },
        { name: "/me [CHAT]", value: 3 },
        { name: "/me [Chat] [SUB]", value: 4 },
        { name: "/me [External]", value: 5 },
        { name: "/me [External] [SUB]", value: 6 },
        { name: "/me [Chat] [External]", value: 7 },
        { name: "/me [Chat] [External] [SUB]", value: 8 },
        { name: "Sleep", value: 9 },
        { name: "Sleep [SUB]", value: 10 },
        { name: "Skin Change [Persona]", value: 11 },
        //{ name: "Skin Change [Persona] [SUB]", value: 12}, /*Persona Skins are somehow Broken on Subs, idk why but they give random Packet violations out*/
        { name: "Skin Change [No Persona]", value: 13 },
        { name: "Skin Change [No Persona] [SUB]", value: 14 },
        { name: "Skin Change [Persona & No Persona]", value: 15 },
        //{ name: "Skin Change [Persona & No Persona] [SUB]", value: 16},
        { name: "Skin Change [Persona & No Persona] & Sleep", value: 17 },
        //{ name: "Skin Change [Persona & No Persona] & Sleep [SUB]", value: 18},
        { name: "Emote [SUB]", value: 19 },
        //{ name: "All", value: 20 }, this will have its own cmd later 
        //{ name: "Test", value: 21}, only used for testing 
        { name: "Help [OP Chat]", value: 22 }, // help cmd has no ratelimit delay btw 
      ]
    },
    {
      type: 3,
      name: "message",
      description: "Message to send",
      required: true,
      min_length: 1,
      max_length: 256
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
      name: "amount",
      description: "amount",
      min_value: 1,
      max_value: 50
    },
    {
      type: 3,
      name: "emote",
      description: "Choose the emote to Play",
      choices: [
        { name: "Random", value: 'random' },
        { name: "Gooning", value: 'a57277d5-0693-4c8a-9b5c-45c33fdf7c26' },
        { name: "Griddy", value: "a58d3b2d-dac0-690f-b399-fd0e514ddf87" },
        { name: "Lagging", value: "a0db0cc0-bc44-03db-d64f-03c397da3a63" },
        { name: "Double L Dance", value: "515bb330-78b6-cc1e-58dd-6ad1399967e5" },
        { name: "Teleporting to Infinity", value: "f31cea6b-4a5d-2a1e-a9ed-18ade918d1ae" },
        { name: "Baby Shark", value: "d2e66d12-cd7a-2d65-1fb2-6048115e07f6" },
        { name: "Let me Cook!", value: "946e8237-6d30-a306-19dd-6b79e2f6938a" },
        { name: "Rizz Emote", value: "1eab3476-1a68-44d8-1151-2b5e2cfeb077" },
        { name: "SIUUU Dab Celebration", value: "03e62acd-4eb7-44c2-a58a-b223a51e2536" },
        { name: "Swimming", value: "5738659f-8432-a9e6-ae34-3808e3fde703" },
        { name: "UwU", value: "98f4e765-1c84-09af-90b6-f957f428e4c8" },
        { name: "Yapping Emote", value: "be6fed53-39bc-6fad-223e-12203b37c2df" },
        { name: 'T-Pose', value: "2794cdac-e033-23e4-b931-c894f9c9f5dc" },
      ]
    }
  ],
  execute: async (interaction, args, dbUser, embed, clearCooldown) => {
    let { input, type, message, time, amount, emote } = args;
    const { user } = interaction;
    let address = {};

    if (typeof amount === "undefined") amount = 1;
    //if (typeof emote === "undefined") emote = "a58d3b2d-dac0-690f-b399-fd0e514ddf87";
    if (typeof emote === "undefined") emote = "34a9df51-c283-b494-62ab-f77405829f30";

    message = message.replaceAll("\\n", "\n");

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

    let interval, timeout, interval2 = setInterval(async () => {
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

    client.on("disconnect_1", async (packet) => client.emit("kick", { ...packet, isSubClient: true }))

    client.on("kick", async (packet) => {
      if (!map.get(user.id)) return;

      if (typeof packet.isSubClient === "boolean" && packet?.isSubClient && packet.reason != "server_full") return;

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

    let ratelimit = 0

    switch (type) {
      case 1:
      case 2:
        ratelimit = 150;
        break;
      case 19:
        ratelimit = 1500;
        break;
    }

    const play_fab_id = client.options.skinData.PlayFabId

    let emotes = require('../../ext/emotes.json')

    let persona = require('../../ext/skin_change_persona.json')
    let persona_id = `persona-${play_fab_id}-5`

    persona = {
      ...persona,
      skin_id: persona_id,
      play_fab_id,
      full_skin_id: persona_id,
      skin_resource_pack: persona.skin_resource_pack.replaceAll("persona-f9747bc1582540ec-5", persona_id),
      geometry_data: persona.geometry_data.replaceAll("persona-f9747bc1582540ec-5", persona_id)
    }

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

    let uuids = [];

    ["player_list_1", "player_list_2", "player_list_3"].forEach(ev => {
      client.once(ev, async (packet) => {
        for (const player of packet.records.records) {
          if (uuids.includes(player.uuid)) return

          uuids.push(player.uuid)
        }
      })
    })

    const startGameHandler = (packet, index) => {
      let emotePktName, plrActionPktName;

      index === 0 ? emotePktName = 'emote' : emotePktName = `emote_${index}`;
      index === 0 ? plrActionPktName = 'player_action' : plrActionPktName = `player_action_${index}`;

      const actionData = {
        runtime_entity_id: packet.runtime_entity_id,
        position: packet.player_position,
        result_position: packet.player_position,
        face: 0
      }

      interval = setInterval(() => {
        switch (type) {
          case 9:
          case 10:
          case 17:
            client.write(plrActionPktName, { ...actionData, action: 5 })
            client.write(plrActionPktName, { ...actionData, action: 6 })
            break
          case 19:
            client.writeBatch(emotePktName, {
              entity_id: packet.runtime_entity_id,
              emote_id: emote === 'random' ? emotes[~~(Math.random() * emotes.length)] : emote,
              emote_length_ticks: 40,
              xuid: "", 
              platform_id: "",
              flags: 0
            }, amount)
            break;
        }
      }, type === 19 ? ratelimit : 0);
    }

    timeout = setTimeout(async () => {
      client.disconnect();
      map.delete(user.id);
      cleanLeftovers([interval, interval2], [timeout]);

      embed.fields[1].value = ":green_circle:"

      const reward = await CHandler.reward();

      embed.description += `\nCoins Earned: **${reward}**`;

      return await msg.edit({ embed, components: [] });
    }, time * 1000);

    ["start_game", "start_game_1", "start_game_2", "start_game_3"].forEach((value, index) => {
      client.once(value, (packet) => startGameHandler(packet, index))
    });

    ["play_status_1", "play_status_2", "play_status_3"].forEach((value, index) => {
      client.once(value, () => handlePlayStatus(index + 1));
    })

    const handlePlayStatus = async (index) => {
      const config = { batchOptions: { enabled: true, count: amount } };
      const chatconfig = { batchOptions: { enabled: false, count: 0 } };
      let plrSkinPktName, uuid, bigmessage = `${message}\n`.repeat(5000);

      index === 0 ? plrSkinPktName = 'player_skin' : plrSkinPktName = `player_skin_${index}`;

      interval = setInterval(() => {
        switch (type) {
          case 1:
          case 2:
            client.sendMessage(bigmessage, index, chatconfig);
            break;
          case 3:
            client.sendCommand(`me ${message}`, 0, index, config);
            break;
          case 4:
            if (index >= 1) client.sendCommand(`me ${message}`, 0, index, config);
            break;
          case 5:
            client.sendCommand(`me ${message}`, 5, 1, config);
            break;
          case 6:
            if (index >= 1) client.sendCommand(`me ${message}`, 5, index, config);
            break;
          case 7:
            client.sendCommand(`me ${message}`, Math.random() > 0.5 ? 5 : 0, index, config);
            break;
          case 8:
            if (index >= 1) client.sendCommand(`me ${message}`, Math.random() > 0.5 ? 5 : 0, index, config);
            break;
          case 9:
          case 10:
            break;
          case 11:
          case 12:
          case 15:
          case 16:
          case 17:
          case 18:
            uuid = index >= 1 ? uuids[index - 1] : client.profile.uuid;

            client.writeBatch(plrSkinPktName, {
              uuid,
              skin: persona,
              skin_name: persona.skin_id,
              old_skin_name: "",
              is_verified: true
            }, amount);
            break;
          case 13:
          case 14:
          case 15:
          case 16:
          case 17:
          case 18:
            uuid = index >= 1 ? uuids[index - 1] : client.profile.uuid;

            client.writeBatch(plrSkinPktName, {
              uuid,
              skin: no_persona,
              skin_name: no_persona.skin_id,
              old_skin_name: '',
              is_verified: true
            }, amount);
            break;
          case 22:
            client.sendCommand(`help`, 0, index, config);
            break;
        }
      }, type === 1 || type === 2 ? ratelimit : 0);
    };

    client.on(`play_status`, async () => {
      await delay(100)

      if (type == 2 || type == 4 || type == 6 || type == 8 || type == 10 || type == 12 || type == 14 || type == 16 || type == 18 || type == 19 || type == 21 || type == 22) {
        for (let sub = 0; sub < 3; sub++) {
          client.createSubClient(sub, {
            ssbp: { enabled: false, type: 0 },
            listeners: { enabled: true },
            name: { enabled: true, value: "§4§lVERTEX PRODUCTIONS ©" },
          })
        }
      }

      handlePlayStatus(0)
    });
  },
  componentPressEvent: cancel
};

async function cancel(interaction) {
  const { user } = interaction;

  map.set(user.id, 64)

  await interaction.acknowledge();
}