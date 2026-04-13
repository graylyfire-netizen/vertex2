const { userModel } = require("../../common/Database");

/*            CONFIG                */
const userId = "1298205558779678794";
/*                                  */

(async() => {
    const user = await userModel.findOne({ id: userId });
    console.log(user)

    user.staff = true;

    await user.save();

    console.log(`Staff ${userId}`);

    process.exit(0);
})();