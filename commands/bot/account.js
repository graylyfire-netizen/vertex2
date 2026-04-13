"use strict";

const { Authflow } = require("../../authentication/index.js");

const { getCacheFactory, deviceMapping } = require("../../common/Util.js");

const XboxAPI = require("../../common/Xbox.js");
const PlayFabAPI = require("../../common/PlayFab.js");

const CoinHandler = require("../../classes/CoinSystem.js");

const errorMessages = {
    "does not have an Xbox profile": "You don't have an Xbox profile with your account. Status 242",
    "service abuse mode": "Microsoft has flagged this account in Service Abuse Mode. Status 248",
    "Client application access to the requested scope.": "Something went wrong with authentication scopes. Try again later. Status 254",
    "The provided value for input parameter 'device_code'": "Something went wrong with the device code. Try again later. Status 260",
    "Failed to acquire authorization code from device token": "Something went wrong while acquiring authorization. Try again later. Status 266",
    "Authentication failed, timed out": "Authentication has timed out.\nTry again later. Status 272",
    ',"UKAgeCheck":true}': "Your account requires age verification due to you being in the United Kingdom.\nPlease use a VPN when making and linking your account next time. Status 284",
    "Xbox Live authentication failed to obtain a XSTS token.": "Failure to get XSTS Token. Try again later. Status 291",
    "invalid_grant": "You couldn't be authenticated or user interaction from you is required. Try creating a Xbox Account at https://minecraft.net/, and link again with that account instead. LESTER will handle everything for you."
};

const cleanup = async (API, clearCooldown, timeout, flow) => {
    await API.cleanLinkData("", true);

    clearCooldown();

    if (timeout) clearTimeout(timeout);
    if (flow && flow.msa) flow = null;
}

module.exports = {
    name: "account",
    description: "Manage a account",
    dontUseDB: false, // ONLY USE IF IT DOESN'T REQUIRE ANY DATABASE CHANGES / MINECRAFT OR XBOX RELATED LINK COMMANDS
    dmsOnly: true,
    cooldown: {
        global: 10000,
        link: 900000,
        unlink: 0
    },
    options: [
        {
            type: 1,
            name: "link",
            description: "Link account",
            options: [
                {
                    type: 4,
                    name: "device",
                    description: "Select device",
                    required: true,
                    choices: [
                        {
                            name: "Android",
                            value: 0
                        },
                        {
                            name: "iOS",
                            value: 1
                        },
                    ]
                }
            ]
        },
        {
            type: 1,
            name: "profile",
            description: "View profile"
        },
        {
            type: 1,
            name: "unlink",
            description: "Unlink account"
        }
    ],
    execute: async (interaction, args, dbUser, embed, clearCooldown) => {
        const commands = { link, profile, unlink }

        commands[args.sub_command](interaction, args, dbUser, embed, clearCooldown)
    }
}

