const ms = require("ms");

const { userModel, createUserDefaults } = require("../common/Database.js");

const Embed = require("./Embed.js");
const config = require("../ext/config.json");

class CommandHandler {
  constructor(member, guild, command, cooldowns, interaction, args) {
    this.member = member;
    this.guild = guild;
    this.command = command;
    this.interaction = interaction;
    this.cooldowns = cooldowns;
    this.args = args;
    this.whole_command = this.args.sub_command ? `${this.command.name} ${this.args.sub_command}` : this.command.name;
    this.embed = new Embed();
    this.embed.thumbnail.url = "";
  }

  async handle() {
    if (!this.command.dontUseDB) {
      this.dbUser = await userModel.findOne({ id: this.member.id }) ?? createUserDefaults({ id: this.member.id });

      this.checkPremiumStatus(this.dbUser);
    } else {
      this.dbUser = {};
    }

    if (this.isUserRestricted(this.dbUser)) return "Restricted";

    let cooldownResult = null;

    if (this.command.cooldown) {
      cooldownResult = this.command.dontUseDB ? this.handleCooldown() : this.handleCooldown(this.dbUser);

      if (cooldownResult) return "onCooldown";
    }
  }

  checkPremiumStatus(user) {
    if (user.premium && user.premiumExpiry - Date.now() <= 0) {
      user.premium = false;
      user.premiumExpiry = 0;
      user.save();
    }
  }

  isUserRestricted(user) {
    if (
      (!config.guildsWhitelist.includes(String(this.guild?.id)) && this.guild) ||
      (this.command.dmsOnly && this.guild)
    ) {
      const reason =
        !config.guildsWhitelist.includes(String(this.guild?.id)) && this.guild ?
          "You're not in a whitelisted guild." :
          "This is only usable in DMs.";

      this.embed.description = reason;
      this.interaction.createFollowup({ embed: this.embed });
      return true;
    }

    if (
      !this.command.dontUseDB && user.blacklisted ||
      (this.command.staffOnly && !user.staff) ||
      (this.command.requireLink && !user.didLink) ||
      (this.command.premium && !user.premium)
    ) {
      const reason = user.blacklisted ? "You're blacklisted."
        : this.command.staffOnly && !user.staff ? "You don't have access to use this command."
          : this.command.requireLink && !user.didLink ? "This requires you to link."
            : this.command.premium && !user.premium ? "This command requires premium."
              : this.command.notUpdated ? "This command is not updated to the current version." : "";

      this.embed.description = reason;
      this.interaction.createFollowup({ embed: this.embed });
      return true;
    }

    return false;
  }

  handleCooldown(user) {
    // No staff cooldown :yawning_face:
    if (typeof user === "object" && user?.staff) return false;

    const now = Date.now();
    const cooldownMap = this.cooldowns.get(this.member.id) ?? {};
    let rateLimitEnd;

    const sub_command = this.args?.sub_command;

    let cooldownDuration = 0;
    if (typeof this.command.cooldown === "object") {
      cooldownDuration = this.command.cooldown[sub_command] ?? this.command.cooldown.global ?? 0;
    } else {
      cooldownDuration = this.command.cooldown ?? 0;
    }

    if (Object.keys(cooldownMap).length !== 0 && cooldownMap[this.whole_command]) {
      rateLimitEnd = ms(cooldownMap[this.whole_command] - now, { long: true });

      if (!rateLimitEnd.includes("ms") && cooldownMap[this.whole_command] > now) {
        this.embed.description = `This is on cooldown for **${rateLimitEnd}**.`;
        this.interaction.createFollowup({ embed: this.embed });
        return true;
      }
    }

    cooldownMap[this.whole_command] = now + cooldownDuration;
    this.cooldowns.set(this.member.id, cooldownMap);

    return false;
  }

  clearCooldown() {
    const cooldownMap = this.cooldowns.get(this.member.id);

    if (cooldownMap && cooldownMap[this.whole_command]) {
      delete cooldownMap[this.whole_command];

      if (Object.keys(cooldownMap).length === 0) {
        this.cooldowns.delete(this.member.id);
      }
    }
  }
}

module.exports = CommandHandler;