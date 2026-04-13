const XboxAPI = require("./Xbox.js");
const verData = require("../ext/data.json");

const { deviceMapping } = require("./Util.js");
const { userModel } = require("./Database.js");

const { v4fast: v4 } = require("uuid-1345");

class PlayFabAPI extends XboxAPI {
	constructor(accountID) {
		super();
		this.apiUrl = "https://20ca2.playfabapi.com";
		this.accountID = accountID;
		this.api_headers = {
			"Accept": "application/json",
			"content-type": "application/json",
			"User-Agent": "libhttpclient/1.0.0.0",
			"Accept-Language": "en-US",
			"Accept-Encoding": "gzip, deflate, br",
			"Host": "20ca2.playfabapi.com",
			"Connection": "Keep-Alive",
			"Cache-Control": "no-cache"
		};
	}

	async loginWithXbox() {
		const authToken = await this.getXboxAuthToken("https://b980a380.minecraft.playfabapi.com/");

		if (!authToken) return;

		if (authToken.errorMsg) return authToken;

		const body = JSON.stringify({
			CreateAccount: true,
			InfoRequestParameters: {
				GetPlayerProfile: true,
				GetUserAccountInfo: true
			},
			TitleId: "20CA2",
			XboxToken: authToken
		}, null, 2);

		const response = await fetch(`${this.apiUrl}/Client/LoginWithXbox`, {
			method: "POST",
			headers: {
				...this.api_headers,
				"Content-Length": body.length
			},
			body,
		});

		const data = await response.json();

		if (data.status !== "OK") return data;

		return data.data;
	}

	async getPublisherData() {
		const authData = await this.loginWithXbox();

		if (authData.errorMsg) return authData;

		const response = await fetch(`${this.apiUrl}/Client/GetUserPublisherData`, {
			method: "POST",
			headers: {
				...this.api_headers,
				"x-authorization": authData.SessionTicket
			}
		});

		const data = await response.json();

		if (data.status !== "OK") return { errorMsg: `[getPublisherData] ${data.code} ${data.status}. Error: ${data.errorMessage}` };

		return data.data;
	}

	async updatePublisherData() {
		const authData = await this.loginWithXbox();

		if (authData.errorMsg) return authData;

		const publisherData = await this.getPublisherData();

		const profile = await this.getXboxUser(authData.InfoResultPayload.AccountInfo.XboxInfo.XboxUserId);

		if (!profile) return;

		// Check if it actually needs updated
		// Minecraft doesn't update it everytime anymore, and only updates on gamertag or FilterProfanity change.
		if (
			typeof publisherData?.Data?.GamertagHint?.Value != "undefined" ||
			typeof publisherData?.Data?.FilterProfanity?.Value != "undefined" ||
			publisherData?.Data?.GamertagHint?.Value === profile.gamertag ||
			publisherData?.Data?.DataVersion >= 1
		) return { msg: "No update is needed" };

		const body = JSON.stringify({
			Data: { "GamertagHint": profile.gamertag, "FilterProfanity": "false" },
			Entity: { "Id": authData.PlayFabId, "Type": "master_player_account" },
			Permission: "Public"
		}, null, 2);

		const response = await fetch(`${this.apiUrl}/Client/UpdateUserPublisherData`, {
			method: "POST",
			headers: {
				...this.api_headers,
				"x-authorization": authData.SessionTicket,
				"Content-Length": body.length
			},
			body
		});

		const data = await response.json();

		if (data.status !== "OK") return { errorMsg: `[updatePublisherData] ${data.code} ${data.status}. Error: ${data.errorMessage}` };

		return data;
	}

	async getCurrency() {
		const authData = await this.loginWithXbox();

		if (authData.errorMsg) return authData;

		const response = await fetch(`${this.apiUrl}/inventory/GetVirtualCurrencies`, {
			method: "POST",
			headers: {
				...this.api_headers,
				"x-entitytoken": authData.EntityToken.EntityToken
			}
		})

		const data = await response.json();

		if (data.status !== "OK") return { errorMsg: `[getCurrency] ${data.code} ${data.status}. Error: ${data.errorMessage}` };

		return data;
	}

