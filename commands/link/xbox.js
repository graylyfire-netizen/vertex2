"use strict";

const XboxAPI = require("../../common/Xbox.js");

module.exports = {
  name: "xbox",
  description: "Xbox commands",
  dontUseDB: false, // ONLY USE IF IT DOESN'T REQUIRE ANY DATABASE CHANGES / MINECRAFT OR XBOX RELATED LINK COMMANDS
  requireLink: true,
  cooldown: 10000,
  options: [
    {
      type: 1,
      name: "lookup",
      description: "Lookup information on a xbox user",
      options: [
        {
          type: 3,
          name: "input",
          description: "Xbox Username or Xbox User ID (XUID)",
          required: true,
          min_length: 3,
          max_length: 18
        }
      ]
    },
    {
      type: 1,
      name: "add",
      description: "Send a Friend Request to a Xbox User",
      options: [
        {
          type: 3,
          name: "input",
          description: "Xbox Username or Xbox User ID (XUID)",
          required: true,
          min_length: 3,
          max_length: 18
        }
      ]
    },
    {
      type: 1,
      name: "remove",
      description: "Remove a Xbox User from your Friend List",
      options: [
        {
          type: 3,
          name: "input",
          description: "Xbox Username or Xbox User ID (XUID)",
          required: true,
          min_length: 3,
          max_length: 18
        }
      ]
    },
    {
      type: 1,
      name: "follow",
      description: "Follow a user on xbox",
      options: [
        {
          type: 3,
          name: "input",
          description: "Xbox Username or Xbox User ID (XUID)",
          required: true,
          min_length: 3,
          max_length: 18
        }
      ]
    }
  ],
  execute: async (interaction, args, dbUser, embed, clearCooldown) => {
    const commands = { lookup, add, remove, follow }

    commands[args.sub_command](interaction, args, dbUser, embed, clearCooldown)
  }
};

async function lookup(interaction, args, dbUser, embed) {
  const { input } = args;
  const { user } = interaction;

  let XAPI = new XboxAPI(user.id), XUser;

  if (/^\d+$/.test(input)) {
    XUser = await XAPI.getXboxUser(input);
  } else {
    const xuid = await XAPI.gamertagToXuid(input);

    if (xuid === null) {
      embed.description = "User not found."
      return interaction.createFollowup({ embed })
    }

    XUser = await XAPI.getXboxUser(xuid)
  }

  if (XUser === null) {
    embed.description = "User not found."
    return interaction.createFollowup({ embed })
  }

  embed.description = "Please wait...";
  const msg = await interaction.createFollowup({ embed });

  if (XUser.status) {
    switch (XUser.status) {
      case 403:
        embed.description = `Unauthorized. (${XUser.status})`;
        break;
      case 404:
        embed.description = `User not found. (${XUser.status})`;
        break;
      case 500:
        embed.description = `Sent a bad HTTP request to the Xbox API.`;
        break;
      case 502:
      case 504:
        embed.description = `Xbox API is currently undergoing a outage.`;
        break;
      default:
        embed.description = `Try again later or contact support. (Status ${XUser.status})`;
        break;
    }

    return await msg.edit({ embed });
  }

  Object.keys(XUser).forEach((key) => {
    if (XUser[key] === null) XUser[key] = undefined;
  })

  if (XUser.presenceDetails) {
    for (let i = 0; i < XUser.presenceDetails.length; i++) {
      Object.keys(XUser.presenceDetails[i]).forEach((key) => {
        if (XUser.presenceDetails[i][key] === null) XUser.presenceDetails[i][key] = undefined;
      })
    }
  }

  embed.thumbnail.url = XUser.displayPicRaw;
  embed.description = `\`\`\`json\n${JSON.stringify(XUser, null, 2)}\`\`\``;

  return await msg.edit({ embed })
}

