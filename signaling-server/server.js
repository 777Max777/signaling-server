const WebSocket = require('ws')
const http = require('http')
const Y = require('yjs')
const syncProtocol = require('y-protocols/sync')
const encoding = require('lib0/encoding')
const decoding = require('lib0/decoding')
const map = require('lib0/map')

const port = process.env.PORT || 1234
const host = process.env.HOST || '0.0.0.0'

const docs = new Map()
const docConnections = new Map()

const messageSync = 0
const messageAwareness = 1

const getYDoc = (docname) => map.setIfUndefined(docs, docname, () => {
  const doc = new Y.Doc()
  doc.gc = true
  docConnections.set(docname, new Set())
  return doc
})

const server = http.createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' })
  response.end('Y-WebSocket Server')
})

const wss = new WebSocket.Server({ server })

const broadcastPeerCount = (docName) => {
  const connections = docConnections.get(docName)
  if (!connections) return

  const peerCount = connections.size
  const message = JSON.stringify({ type: 'peer-count', count: peerCount })

  connections.forEach(conn => {
    if (conn.readyState === WebSocket.OPEN) {
      conn.send(message)
    }
  })
}

wss.on('connection', (conn, req) => {
  const docName = req.url.slice(1).split('?')[0]
  const doc = getYDoc(docName)
  const connections = docConnections.get(docName)

  connections.add(conn)
  console.log(`[${new Date().toISOString()}] Client connected to doc: ${docName} (${connections.size} peers)`)

  broadcastPeerCount(docName)

  conn.on('message', (message) => {
    if (typeof message === 'string') return

    const uint8Message = new Uint8Array(message)
    const encoder = encoding.createEncoder()
    const decoder = decoding.createDecoder(uint8Message)
    const messageType = decoding.readVarUint(decoder)

    switch (messageType) {
      case messageSync:
        encoding.writeVarUint(encoder, messageSync)
        syncProtocol.readSyncMessage(decoder, encoder, doc, conn)

        if (encoding.length(encoder) > 1) {
          conn.send(encoding.toUint8Array(encoder))
        }

        connections.forEach(client => {
          if (client !== conn && client.readyState === WebSocket.OPEN) {
            client.send(uint8Message)
          }
        })
        break
      case messageAwareness:
        connections.forEach(client => {
          if (client !== conn && client.readyState === WebSocket.OPEN) {
            client.send(uint8Message)
          }
        })
        break
    }
  })

  const encoder = encoding.createEncoder()
  encoding.writeVarUint(encoder, messageSync)
  syncProtocol.writeSyncStep1(encoder, doc)
  conn.send(encoding.toUint8Array(encoder))

  conn.on('close', () => {
    connections.delete(conn)
    console.log(`[${new Date().toISOString()}] Client disconnected from doc: ${docName} (${connections.size} peers)`)

    broadcastPeerCount(docName)

    if (connections.size === 0) {
      docs.delete(docName)
      docConnections.delete(docName)
    }
  })
})

server.listen(port, host, () => {
  console.log(`Y-WebSocket Server running on ws://${host}:${port}`)
})


