const fs = require('fs');

const protocol = require(`../ext/protocol.json`);

// protocol.patched = false;

if (!protocol.patched) {
    const packetIDs = protocol.types.mcpe_packet[1][0].type[1].mappings;
    const packets = protocol.types.mcpe_packet[1][1].type[1].fields;

    const packetNames = Object.keys(packets);

    for (let subClientId = 1; subClientId < 4; subClientId++) {
        const [subPacketId, subPacketIdListener] = [4096 * subClientId, 1024 * subClientId];

        for (let packetName of packetNames) {
            if (/_\d$/.test(packetName)) continue;

            const packetId = parseInt(Object.keys(packetIDs).find(key => packetIDs[key] === packetName));

            packetIDs[`${packetId + subPacketId}`] = `${packetName}_${subClientId}`;
            packetIDs[`${packetId + subPacketIdListener}`] = `${packetName}_${subClientId}`;
            packets[`${packetName}_${subClientId}`] = `packet_${packetName}`;
        }
    }

    protocol.patched = true;
    fs.writeFileSync(`./ext/protocol.json`, JSON.stringify(protocol, null, 2));

    console.log(`Patches applied to ./ext/protocol.json!\nPlease restart.`);
    process.exit(0);
}
