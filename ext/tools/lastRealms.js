const { userModel } = require("../../common/Database");

/*            CONFIG                */
const userId = "1246500456830734438";
/*                                  */

(async() => {
    const user = await userModel.findOne({ id: userId });

    for (const realm of user.lastRealms) {
        /* if (typeof realm?.timeWhenBanned != "number" || typeof realm?.wasBanned != "boolean") continue;
        if (!realm.wasBanned) continue; */

        console.log(realm)
    }

    await user.save()

    process.exit(0);
})();