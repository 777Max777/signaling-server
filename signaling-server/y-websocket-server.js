const WebSocket = require('ws')
const http = require('http')
const Y = require('yjs')
const syncProtocol = require('y-protocols/sync')
const awarenessProtocol = require('y-protocols/awareness')
const encoding = require('lib0/encoding')
const decoding = require('lib0/decoding')
const map = require('lib0/map')

const port = process.env.PORT || 1234
const host = process.env.HOST || '0.0.0.0'

const docs = new Map()

const messageSync = 0
const messageAwareness = 1

const getYDoc = (docname) => map.setIfUndefined(docs, docname, () => {
  const doc = new Y.Doc()
  doc.gc = true
  return doc
})

const server = http.createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' })
  response.end('Y-WebSocket Server')
})

const wss = new WebSocket.Server({ server })

wss.on('connection', (conn, req) => {
  const docName = req.url.slice(1).split('?')[0]
  const doc = getYDoc(docName)

  console.log(`[${new Date().toISOString()}] Client connected to doc: ${docName}`)

  conn.on('message', (message) => {
    const encoder = encoding.createEncoder()
    const decoder = decoding.createDecoder(new Uint8Array(message))
    const messageType = decoding.readVarUint(decoder)

    switch (messageType) {
      case messageSync:
        encoding.writeVarUint(encoder, messageSync)
        syncProtocol.readSyncMessage(decoder, encoder, doc, conn)
        if (encoding.length(encoder) > 1) {
          conn.send(encoding.toUint8Array(encoder))
        }
        break
      case messageAwareness:
        // Broadcast awareness to all other clients
        wss.clients.forEach(client => {
          if (client !== conn && client.readyState === WebSocket.OPEN) {
            client.send(message)
          }
        })
        break
    }
  })

  // Send sync step 1
  const encoder = encoding.createEncoder()
  encoding.writeVarUint(encoder, messageSync)
  syncProtocol.writeSyncStep1(encoder, doc)
  conn.send(encoding.toUint8Array(encoder))

  conn.on('close', () => {
    console.log(`[${new Date().toISOString()}] Client disconnected from doc: ${docName}`)
  })
})

server.listen(port, host, () => {
  console.log(`Y-WebSocket Server running on ws://${host}:${port}`)
})
