# v1.0.0
- Added `/link`
- Added `/ping`
- Added `/unlink`
- Added `/join`
- Added `/realm`
- Added `/resolve`
- Added `/ssbp`

# v1.0.1
- Added type 3 to `/join`
- Bug fixes

# v1.0.2
- Added type 4 to `/join`
- Bug fixes

# v1.0.3
- Added types 5, 6, & 7 to `/join`
- Bug fix

# v1.1.0
- Added types 8, 9, & 10 to `/join`
- Added `/particles`
- Added `/anvil`
- Added the times of each type on `/join`
- Improvements

# v1.1.5
- Added type 11 to `/join`
- Added `/chat`
- Added `/xp`
- Added `/pos`
- Added `/version`
- Choices now show for `/anvil`
- Improvements

# v1.2.0
- Added `/client-join`
- Added `/freeze`
- Improvements

# v1.2.1
- Bug fixes
- Improvements

# v1.3.0
- Added types 12, 13, 14, 15, 16, 17, & 18 to `/join`
- Added `/noise`
- Bug fixes
- Improvements

# v1.3.1
- Bug fixes
- Improvements

# v1.3.5
- Add `/player`
- Improvements
- Bug fixes

# v1.3.6
- Improvements
- Bug fixes

# v1.3.7
- Minor changes
- Improvements
- Bug fixes

# v1.4.0
- Added `/account` and it now has the following subcommands
  - `link`
  - `profile`
  - `unlink`
- Added type 4 to `/client-join`
- Renamed `/players` to `/playerlist`
- Improvements
- Bug fixes

# v1.5.0
- Added `/changelogs`
- `/account profile` now shows your total Minecoins
- Minor changes
- Bug fixes

# v1.6.0
- Added `/invites`
- `/realm` now has subcommands
  - `lookup`
  - `list` (new)
- Added type option to `/ssbp` (no new types)
- Added type 19 to `/join`
- Minor changes
- Bug fixes

# v1.7.0
- Added `/friends`
- Added `/party`
- Added type 2 to `/ssbp`
- Added `ssbp` option to `/join`
- Minor changes

# v1.7.5
- Advanced suspicious behavior system
- Bug fixes

# v1.7.6
- Bug fixes

# v1.8.0
- Added `/ad`
- Added `ad` option to `/party` & `/friends`
- Added `amount` option to `/chat`
- Added type 20 [E] & 21 [E] to `/join`
- Renamed `/ssbp` to `/ec-block`
- Updated descriptions in most commands to describe more
- Minor changes
- Bug fixes

# v1.8.1
- Lower times of `/chat`, `/ec-block`, `/freeze`, `/noise`, & `/particles` to 180 (3 minutes) instead of 300 (5 minutes).
  - There's multiple reasons on why the VERTEX team did this.
    - 1. Performance for our backend
    - 2. The buttons can expire at times during these operations, making you not being able to end the operation.
    - 3. In favor of keeping the Nethernet Connection short, and making you, the user, less disappointed.
- Minor changes
- Bug fixes

# v1.9.0
- Removed `/xp`
- `/playerlist` will now only do 11/11 only when the realm owner is in the realm, else it'll be 10/10.
- `amount` option in `/chat` is now 25 instead of 50.
- Minor changes
- Bug fixes

# v1.9.1
- Proper v1.21.120 Support
- Minor changes
- Bug fixes

# v2.0.0
- SKIN CUSTOMIZATION (P1)
  - You can customization these below with custom colors of your choosing!
    - Eye Color
    - Hair Color
    - Mouth Color
    - Skin Tone
- Added `/realm join`
- Added `/realm leave`
- Added `/realm club`
- Added `/color tone`
- Added `/color eyes`
- Added `/color mouth`
- Added `/color hair`
- Added `/color all`
- Added `/color reset`
- Performance Improvements
- Minor changes
- Bug fixes

# v2.0.1
- Bug fixes
- Minor changes
- Performance Improvements

# v2.0.2
- Properly Support v1.21.124

# v2.0.5
- Added `/inventory-spread`
- `/particles` no longer client crashes nearby clients if the option is `Eat Particles`.
- Bug fixes

# v2.1.0
- Added type 22 to `/join`
- Added `/client-freeze`
- Added `/containers`
- Added `/realm post`
- Added `/xbox lookup`
- Corrected the time for Type 21 [E] on `/join`
- Corrected the duration for `/inventory-spread`
- Corrected some command cooldowns
- Performance Improvements
- Minor changes
- Bug fixes

# v2.2.0
- Full Stable Nethernet Support
- You can now see how many total operations you have done in `/account profile`
- Added `count` option to `/party`
- Lower `time` option to 15s on `/party` due to usage.
- Lower `count` option on `/client-freeze` due to usage.

# v2.2.5
- Stable v1.21.130 Support
- `/chat` temporary disabled
- Replaced type 14 `/join`
- `/version` now includes the Minecraft version & protocol version.
- Minor changes
- Bug fixes

# v2.2.6
- Enabled `/chat` again

# v2.2.7
- Removed msg options from `/chat`
- Bug fixes

