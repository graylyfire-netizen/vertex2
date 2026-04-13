const Embed = require("../../classes/Embed.js");
const RealmAPI = require("../../common/Realm.js");

const { userModel } = require("../../common/Database.js");

const map = new Map();

module.exports = {
    name: "invites",
    description: "Manage any pending realm invites in your inbox",
    dontUseDB: false, // ONLY USE IF IT DOESN'T REQUIRE ANY DATABASE CHANGES / MINECRAFT OR XBOX RELATED LINK COMMANDS,
    cooldown: 10000,
    options: [
        {
            type: 3,
            name: "realm",
            description: "Realm's invite to manage (If no invites, none will show)",
            required: true,
            autocomplete: true
        }
    ],
    execute: async (interaction, args, dbUser, embed) => {
        const { realm: realmName } = args;

        const userMap = map.get(dbUser.id);

        if (!userMap.invites) {
            embed.description = "No invites found in map. Try searching again.";

            return interaction.createFollowup({ embed });
        }

        let realm;

        userMap.invites = await userMap.RAPI.getInvites();

        console.log(userMap.invites);

        for (const invite of userMap.invites) {
            if (invite.worldName === realmName) realm = invite;
        }

        if (typeof realm?.worldName != "string") {
            embed.description = "Invite not found whilst going through the for loop of invites. Try again later.";

            return interaction.createFollowup({ embed });
        }

        // There's a 100 character length on custom_id, so we have to make it short as possible
        // We only save the invitationId
        delete realm.worldDescription, realm.worldOwnerName, realm.worldOwnerUuid, realm.status, realm.date, realm.worldId;

        embed.title = `Manage Invite`
        embed.description = `You've been invited to join **${realm.worldName}**`;

        delete realm.worldName;

        map.delete(dbUser.id);

        console.log(JSON.stringify({ option: "a", realm }).length, JSON.stringify({ option: "r", realm }).length)

        return interaction.createFollowup({
            embed,
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            label: "Accept",
                            style: 3,
                            custom_id: JSON.stringify({ option: "a", realm })
                        },
                        {
                            type: 2,
                            label: "Reject",
                            style: 4,
                            custom_id: JSON.stringify({ option: "r", realm })
                        }
                    ]
                }
            ]
        });
    },
    autocompleteEvent: inviteSelector,
    componentPressEvent: manageInvite
};

async function inviteSelector(interaction, arg) {
    const { user } = interaction;

    const query = arg?.value;

    if (typeof query != "string") return interaction.result([]);

    if (!map.get(user.id)) map.set(user.id, { dbUser: await userModel.findOne({ id: user.id }).lean() });

    const dbUser = map.get(user.id).dbUser;

    if (typeof dbUser?.didLink != "boolean") return;
    if (!dbUser?.didLink || dbUser?.linkDevice?.length === 0) return interaction.result([]);

    map.set(user.id, { ...map.get(user.id), RAPI: new RealmAPI(dbUser.id) });

    const RAPI = map.get(user.id).RAPI;
    let invites = await RAPI.getInvites();
    let results = [];

    // Cache invites, if 0 or erroring out then automatically keep sending these requests
    // It doesn't look like it has a ratelimit anyways right now
    if (invites.length === 0) {
        invites = await RAPI.getInvites();
        map.set(user.id, { ...map.get(user.id), invites });
    }

    if (invites.length > 0) {
        map.set(user.id, { ...map.get(user.id), invites });
    }

    if (typeof invites?.status === "number") return interaction.result([]);
    if (invites?.length === 0) return interaction.result([]);
    if (typeof invites != "object") return interaction.result([]);

    for (const invite of invites) {
        if (results.length >= 25) break;

        if (invite.worldName.startsWith(query)) {
            results.push({ name: invite.worldName, value: invite.worldName });
        }
    }

    return interaction.result(results);
}

async function manageInvite(interaction, custom_id) {
    const { user } = interaction;

    const result = JSON.parse(custom_id)

    console.log(result)

    await interaction.acknowledge();

    const embed = new Embed();

    const RAPI = new RealmAPI(user.id);
    let response;

    switch (result.option) {
        case "a":
            response = await RAPI.acceptInvite(result.realm.invitationId);

            if (response.status === 204) {
                embed.description = `Successfully accepted the invite. Use /realm list to find the Realm ID.`;
            } else {
                embed.description = `Failed to accept the invite. * (${response.status})`;
            }

            return interaction.message.edit({ embed, components: [] })
        case "r":
            response = await RAPI.rejectInvite(result.realm.invitationId);

            if (response.status === 204) {
                embed.description = `Successfully rejected the invite to **${result.realm.worldName}**`;
            } else {
                embed.description = `Failed to reject the invite from **${result.realm.worldName}** (${response.status})`;
            }

            return interaction.message.edit({ embed, components: [] })
    }
}