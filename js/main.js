let telemetryInterval = null;
let joystickTimeout = null;
let isJoystickActive = false;
let joystickCenter = {x: 0, y: 0};
let device = null;
try {
    device = JSON.parse(localStorage.getItem('selectedDevice'));
    if (!device) {
        alert('Устройство не выбрано');
        window.location.href = 'index.html';
    }
} catch (error) {
    alert('Устройство не выбрано');
    window.location.href = 'index.html';
}
let isConnected = false;
let lastTelemetryData = null;
document.addEventListener('DOMContentLoaded', () => {
    initSystem();
    startStream();
    startTelemetry();
});
function initSystem() {
    setupEventListener();
    updateDeviceStatus();
    const videoElement = document.getElementById('video-feed');
    videoElement.src = '';
    videoElement.textContent = 'Ожидание видеопотока...';
    updateDeviceStatus('warning', 'Ожидание видеопотока...')
}
function setupEventListener() {
    document.querySelectorAll('.cam-btn').forEach(button => {
        button.addEventListener('mousedown', handleCameraControl);
        button.addEventListener('touchstart', handleCameraControl);
        button.addEventListener('mouseup', stopCameraControl);
        button.addEventListener('touchend', stopCameraControl);
    });
    // const joystick = document.getElementById('joystick-camera');
    // if (joystick) {
    //     joystick.addEventListener('mousedown', startJoystickControl);
    //     joystick.addEventListener('touchstart', startJoystickControl);
    //     joystick.addEventListener('mousemove', updateJoystickPosition);
    //     joystick.addEventListener('touchmove', updateJoystickPosition);
    //     joystick.addEventListener('mouseup', stopJoystickControl);
    //     joystick.addEventListener('touchend', stopJoystickControl);
    // }
    document.getElementById('stopTelemetryBtn').addEventListener('click', stopTelemetry);
}
function disconnect() {
    stopTelemetry();
    window.location.href = 'index.html';
}
async function startStream() {
    const videoElement = document.getElementById('video-feed');
    try {
        const url = `${device.address}/stream`;
        videoElement.src = url;
        videoElement.onload = () => {
            isConnected = true;
            updateDeviceStatus('success', 'Видеопоток активен');
            console.log('Stream active');
        };
        console.log(isConnected);
        
        videoElement.onerror = () => {
            updateDeviceStatus('error', 'Ошибка видеопотока');
        };
    } catch (error) {
        console.error('Ошибка подключения видео:', error);
        updateDeviceStatus('error', 'Не удалось подключиться к видео');
    }
}
function startTelemetry() {
    clearInterval(telemetryInterval);

    const startBtn = document.getElementById('stopTelemetryBtn');
    startBtn.removeEventListener('click', startTelemetry);
    startBtn.addEventListener('click', stopTelemetry);
    startBtn.textContent = 'Остановить телеметрию';

    telemetryInterval = setInterval(async () => {
        try {
            const response = await fetch(`${device.address}/telemetry`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const telemetryData = await response.json();
            lastTelemetryData = telemetryData;
            updateTelemetryOverlay(telemetryData);
        } catch (error) {
            console.error('Ошибка получения телеметрии:', error);
            if (lastTelemetryData) {
                updateTelemetryOverlay(lastTelemetryData);
            }
            const lastUpdate = lastTelemetryData
                ? ` (последние данные: ${new Date().toLocaleTimeString()})`
                : '';
            updateDeviceStatus('warning', `Проблемы с телеметрией${lastUpdate}`);
        }
    }, 1000);
}
function updateTelemetryOverlay(data) {
    document.getElementById('battery-value').textContent = data.data.battery ? `${data.data.battery}%` : '—';
    document.getElementById('obstacle-value').textContent = data.data.obstacle_distance ? `${data.data.obstacle_distance} см` : '— см';

    const now = new Date();
    document.getElementById('timestamp-value').textContent = data.timestamp;
    updateBatteryColor(data.data.battery);
}
function updateBatteryColor(level) {
    const batteryEl = document.getElementById('battery-value');
    batteryEl.classList.remove('warning');
    if (level <= 20) {
        batteryEl.classList.add('warning');
    }
}
function updateObstacleColor(distance) {
    const obstacleEl = document.getElementById('obstacle-value');
    obstacleEl.classList.remove('warning');
    if (distance <= 10) {
        obstacleEl.classList.add('warning');
    }
}
function stopTelemetry() {
    if (telemetryInterval) {
        clearInterval(telemetryInterval);
        telemetryInterval = null;
    }
    const stopButton = document.getElementById('stopTelemetryBtn');
    stopButton.removeEventListener('click', stopTelemetry);
    stopButton.addEventListener('click', startTelemetry);
    stopButton.textContent = 'Запустить телеметрию';
}
function updateDeviceStatus(statusType = 'warning', message = 'Подключение...') {
    const statusElement = document.getElementById('status-label');
    if (!statusElement) return;
    statusElement.textContent = message;
    statusElement.className = 'status-label';
    if (statusType) {
        statusElement.classList.add(statusType);
    }
}
async function handleCameraControl(event) {
    const direction = event.target.dataset.direction;
    try {
        const response = await fetch(`${device.address}/${direction}`, {
            method: 'GET', 
        });
        const result = await response.json();
        if (result.status === 'ok') {
            event.target.style.opacity = '0.7';
            updateDeviceStatus('success', result.message);
        } else {
            updateDeviceStatus('error', result.message);
        }
    } catch (error) {
        console.error('Ошибка отправки команды управления:', error);
        updateDeviceStatus('error', 'Ошибка управления камерой');
    }
}
async function stopCameraControl() {
    
    try {
        const response = await fetch(`${device.address}/cam-stop`, {
            method: 'GET'
        });
        const result = await response.json();
        document.querySelectorAll('.cam-btn').forEach(btn => {
            btn.style.opacity = '1';
        });
        if (result.status === 'ok') {
            updateDeviceStatus('success', result.message);
        }
    } catch (error) {
        console.error('Ошибка отправки команды:', error);
        updateDeviceStatus('error', result.message);    
    }
}
async function sendCarCommand(event) {
    
}