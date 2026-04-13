"use strict";

module.exports = {
  name: "credits",
  description: "People who made LESTER possible",
  dontUseDB: true, // ONLY USE IF IT DOESN'T REQUIRE ANY DATABASE CHANGES / MINECRAFT OR XBOX RELATED LINK COMMANDS
  execute: async (interaction, args, dbUser, embed) => {
    embed.description = `
# VERTEX CREDITS
## VERTEX DEVELOPMENT TEAM
  - theosamavis (2strxpz)
  - TSL
  - thatryguyperson
  - bunnington (johnbron5200)
## Commands & Features
- \`/chunks\` command
  - adgods_
- \`/client-join\` type 5
  - -# coolio (not publicly known, has no weight in the community)
## VERTEX PROTOCOL
  - [BedrockX](https://github.com/thejfkvis/bedrockx)
## Special Thanks
  - <@${interaction.user.id}> for using the bot!

## May Cornerhard protect your realm.
-# **VERTEX PRODUCTIONS © 2025-2026**
    `;

    return interaction.createFollowup({ embed });
  }
};