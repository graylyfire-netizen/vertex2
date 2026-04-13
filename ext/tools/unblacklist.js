const { userModel } = require("../../common/Database");
const { delay } = require("../../common/Util");

/*            CONFIG                */
const userId = "1249422342812336190";
/*                                  */

(async() => {
    const user = await userModel.findOne({ id: userId });
    console.log(user)

    await delay(100)

    user.blacklisted = false;

    console.log(`Unblacklisted ${userId}`);

    await user.save()

    process.exit(0);
})();