"use strict";

const mongoose = require("mongoose");
const config = require("../config"); // ✅ FIXED (no more .json)

// ===== USER SCHEMA =====
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

// ===== WHITELISTED REALMS =====
const whitelistedRealmsSchema = new mongoose.Schema({
  id: Number
});

// ===== MODELS =====
const user = mongoose.model("User", userSchema);
const whitelistedRealms = mongoose.model("WhitelistedRealms", whitelistedRealmsSchema);

mongoose.set("strictQuery", true);

// ✅ CONNECT USING ENV VARIABLE (via config.js)
mongoose.connect(config.DB_URL)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((error) => {
    console.error("❌ MongoDB Error:", error);
    process.exit(1);
  });

// ===== CREATE DEFAULT USER =====
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
    body: data.body ?? { hat: {}, hair: {}, eye: {}, mouth: {}, shirt: {}, bottom: {}, feet: {} }
  });
}

// ===== CREATE DEFAULT REALM =====
function createWhitelistedRealmDefaults(data) {
  if (typeof data != "object") throw TypeError("Missing Data");
  if (!data.id) throw TypeError("Missing Realm ID");

  return new whitelistedRealms({
    _id: data._id,
    id: data.id
  });
}

// ===== EXPORTS =====
module.exports = {
  userModel: user,
  whitelistedRealmsModel: whitelistedRealms,
  createUserDefaults,
  createWhitelistedRealmDefaults
};
