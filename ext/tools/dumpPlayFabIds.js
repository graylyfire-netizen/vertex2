const { userModel } = require("../../common/Database");

/*            CONFIG                */
const userId = "1298205558779678794";
/*                                  */

(async() => {
    const pfids = await userModel.find({}, { playFabId: 1 }).lean();
    for (const pfid of pfids) {
        if (pfid.playFabId.length === 0) continue;
        console.log(pfid.playFabId)
    }
    
    process.exit(0);
})();