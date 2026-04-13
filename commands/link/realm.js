"use strict";

const RealmAPI = require("../../common/Realm.js");

const realmListMap = new Map();

const { userModel } = require("../../common/Database.js");
const Embed = require("../../classes/Embed.js");

module.exports = {
  name: "realm",
  description: "Manage realms",
  dontUseDB: false, // ONLY USE IF IT DOESN'T REQUIRE ANY DATABASE CHANGES / MINECRAFT OR XBOX RELATED LINK COMMANDS
  requireLink: true,
  cooldown: 10000,
  options: [
    {
      type: 1,
      name: "list",
      description: "Manage realms in your list (If no realms, none will show)",
      options: [
        {
          type: 3,
          name: "name",
          description: "Realm to manage",
          required: true,
          autocomplete: true
        }
      ]
    },
    {
      type: 1,
      name: "lookup",
      description: "Lookup information on a realm",
      options: [
        {
          type: 3,
          name: "input",
          description: "Realm Code or ID",
          required: true,
          min_length: 5,
          max_length: 15
        }
      ]
    },
    {
      type: 1,
      name: "club",
      description: "Lookup club information on the realm",
      options: [
        {
          type: 3,
          name: "input",
          description: "Realm Code or ID",
          required: true,
          min_length: 5,
          max_length: 15
        }
      ]
    },
    {
      type: 1,
      name: "join",
      description: "Join realm",
      options: [
        {
          type: 3,
          name: "input",
          description: "Realm Code",
          required: true,
          min_length: 11,
          max_length: 15
        }
      ]
    },
    {
      type: 1,
      name: "leave",
      description: "Leave realm",
      options: [
        {
          type: 3,
          name: "input",
          description: "Realm Code or ID",
          required: true,
          min_length: 5,
          max_length: 15
        }
      ]
    },
    {
      type: 1,
      name: "post",
      description: "Post a story on the realm",
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
          name: "text",
          description: "Text to send",
          required: true,
          min_length: 1,
          max_length: 128
        },
      ]
    },
    {
      type: 1,
      name: "players",
      description: "View active players in the realm",
      options: [
        {
          type: 3,
          name: "input",
          description: "Realm Code or ID",
          required: true,
          min_length: 5,
          max_length: 15
        }
      ]
    },
    {
      type: 1,
      name: "operators",
      description: "View operators in the realm",
      options: [
        {
          type: 3,
          name: "input",
          description: "Realm Code or ID",
          required: true,
          min_length: 5,
          max_length: 15
        }
      ]
    },
  ],
  execute: async (interaction, args, dbUser, embed, clearCooldown) => {
    const commands = { lookup, list, club, join, leave, post, players, operators }

    if (!interaction.user) interaction.user = interaction.member

    commands[args.sub_command](interaction, args, dbUser, embed, clearCooldown)
  },
  autocompleteEvent: realmSelector,
  componentPressEvent: manageRealm
};

async function lookup(interaction, args, dbUser, embed) {
  const { input } = args;
  let { user } = interaction;

  let RAPI = new RealmAPI(user.id);
  let realm = /^\d+$/.test(input) ? await RAPI.getRealmInfoByID(input) : await RAPI.getRealmInfo(input, false);

  embed.description = "Please wait...";
  const msg = await interaction.createFollowup({ embed });

  if (realm.status) {
    switch (realm.status) {
      case 403:
      case 404:
      case 429:
      case 500:
      case 1403:
      case 1429:
      case 1500:
        embed.description = `${realm?.body?.errorMsg} (${realm?.body?.errorCode})`;
        break;
      case 502:
      case 504:
        embed.description = `Realms API is currently undergoing a outage.`;
        break;
      default:
        embed.description = `Try again later or contact support. (Status ${realm.status})`;
        break;
    }

    return await msg.edit({ embed });
  }

  const ownerProfile = await RAPI.getXboxUser(realm.ownerUUID);

  realm = {
    ...realm,
    membercount: realm.players.length,
    players: undefined,
    slots: undefined,
    ownerGamertag: ownerProfile.gamertag
  }

  embed.description = `\`\`\`json\n${JSON.stringify(realm, null, 2)}\`\`\``;

  return await msg.edit({ embed })
}

