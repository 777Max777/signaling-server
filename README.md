# Real-Time Collaborative Editor

Приложение для совместного редактирования текста и чата в реальном времени с использованием WebSocket и Yjs CRDT.

## ⚠️ Важно: Архитектура

Это **НЕ P2P** соединение. Используется **Client-Server** архитектура:

- ✅ Все данные проходят через центральный WebSocket сервер
- ✅ Сервер синхронизирует изменения между всеми клиентами
- ✅ Использует Yjs CRDT для автоматического разрешения конфликтов
- ❌ Данные НЕ передаются напрямую между клиентами (не P2P)

**Почему не P2P?**
- WebRTC P2P требует сложную настройку STUN/TURN серверов
- В локальной сети WebSocket проще и надежнее
- Для P2P нужны публичные TURN серверы (платные)

## Возможности

- ✅ Совместное редактирование текста в реальном времени
- ✅ Групповой чат
- ✅ Счетчик подключенных пользователей
- ✅ Автоматическое разрешение конфликтов (CRDT)
- ✅ Работает в локальной сети
- ✅ Docker контейнеры для сервера и клиента

## Быстрый старт

### Вариант 1: Все в Docker (рекомендуется)

```bash
docker-compose up -d --build
```

Откройте в браузере:
- **Клиент**: http://localhost:3000
- **Сервер**: ws://localhost:1234

### Вариант 2: Только сервер в Docker

**Сервер:**
```bash
cd signaling-server
docker-compose up -d --build
```

**Клиент (для разработки):**
```bash
npm install
npm run dev
```

Откройте: http://localhost:3000

## Использование в локальной сети

1. **На сервере** (устройство где запущен Docker):
   ```bash
   docker-compose up -d --build
   ```

2. **Узнайте IP сервера:**
   ```bash
   # Windows
   ipconfig
   
   # Linux/Mac
   ip addr
   ```
   Например: `192.168.1.78`

3. **На других устройствах** откройте в браузере:
   ```
   http://192.168.1.78:3000
   ```

4. **Все устройства должны быть в одной WiFi сети**

## Структура проекта

```
.
├── signaling-server/       # WebSocket сервер
│   ├── server.js           # Код сервера (Yjs WebSocket)
│   ├── Dockerfile          # Docker образ сервера
│   ├── docker-compose.yml  # Конфигурация Docker
│   ├── package.json        # Зависимости сервера
│   └── README.md           # Документация сервера
├── main.js                 # Клиентская логика
├── index.html              # Интерфейс
├── package.json            # Зависимости клиента
├── vite.config.js          # Конфигурация Vite
├── Dockerfile              # Docker образ клиента (Nginx)
├── nginx.conf              # Конфигурация Nginx
├── docker-compose.yml      # Общая конфигурация Docker
└── README.md               # Эта документация
```

## Технологии

**Сервер:**
- Node.js 20
- Yjs - CRDT библиотека
- y-protocols - протоколы синхронизации
- ws - WebSocket сервер

**Клиент:**
- Yjs - CRDT библиотека
- y-websocket - WebSocket провайдер
- Vite - сборщик
- Nginx - веб-сервер (в Docker)

## Команды

```bash
# Запуск всего проекта
docker-compose up -d

# Остановка
docker-compose down

# Логи
docker-compose logs -f

# Логи только сервера
docker-compose logs -f server

# Логи только клиента
docker-compose logs -f client

# Перезапуск
docker-compose restart

# Пересборка
docker-compose up -d --build
```

## Порты

- **1234** - WebSocket сервер
- **3000** - Веб-клиент (Nginx)

## Разработка

Для локальной разработки без Docker:

```bash
# Установка зависимостей
npm install

# Запуск dev сервера (Vite)
npm run dev

# Сборка для production
npm run build

# Предпросмотр production сборки
npm run preview
```

## Troubleshooting

### Устройства не видят друг друга

1. **Проверьте сеть**: все устройства должны быть в одной WiFi сети
2. **Отключите VPN** на всех устройствах
3. **Проверьте firewall**:
   ```bash
   # Windows
   netsh advfirewall firewall add rule name="Yjs Server" dir=in action=allow protocol=TCP localport=1234
   netsh advfirewall firewall add rule name="Yjs Client" dir=in action=allow protocol=TCP localport=3000
   
   # Linux
   sudo ufw allow 1234/tcp
   sudo ufw allow 3000/tcp
   ```

### Сообщения не синхронизируются

1. Проверьте статус подключения (должно быть "Connected")
2. Проверьте логи сервера: `docker-compose logs -f server`
3. Убедитесь, что используете одинаковое имя комнаты
4. Откройте консоль браузера (F12) и проверьте ошибки

### Docker контейнер не запускается

```bash
# Остановите все контейнеры
docker-compose down

# Удалите старые образы
docker-compose rm -f

# Пересоберите
docker-compose up -d --build
```

## Как это работает

1. **Клиент** подключается к WebSocket серверу
2. **Yjs** создает CRDT документ на клиенте
3. При изменении данных клиент отправляет **sync сообщения** на сервер
4. **Сервер** транслирует изменения всем другим клиентам в той же комнате
5. **CRDT** автоматически разрешает конфликты при одновременном редактировании

## Безопасность

⚠️ **Это демо-проект для локальной сети**

Для production добавьте:
- SSL/TLS (WSS вместо WS)
- Аутентификацию пользователей
- Авторизацию комнат
- Rate limiting
- Валидацию данных

## Лицензия

MIT