async function link(interaction, args, dbUser, embed, clearCooldown) {
    let { device } = args;

    if (!interaction.user.id) {
        embed.description = "An unknown error occurred.\nTry again later. Status 78";

        interaction.createFollowup({ embed });

        return clearCooldown();
    }

    if (dbUser?.didLink) {
        embed.description = "You have already linked your account.\nPlease unlink first to relink.";

        interaction.createFollowup({ embed });

        return clearCooldown();
    }

    let deviceName;
    switch (device) {
        case 0:
            deviceName = "Android";
            break;
        case 1:
            deviceName = "iOS";
            break;
        default:
            embed.description = "Device unsupported. Status 48";
            interaction.createFollowup({ embed });
            return clearCooldown();
    }

    dbUser.linkDevice = deviceName;

    await dbUser.save();

    let userFlow = deviceMapping[dbUser.linkDevice] || {};

    embed.description = `Please wait...`;
    const msg = await interaction.createFollowup({ embed });

    let timeout, flowData, alreadyLinked = false, API = new PlayFabAPI(interaction.user.id);

    let flow = new Authflow(undefined, getCacheFactory(dbUser), {
        flow: userFlow.flow,
        authTitle: userFlow.authTitle,
        deviceType: userFlow.deviceType,
        deviceVersion: userFlow.deviceVersion,
        titleId: userFlow.titleId
    }, async (code) => {
        if (alreadyLinked) {
            embed.title = "";
            embed.description = "Link Expired\nTry again later. Status 98";

            await msg.edit({ embed, components: [] });
            await cleanup(API, clearCooldown, timeout, flow);

            return;
        }

        alreadyLinked = true;

        embed.title = "Link Process";
        embed.description = `Click the button below to link your account.\n\nIf it doesn't include a code when you click the button, enter the code below.\n\n\`\`\`${code.user_code}\`\`\`\n\n`;

        await msg.edit({ embed, 
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            style: 5,
                            label: "Link",
                            url: `https://microsoft.com/link?otc=${code.user_code}`
                        }
                    ]
                }
            ] 
        });

        timeout = setTimeout(async () => {
            embed.title = "";
            embed.description = "Link Expired\nTry again later. Status 105";

            await msg.edit({ embed, components: [] });
            await cleanup(API, clearCooldown, timeout, flow);

            return;
        }, 900000);
    });

    try {
        flowData = await flow.getXboxToken();

        if (timeout) clearTimeout(timeout);

        embed.title = "";
        embed.description = "Please wait...";

        await msg.edit({ embed, components: [] });

        if (!flowData) {
            embed.description = "Something went wrong.\nTry again later. Status 170";

            await msg.edit({ embed });
            await cleanup(API, clearCooldown, timeout, flow);

            return;
        }

        if (Object.keys(flowData).length === 0) {
            embed.description = "Something went wrong.\nTry again later. Status 176";

            await msg.edit({ embed });
            await cleanup(API, clearCooldown, timeout, flow);

            return;
        }

        if (typeof flowData.userXUID !== "string" && flowData.userXUID.length != 16) {
            embed.description = "Something went wrong.\nTry again later. Status 178";

            await msg.edit({ embed });
            await cleanup(API, clearCooldown, timeout, flow);

            return;
        }

        if (typeof flowData.userHash !== "string") {
            embed.description = "Something went wrong.\nTry again later. Status 189";

            await msg.edit({ embed });
            await cleanup(API, clearCooldown, timeout, flow);

            return;
        }

        if (typeof flowData.XSTSToken !== "string") {
            embed.description = "Something went wrong.\nTry again later. Status 222";

            await msg.edit({ embed });
            await cleanup(API, clearCooldown, timeout, flow);

            return;
        }

        if (typeof flowData.expiresOn !== "string") {
            embed.description = "Something went wrong.\nTry again later. Status 237";

            await msg.edit({ embed });
            await cleanup(API, clearCooldown, timeout, flow);

            return;
        }

        API = new PlayFabAPI(interaction.user.id);

        await dbUser.save();

        const results = await Promise.allSettled([
            API.getXboxUser(),
            API.loginWithXbox()
        ]);

        const [xboxUser, PFData] = results;

        if (xboxUser.status === "rejected" || !xboxUser.value) {
            embed.description = "Something went wrong.\nTry again later. Status 192";

            await msg.edit({ embed });
            await cleanup(API, clearCooldown, timeout, flow);

            return;
        }

        const { gamertag, displayPicRaw } = xboxUser.value;

        if (PFData.status === "rejected") {
            embed.description = `Network error during PlayFab link. Status 167`;

            await msg.edit({ embed });
            await cleanup(API, clearCooldown, timeout, flow);

            return;
        }

        const { PlayFabId, code, error, errorMessage, errorDetails } = PFData.value;

        if (typeof code === "number") {
            switch (code) {
                case 403:
                    const values = Object.values(errorDetails || {});
                    const banExpires = values.length > 0 ? values[0][0] : "Unknown";
                    const timestamp = ~~(new Date(banExpires).getTime() / 1000);

                    embed.description = `${errorMessage}.\nThis ban expires on: <t:${timestamp}:F>`;
                    break;
                default:
                    embed.description = `Something went wrong here during linking to PlayFab.\nTry again later. Status 167 (${code}, ${error})`;
                    break;
            }

            await msg.edit({ embed });
            await cleanup(API, clearCooldown, timeout, flow);

            return;
        }

        if (typeof PlayFabId !== "string") {
            embed.description = "Something went wrong.\nTry again later. Status 215";

            await msg.edit({ embed });
            await cleanup(API, clearCooldown, timeout, flow);

            return;
        }

        await API.updatePublisherData()

        if (timeout) clearTimeout(timeout);
        if (flow && flow.msa) flow = null;

        clearCooldown();

        embed.title = "Link Confirmation";
        embed.thumbnail.url = displayPicRaw;
        embed.description = `**Account**\nSuccessfully linked the account **${gamertag}**.`;

        dbUser.playFabId = PlayFabId.toLowerCase();
        dbUser.didLink = true;
        // Save again just in case.. lol
        dbUser.linkDevice = deviceName;

        await dbUser.save();
        await msg.edit({ embed });
    } catch (error) {
        embed.title = "";

        const errorString = error.toString();

        console.log(error, errorString)

        let matched = false;

        for (const key in errorMessages) {
            if (errorString && errorString.includes(key)) {
                embed.description = errorMessages[key];
                matched = true;
                break;
            }
        }

        if (!matched) embed.description = "An unknown error occurred during linking.\nTry again later. Status 278";

        await API.cleanLinkData("", true);
    } finally {
        // And finally, you can suck this dick last
        clearCooldown();

        await msg.edit({ embed, components: [] });

        if (flow) flow = null;
        if (timeout) clearTimeout(timeout);
    }
}

async function profile(interaction, args, dbUser, embed, clearCooldown) {
    if (dbUser?.didLink) {
        const API = new PlayFabAPI(dbUser.id);
        const profile = await API.getXboxUser();

        if (!profile?.xuid) {
            embed.description = "Something went wrong while grabbing your profile.";
            return interaction.createFollowup({ embed });
        }

        const currency = await API.getCurrency();
        const minecoins = currency?.data?.Currencies?.find(currency => currency === "ecd19d3c-7635-402c-a185-eb11cb6c6946")?.Amount ?? 0;
        const CHandler = new CoinHandler(interaction, dbUser);
        const seasonInfo = CHandler.getSeason();

        embed.thumbnail.url = profile.displayPicRaw;
        embed.title = "Profile";
        embed.description = `
        Gamertag: **${profile.gamertag}**
        XUID: **${profile.xuid}**
        Presence: **${profile.presenceState}**
        Minecoins: **${minecoins.toLocaleString() ?? 0}**
        Operation Count: **${dbUser.attacks.toLocaleString()}**
        Coins: **${dbUser.coins.toLocaleString()}**
        Season: **${seasonInfo.season.toUpperCase()}** (**${seasonInfo.multiplier}x**)
        `;
    } else {
        embed.description = "You've never linked your account."
    }

    return interaction.createFollowup({ embed });
}

async function unlink(interaction, args, dbUser, embed, clearCooldown) {
    if (dbUser?.didLink) {
        const API = new XboxAPI(dbUser.id);
        await API.cleanLinkData("", true)

        embed.title = "Unlink Confirmation";
        embed.description = "Your account has been unlinked.";
    } else {
        embed.description = "You've never linked your account."
    }

    return interaction.createFollowup({ embed });
}