async function list(interaction, args, dbUser, embed) {
  const { name } = args;
  let { user } = interaction;

  const userMap = realmListMap.get(user.id);

  let realm = {};

  if (!userMap?.realms) userMap.realms = await userMap.RAPI.getRealms();

  // Name is the Realm ID.. dont ask why
  for (const r of userMap.realms) {
    if (r.id === Number(name)) {
      realm = {
        name: r.name,
        id: r.id
      };
    }
  }

  if (typeof realm?.name != "string" || typeof realm?.id != "number") {
    embed.description = "Realm not found whilst going through the for loop of realms. Try again later.";

    return interaction.createFollowup({ embed });
  }

  embed.title = `Manage Realm`
  embed.description = `**${realm.name}** (${realm.id})`;

  return interaction.createFollowup({
    embed,
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            label: "Leave",
            style: 4,
            custom_id: JSON.stringify({ option: "l", realm })
          }
        ]
      }
    ]
  });
}

async function club(interaction, args, dbUser, embed) {
  const { input } = args;
  let { user } = interaction;

  let RAPI = new RealmAPI(user.id);
  let realm = /^\d+$/.test(input) ? await RAPI.getRealmInfoByID(input) : await RAPI.getRealmInfo(input, false);

  embed.description = "Please wait...";
  const msg = await interaction.createFollowup({ embed });

  if (realm.status) {
    switch (realm.status) {
      case 403:
      case 404:
      case 429:
      case 500:
      case 1403:
      case 1429:
      case 1500:
        embed.description = `${realm?.body?.errorMsg} (${realm?.body?.errorCode})`;
        break;
      case 502:
      case 504:
        embed.description = `Realms API is currently undergoing a outage.`;
        break;
      default:
        embed.description = `Try again later or contact support. (Status ${realm.status})`;
        break;
    }

    return await msg.edit({ embed });
  }

  let club = await RAPI.getClubData(realm.clubId)

  if (club.status) {
    switch (club.status) {
      case 403:
        embed.description = `${club?.errorMsg} (${club?.errorCode})`;
        break;
      case 404:
        embed.description = `${club?.errorMsg} (${club?.errorCode})`;
        break;
      case 500:
        embed.description = `Sent a bad HTTP request to the Xbox API.`;
        break;
      case 502:
      case 504:
        embed.description = `Xbox API is currently undergoing a outage.`;
        break;
      default:
        embed.description = `Try again later or contact support. (Status ${club.status})`;
        break;
    }

    return await msg.edit({ embed })
  }

  club = {
    ownerXuid: club.ownerXuid,
    clubPresenceTodayCount: club.clubPresenceTodayCount,
    clubPresenceInGameCount: club.clubPresenceInGameCount,
    membersCount: club.membersCount,
    clubType: club.clubType,
    reportedItemsCount: club.reportedItemsCount,
    reportCount: club.reportCount,
    requestedToJoinCount: club.requestedToJoinCount,
    glyphImageUrl: club.glyphImageUrl,
    bannerImageUrl: club.bannerImageUrl
  }

  embed.description = `\`\`\`json\n${JSON.stringify(club, null, 2)}\`\`\``

  return await msg.edit({ embed })
}

async function join(interaction, args, dbUser, embed) {
  const { input } = args;
  let { user } = interaction;

  let RAPI = new RealmAPI(user.id);

  if (/^\d+$/.test(input)) {
    embed.description = "You can't join this Realm by using a ID."
    return interaction.createFollowup({ embed });
  }

  let realm = await RAPI.getRealmInfo(input, true);

  embed.description = "Please wait...";

  const msg = await interaction.createFollowup({ embed });

  if (realm.status) {
    switch (realm.status) {
      case 403:
      case 404:
      case 429:
      case 500:
      case 1403:
      case 1429:
      case 1500:
        embed.description = `${realm?.body?.errorMsg} (${realm?.body?.errorCode})`;
        break;
      case 502:
      case 504:
        embed.description = `Realms API is currently undergoing a outage.`;
        break;
      default:
        embed.description = `Try again later or contact support. (Status ${realm.status})`;
        break;
    }

    return await msg.edit({ embed });
  }

  embed.description = realm.member ? `You are already a member of **${realm.name}**` : `Successfully joined **${realm.name}**`

  return await msg.edit({ embed })
}

