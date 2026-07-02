import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

let ydoc = null
let provider = null
let currentRoom = null

// Generate random user color
const userColor = '#' + Math.floor(Math.random()*16777215).toString(16)
const userName = 'User-' + Math.random().toString(36).substr(2, 5)

function initEditor(roomName) {
  console.log('=== Initializing editor for room:', roomName)

  // Don't reinitialize if already in the same room
  if (currentRoom === roomName && provider) {
    console.log('Already in room:', roomName)
    return
  }

  // Clean up previous instance
  if (provider) {
    console.log('Destroying previous provider')
    provider.destroy()
  }
  if (ydoc) {
    console.log('Destroying previous ydoc')
    ydoc.destroy()
  }

  currentRoom = roomName

  // Create Yjs document
  ydoc = new Y.Doc()
  const ytext = ydoc.getText('editor')
  const chatArray = ydoc.getArray('chat')

  console.log('Yjs document created')

  // Connect to the y-websocket sync server (see sync-server/).
  // Derive host from the page location so it works both on localhost and over LAN/Docker.
  const wsProtocol = location.protocol === 'https:' ? 'wss' : 'ws'
  const syncUrl = `${wsProtocol}://${location.hostname}:1234`
  provider = new WebsocketProvider(syncUrl, roomName, ydoc)

  // Listen for custom peer count messages
  provider.ws.addEventListener('message', (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.type === 'peer-count') {
        document.getElementById('peers').textContent = `Peers: ${data.count - 1}`
        console.log('Peer count updated:', data.count - 1)
      }
    } catch (e) {
      // Not a JSON message, ignore
    }
  })

  console.log('WebSocket provider created')

  // Log all provider events
  console.log('Available provider events:', Object.keys(provider))

  // Update connection status
  provider.on('status', event => {
    const statusEl = document.getElementById('status')
    console.log('Status event:', event)
    if (event.status === 'connected') {
      statusEl.textContent = 'Connected'
      statusEl.className = 'connected'
      console.log('Connected to WebSocket server')
    } else {
      statusEl.textContent = 'Disconnected'
      statusEl.className = 'disconnected'
      console.log('Disconnected from WebSocket server')
    }
  })

  // WebsocketProvider peer count will be updated via custom messages
  document.getElementById('peers').textContent = 'Peers: 0'

  // Update on sync
  provider.on('sync', (isSynced) => {
    console.log('Provider synced:', isSynced)
  })

  // Setup simple textarea editor
  const editorTextarea = document.getElementById('editor-textarea')
  let isLocalChange = false

  // Update textarea when ytext changes
  ytext.observe(() => {
    if (!isLocalChange) {
      const newText = ytext.toString()
      if (editorTextarea.value !== newText) {
        const cursorPos = editorTextarea.selectionStart
        editorTextarea.value = newText
        editorTextarea.setSelectionRange(cursorPos, cursorPos)
        console.log('Editor updated from remote')
      }
    }
  })

  // Update ytext when textarea changes
  editorTextarea.addEventListener('input', () => {
    isLocalChange = true
    const currentText = ytext.toString()
    const newText = editorTextarea.value

    if (newText !== currentText) {
      ydoc.transact(() => {
        ytext.delete(0, currentText.length)
        ytext.insert(0, newText)
      })
      console.log('Editor updated locally')
    }
    isLocalChange = false
  })

  // Set initial value
  editorTextarea.value = ytext.toString()

  // Setup chat
  chatArray.observe(event => {
    console.log('Chat array changed:', {
      changes: event.changes,
      transaction: event.transaction.origin,
      arrayLength: chatArray.length
    })
    renderChat(chatArray)
  })

  console.log('Initial chat array length:', chatArray.length)

  // Log when document updates
  ydoc.on('update', (update, origin) => {
    console.log('Yjs document updated:', {
      updateSize: update.length,
      origin: origin,
      chatLength: chatArray.length,
      textLength: ytext.length
    })
  })

  // Chat input handler
  const chatInput = document.getElementById('chat-input')
  const sendBtn = document.getElementById('send-btn')

  // Remove old listeners by cloning
  const newChatInput = chatInput.cloneNode(true)
  chatInput.parentNode.replaceChild(newChatInput, chatInput)

  const newSendBtn = sendBtn.cloneNode(true)
  sendBtn.parentNode.replaceChild(newSendBtn, sendBtn)

  const sendMessage = () => {
    const text = newChatInput.value.trim()
    if (text) {
      console.log('Sending message:', text)
      const message = {
        author: userName,
        text: text,
        time: Date.now()
      }
      chatArray.push([message])
      console.log('Chat array length:', chatArray.length)
      newChatInput.value = ''
    }
  }

  newChatInput.addEventListener('keypress', (e) => {
    console.log('Key pressed:', e.key)
    if (e.key === 'Enter') {
      e.preventDefault()
      console.log('Enter pressed, sending message')
      sendMessage()
    }
  })

  newSendBtn.addEventListener('click', () => {
    console.log('Send button clicked')
    sendMessage()
  })

  console.log('Chat handlers attached')

  renderChat(chatArray)
}

function renderChat(chatArray) {
  const chatMessages = document.getElementById('chat-messages')
  chatMessages.innerHTML = ''

  console.log('Rendering chat, messages:', chatArray.length)

  chatArray.forEach((msg, index) => {
    console.log('Message', index, msg)
    const msgEl = document.createElement('div')
    msgEl.className = 'message'
    msgEl.innerHTML = `
      <div class="author">${msg.author}</div>
      <div class="text">${msg.text}</div>
    `
    chatMessages.appendChild(msgEl)
  })

  chatMessages.scrollTop = chatMessages.scrollHeight
}

// Join room button
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, setting up handlers')

  document.getElementById('join-btn').onclick = () => {
    const roomName = document.getElementById('room-input').value.trim() || 'default-room'
    initEditor(roomName)
  }

  // Auto-join default room on load
  initEditor('default-room')
})