async function add(interaction, args, dbUser, embed) {
  const { input } = args;
  const { user } = interaction;

  let XAPI = new XboxAPI(user.id), XResult, XUser;

  if (/^\d+$/.test(input)) {
    XUser = await XAPI.getXboxUser(input);

    if (XUser === null) {
      embed.description = "User not found."
      return interaction.createFollowup({ embed })
    }

    XResult = await XAPI.addUser(input);
  } else {
    const xuid = await XAPI.gamertagToXuid(input);

    if (xuid === null) {
      embed.description = "User not found."
      return interaction.createFollowup({ embed })
    }

    XUser = await XAPI.getXboxUser(xuid);

    if (XUser === null) {
      embed.description = "User not found."
      return interaction.createFollowup({ embed })
    }

    XResult = await XAPI.addUser(xuid)
  }

  if (XResult === null) {
    embed.description = "User not found."
    return interaction.createFollowup({ embed })
  }

  embed.description = "Please wait...";
  const msg = await interaction.createFollowup({ embed });

  if (XResult.status) {
    switch (XResult.status) {
      case 403:
        embed.description = `Unauthorized. (${XResult.status})`;
        break;
      case 404:
        embed.description = `User not found. (${XResult.status})`;
        break;
      case 500:
        embed.description = `Sent a bad HTTP request to the Xbox API.`;
        break;
      case 502:
      case 504:
        embed.description = `Xbox API is currently undergoing a outage.`;
        break;
      case 200:
        embed.description = `Successfully added **${XUser?.gamertag || "User"}**`; // todo add user's gamertag ? 
        break
      default:
        embed.description = `Try again later or contact support. (Status ${XResult.status})`;
        break;
    }

    return await msg.edit({ embed });
  }
}

async function remove(interaction, args, dbUser, embed) {
  const { input } = args;
  const { user } = interaction;

  let XAPI = new XboxAPI(user.id), XResult, XUser;

  if (/^\d+$/.test(input)) {
    XUser = await XAPI.getXboxUser(input);

    if (XUser === null) {
      embed.description = "User not found."
      return interaction.createFollowup({ embed })
    }

    XResult = await XAPI.removeUser(input);
  } else {
    const xuid = await XAPI.gamertagToXuid(input);

    if (xuid === null) {
      embed.description = "User not found."
      return interaction.createFollowup({ embed })
    }

    XUser = await XAPI.getXboxUser(xuid);

    if (XUser === null) {
      embed.description = "User not found."
      return interaction.createFollowup({ embed })
    }

    XResult = await XAPI.removeUser(xuid)
  }

  if (XResult === null) {
    embed.description = "User not found."
    return interaction.createFollowup({ embed })
  }

  embed.description = "Please wait...";
  const msg = await interaction.createFollowup({ embed });

  if (XResult.status) {
    switch (XResult.status) {
      case 403:
        embed.description = `Unauthorized. (${XResult.status})`;
        break;
      case 404:
        embed.description = `User not found. (${XResult.status})`;
        break;
      case 500:
        embed.description = `Sent a bad HTTP request to the Xbox API.`;
        break;
      case 502:
      case 504:
        embed.description = `Xbox API is currently undergoing a outage.`;
        break;
      case 200:
        embed.description = `Successfully removed **${XUser?.gamertag || "User"}**`;
        break
      default:
        embed.description = `Try again later or contact support. (Status ${XResult.status})`;
        break;
    }

    return await msg.edit({ embed });
  }
}

async function follow(interaction, args, dbUser, embed) {
  const { input } = args;
  const { user } = interaction;

  let XAPI = new XboxAPI(user.id), XResult, XUser;

  if (/^\d+$/.test(input)) {
    XUser = await XAPI.getXboxUser(input);

    if (XUser === null) {
      embed.description = "User not found."
      return interaction.createFollowup({ embed })
    }

    XResult = await XAPI.followUser(input);
  } else {
    const xuid = await XAPI.gamertagToXuid(input);

    if (xuid === null) {
      embed.description = "User not found."
      return interaction.createFollowup({ embed })
    }

    XUser = await XAPI.getXboxUser(xuid);

    if (XUser === null) {
      embed.description = "User not found."
      return interaction.createFollowup({ embed })
    }

    XResult = await XAPI.followUser(xuid)
  }

  if (XResult === null) {
    embed.description = "User not found."
    return interaction.createFollowup({ embed })
  }

  embed.description = "Please wait...";
  const msg = await interaction.createFollowup({ embed });

  if (XResult.status) {
    switch (XResult.status) {
      case 403:
        embed.description = `Unauthorized. (${XResult.status})`;
        break;
      case 404:
        embed.description = `User not found. (${XResult.status})`;
        break;
      case 500:
        embed.description = `Sent a bad HTTP request to the Xbox API.`;
        break;
      case 502:
      case 504:
        embed.description = `Xbox API is currently undergoing a outage.`;
        break;
      case 204:
        embed.description = `Successfully followed **${XUser?.gamertag || "User"}**`; // todo add user's gamertag ? 
        break
      default:
        embed.description = `Try again later or contact support. (Status ${XResult.status})`;
        break;
    }

    return await msg.edit({ embed });
  }
}