async function leave(interaction, args, dbUser, embed) {
  const { input } = args;
  let { user } = interaction;

  let RAPI = new RealmAPI(user.id);
  let realm = /^\d+$/.test(input) ? await RAPI.getRealmInfoByID(input) : await RAPI.getRealmInfo(input, false);

  embed.description = "Please wait...";

  const msg = await interaction.createFollowup({ embed });

  if (realm.status) {
    switch (realm.status) {
      case 403:
      case 404:
      case 429:
      case 500:
      case 1403:
      case 1429:
      case 1500:
        embed.description = `${realm?.body?.errorMsg} (${realm?.body?.errorCode})`;
        break;
      case 502:
      case 504:
        embed.description = `Realms API is currently undergoing a outage.`;
        break;
      default:
        embed.description = `Try again later or contact support. (Status ${realm.status})`;
        break;
    }

    return await msg.edit({ embed });
  }

  const result = await RAPI.leaveRealm(realm.id);

  switch (result) {
    case "success":
      embed.description = `Successfully left **${realm.name}**`;
      break;
    case "failed":
      embed.description = `Failed to leave **${realm.name}**`;
      break;
  }

  return await msg.edit({ embed })
}

async function post(interaction, args, dbUser, embed) {
  const { input, text } = args;
  let { user } = interaction;

  let RAPI = new RealmAPI(user.id);
  let realm = /^\d+$/.test(input) ? await RAPI.getRealmInfoByID(input) : await RAPI.getRealmInfo(input, false);

  embed.description = "Please wait...";

  const msg = await interaction.createFollowup({ embed });

  if (realm.status) {
    switch (realm.status) {
      case 403:
      case 404:
      case 429:
      case 500:
      case 1403:
      case 1429:
      case 1500:
        embed.description = `${realm?.body?.errorMsg} (${realm?.body?.errorCode})`;
        break;
      case 502:
      case 504:
        embed.description = `Realms API is currently undergoing a outage.`;
        break;
      default:
        embed.description = `Try again later or contact support. (Status ${realm.status})`;
        break;
    }

    return await msg.edit({ embed });
  }

  const result = await RAPI.postComment(realm.clubId, text)

  if (!result) {
    embed.description = `Something went wrong while posting the story to **${realm.name}**.`

    return await msg.edit({ embed })
  }

  switch (result.status) {
    case 200:
      embed.description = `Successfully posted the story to **${realm.name}**.`

      return await msg.edit({ embed })
    case 403:
      embed.description = `You don't have permission to post a story on **${realm.name}**.`

      return await msg.edit({ embed })
    default:
      embed.description = `Something went wrong while posting the story to **${realm.name}**. (Status ${result.status})`

      return await msg.edit({ embed })
  }
}

async function players(interaction, args, dbUser, embed) {
  const { input } = args;
  const { user } = interaction;

  let RAPI = new RealmAPI(user.id);
  let realm = /^\d+$/.test(input) ? await RAPI.getRealmInfoByID(input) : await RAPI.getRealmInfo(input, false);

  embed.description = "Please wait...";
  const msg = await interaction.createFollowup({ embed });

  if (realm.status) {
    switch (realm.status) {
      case 403:
      case 404:
      case 429:
      case 500:
      case 1403:
      case 1429:
      case 1500:
        embed.description = `${realm?.body?.errorMsg} (${realm?.body?.errorCode})`;
        break;
      case 502:
      case 504:
        embed.description = `Realms API is currently undergoing a outage.`;
        break;
      default:
        embed.description = `Try again later or contact support. (Status ${realm.status})`;
        break;
    }

    return await msg.edit({ embed });
  }

  const playersActive = await RAPI.getActivePlayers(realm.id);

  let xuids = [];

  if (
    typeof playersActive?.players === "undefined" ||
    playersActive.players.length === 0
  ) {
    embed.description = `Nobody is currently playing.`;

    return await msg.edit({ embed, components: [] });
  }

  for (let player of playersActive.players) xuids.push(player.uuid);

  for (const xuid of xuids) {
    if (xuid.length === 0) {
      xuids = xuids.filter(e => e !== xuid);
    }
  }

  if (xuids.length === 0) {
    embed.description = `Nobody is currently playing.`;

    return await msg.edit({ embed, components: [] });
  }

  const users = await RAPI.getXboxUserBulk(xuids);

  if (users.status && users.errorMsg) {
    switch (users.status) {
      case 400:
        embed.description = `Bad request was sent to the Xbox API.\n${users.errorMsg}`;

        console.log(users)

        return await msg.edit({ embed, components: [] });
    }
  }

  if (typeof users.map != "function") {
    embed.description = "I couldn't complete your request. Try again later. (users.map is not a function)";

    console.log(users.map, typeof users.map);

    return await msg.edit({ embed, components: [] });
  }

  embed.description = users.map((user) => {
    const player = realm.players.find(p => p.uuid === user.xuid);

    if (player?.uuid === realm.ownerUUID) realm.maxPlayers++;

    switch (player?.permission) {
      case "VISITOR":
        return `:wave: - **${user.gamertag}**\n`;
      case "MEMBER":
        return `:star: - **${user.gamertag}**\n`;
      case "OPERATOR":
        return `:crown: - **${user.gamertag}**\n`;
      default:
        return `:x: - **${user.gamertag}**\n`;
    }
  }).join('');

  embed.title = `${realm.name}'s playerlist (${playersActive.players.length}/${realm.maxPlayers})`;

  return await msg.edit({ embed })
}

