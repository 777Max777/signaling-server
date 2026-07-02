# Sync Server (Yjs / y-websocket)

Собственный сервер синхронизации для Yjs на базе `y-websocket`. Именно к нему подключается
клиент (`../main.js`) по адресу `ws://localhost:1234`. Сервер принимает WebSocket-соединения,
хранит документ для каждой комнаты, ретранслирует sync/awareness-сообщения между участниками
и рассылает служебное сообщение с числом подключённых пиров.

## Быстрый старт

### Запуск через Docker Compose

```bash
docker-compose up -d
```

### Запуск через Docker

```bash
# Сборка образа
docker build -t sync-server .

# Запуск контейнера
docker run -d -p 1234:1234 --name sync-server sync-server
```

### Локальный запуск (для разработки)

```bash
npm install
npm start
```

После запуска сервер слушает `ws://0.0.0.0:1234`, а по HTTP на том же порту отдаёт
короткий health-ответ `Y-WebSocket Server`.

## Конфигурация

Переменные окружения:

- `PORT` — порт сервера (по умолчанию: `1234`)
- `HOST` — хост для прослушивания (по умолчанию: `0.0.0.0`)
- `NODE_ENV` — окружение (`production` / `development`)

## Использование в клиенте

Клиент уже настроен на этот сервер в `../main.js`:

```javascript
import { WebsocketProvider } from 'y-websocket'

provider = new WebsocketProvider('ws://localhost:1234', roomName, ydoc)
```

Чтобы указать другой адрес сервера, поменяйте первый аргумент `WebsocketProvider`
(например, `wss://your-domain.com`).

## Развертывание на сервере

### С Nginx (рекомендуется для production)

Конфигурация Nginx для проксирования WebSocket:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:1234;
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

После этого используйте в клиенте `wss://your-domain.com` вместо `ws://localhost:1234`.

## Мониторинг

```bash
# Просмотр логов
docker-compose logs -f sync-server

# Проверка статуса
docker-compose ps

# Остановка сервера
docker-compose down
```

## Безопасность

Рекомендации для production:

1. Используйте WSS (WebSocket Secure) вместо WS.
2. Настройте firewall для ограничения доступа.
3. Добавьте rate limiting (например, на уровне Nginx).
4. Добавьте аутентификацию (токен в query-параметре / заголовке).
5. Регулярно обновляйте зависимости.
