# YouTube Downloader — 8-bit Web App

Минималистичное веб-приложение для скачивания видео/аудио с YouTube в ретро 8-bit стиле.

## Структура проекта

```
youtube-downloader/
├── server.js          # Express сервер с API
├── package.json       # Конфигурация проекта
└── public/
    ├── index.html     # Главная страница
    ├── styles.css     # 8-bit стили
    └── app.js         # Клиентская логика
```

## Требования

### Обязательно

1. **Node.js** (v18+)
   ```bash
   # macOS с Homebrew
   brew install node
   
   # Или через nvm
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 20
   ```

2. **yt-dlp**
   ```bash
   # macOS
   brew install yt-dlp
   
   # Или через pip
   pip install yt-dlp
   ```

3. **ffmpeg** (для конвертации аудио)
   ```bash
   brew install ffmpeg
   ```

## Запуск

```bash
# Перейти в папку проекта
cd youtube-downloader

# Установить зависимости
npm install

# Запустить сервер
npm start
```

Приложение будет доступно: **http://localhost:3000**

## Использование

1. Откройте http://localhost:3000
2. Вставьте ссылку на YouTube видео (кнопка PASTE или Ctrl+V)
3. Дождитесь загрузки информации о видео
4. Нажмите **VIDEO** для скачивания видео (MP4)
5. Нажмите **AUDIO** для скачивания аудио (MP3)

## API

| Endpoint | Method | Body | Описание |
|----------|--------|------|----------|
| `/api/info` | POST | `{ url }` | Получить информацию о видео |
| `/api/download` | POST | `{ url, format }` | Скачать видео/аудио |
| `/api/health` | GET | - | Проверка статуса сервера |

**format**: `"video"` или `"audio"`

## Дизайн

- **Стиль**: 8-bit / ретро-терминал
- **Шрифт**: Press Start 2P
- **Палитра**: чёрный, белый, зелёный (#00ff00), красный
- Без градиентов, теней и сложных эффектов
