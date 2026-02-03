// =============================================
// ai-event — APP LOGIC
// =============================================

(function () {
    'use strict';

    // DOM Elements
    const urlInput = document.getElementById('url-input');
    const pasteBtn = document.getElementById('paste-btn');
    const btnVideo = document.getElementById('btn-video');
    const btnAudio = document.getElementById('btn-audio');
    const videoInfo = document.getElementById('video-info');
    const videoTitle = document.getElementById('video-title');
    const videoDuration = document.getElementById('video-duration');
    const statusText = document.getElementById('status-text');
    const progressBar = document.getElementById('progress-bar');
    const progressFill = document.getElementById('progress-fill');
    const qualitySection = document.getElementById('quality-section');
    const videoQuality = document.getElementById('video-quality');
    const audioQuality = document.getElementById('audio-quality');

    // State
    let currentUrl = '';
    let isLoading = false;

    // Initialize
    function init() {
        pasteBtn.addEventListener('click', handlePaste);
        urlInput.addEventListener('input', handleInput);
        urlInput.addEventListener('keydown', handleKeyDown);
        btnVideo.addEventListener('click', () => download('video'));
        btnAudio.addEventListener('click', () => download('audio'));
    }

    // Paste from clipboard
    async function handlePaste() {
        try {
            const text = await navigator.clipboard.readText();
            urlInput.value = text;
            handleInput();
        } catch (err) {
            setStatus('ОШИБКА БУФЕРА', 'error');
        }
    }

    // Handle input change
    function handleInput() {
        const url = urlInput.value.trim();

        if (url && isValidYouTubeUrl(url)) {
            if (url !== currentUrl) {
                currentUrl = url;
                fetchVideoInfo(url);
            }
        } else {
            currentUrl = '';
            hideVideoInfo();
            hideQualitySection();
            disableButtons();
            if (url) {
                setStatus('НЕВЕРНАЯ ССЫЛКА', 'error');
            } else {
                setStatus('ГОТОВ');
            }
        }
    }

    // Handle Enter key
    function handleKeyDown(e) {
        if (e.key === 'Enter') {
            handleInput();
        }
    }

    // Validate YouTube URL
    function isValidYouTubeUrl(url) {
        const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]+/;
        return pattern.test(url);
    }

    // Fetch video info from API
    async function fetchVideoInfo(url) {
        if (isLoading) return;

        isLoading = true;
        setStatus('ЗАГРУЗКА...', 'loading');
        disableButtons();

        try {
            const response = await fetch('/api/info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Не удалось получить информацию');
            }

            showVideoInfo(data);
            showQualitySection();
            enableButtons();
            setStatus('ГОТОВ К ЗАГРУЗКЕ');
        } catch (err) {
            setStatus(err.message.toUpperCase(), 'error');
            hideVideoInfo();
            hideQualitySection();
        } finally {
            isLoading = false;
        }
    }

    // Show video info
    function showVideoInfo(data) {
        videoTitle.textContent = truncateText(data.title, 50);
        videoDuration.textContent = formatDuration(data.duration);
        videoInfo.classList.remove('hidden');
    }

    // Hide video info
    function hideVideoInfo() {
        videoInfo.classList.add('hidden');
    }

    // Show quality section
    function showQualitySection() {
        qualitySection.classList.remove('hidden');
    }

    // Hide quality section
    function hideQualitySection() {
        qualitySection.classList.add('hidden');
    }

    // Enable download buttons
    function enableButtons() {
        btnVideo.disabled = false;
        btnAudio.disabled = false;
    }

    // Disable download buttons
    function disableButtons() {
        btnVideo.disabled = true;
        btnAudio.disabled = true;
    }

    // Download video or audio
    async function download(format) {
        if (isLoading || !currentUrl) return;

        const quality = format === 'video'
            ? videoQuality.value
            : audioQuality.value;

        isLoading = true;
        const formatName = format === 'video' ? 'ВИДЕО' : 'АУДИО';
        setStatus(`СКАЧИВАНИЕ ${formatName}...`, 'loading');
        showProgress();
        disableButtons();

        // Simulate progress
        const progressInterval = simulateProgress();

        try {
            const response = await fetch('/api/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: currentUrl, format, quality })
            });

            clearInterval(progressInterval);

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Ошибка загрузки');
            }

            // Get blob and trigger download
            const blob = await response.blob();
            const ext = format === 'audio' ? 'mp3' : 'mp4';
            const filename = `download.${ext}`;

            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

            setProgress(100);
            setStatus('ЗАГРУЗКА ЗАВЕРШЕНА');

            // Reset after delay
            setTimeout(() => {
                hideProgress();
                enableButtons();
                setStatus('ГОТОВ');
            }, 2000);

        } catch (err) {
            clearInterval(progressInterval);
            setStatus(err.message.toUpperCase(), 'error');
            hideProgress();
            enableButtons();
        } finally {
            isLoading = false;
        }
    }

    // Set status text
    function setStatus(text, type = '') {
        statusText.textContent = text;
        statusText.className = 'status-text' + (type ? ` ${type}` : '');

        if (type === 'loading') {
            document.body.classList.add('loading');
        } else {
            document.body.classList.remove('loading');
        }
    }

    // Show progress bar
    function showProgress() {
        progressBar.classList.remove('hidden');
        setProgress(0);
    }

    // Hide progress bar
    function hideProgress() {
        progressBar.classList.add('hidden');
        setProgress(0);
    }

    // Set progress value
    function setProgress(percent) {
        progressFill.style.width = `${percent}%`;
    }

    // Simulate progress
    function simulateProgress() {
        let progress = 0;
        return setInterval(() => {
            if (progress < 90) {
                progress += Math.random() * 10;
                progress = Math.min(progress, 90);
                setProgress(progress);
            }
        }, 500);
    }

    // Format duration (seconds to MM:SS)
    function formatDuration(seconds) {
        if (!seconds) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // Truncate text with ellipsis
    function truncateText(text, maxLength) {
        if (!text) return '-';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    // Start app
    init();
})();
