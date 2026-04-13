"use strict";

const { getVersionLog } = require("../../common/Util");

const versions = getVersionLog("", true);

module.exports = {
    name: "changelogs",
    description: "View changelogs",
    dontUseDB: true, // ONLY USE IF IT DOESN'T REQUIRE ANY DATABASE CHANGES / MINECRAFT OR XBOX RELATED LINK COMMANDS,
    options: [
        {
            type: 3,
            name: "version",
            description: "Version to view",
            required: true,
            autocomplete: true
        }
    ],
    execute: async (interaction, args, dbUser, embed) => {
        let { version } = args;

        version = version.replace("v", "").replace("V", "").trim();

        // AI is the best at making Regexes! (I don't make regexes at all normally, but this works, it looks so bad lol)
        if (!/^(?:\()?(\d+(?:\.\d+)+)(?:\))?$/.test(version.trim()) || !versions[version] || versions[version]?.length === 0) {
            embed.description = `Invaild version\nUse autocomplete or type the version properly.`
            return interaction.createFollowup({ embed })
        } 

        embed.description = versions[version];

        return interaction.createFollowup({ embed });
    },
    autocompleteEvent: versionSelector
};

async function versionSelector(interaction, arg) {
    const query = arg.value.replaceAll("v", "").trim();

    if (query.length < 1 || query.length > 8) return interaction.result([]);

    let allVersions = Object.keys(versions);
    let results = [];

    for (let i = 0; i < allVersions.length; i++) {
        if (results.length >= 25) break;

        if (allVersions[i].startsWith(query)) {
            results.push({ name: `v${allVersions[i]}`, value: allVersions[i] });
        }
    }

    interaction.result(results);
}