# v2.3.0
- VERTEX COINS
  - Earn coins based on each operation you do!
  - You can always view your VERTEX COINS in `/account profile`, they'll never reset during `/account unlink`.
  - You gain 1 coin per 2 seconds in operations.
  - Whenever someone leaves during a `/ec-block` operation you get 1+ coin each time.
  - On the weekends, you get a 2x multiplier, season doesn't matter. (Beside singular seasons, like Halloween, Easter, Christmas, Birthday, etc.)
- VERTEX SEASONS
  - During VERTEX SEASONS, you can earn more coins during these times, the following seasons include:
    - Normal (1x) (Weekends: 2x)
    - Summer (2x) (Weekends: 4x)
    - Halloween (4x) 
    - Winter (2x) (Weekends: 4x)
    - Spring (2x) (Weekends: 4x)
    - Easter (4x)
    - Birthday (6x)
    - Christmas (4x)
    - Nukie Bear (Only available in Nukie Bear Discord) (4x) (Weekends: 6x)
  - Note: Each VERTEX SEASON is automated with dates or by using VERTEX in specific servers, the following changes will not happen each time a new season occurs:
    - Bot Profile Picture
    - VERTEX PRODUCTIONS © Discord Server
- Added `/leaderboard`
- Added `/credits`
- Added `/chunks`
- Added `/season`
- New `/chat` types
  - `Text [SUB]`
  - `/me [Chat] [SUB]`
  - `/me [External] [SUB]`
  - `/me [Chat] [External] [SUB]`
  - `Sleep [SUB]`
  - `Skin Change [No Persona] [SUB]`
  - `Emote [SUB]`
  - `Help [OP Chat]`
- Improvements
- Bug fixes

# v2.3.5
- Added `/do-all`
- Added newline support to `/chat`
- Improvements
- Bug fixes

# v2.3.6
- VERTEX Whitelist System
  - You must boost our Discord, VERTEX PRODUCTIONS © 2 times and then contact a staff member a vaild realm code or offer a invite to the realm.
- Concurrent Operations
  - If someone else is doing a operation on that specific realm already, you'll not be able to do a operation until they're finish. Please note this is to save on usage for other people to do other operations on different realms.
- New `hmain` option for `/do-all`
- Changed `message` length on `/chat` to 256.
- `/party` & `/friends` now only work on DEFAULT Protocol.
- Improvements
- Bug fixes

# v2.4.0
- Added `/clgmessage`
- Added `/xbox add`
- Added `/xbox follow`
- Added `/xbox remove`
- Added `Type 3` in `/ec-block`
- Reconnects for certain `/join` types
- `/friends` enabled
- `ecblock` option in `/friends`
- `permanent` option in `/ec-block`
- Removed `/party`
- Improvements
- Bug fixes

# v2.4.1
- Removed reconnects from `/join`

# v2.4.2
- Added `type 5` to `/client-join`
- Minor changes
- Improvements
- Bug fixes

# v2.4.3
- Fixed an issue with `/chat` & `/do-all`

# v2.4.4
- Renamed `/chat` option "Text" to "Big Text"
- Increased `/chat` "amount" option from 25 to 50
- Added `/ec-block` Type 4
- Fixed `/ec-block` perm option

# v2.4.5
- Minor changes
- Improvements

# v2.4.6
- Removed patched out `/join` methods
  - We now follow a new way to add methods before it hits production, so we'll no longer have duplicate join types.
- Authentication changes
- Minor changes
- Improvements

# v2.4.7
- Full Stable NETHERNET_JSONRPC Support

# v2.5.0
- Stable v26.0 Support

# v2.5.1
- Minor changes
- Improvements
- Bug fixes

# v2.6.0
- Added `/jsonrpc-join`
- Added `/realm operators`
- Added `/teleports`
- `/seed` now includes a `Chunkbase` button after the operation completes.
- Renamed `/playerlist` to `/realm players`
- Minor changes
- Improvements
- Bug fixes

# v2.7.0
- Added `/potion`
- Added `/arrow`
- Added `/blocks`
- Added `/damage`
- Added `/client-join` type 6
- Improvements
- Bug fixes

# v2.7.1
- Added `/metadata` (Basically does every item with metadata, including arrows, potions, cauldrons, beds, etc.)
- Removed `/potion`
- Removed `/arrow`
- Bug fix

# v2.7.2
- Readded reconnects to `/join`

# v2.7.3
- Improvements

# v2.7.4
- Stable v26.10 Support
- Added `/request-join`
- Bug fixes
- Improvements

# v2.7.5
- Fixed `/join` type 4

# v2.7.6
- Bug fixes
- Improvements

# v2.8.0
- SKIN CUSTOMIZATION (P2)
  - With VERTEX COINS, you can now customize your skin in a unique way using a variety of items included in VERTEX!
    - Hats
    - Hair
    - Eyes
    - Mouth
    - Shirts
    - Bottoms
    - Feet
- Add `/marketplace currency`
- Add `/marketplace hats`
- Add `/marketplace hairs`
- Add `/marketplace eyes`
- Add `/marketplace mouths`
- Add `/marketplace shirts`
- Add `/marketplace bottoms`
- Add `/marketplace feets`
- Add `/marketplace free-items`