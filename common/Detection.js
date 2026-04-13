const XboxAPI = require("./Xbox");
const { userModel } = require("./Database")

async function checkRealm(accountID, realm, realmCode, advanced, isBanned) {
    let actions = [];

    if (accountID === "1470357596694118533") return actions;

    const XAPI = new XboxAPI(accountID)

    const dbUser = await userModel.findOne({ id: accountID }, { lastRealms: 1 });

    if (!dbUser) return actions;

    if (!dbUser?.lastRealms) {
        dbUser.lastRealms = [];
        await dbUser.save()
    }

    if (dbUser.lastRealms) {
        for (const lastRealm of dbUser.lastRealms) {
            // Most automod developers unban themselves after, this check will prevent active testing against VERTEX.
            if (typeof realm?.id != "number" || typeof lastRealm.id != "number" && realmCode.length === 0) continue;
            if (typeof lastRealm?.timeWhenBanned != "number" || typeof lastRealm?.wasBanned != "boolean") continue;
            if (!lastRealm.wasBanned) continue;

            if (
                !lastRealm.isBanned && lastRealm.id === realm.id || lastRealm.code === realmCode &&
                Date.now() - lastRealm.timeWhenBanned < 72 * 60 * 60 * 1000
            ) {
                actions.push({ type: "been_unbanned", value: true });
            }
        }
    }

    if (isBanned) return actions;

    if (advanced) {
        if (realm.players.length < 20) actions.push({ type: "low_members", value: true });

        const ownersProfile = await XAPI.getXboxUser(realm.ownerUUID);

        if (typeof ownersProfile?.gamertag != "string") return actions;
        if (realm.name.includes(ownersProfile.gamertag) && realm.players.length < 20) actions.push({ type: "default_realm_name", value: true });
    }

    if (realm.maxPlayers === 2) actions.push({ type: "low_max_players", value: true });

    const dbUserProfile = await XAPI.getXboxUser();

    if (dbUserProfile.xuid === realm.ownerUUID) actions.push({ type: "realm_owned", value: true });

    return actions;
}

module.exports = { checkRealm }