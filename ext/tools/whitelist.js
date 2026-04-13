const { whitelistedRealmsModel, createWhitelistedRealmDefaults } = require("../../common/Database");

/*            CONFIG                */
const id = 30816780;
const action = "add"; // add or remove
/*                                  */

(async () => {
    const realm = await whitelistedRealmsModel.findOne({ id });

    switch (action) {
        case "add":
            if (!realm) {
                const newRealm = createWhitelistedRealmDefaults({ id });
                await newRealm.save();

                console.log("Whitelisted Realm added.");
            } else {
                console.log("Whitelisted Realm already exists.");
            }
            break;
        case "remove":
            if (realm) {
                await whitelistedRealmsModel.deleteOne({ id });
                
                console.log("Whitelisted Realm removed.");
            } else {
                console.log("Whitelisted Realm not found.");
            }
            break;
        default:
            console.log("Invalid action. Use 'add' or 'remove'.");
            break;
    }

    process.exit(0);
})();