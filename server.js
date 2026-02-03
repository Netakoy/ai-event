const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;

// Temp directory for downloads
const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Validate YouTube URL
function isValidYouTubeUrl(url) {
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]+/;
    return pattern.test(url);
}

// Get video info
app.post('/api/info', async (req, res) => {
    const { url } = req.body;

    if (!url || !isValidYouTubeUrl(url)) {
        return res.status(400).json({ error: 'Неверная ссылка YouTube' });
    }

    const args = [
        '--dump-json',
        '--no-playlist',
        // Попытка обойти блокировку ботов
        '--extractor-args', 'youtube:player_client=android',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        url
    ];

    const ytdlp = spawn('yt-dlp', args);
    let stdout = '';
    let stderr = '';

    ytdlp.stdout.on('data', (data) => {
        stdout += data.toString();
    });

    ytdlp.stderr.on('data', (data) => {
        stderr += data.toString();
    });

    ytdlp.on('close', (code) => {
        if (code !== 0) {
            console.error('yt-dlp error:', stderr);
            // Возвращаем реальную ошибку клиенту для отладки
            return res.status(500).json({ error: stderr || 'Не удалось получить информацию (Server Error)' });
        }

        try {
            const info = JSON.parse(stdout);
            res.json({
                title: info.title,
                duration: info.duration,
                thumbnail: info.thumbnail,
                uploader: info.uploader
            });
        } catch (e) {
            res.status(500).json({ error: 'Ошибка парсинга данных (Invalid JSON)' });
        }
    });
});

// Download video or audio
app.post('/api/download', async (req, res) => {
    const { url, format, quality } = req.body;

    if (!url || !isValidYouTubeUrl(url)) {
        return res.status(400).json({ error: 'Неверная ссылка YouTube' });
    }

    if (!['video', 'audio'].includes(format)) {
        return res.status(400).json({ error: 'Неверный формат' });
    }

    const fileId = uuidv4();
    const ext = format === 'audio' ? 'mp3' : 'mp4';
    const outputPath = path.join(TEMP_DIR, `${fileId}.${ext}`);

    let args = [
        '--no-playlist',
        '--extractor-args', 'youtube:player_client=android',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];

    if (format === 'audio') {
        // Audio quality
        const audioQuality = quality === '0' ? '0' : quality;
        args.push(
            '-x',
            '--audio-format', 'mp3',
            '--audio-quality', audioQuality,
            '-o', outputPath,
            url
        );
    } else {
        // Video quality
        let formatSpec;
        if (quality === 'best') {
            formatSpec = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';
        } else {
            formatSpec = `bestvideo[height<=${quality}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${quality}][ext=mp4]/best`;
        }
        args.push(
            '-f', formatSpec,
            '--merge-output-format', 'mp4',
            '-o', outputPath,
            url
        );
    }

    const ytdlp = spawn('yt-dlp', args);
    let stderr = '';

    ytdlp.stderr.on('data', (data) => {
        stderr += data.toString();
    });

    ytdlp.on('close', (code) => {
        if (code !== 0) {
            console.error('yt-dlp error:', stderr);
            if (fs.existsSync(outputPath)) {
                fs.unlinkSync(outputPath);
            }
            return res.status(500).json({ error: stderr || 'Ошибка загрузки (Server Error)' });
        }

        if (!fs.existsSync(outputPath)) {
            return res.status(500).json({ error: 'Файл не создан' });
        }

        const downloadName = `download.${ext}`;

        res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
        res.setHeader('Content-Type', format === 'audio' ? 'audio/mpeg' : 'video/mp4');

        const fileStream = fs.createReadStream(outputPath);
        fileStream.pipe(res);

        fileStream.on('end', () => {
            fs.unlink(outputPath, (err) => {
                if (err) console.error('Failed to delete temp file:', err);
            });
        });

        fileStream.on('error', (err) => {
            console.error('Stream error:', err);
            fs.unlink(outputPath, () => { });
            if (!res.headersSent) {
                res.status(500).json({ error: 'Ошибка потока' });
            }
        });
    });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