async function operators(interaction, args, dbUser, embed) {
  const { input } = args;
  const { user } = interaction;

  let RAPI = new RealmAPI(user.id);
  let realm = /^\d+$/.test(input) ? await RAPI.getRealmInfoByID(input) : await RAPI.getRealmInfo(input, false);

  embed.description = "Please wait...";
  const msg = await interaction.createFollowup({ embed });

  if (realm.status) {
    switch (realm.status) {
      case 403:
      case 404:
      case 429:
      case 500:
      case 1403:
      case 1429:
      case 1500:
        embed.description = `${realm?.body?.errorMsg} (${realm?.body?.errorCode})`;
        break;
      case 502:
      case 504:
        embed.description = `Realms API is currently undergoing a outage.`;
        break;
      default:
        embed.description = `Try again later or contact support. (Status ${realm.status})`;
        break;
    }

    return await msg.edit({ embed });
  }

  const operators = realm.players.filter(p => p.permission === "OPERATOR");

  if (operators.length === 0) {
    embed.description = `There are no operators in this realm.`;

    return await msg.edit({ embed, components: [] });
  }

  let xuids = [];

  for (let operator of operators) xuids.push(operator.uuid);

  const users = await RAPI.getXboxUserBulk(xuids);

  if (users.status && users.errorMsg) {
    switch (users.status) {
      case 400:
        embed.description = `Bad request was sent to the Xbox API.\n${users.errorMsg}`;

        console.log(users)

        return await msg.edit({ embed, components: [] });
    }
  }

  embed.description = users.map((user) => `:crown: - **${user.gamertag}**\n`).join('');

  embed.title = `${realm.name}'s operators (${operators.length})`;

  return await msg.edit({ embed })
}

async function realmSelector(interaction, arg) {
  if (!interaction.user) interaction.user = interaction.member

  let { user } = interaction;

  const query = arg?.value;

  if (typeof query != "string") return interaction.result([]);

  if (!realmListMap.get(user.id)) realmListMap.set(user.id, { dbUser: await userModel.findOne({ id: user.id }).lean() });

  const dbUser = realmListMap.get(user.id).dbUser;

  if (!dbUser.didLink || dbUser.linkDevice.length === 0) return interaction.result([]);

  realmListMap.set(user.id, { ...realmListMap.get(user.id), RAPI: new RealmAPI(dbUser.id) });

  const RAPI = realmListMap.get(user.id).RAPI;
  let realms = await RAPI.getRealms();
  let results = [];

  // Cache realms, if 0 or erroring out then automatically keep sending these requests
  // It doesn't look like it has a ratelimit anyways right now
  if (realms?.length === 0) {
    realms = await RAPI.getRealms();
    realmListMap.set(user.id, { ...realmListMap.get(user.id), realms });
  }

  if (realms.length > 0) {
    realmListMap.set(user.id, { ...realmListMap.get(user.id), realms });
  }

  if (typeof realms?.status === "number") return interaction.result([]);
  if (realms?.length === 0) return interaction.result([]);
  if (typeof realms != "object") return interaction.result([]);

  for (const realm of realms) {
    if (results.length >= 25) break;

    if (realm.name.startsWith(query)) {
      results.push({ name: realm.name, value: String(realm.id) });
    }
  }

  return interaction.result(results);
}

async function manageRealm(interaction, custom_id) {
  if (!interaction.user) interaction.user = interaction.member

  let { user } = interaction;

  const result = JSON.parse(custom_id)

  await interaction.acknowledge();

  const embed = new Embed();

  const RAPI = new RealmAPI(user.id);
  let response;

  switch (result.option) {
    case "l":
      response = await RAPI.leaveRealm(result.realm.id);

      switch (response) {
        case "success":
          embed.description = `Successfully left the realm **${result.realm.name}**`;
          break;
        case "failed":
          embed.description = `Failed to leave the realm`;
          break;
      }

      return interaction.message.edit({ embed, components: [] })
  }
}
