const { Authflow } = require('../../../authentication/index')
const { translateUUID } = require('../../../common/Util')

const JWT = require('jsonwebtoken')

async function authenticate(client, options) {
  try {
    options.authflow ??= new Authflow(options.username, options.profilesFolder, options, options.onMsaCode)

    const MCTOKEN = (await options.authflow.getMinecraftBedrockServicesToken({ version: client.options.version })).mcToken
    const body = JSON.stringify({ publicKey: client.clientX509 })

    const response = await fetch("https://authorization.franchise.minecraft-services.net/api/v1.0/multiplayer/session/start", {
      method: "POST",
      headers: {
        "accept": "*/*",
        "authorization": MCTOKEN,
        "content-type": "application/json",
        "User-Agent": "libhttpclient/1.0.0.0",
        "Accept-Language": "en-US",
        "Accept-Encoding": "gzip, deflate, br",
        "Content-Length": body.length
      },
      body
    })

    const result = await response.json()

    if (result.code === "PlayerBanned") {
      throw new Error(JSON.stringify({
        "path": "/multiplayer/bedrock/authentication",
        "error": "FORBIDDEN"
      }))
    }

    const signedToken = result.result.signedToken

    const chains = await options.authflow.getMinecraftBedrockToken(client.clientX509).catch(e => {
      throw e
    })
    
    const Mjwt = chains[0]
    const jwt = chains[1]
    const [h, payload] = jwt.split('.').map(k => Buffer.from(k, 'base64')) // eslint-disable-line
    const [Mh, Mpayload] = Mjwt.split('.').map(k => Buffer.from(k, 'base64'))
    const xboxProfile = JSON.parse(String(payload))
    const mojangPayload = JSON.parse(String(Mpayload))
    const mojangHeader = JSON.parse(String(Mh))
 
    let clientpayload = {
      certificateAuthority: true,
      exp: mojangPayload.exp,
      identityPublicKey: mojangHeader.x5u,
      nbf: mojangPayload.nbf,
    }

    const clienttoken = JWT.sign(clientpayload, client.privateKeyPEM, { algorithm: "ES384", noTimestamp: true, header: { x5u: xboxProfile.identityPublicKey, alg: "ES384", typ: undefined } })

    client.profile = xboxProfile?.extraData
    client.profile.uuid = translateUUID(client.profile.identity)
    client.chain = chains
    client.clienttoken = clienttoken
    client.token = signedToken
    client.emit('session', xboxProfile)
  } catch (err) {
    client.emit('error', err)
  }
}

module.exports = { authenticate }