	async servicesToken() {
		const authData = await this.loginWithXbox();

		if (authData.errorMsg) return authData;

		if (!this.userFlow) {
			const dbUser = await userModel.findOne({ id: this.accountID });

			this.userFlow = deviceMapping[dbUser.linkDevice] ?? null

			if (!this.userFlow) {
				this.cleanLinkData(`No UserFlow is found. (Device: ${dbUser.linkDevice})`, true);
				console.log(`(${dbUser.id}) has no userflow. Device Choosen: ${dbUser.linkDevice}`);
				return;
			}
		}

		const response = await fetch("https://authorization.franchise.minecraft-services.net/api/v1.0/session/start", {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'User-Agent': 'libhttpclient/1.0.0.0'
			},
			body: JSON.stringify({
				device: {
					applicationType: 'MinecraftPE',
					capabilities: ["VibrantVisuals"],
					gameVersion: verData.version,
					hardwareMemoryTier: 1,
					id: this.userFlow.deviceType === "Android" ? v4().replace(/-/g, "") : v4().replace(/-/g, "").toUpperCase(),
					// All of this for it to be blank.. sad
					integrityToken: "eyJhbGciOiJBMjU2S1ciLCJlbmMiOiJBMjU2R0NNIn0.e2JO8NSO2w4eu40Oixqj_PhJJTzUN1qh5gH7DZNPalaiQReb4A6zAA.t4Oil-_QR_k5UjYP.E2c15h925-UGW_jNFXqVQekoyVwY-IXdf2Ode4WiWSTQChd-y2_exybn4Cbrt26rhffg2aqE8NtOoTPGN9zXNyf1yMPAxjmpXKHvR2-bNCxbJeX6vOPh1IOevjxrP8mDgdNZ_NTa24m5n4Wj_nAPrNlGxwy3HXn7YGK5Wp3rq2SPL1k2-u4_Kvs79aTZ3p0ckk67XxNeGghbN3zctYSn_dKvxh5JSczpKy97-pdqKM0l2tUSgBDYol-DuJuAX3p0UD68riQUxUJBihz9ek96XiFjF-nOduLYRnhzppAZyQg4AKfv4CSCxAzawQPbuR0qUzZTcHkqERSJa-LlH6Om2YKIzj1szVA9ZlQY57Oyzoy2kigkqiDGCrYTiJOYm0vgNBWLYsooZvL9nlzxOzFdLqT6JX0eLA2kxYIn3HGAI4QFEUr3kRruMPwagebbAodnkhKbtpqOH04Dq8JgvtJjDExJZ86t4NNCGoifhM3TjMoKzjnikKAJQHA55kA7prgwgSlBFakvI-ql6SITkA6UoqCBMA_kTQwPJhn_X-p00WV_86NZttIp51fmEsOTqzlndGNStdRV-5tjk7QPFB6H0M8dO4MHqiGHGOuQOce_5eWsQ-JCWs-e1gMSFMVVofgiUReug5jVYsz1thZI4WJLjTT8iohVW-wk2pfpW5CoeM9RUXpQ-n6qjg0L49B35_CuxGmjV2aQ4w_1Gelby6qv3C6e0KukuPpUkfbUTEMPqFuP0id04OI.KqiiB51qoLbuChkTG9bQ4w",
					isPreview: false,
					memory: this.userFlow.deviceType === "Android" ? "4131418112" : "6442450944",
					platform: this.userFlow.deviceType,
					playFabTitleId: '20CA2',
					storePlatform: this.userFlow.deviceType === "Android" ? 'android.googleplay' : 'ios.store',
					treatmentOverrides: null,
					type: this.userFlow.deviceType
				},
				user: {
					language: "en",
					languageCode: "en-US",
					regionCode: "US",
					token: authData.SessionTicket,
					tokenType: 'PlayFab'
				}
			})
		})

		const data = await response.json();

		return data
	}
}

module.exports = PlayFabAPI;