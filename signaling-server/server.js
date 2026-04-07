#!/usr/bin/env node

/**
 * WebSocket signaling server for y-webrtc
 * Based on y-websocket signaling implementation
 */

const WebSocket = require('ws')
const http = require('http')
const url = require('url')

const port = process.env.PORT || 4444
const host = process.env.HOST || '0.0.0.0'

const server = http.createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' })
  response.end('WebRTC Signaling Server')
})

const wss = new WebSocket.Server({ server })

// Store rooms and their connections
const rooms = new Map()

function getRoom(roomName) {
  if (!rooms.has(roomName)) {
    rooms.set(roomName, new Set())
  }
  return rooms.get(roomName)
}

wss.on('connection', (ws, request) => {
  const params = url.parse(request.url, true).query
  const roomName = params.room || 'default'

  const room = getRoom(roomName)
  room.add(ws)

  console.log(`[${new Date().toISOString()}] Client connected to room: ${roomName} (${room.size} peers)`)

  // Send current peer count
  ws.send(JSON.stringify({
    type: 'peers',
    count: room.size - 1
  }))

  ws.on('message', (message) => {
    // Broadcast message to all other peers in the room
    room.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message)
      }
    })
  })

  ws.on('close', () => {
    room.delete(ws)
    console.log(`[${new Date().toISOString()}] Client disconnected from room: ${roomName} (${room.size} peers)`)

    // Clean up empty rooms
    if (room.size === 0) {
      rooms.delete(roomName)
    }

    // Notify remaining peers
    room.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'peers',
          count: room.size - 1
        }))
      }
    })
  })

  ws.on('error', (error) => {
    console.error(`[${new Date().toISOString()}] WebSocket error:`, error)
  })
})

server.listen(port, host, () => {
  console.log(`WebRTC Signaling Server running on ws://${host}:${port}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})
