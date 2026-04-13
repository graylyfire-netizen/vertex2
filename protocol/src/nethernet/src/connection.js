const MAX_MESSAGE_SIZE = 50000; // 262143 IS MAX LIMIT EXACTLY

const ensureBuffer = (data) => {
  if (Buffer.isBuffer(data)) return data
  if (typeof data === 'string') return Buffer.from(data)
  if (data instanceof ArrayBuffer) return Buffer.from(data)
  if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer, data.byteOffset, data.byteLength)

  throw new Error('Unsupported data type for RTC message')
}

class Connection {
  constructor(nethernet, address, rtcConnection) {
    this.nethernet = nethernet
    this.address = address
    this.rtcConnection = rtcConnection
    this.reliable = null
    this.unreliable = null
    this.promisedSegments = 0
    this.buf = Buffer.allocUnsafe(0)
    this.chunks = []
    this.totalByteLength = 0
    this.sendQueue = []
  }

  setChannels(reliable, unreliable) {
    if (reliable) {
      this.reliable = reliable
      this.reliable.binaryType = 'arraybuffer'
      this.reliable.onmessage = (event) => this.handleMessage(event.data)
      this.reliable.onopen = () => this.flushQueue()
    }

    if (unreliable) {
      this.unreliable = unreliable
      this.unreliable.binaryType = 'arraybuffer'
    }
  }

  handleMessage(data) {
    data = ensureBuffer(data)

    if (data.length < 1) throw new Error("Unexpected EOF")

    const segments = data[0]

    if (this.promisedSegments > 0 && this.promisedSegments - 1 !== segments) {
      throw new Error(`Invalid promised segments: expected ${this.promisedSegments - 1}, got ${segments}`)
    }

    this.promisedSegments = segments

    if (!this.chunks) {
      this.chunks = []
      this.totalByteLength = 0
    }

    const payload = data.subarray(1)
    this.chunks.push(payload)
    this.totalByteLength += payload.length

    if (this.promisedSegments > 0) return

    let finalBuffer = this.chunks.length === 1 ? this.chunks[0] : Buffer.concat(this.chunks, this.totalByteLength)

    this.nethernet.emit("encapsulated", finalBuffer)

    this.chunks = []
    this.totalByteLength = 0
  }

  send(data, num = 1) {
    const payload = ensureBuffer(data)

    switch (this.reliable.readyState) {
      case 'open':
        return this.sendNow(payload, num)
      case 'closing':
      case 'closed':
        throw new Error('Reliable channel is closed')
      default:
        this.sendQueue.push(payload)
        return 0
    }
  }

  sendNow(data, num = 1) {
    const segments = Math.ceil(data.length / MAX_MESSAGE_SIZE)
    const buffers = Array(segments)

    for (let i = 0; i < segments; i++) {
      buffers[i] = data.subarray(i * MAX_MESSAGE_SIZE, Math.min((i + 1) * MAX_MESSAGE_SIZE, data.length))
    }

    for (let i = 0; i < num; i++) {
      for (let i = 0; i < buffers.length; i++) {
        const message = Buffer.allocUnsafe(1 + buffers[i].length)
        message[0] = segments - 1 - i
        buffers[i].copy(message, 1)
        this.reliable?.send(message)
      }
    }

    return data.length
  }

  flushQueue() {
    for (let i = 0; i < this.sendQueue.length; i++) {
      this.sendNow(this.sendQueue[i])
    }
  }

  close() {
    this.reliable?.close()
    this.unreliable?.close()
    this.rtcConnection?.close()
  }
}

module.exports = { Connection }