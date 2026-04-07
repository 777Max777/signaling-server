# Y-WebRTC Signaling Server

Собственный signaling сервер для y-webrtc, развернутый через Docker.

## Быстрый старт

### Запуск через Docker Compose

```bash
docker-compose up -d
```

### Запуск через Docker

```bash
# Сборка образа
docker build -t y-webrtc-signaling .

# Запуск контейнера
docker run -d -p 4444:4444 --name signaling-server y-webrtc-signaling
```

### Локальный запуск (для разработки)

```bash
npm install
npm start
```

## Конфигурация

Переменные окружения:

- `PORT` - порт сервера (по умолчанию: 4444)
- `HOST` - хост для прослушивания (по умолчанию: 0.0.0.0)
- `NODE_ENV` - окружение (production/development)

## Использование в клиенте

После развертывания сервера, обновите конфигурацию в `main.js`:

```javascript
provider = new WebrtcProvider(roomName, ydoc, {
  signaling: ['ws://your-server.com:4444'], // Замените на адрес вашего сервера
  password: null,
  awareness: {
    name: userName,
    color: userColor
  }
})
```

## Развертывание на сервере

### С Nginx (рекомендуется для production)

Создайте конфигурацию Nginx для проксирования WebSocket:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:4444;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### С SSL (Let's Encrypt)

```bash
# Установите certbot
sudo apt install certbot python3-certbot-nginx

# Получите сертификат
sudo certbot --nginx -d your-domain.com
```

Обновите клиент для использования WSS:

```javascript
signaling: ['wss://your-domain.com']
```

## Мониторинг

### Просмотр логов

```bash
docker-compose logs -f signaling-server
```

### Проверка статуса

```bash
docker-compose ps
```

### Остановка сервера

```bash
docker-compose down
```

## Масштабирование

Для горизонтального масштабирования можно использовать несколько инстансов:

```javascript
provider = new WebrtcProvider(roomName, ydoc, {
  signaling: [
    'wss://signaling1.your-domain.com',
    'wss://signaling2.your-domain.com',
    'wss://signaling3.your-domain.com'
  ]
})
```

## Безопасность

Рекомендации для production:

1. Используйте WSS (WebSocket Secure) вместо WS
2. Настройте firewall для ограничения доступа
3. Добавьте rate limiting
4. Используйте аутентификацию (можно добавить токены)
5. Регулярно обновляйте зависимости

## Альтернативные решения

- **y-websocket** - официальный WebSocket провайдер от Yjs (более функциональный)
- **simple-peer-server** - для использования с simple-peer
- **PeerJS Server** - для использования с PeerJS
