const { Authflow } = require("../authentication/index.js");
const { v4fast: v4 } = require("uuid-1345");

const { getCacheFactory, deviceMapping } = require("./Util.js");
const { userModel, createUserDefaults } = require("./Database.js");
const { client } = require("../index.js");

const Embed = require("../classes/Embed.js");

const content_restrictions = "eyJ2ZXJzaW9uIjoyLCJkYXRhIjp7Imdlb2dyYXBoaWNSZWdpb24iOiJVUyIsIm1heEFnZVJhdGluZyI6MjU1LCJwcmVmZXJyZWRBZ2VSYXRpbmciOjI1NSwicmVzdHJpY3RQcm9tb3Rpb25hbENvbnRlbnQiOmZhbHNlfX0";

class XboxAPI {
  constructor(accountID) {
    this.accountID = accountID;
  }

  async cleanLinkData(reason, hideMsg, clearLastRealms = true, blacklist = false) {
    let dbUser = await userModel.findOne({ id: this.accountID });

    if (typeof dbUser?.didLink != "boolean") {
      dbUser = createUserDefaults({ id: this.accountID });
      return dbUser.save();
    }

    dbUser.didLink = false;
    dbUser.linkData = {};
    dbUser.linkDevice = "";
    dbUser.playFabId = "";
    
    if (clearLastRealms) dbUser.lastRealms = [];
    if (blacklist) dbUser.blacklisted = true;
    await dbUser.save();

    if (!reason) reason = "No reason provided.";

    if (hideMsg) return;

    const channel = await client.getDMChannel(dbUser.id);

    const embed = new Embed();
    embed.description = `Your account has been unlinked because of the following reason below:\n\n\`\`\`${reason}\`\`\``

    await channel.createMessage({ embed });
  }

  async getXboxAuthToken(relyingParty) {
    const dbUser = await userModel.findOne({ id: this.accountID });

    if (!dbUser) return { errorMsg: "User not found." };

    if (!dbUser.linkDevice || dbUser.linkDevice.length === 0) {
      this.cleanLinkData("The device field is empty or undefined.", true);
      console.log(`(${dbUser.id}) has nothing in the linkDevice field. Device Choosen: ${dbUser.linkDevice}`);
      return;
    }

    this.userFlow = deviceMapping[dbUser.linkDevice] ?? null

    if (!this.userFlow) {
      this.cleanLinkData(`No UserFlow is found. (Device: ${dbUser.linkDevice})`, true);
      console.log(`(${dbUser.id}) has no userflow. Device Choosen: ${dbUser.linkDevice}`);
      return;
    }

    this.flow = new Authflow(undefined, getCacheFactory(dbUser), {
      flow: this.userFlow.flow,
      authTitle: this.userFlow.authTitle,
      deviceType: this.userFlow.deviceType,
      deviceVersion: this.userFlow.deviceVersion,
      titleId: this.userFlow.titleId
    }, (data) => {
      this.cleanLinkData("Failed to get authentication token from Xbox API.", false);
      console.log(data);
      // So it isn't actively checking when it failed..
      this.flow.msa.polling = false;
      return data;
    });

    let xboxToken = await this.flow.getXboxToken(relyingParty, true);

    if (!xboxToken) {
      this.cleanLinkData("Failed to get authentication token from Xbox API.", false);
      return;
    }

    if (typeof xboxToken.userXUID === "string" || typeof xboxToken.userXUID === "number") this.xuid = xboxToken?.userXUID;

    return `XBL3.0 x=${xboxToken.userHash};${xboxToken.XSTSToken}`;
  }

  async sendPresence(body) {
    const authToken = await this.getXboxAuthToken();
    if (!authToken) return

    body = JSON.stringify(body);

    if (authToken?.errorMsg) return authToken;

    const response = await fetch(`https://userpresence.xboxlive.com/users/xuid(${this.xuid})/devices/current/titles/current`, {
      method: "POST",
      headers: {
        "x-xbl-contract-version": 3,
        "Accept-Encoding": "gzip, deflate",
        "Accept": "application/json",
        "Accept-Language": "en-US",
        "Content-Length": body.length,
        "Authorization": authToken,
        "Content-Type": "application/json; charset=UTF-8",
        "Host": "userpresence.xboxlive.com",
        "Connection": "Keep-Alive",
        "Cache-Control": "no-cache"
      },
      body
    });

    switch (response.status) {
      case 200:
        return "success";
      default:
        return { errorMsg: await response.text(), status: response.status };
    }
  }

