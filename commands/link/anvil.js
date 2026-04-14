"use strict";

const bpClient = require("../../common/Client.js");
const RealmAPI = require("../../common/Realm.js");
const CoinHandler = require("../../classes/CoinSystem.js");
const { translateDisconnectMessage } = require("../../common/Util.js");

const map = new Map();

module.exports = {
  name: "anvil",
  description: "Change anvil",
  dontUseDB: false,
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
      name: "damage",
      description: "Damage",
      required: true,
      choices: [
        { name: "Repair Anvil", value: 0 },
        { name: "Chipped Anvil", value: 1 },
        { name: "Damaged Anvil", value: 2 },
        { name: "Destroy Anvil", value: 3 }
      ]
    },
    { type: 4, name: "x", description: "X", required: true },
    { type: 4, name: "y", description: "Y", required: true },
    { type: 4, name: "z", description: "Z", required: true }
  ],

  execute: async (interaction, args, dbUser, embed, clearCooldown) => {
    const userId = interaction.user?.id;

    const safeEdit = async (msg, payload) => {
      try {
        return await msg.edit(payload);
      } catch (e) {
        console.error("Edit failed:", e);
      }
    };

    const safeFollowup = async (payload) => {
      try {
        return await interaction.createFollowup(payload);
      } catch (e) {
        console.error("Followup failed:", e);
      }
    };

    // prevent duplicate runs
    if (map.has(userId)) {
      await safeFollowup({
        embeds: [{ description: "You're already running an operation." }]
      });
      return clearCooldown();
    }

    map.set(userId, true);

    const cleanup = () => map.delete(userId);

    const { input, damage, x, y, z } = args;

    try {
      let RAPI = new RealmAPI(userId);

      const realm = /^\d+$/.test(input)
        ? await RAPI.getRealmInfoByID(input)
        : await RAPI.getRealmInfo(input);

      if (!realm || realm.status) {
        cleanup();

        return safeFollowup({
          embeds: [{
            description: `Failed to fetch realm.\nInput: **${input}**`
          }]
        });
      }

      let msg = await interaction.createFollowup({
        embeds: [{
          title: "Operation Started",
          description: `Realm: **${realm.name}**\nInput: **${input}**`,
          fields: [
            { name: "Connection", value: "🟡", inline: true },
            { name: "Operation", value: "🔴", inline: true }
          ]
        }]
      });

      if (realm.expired || realm.state === "CLOSED") {
        cleanup();

        return safeEdit(msg, {
          embeds: [{
            description: `Realm is not available.\n**${realm.name}**`
          }]
        });
      }

      const realmIP = await RAPI.getRealmIP(realm.id);

      if (!realmIP || realmIP.status) {
        cleanup();

        return safeEdit(msg, {
          embeds: [{
            description: `Failed to get IP for realm **${realm.name}**`
          }]
        });
      }

      let address = {};

      switch (realmIP.networkProtocol) {
        case "NETHERNET":
        case "NETHERNET_JSONRPC":
          address.networkId = realmIP.address;
          break;

        case "DEFAULT":
          address.ip = realmIP.address?.split(":")[0];
          address.port = Number(realmIP.address?.split(":")[1]);
          break;

        default:
          cleanup();
          return safeEdit(msg, {
            embeds: [{
              description: `Unsupported protocol: ${realmIP.networkProtocol}`
            }]
          });
      }

      const client = await new bpClient(
        address,
        dbUser,
        realm,
        { ssbp: { enabled: false }, transport: realmIP.networkProtocol }
      ).connect();

      if (typeof client === "string") {
        cleanup();

        return safeEdit(msg, {
          embeds: [{
            description: `Connection failed: ${client}`
          }]
        });
      }

      const coinHandler = new CoinHandler(interaction, dbUser);
      coinHandler.start();

      await safeEdit(msg, {
        embeds: [{
          description: `Connected to **${realm.name}**`,
          fields: [
            { name: "Connection", value: "🟢", inline: true },
            { name: "Operation", value: "🟡", inline: true }
          ]
        }]
      });

      // SAFE KICK HANDLER
      client.on("kick", async (packet) => {
        try {
          cleanup();

          const reward = await coinHandler.reward();

          const reason =
            packet?.message
              ? translateDisconnectMessage(packet)
              : "Unknown reason";

          await safeEdit(msg, {
            embeds: [{
              description:
                `Operation failed on **${realm.name}**\n` +
                `Coins Earned: **${reward}**`,
              fields: [
                { name: "Reason", value: reason, inline: true }
              ]
            }]
          });
        } catch (e) {
          console.error("Kick handler error:", e);
        }
      });

      // SAFE SUCCESS HANDLER
      client.once("start_game", async () => {
        try {
          await client.write("anvil_damage", {
            position: { x, y, z },
            damage
          });

          client.disconnect();
          cleanup();

          const reward = await coinHandler.reward();

          await safeEdit(msg, {
            embeds: [{
              description:
                `Operation completed on **${realm.name}**\n` +
                `Coins Earned: **${reward}**`
            }]
          });
        } catch (e) {
          console.error("Start_game error:", e);
          cleanup();
        }
      });

    } catch (err) {
      console.error("ANVIL COMMAND ERROR:", err);
      cleanup();

      return safeFollowup({
        embeds: [{
          description: "An internal error occurred while processing the command."
        }]
      });
    }
  }
};
