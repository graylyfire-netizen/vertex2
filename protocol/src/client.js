const { ClientStatus, Connection } = require('./connection')
const { createDeserializer, createSerializer } = require('./transforms/serializer')
const { NethernetClient } = require('./nethernet')
const { RakClient } = require('./rak')
const { authenticate } = require('./client/auth')
const JWT = require('jsonwebtoken')
const crypto = require('crypto')

const pem = { format: 'pem', type: 'sec1' }
const der = { format: 'der', type: 'spki' }

function readVarInt(buf, offset = 0) {
    let numRead = 0
    let result = 0
    let read
    do {
        if (offset + numRead >= buf.length) throw new Error('VarInt exceeds buffer length')
        read = buf[offset + numRead]
        const value = read & 0x7F
        result |= (value << (7 * numRead))
        numRead++
        if (numRead > 5) throw new Error('VarInt too big')
    } while ((read & 0x80) !== 0)

    return { value: result, size: numRead }
}

class Client extends Connection {
    connection

    constructor(options) {
        super()
        this.options = { ...options }
        this.compressionAlgorithm = 'none'
        this.compressionThreshold = 512
        this.compressionLevel = options.compressionLevel

        if (this.options.transport === 'NETHERNET' || this.options.transport === "NETHERNET_JSONRPC") this.nethernet = {}

        if (!options.delayedInit) this.init()
    }

    init() {
        this.serializer = createSerializer()
        this.deserializer = createDeserializer()
        this.features = { compressorInHeader: true }

        this.ecdhKeyPair = crypto.generateKeyPairSync('ec', { namedCurve: "secp384r1" })
        this.clientX509 = this.ecdhKeyPair.publicKey.export(der).toString('base64')
        this.privateKeyPEM = this.ecdhKeyPair.privateKey.export(pem)

        switch (this.options.transport) {
            case "NETHERNET":
            case "NETHERNET_JSONRPC":
                this.connection = new NethernetClient({ networkId: this.options.networkId, closeOnError: true })

                this.batchHeader = null
                this.disableEncryption = true
                break;
            case "DEFAULT":
                this.connection = new RakClient({ host: this.options.host, port: this.options.port })

                this.batchHeader = 0xfe
                this.disableEncryption = false
                break;
        }

        this.batch.updateCompressionSettings(this)

        this.emit('connect_allowed')
    }

    connect() {
        if (!this.connection) throw new Error('Connect not currently allowed')
        this.on('session', this._connect)
        authenticate(this, this.options)
    }

    _connect = async () => {
        this.connection.onConnected = () => {
            this.status = ClientStatus.Connecting
            this.write('request_network_settings', { client_protocol: this.options.protocolVersion })
            this.emit('connected')
        }

        this.connection.onCloseConnection = () => {
            this.close()
        }

        this.connection.onEncapsulated = (encapsulated) => {
            this.handle(Buffer.from(encapsulated.buffer))
        }

        this.connection.connect()
    }

    sendLogin() {
        this.status = ClientStatus.Authenticating

        let payload = {
            GameVersion: this.options.version,
            ServerAddress: `${this.options.host}:${this.options.port}`,
            ...this.options.skinData
        }

        let chain = [this.clienttoken, ...this.chain]
        let Certificate = JSON.stringify({ chain })

        if (this.options.crash.enabled) {
            switch (this.options.crash.type) {
                case 4:
                    Certificate = JSON.stringify({ chain: Array(500001).fill("") })
                    this.token = ""
                    break
            }
        }

        // tsl - 1.26.10 no longer uses the Certificate chain and relies on the Token but im too lazy to change :3
        this.write('login', {
            protocol_version: this.options.protocolVersion,
            tokens: {
                identity: JSON.stringify({ AuthenticationType: 0, Certificate, Token: this.token }),
                client: JWT.sign(payload, this.ecdhKeyPair.privateKey, { algorithm: 'ES384', header: { x5u: this.clientX509 } })
            }
        })
    }

    disconnect(reason = 'Client leaving') {
        if (this.status === ClientStatus.Disconnected) return

        this.close(reason)
    }

    close() {
        if (this.status !== ClientStatus.Disconnected) this.emit('close') // Emit close once
        this.batch = null;
        this.connection?.close()
        if (this.options.transport.includes("NETHERNET") && this.nethernet?.signalling) this.nethernet.signalling.destroy()
        this.removeAllListeners()
        this.status = ClientStatus.Disconnected
    }

    readPacket(packet) {
        if (this.disableSubListeners && readVarInt(packet, 0).value >= 1024) return;

        try {
            var des = this.deserializer.parsePacketBuffer(packet) // eslint-disable-line
        } catch (e) {
            this.emit('error', e)
            return
        }

        // Abstract some boilerplate before sending to listeners
        switch (des.data.name) {
            case 'network_settings':
                this.compressionAlgorithm = des.data.params.compression_algorithm || 'deflate'
                this.compressionThreshold = des.data.params.compression_threshold
                this.compressionReady = true
                this.batch.updateCompressionSettings(this)

                this.sendLogin()
                break
            case 'server_to_client_handshake':
                const [header, payload] = des.data.params.token.split('.', 2).map(part => JSON.parse(Buffer.from(part, 'base64url').toString()))

                if (!this.disableEncryption) {
                    this.secretKeyBytes = crypto.createHash('sha256').update(Buffer.from(payload.salt, 'base64')).update(crypto.diffieHellman({ privateKey: this.ecdhKeyPair.privateKey, publicKey: crypto.createPublicKey({ key: Buffer.from(header.x5u, 'base64'), ...der }) })).digest()
                    this.startEncryption(this.secretKeyBytes.slice(0, 16))
                }

                this.options.crash.enabled && this.options.crash.type === 5 ? this.writeBatch('client_to_server_handshake', {}, 10000000) : this.write('client_to_server_handshake', {})
                this.status = ClientStatus.Initializing
                break
            case 'disconnect': // Client kicked
                this.emit('kick', des.data.params)
                this.close()
                break
            case 'item_registry':
                des.data.params.itemstates?.forEach(state => {
                    if (state.name === 'minecraft:shield') {
                        this.serializer.proto.setVariable('ShieldItemID', state.runtime_id)
                        this.deserializer.proto.setVariable('ShieldItemID', state.runtime_id)
                    }
                })
                break
            case 'play_status':
                if (this.status === ClientStatus.Authenticating) this.status = ClientStatus.Initializing
                break
            default:
                break
        }

        this.emit(des.data.name, des.data.params)
    }
}

module.exports = { Client }