  async sendInGamePresence(realm, inGame) {
    const authToken = await this.getXboxAuthToken();
    if (!authToken) return

    if (authToken?.errorMsg) return authToken;

    const response = await fetch(`https://clubpresence.xboxlive.com/clubs/${realm.clubId}/users/xuid(${this.xuid})/session?titleFamilyId=3347393a-1a27-4e26-a623-31173bb86ee1`, {
      method: "POST",
      headers: {
        "Accept-Language": "en-US",
        "Authorization": authToken,
        "Content-Type": "application/json",
        "User-Agent": "libhttpclient/1.0.0.0",
        "x-xbl-contract-version": "1",
        "Accept-Encoding": "gzip, deflate, br",
        "Host": "clubpresence.xboxlive.com",
        "Connection": "Keep-Alive",
        "Cache-Control": "no-cache"
      },
      body: JSON.stringify({ inGame })
    });

    switch (response.status) {
      case 204:
        return "success";
      default:
        return { errorMsg: await response.text(), status: response.status };
    }
  }

  async gamertagToXuid(gamertag) {
    const authToken = await this.getXboxAuthToken();
    if (!authToken) return

    if (authToken?.errorMsg) return authToken;

    const response = await fetch(`https://profile.xboxlive.com/users/gt(${gamertag})/profile/settings`, {
      method: "GET",
      headers: {
        "Accept-Language": "en-US,en",
        "Authorization": authToken,
        "Content-Type": "application/json; charset=utf-8",
        "User-Agent": "XboxServicesAPI/2021.10.20220301.4 c",
        "x-xbl-contract-version": 2,
        "Accept-Encoding": "gzip, deflate, br",
        "Host": "profile.xboxlive.com",
        "Connection": "Keep-Alive",
        "Cache-Control": "no-cache"
      }
    });

    switch (response.status) {
      case 200:
        return (await response.json()).profileUsers[0].id;
      case 404:
        return null;
      default:
        return { errorMsg: await response.text(), status: response.status };
    }
  }

  async getXboxUser(xuid) {
    const authToken = await this.getXboxAuthToken();

    if (!authToken) return

    if (!xuid) xuid = this.xuid;

    if (authToken?.errorMsg) return authToken;

    const response = await fetch(`https://peoplehub.xboxlive.com/users/me/people/xuids(${xuid})/decoration/detail,preferredColor,presenceDetail`, {
      method: "GET",
      headers: {
        "x-xbl-contract-version": 4,
        "Accept-Encoding": "gzip, deflate",
        "Accept": "application/json",
        "User-Agent": "WindowsGameBar/5.823.1271.0",
        "Accept-Language": "en-US",
        "Authorization": authToken,
        "Host": "peoplehub.xboxlive.com",
        "Connection": "Keep-Alive"
      }
    });

    switch (response.status) {
      case 200:
        return (await response.json()).people[0];
      case 400:
      case 401:
      case 404:
        return null;
      default:
        return { errorMsg: await response.text(), status: response.status };
    }
  }

  async getXboxUserBulk(xuids = []) {
    if (xuids.length === 0) return [];

    const authToken = await this.getXboxAuthToken();
    if (!authToken) return;

    if (authToken.errorMsg) return authToken;

    const response = await fetch("https://peoplehub.xboxlive.com/users/me/people/batch/decoration/detail,presenceDetail", {
      method: "POST",
      headers: {
        "x-xbl-contract-version": 4,
        "Accept-Encoding": "gzip, deflate",
        "Accept": "application/json",
        "User-Agent": "WindowsGameBar/5.823.1271.0",
        "Accept-Language": "en-US",
        "Authorization": authToken,
        "Host": "peoplehub.xboxlive.com",
        "Connection": "Keep-Alive"
      },
      body: JSON.stringify({ xuids })
    });

    switch (response.status) {
      case 200:
        return (await response.json()).people;
      default:
        return { errorMsg: await response.text(), status: response.status };
    }
  }

  async getClubData(clubID) {
    if (!clubID) return;

    const authToken = await this.getXboxAuthToken();
    if (!authToken) return

    if (authToken.errorMsg) return authToken;

    const response = await fetch(`https://clubhub.xboxlive.com/clubs/Ids(${clubID})/decoration/clubPresence`, {
      method: "GET",
      headers: {
        "x-xbl-contract-version": 4,
        "Accept-Encoding": "gzip; q=1.0, deflate; q=0.5, identity; q=0.1",
        "x-xbl-contentrestrictions": content_restrictions,
        "Cache-Control": "no-store, must-revalidate, no-cache",
        "Accept": "application/json",
        "X-XblCorrelationId": v4(),
        "PRAGMA": "no-cache",
        "Accept-Language": "en-US, en",
        "Authorization": authToken,
        "Host": "clubhub.xboxlive.com",
        "Connection": "Keep-Alive"
      }
    });

    switch (response.status) {
      case 200:
        const clubData = await response.json();

        if (clubData.code) return clubData;

        return clubData.clubs[0];
      case 403:
        break;
      case 404:
        return null;
      default:
        return { errorMsg: await response.text(), status: response.status };
    }
  }

