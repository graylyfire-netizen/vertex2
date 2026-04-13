"use strict";

const { componentToHex } = require("../../common/Util.js");

let options = [
    {
        type: 3,
        name: "hex",
        description: "Hex value",
        min_length: 6,
        max_length: 7
    },
    {
        type: 3,
        name: "rgb",
        description: "RGB value (ex: 0, 0, 0)",
        min_length: 5,
        max_length: 15
    }
];

module.exports = {
    name: "color",
    description: "Change character part colors",
    dontUseDB: false,
    options: [
        {
            type: 1,
            name: "all",
            description: "Change color of all the parts",
            options
        },
        {
            type: 1,
            name: "tone",
            description: "Change tone color",
            options
        },
        {
            type: 1,
            name: "eyes",
            description: "Change eye color",
            options
        },
        {
            type: 1,
            name: "mouth",
            description: "Change mouth color",
            options
        },
        {
            type: 1,
            name: "hair",
            description: "Change hair color",
            options
        },
        {
            type: 1,
            name: "reset",
            description: "Reset all body colors"
        }
    ],
    execute: async (interaction, args, dbUser, embed) => {
        const { hex, rgb } = args
        let rgbParts = rgb ? rgb.split(",").map(entry => entry.trim()) : null, val;

        if (args.sub_command === "reset") {
            dbUser.colors = { hair: "default", eyes: "default", tone: "default", mouth: "default" }
            await dbUser.save()

            embed.description = `Successfully reset all of your colors to default.`
            return interaction.createFollowup({ embed })
        }

        if (hex && rgb) {
            embed.description = "You can only provide one color."
            return interaction.createFollowup({ embed })
        }

        if (rgbParts && rgbParts.length != 3) {
            embed.description = "Please format your RGB. Example: 0, 0, 0."
            return interaction.createFollowup({ embed })
        }

        if (hex) {
            if (!/(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(hex)) {
                embed.description = `Invalid hex provided.`
                return interaction.createFollowup({ embed })
            }

            val = hex
        }

        if (rgb) val = "#" + componentToHex(parseInt(rgbParts[0])) + componentToHex(parseInt(rgbParts[1])) + componentToHex(parseInt(rgbParts[2]))

        if (!val) {
            embed.description = "No vaild color provided."
            return interaction.createFollowup({ embed })
        }

        if (typeof dbUser.colors != "object") dbUser.colors = {};

        switch (args.sub_command) {
            case "all":
                dbUser.colors.tone = val
                dbUser.colors.hair = val
                dbUser.colors.mouth = val
                dbUser.colors.eyes = val
                dbUser.markModified("colors")
                await dbUser.save()

                embed.description = `Successfully changed all of your parts color to \`${val}\`.`
                return interaction.createFollowup({ embed })
            case "tone":
                dbUser.colors.tone = val
                dbUser.markModified("colors")
                await dbUser.save()

                embed.description = `Successfully changed your Tone color to \`${val}\`.`
                return interaction.createFollowup({ embed })
            case "hair":
                dbUser.colors.hair = val
                dbUser.markModified("colors")
                await dbUser.save()

                embed.description = `Successfully changed your Hair color to \`${val}\`.`
                return interaction.createFollowup({ embed })
            case "mouth":
                dbUser.colors.mouth = val
                dbUser.markModified("colors")
                await dbUser.save()

                embed.description = `Successfully changed your Mouth color to \`${val}\`.`
                return interaction.createFollowup({ embed })
            case "eyes":
                dbUser.colors.eyes = val
                dbUser.markModified("colors")
                await dbUser.save()

                embed.description = `Successfully changed your Eye color to \`${val}\`.`
                return interaction.createFollowup({ embed })
        }
    }
}