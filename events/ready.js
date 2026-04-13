"use strict";

const { client } = require("../index.js");

client.once("ready", async () => {
  let commands = [...client.commands.values()];
  
  console.log(`Total command(s): ${commands.length}`);

  client.bulkEditCommands(commands);

  client.editStatus("online");

  console.log(`Logged in as ${client.user.username}#${client.user.discriminator} (${client.user.id})`);

  commands = [];
});