  async postComment(clubID, text = "") {
    if (!clubID) return;

    const authToken = await this.getXboxAuthToken();

    if (!authToken) return;

    if (authToken.errorMsg) return authToken;

    const body = JSON.stringify({
      postText: text,
      postType: "XboxLink",
      postTypeData: {
        locator: "screenshotsmetadata.xboxlive.com/users/xuid(2535421154553917)/scids/00000000-0000-0000-0000-000000000000/screenshots/d9ce6f7b-3d03-4107-82b9-682812696543"
      },
      timelines: [
        {
          timeLineOwner: clubID,
          timeLineType: "Club"
        }
      ]
    })

    const response = await fetch("https://userposts.xboxlive.com/users/me/posts", {
      method: "POST",
      headers: {
        "Accept": "*/*",
        "accept-language": "en-US",
        "Authorization": authToken,
        "content-type": "application/json",
        "User-Agent": "libhttpclient/1.0.0.0",
        "x-xbl-contract-version": 2,
        "Accept-Encoding": "gzip, deflate, br",
        "Host": "userposts.xboxlive.com",
        "Connection": "Keep-Alive",
        "Cache-Control": "no-cache"
      },
      body
    })

    switch (response.status) {
      case 200:
      case 403:
        return { data: await response.json(), status: response.status }
      default:
        return { errorMsg: await response.text(), status: response.status };
    }
  }

  async addUser(XUID) {
    if (!XUID) return;

    const authToken = await this.getXboxAuthToken();

    if (!authToken) return;

    if (authToken.errorMsg) return authToken;

    const response = await fetch(`https://social.xboxlive.com/users/me/people/friends/v2/xuid(${XUID})`, {
      method: "PUT",
      headers: {
        "Accept": "*/*",
        "accept-language": "en-US",
        "Authorization": authToken,
        "content-type": "application/json",
        "User-Agent": "WindowsGameBar/5.823.1271.0",
        "x-xbl-contract-version": 3,
        "Accept-Encoding": "gzip, deflate, br",
        "Host": "social.xboxlive.com",
        "Connection": "Keep-Alive",
        "Cache-Control": "no-cache"
      }
    })

    switch (response.status) {
      case 200:
        return { data: response.statusText, status: response.status }
      case 403:
        break;
      default:
        return { errorMsg: response.statusText, status: response.status };
    }
  }

  async removeUser(XUID) {
    if (!XUID) return;

    const authToken = await this.getXboxAuthToken();

    if (!authToken) return;

    if (authToken.errorMsg) return authToken;

    const response = await fetch(`https://social.xboxlive.com/users/me/people/friends/v2/xuid(${XUID})?deleteRelationships=friends`, {
      method: "DELETE",
      headers: {
        "Accept": "*/*",
        "accept-language": "en-US",
        "Authorization": authToken,
        "content-type": "application/json",
        "User-Agent": "WindowsGameBar/5.823.1271.0",
        "x-xbl-contract-version": 3,
        "Accept-Encoding": "gzip, deflate, br",
        "Host": "social.xboxlive.com",
        "Connection": "Keep-Alive",
        "Cache-Control": "no-cache"
      }
    })

    switch (response.status) {
      case 200:
        return { data: response.statusText, status: response.status }
      case 403:
        break;
      default:
        return { errorMsg: response.statusText, status: response.status };
    }
  }

  async followUser(XUID) {
    if (!XUID) return;

    const authToken = await this.getXboxAuthToken();

    if (!authToken) return;

    if (authToken.errorMsg) return authToken;

    const response = await fetch(`https://social.xboxlive.com/users/xuid(${this.xuid})/people/xuid(${XUID})`, {
      method: "PUT",
      headers: {
        "x-xbl-contract-version": 3,
        "Accept-Encoding": "gzip, deflate",
        "Accept": "application/json",
        "ms-cv": "rGUN3S.wCU2k6w.1267",
        "accept-language": "en-US",
        "Authorization": authToken,
        "Host": "social.xboxlive.com",
        "content-length": 0,
        "Connection": "Keep-Alive",
        "Cache-Control": "no-cache"
      }
    })

    switch (response.status) {
      case 204:
        return { data: response.statusText, status: response.status }
      case 403:
        break;
      default:
        return { errorMsg: response.statusText, status: response.status };
    }
  }
}

module.exports = XboxAPI;