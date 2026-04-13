"use strict";

const Eris = require("eris");

const { client } = require("../index.js");

const CommandHandler = require("../classes/CommandHandler.js");
const Embed = require("../classes/Embed.js");

const { whitelistedRealmsModel } = require("../common/Database.js");

const config = require("../ext/config.json");
const cooldowns = new Map();

client.on("interactionCreate", (interaction) => {
  if (interaction instanceof Eris.CommandInteraction)
    CommandInteraction(interaction);
  else if (interaction instanceof Eris.ComponentInteraction)
    ComponentInteraction(interaction);
  else if (interaction instanceof Eris.AutocompleteInteraction)
    AutocompleteInteraction(interaction);
});

const embed = new Embed();
const errEmbed = new Embed();

async function CommandInteraction(interaction) {
  try {
    await interaction.acknowledge();
  } catch {
    return;
  }

  const args = {};

  const realmsWhitelisted = await whitelistedRealmsModel.find({}, { id: 1, _id: 0 }).lean();

  for (const { name, value, options, type } of interaction.data.options ?? []) {
    if (name === "input") {
      for (const realm of realmsWhitelisted) {
        if (!/^\d+$/.test(value)) continue;

        if (Number(value) === realm.id) {
          embed.description = "This realm is not available for use.";
          return interaction.createFollowup({ embed });
        }
      }
    }

    switch (type) {
      case 1:
        args.sub_command = name;
        for (const option of options) args[option.name] = option.value;
        break;
      default:
        args[name] = value;
        break;
    }
  }

  if (!interaction.user) interaction.user = interaction.member.user;

  const member = interaction.user;
  const guild = interaction.channel.guild;
  const command = client.commands.get(interaction.data.name.toLowerCase());

  const stringArgs = JSON.stringify(args);
  console.log(`${member.username} (${member.id}) used the command /${interaction.data.name} ${stringArgs}`);

  const commandUsedEmbed = new Embed();
  commandUsedEmbed.thumbnail.url = guild?.iconURL ?? member.avatarURL
  commandUsedEmbed.fields = [
    {
      name: "Command",
      value: `/${interaction.data.name} ${stringArgs.slice(0, 256)}`,
      inline: true
    },
    {
      name: "User",
      value: `<@${member.id}>`,
      inline: true
    },
    {
      name: "Guild Name",
      value: guild ? guild.name : "User DMs",
      inline: false
    },
    {
      name: "Guild ID",
      value: guild ? guild.id : "User DMs",
      inline: true
    },
    {
      name: "Owner",
      value: guild ? `<@${guild.ownerID}>` : "N/A",
      inline: true
    }
  ]

  let commandHandler = new CommandHandler(member, guild, command, cooldowns, interaction, args);

  try {
    client.createMessage(config.command_logs, { embed: commandUsedEmbed });

    const result = await commandHandler.handle();

    if (result === "Restricted" || result === "onCooldown") return;

    command.execute(interaction, args, commandHandler.dbUser, new Embed(), commandHandler.clearCooldown.bind(commandHandler));
  } catch (error) {
    console.log(error)

    errEmbed.description = `\`\`${error}\`\``;

    client.createMessage(config.error_log_channel, { embed: errEmbed });

    embed.description = "An error has occurred.";

    interaction.createFollowup({ embed });

    commandHandler?.clearCooldown();
  }
};

async function ComponentInteraction(interaction) {
  try {
    if (!interaction.user) interaction.user = interaction.member.user;

    const command = interaction.message.interaction;

    const { componentPressEvent, componentSelectEvent } = client.commands.get(command.name.split(" ")[0]);

    const { custom_id } = interaction.data;

    if (interaction.message.interaction.user.id !== (interaction.member?.id ?? interaction.user.id)) return;

    switch (interaction.data.component_type) {
      case 2:
        componentPressEvent(interaction, custom_id);
        break;
      case 3:
        componentSelectEvent(interaction, custom_id);
        break;
    }
  } catch (error) {
    console.error(error);

    errEmbed.description = `\`\`${error}\`\``;

    client.createMessage(config.error_log_channel, { embed: errEmbed });
  }
};

async function AutocompleteInteraction(interaction) {
  try {
    const { name, options } = interaction.data;

    let argument = options.find((args) => args.focused);

    const { autocompleteEvent } = client.commands.get(name.split(" ")[0]);

    // Sub Command Support for Autocomplete
    if (options[0].type === 1) {
      argument = options[0].options.find((args) => args.focused);
    }

    autocompleteEvent(interaction, argument);
  } catch (error) {
    console.error(error);

    errEmbed.description = `\`\`${error}\`\``;

    client.createMessage(config.error_log_channel, { embed: errEmbed });
  }
};