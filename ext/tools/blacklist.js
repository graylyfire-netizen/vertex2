const { userModel } = require("../../common/Database");
const { delay } = require("../../common/Util");

// const XboxAPI = require("../../common/Xbox");

/*            CONFIG                */
const userId = "561590172894887956";
/*                                  */

(async() => {
    const user = await userModel.findOne({ id: userId });
    console.log(user)

    await delay(100)

    user.blacklisted = true;

    /* const XAPI = new XboxAPI(userId);
    await XAPI.cleanLinkData("Blacklisted from LESTER", false); */
    await user.save();

    console.log(`Blacklisted ${userId}`);

    process.exit(0);
})();