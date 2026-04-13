const { userModel } = require("../../common/Database");

/*            CONFIG                */
const userId = "1380944415799119893";
/*                                  */

(async() => {
    const user = await userModel.findOne({ id: userId });

    if (!user) {
        console.log(`User ${userId} not found.`);
        process.exit(1);
    }

    console.log(user)
    
    await user.deleteOne();

    process.exit(0);
})();