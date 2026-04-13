const { userModel } = require("../../common/Database");
const fs = require("fs");

(async () => {
  try {
    const users = await userModel.find({})
    const realms = []
    console.log(`Dumping ${users.length} Users`)
    for (const user of users) {
      if (!Array.isArray(user.lastRealms)) continue

      for (const realm of user.lastRealms) {
        if (!realm.code) continue
        realms.push(realm.code)
      }
    }

    const CodeArray = [...new Set(realms)] // should clear dupes 

    fs.writeFileSync("database.json", JSON.stringify(realms, null, 2))
    console.log(`Found ${CodeArray.length} realm codes`)
  } catch (err) {
    console.error(err)
  } finally {
    process.exit(0)
  }
})();
