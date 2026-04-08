import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

let ydoc = null
let provider = null
let currentRoom = null

const userName = 'User-' + Math.random().toString(36).substr(2, 5)

function initEditor(roomName) {
  if (currentRoom === roomName && provider) {
    return
  }

  if (provider) {
    provider.destroy()
  }
  if (ydoc) {
    ydoc.destroy()
  }

  currentRoom = roomName

  ydoc = new Y.Doc()
  const ytext = ydoc.getText('editor')
  const chatArray = ydoc.getArray('chat')

  const serverUrl = window.location.hostname === 'localhost'
    ? 'ws://localhost:1234'
    : `ws://${window.location.hostname}:1234`

  provider = new WebsocketProvider(serverUrl, roomName, ydoc)

  provider.ws.addEventListener('message', (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.type === 'peer-count') {
        document.getElementById('peers').textContent = `Peers: ${data.count - 1}`
      }
    } catch (e) {}
  })

  provider.on('status', event => {
    const statusEl = document.getElementById('status')
    if (event.status === 'connected') {
      statusEl.textContent = 'Connected'
      statusEl.className = 'connected'
    } else {
      statusEl.textContent = 'Disconnected'
      statusEl.className = 'disconnected'
    }
  })

  document.getElementById('peers').textContent = 'Peers: 0'

  const editorTextarea = document.getElementById('editor-textarea')
  let isLocalChange = false

  ytext.observe(() => {
    if (!isLocalChange) {
      const newText = ytext.toString()
      if (editorTextarea.value !== newText) {
        const cursorPos = editorTextarea.selectionStart
        editorTextarea.value = newText
        editorTextarea.setSelectionRange(cursorPos, cursorPos)
      }
    }
  })

  editorTextarea.addEventListener('input', () => {
    isLocalChange = true
    const currentText = ytext.toString()
    const newText = editorTextarea.value

    if (newText !== currentText) {
      ydoc.transact(() => {
        ytext.delete(0, currentText.length)
        ytext.insert(0, newText)
      })
    }
    isLocalChange = false
  })

  editorTextarea.value = ytext.toString()

  chatArray.observe(() => {
    renderChat(chatArray)
  })

  const chatInput = document.getElementById('chat-input')
  const sendBtn = document.getElementById('send-btn')

  const newChatInput = chatInput.cloneNode(true)
  chatInput.parentNode.replaceChild(newChatInput, chatInput)

  const newSendBtn = sendBtn.cloneNode(true)
  sendBtn.parentNode.replaceChild(newSendBtn, sendBtn)

  const sendMessage = () => {
    const text = newChatInput.value.trim()
    if (text) {
      const message = {
        author: userName,
        text: text,
        time: Date.now()
      }
      chatArray.push([message])
      newChatInput.value = ''
    }
  }

  newChatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      sendMessage()
    }
  })

  newSendBtn.addEventListener('click', sendMessage)

  renderChat(chatArray)
}

function renderChat(chatArray) {
  const chatMessages = document.getElementById('chat-messages')
  chatMessages.innerHTML = ''

  chatArray.forEach((msg) => {
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

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('join-btn').onclick = () => {
    const roomName = document.getElementById('room-input').value.trim() || 'default-room'
    initEditor(roomName)
  }

  initEditor('default-room')
})
