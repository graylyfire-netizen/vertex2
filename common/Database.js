"use strict";

const mongoose = require("mongoose");
const config = require("../ext/config.json");

const userSchema = new mongoose.Schema({
  id: String,
  blacklisted: Boolean,
  staff: Boolean,
  didLink: Boolean,
  playFabId: String,
  linkDevice: String,
  coins: Number,
  attacks: Number,
  premium: Boolean,
  premiumExpiry: Number,
  linkData: Object,
  lastRealms: Array,
  colors: Object,
  body: Object
});

const whitelistedRealmsSchema = new mongoose.Schema({
  id: Number
})

const user = mongoose.model("User", userSchema);
const whitelistedRealms = mongoose.model("WhitelistedRealms", whitelistedRealmsSchema);

mongoose.set("strictQuery", true);

mongoose.connect(config.DB_URL)
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

function createUserDefaults(data) {
  if (typeof data != "object") throw TypeError("Missing Data");
  if (!data.id) throw TypeError("Missing User ID");

  return new user({
    _id: data._id,
    id: data.id,
    blacklisted: data.blacklisted ?? false,
    staff: data.staff ?? false,
    didLink: data.didLink ?? false,
    playFabId: data.playFabId ?? "",
    linkDevice: data.linkDevice ?? "",
    coins: data.coins ?? 0,
    attacks: data.attacks ?? 0,
    premium: data.premium ?? false,
    premiumExpiry: data.premiumExpiry ?? 0,
    linkData: data.linkData ?? {},
    lastRealms: data.lastRealms ?? [],
    colors: data.colors ?? { hair: "default", eyes: "default", tone: "default", mouth: "default" },
    // Unused, but ready for later
    body: data.body ?? { hat: {}, hair: {}, eye: {}, mouth: {}, shirt: {}, bottom: {}, feet: {} }
  });
}

function createWhitelistedRealmDefaults(data) {
  if (typeof data != "object") throw TypeError("Missing Data");
  if (!data.id) throw TypeError("Missing Realm ID");

  return new whitelistedRealms({
    _id: data._id,
    id: data.id
  });
}

module.exports = {
  userModel: user,
  whitelistedRealmsModel: whitelistedRealms,
  createUserDefaults,
  createWhitelistedRealmDefaults
};