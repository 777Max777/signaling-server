import * as Y from 'yjs'
import { WebrtcProvider } from 'y-webrtc'
import { EditorView, basicSetup } from '@codemirror/basic-setup'
import { EditorState } from '@codemirror/state'
import { yCollab } from 'y-codemirror.next'

let ydoc = null
let provider = null
let editorView = null

// Generate random user color
const userColor = '#' + Math.floor(Math.random()*16777215).toString(16)
const userName = 'User-' + Math.random().toString(36).substr(2, 5)

function initEditor(roomName) {
  // Clean up previous instance
  if (provider) {
    provider.destroy()
  }
  if (editorView) {
    editorView.destroy()
  }

  // Create Yjs document
  ydoc = new Y.Doc()
  const ytext = ydoc.getText('codemirror')
  const chatArray = ydoc.getArray('chat')

  // Setup WebRTC provider
  provider = new WebrtcProvider(roomName, ydoc, {
    signaling: ['wss://localhost:4444'],
    password: null,
    awareness: {
      name: userName,
      color: userColor
    }
  })

  // Update connection status
  provider.on('status', event => {
    const statusEl = document.getElementById('status')
    if (event.connected) {
      statusEl.textContent = 'Connected'
      statusEl.className = 'connected'
    } else {
      statusEl.textContent = 'Disconnected'
      statusEl.className = 'disconnected'
    }
  })

  // Update peer count
  provider.on('peers', event => {
    document.getElementById('peers').textContent = `Peers: ${event.webrtcPeers.length}`
  })

  // Setup CodeMirror editor
  const state = EditorState.create({
    doc: ytext.toString(),
    extensions: [
      basicSetup,
      yCollab(ytext, provider.awareness)
    ]
  })

  editorView = new EditorView({
    state,
    parent: document.getElementById('editor')
  })

  // Setup chat
  chatArray.observe(event => {
    renderChat(chatArray)
  })

  // Chat input handler
  const chatInput = document.getElementById('chat-input')
  const sendMessage = () => {
    const text = chatInput.value.trim()
    if (text) {
      chatArray.push([{
        author: userName,
        text: text,
        time: Date.now()
      }])
      chatInput.value = ''
    }
  }

  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      sendMessage()
    }
  })

  renderChat(chatArray)
}

function renderChat(chatArray) {
  const chatMessages = document.getElementById('chat-messages')
  chatMessages.innerHTML = ''

  chatArray.forEach(msg => {
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
document.getElementById('join-btn').onclick = () => {
  const roomName = document.getElementById('room-input').value.trim() || 'default-room'
  initEditor(roomName)
}

// Auto-join default room on load
initEditor('default-room')
