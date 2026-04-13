"use strict";

require('dotenv').config(); // ✅ load env variables

const Eris = require("eris");
const fs = require("node:fs");

const { getMCData } = require("./common/Util.js");
const Embed = require("./classes/Embed.js");

// ✅ use safe config (NOT json with tokens)
const config = require("./config");

getMCData();
require("./common/ProtocolReplacement.js");

// ✅ SAFE TOKEN (from Render env)
const token = process.env.IS_BETA === "true"
  ? process.env.BETA_TOKEN
  : process.env.PROD_TOKEN;

// ✅ create client
const client = new Eris(token, {
  intents: ["all"],
  maxShards: "auto"
});

module.exports = {
  client
};

// ✅ load ALL events (fixed)
const eventFiles = fs.readdirSync("./events/");
eventFiles.forEach(file => require(`./events/${file}`));

// ✅ commands
client.commands = new Map();

fs.readdirSync("./commands", { withFileTypes: true }).forEach(folder => {
  if (folder.name === "unused") return;

  fs.readdirSync(`./commands/${folder.name}`).forEach(file => {
    try {
      const command = require(`./commands/${folder.name}/${file}`);

      if (!command.disabled) client.commands.set(command.name, command);
    } catch (error) {
      console.error(`Unable to load command: ${folder.name}/${file}.\n\nStack: ${error.stack}`);
      process.exit(1);
    }
  });
});

// ✅ embed for logs
let embed = new Embed();

// ===== ERROR HANDLING =====

client.on("error", (error) => {
  if (error.code === 1006 || error.code === 1001) return;

  console.error(error);

  embed.description = `\`\`${error}\`\``;

  client.createMessage(config.error_log_channel, { embed });
});

client.on("debug", (msg) => console.log(`[DEBUG] ${msg}`));

process.on("warning", (warning) => {
  console.warn(warning);

  embed.description = `\`\`${warning}\`\``;

  client.createMessage(config.error_log_channel, { embed });
});

process.on("unhandledRejection", (error) => {
  if ([10062, 50001, 10003].includes(error?.code)) return;
  if (error?.stack?.includes("Authentication failed, timed out")) return;
  if (error?.stack?.includes("Failed to set remote answer sdp: Called in wrong state: stable")) return;

  embed.description = `\`\`${error}\`\``;

  client.createMessage(config.error_log_channel, { embed });

  console.error(error);
});

process.on("uncaughtException", (error) => {
  console.error(error);

  embed.description = `\`\`${error}\`\``;

  client.createMessage(config.error_log_channel, { embed });

  process.exit(0);
});

// ✅ connect bot
client.connect();

// ✅ auto restart every 24h
setTimeout(() => {
  console.log("Restarting...");
  process.exit(0);
}, 86400000);