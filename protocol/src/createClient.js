const { Client } = require('./client')
const { NethernetSignal } = require('./websocket/signal')
const { NethernetSignalJSONRPC } = require('./websocket/signal-jsonrpc')

/** @param {{ version?: number, host: string, port?: number, connectTimeout?: number, skipPing?: boolean }} options */
function createClient(options) {
    const client = new Client({ port: 19132, ...options, delayedInit: true })

    client.once('connect_allowed', () => connect(client))
    client.init()

    return client
}

async function connect(client) {
    switch (client.options.transport) {
        case "NETHERNET":
            client.nethernet.signalling = new NethernetSignal(client, client.connection.nethernet.networkId, client.options.authflow, client.options.version, client.options.networkId)

            await client.nethernet.signalling.connect()

            client.connection.nethernet.credentials = client.nethernet.signalling.credentials
            client.connection.nethernet.signalHandler = client.nethernet.signalling.write.bind(client.nethernet.signalling)

            client.nethernet.signalling.on('signal', signal => client.connection.nethernet.handleSignal(signal))
            break;
        case "NETHERNET_JSONRPC":
            client.nethernet.signalling = new NethernetSignalJSONRPC(client, client.connection.nethernet.networkId, client.options.authflow, client.options.version, client.options.networkId)

            await client.nethernet.signalling.connect()

            client.connection.nethernet.credentials = client.nethernet.signalling.credentials
            client.connection.nethernet.signalHandler = client.nethernet.signalling.write.bind(client.nethernet.signalling)

            client.nethernet.signalling.on('signal', signal => client.connection.nethernet.handleSignal(signal))
            break;
    }

    client.connect()

    client.once('resource_packs_info', () => {
        client.write('resource_pack_client_response', { response_status: 'completed', resourcepackids: [] })
        client.write('request_chunk_radius', { chunk_radius: 16, max_radius: 8 })
        client.write("serverbound_loading_screen", { type: 1 })
    })

    client.on('close', () => {
        if (!client.options.transport.includes("NETHERNET")) return
        if (client.nethernet.signalling) client.nethernet.signalling.destroy()
    })
}

module.exports = { createClient }