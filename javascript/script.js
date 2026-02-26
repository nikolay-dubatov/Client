let deviceIp = '192.168.0.83:5000';

// Обработчик для кнопки подключения
function setDeviceIp(newIp) {
    currentIp = newIp;
    document.getElementById('device-ip').value = newIp;
    updateVideoSource();

}

// Обновление источника видеопотока
function updateVideoSource() {
    const video = document.getElementById('video-stream');
    video.src = `http://${deviceIp}/stream`;
}

// Функция отправки команды
function sendCommand(command) {
    fetch(`http://${deviceIp}/${command}`)
        .then(response => response.json())
        .then(data => {
            const statusEl = document.getElementById('status');
            if (data.status === 'ok') {
                statusEl.className = 'status success';
                statusEl.textContent = `✓ ${data.message}`;
            } else {
                statusEl.className = 'status error';
                statusEl.textContent = `✗ Ошибка: ${data.message}`
            }
        })
        .catch(error => {
            document.getElementById('status').innerText = 
                `Ошибка: ${error.message}`;
        });
}
// Обработчик для кнопки подключения
document.getElementById('connect-btn').addEventListener('click', function() {
    const ipInput = document.getElementById('device-ip');
    const newIp = ipInput.value.trim();

    // Простая валидация IP-адреса
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}(:\d{1,5})?$/;
    if (!ipRegex.test(newIp)) {
        showStatus('Неверный формат IP-адреса', 'error');
        return;
    }
    setDeviceIp(newIp);
    showStatus(`Подключено к ${newIp}`, 'success');
});

// Функция отображения статуса
function showStatus(message, type) {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    updateVideoSource();
});
