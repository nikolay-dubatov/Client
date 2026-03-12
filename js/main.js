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
}
function setupEventListener() {
    document.querySelectorAll('.dir-btn').forEach(button => {
        button.addEventListener('mousedown', handleCameraControl);
        button.addEventListener('touchstart', handleCameraControl);
        button.addEventListener('mouseup', stopCameraControl);
        button.addEventListener('touchend', stopCameraControl);
    });
    const joystick = document.getElementById('joystick-camera');
    if (joystick) {
        joystick.addEventListener('mousedown', startJoystickControl);
        joystick.addEventListener('touchstart', startJoystickControl);
        document.addEventListener('mousemove', updateJoystickPosition);
        document.addEventListener('touchmove', updateJoystickPosition);
        document.addEventListener('mouseup', stopJoystickControl);
        document.addEventListener('touchend', stopJoystickControl);
    }
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
        videoElement.onloadedmetadata = () => {
            isConnected = true;
            updateDeviceStatus('success', 'Видеопоток активен');
        };
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
    document.getElementById('timestamp-value').textContent = 
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    updateBatteryColor(data.battery);
}
function updateBatteryColor(level) {
    const batteryEl = document.getElementById('battery-value');
    if (level !== null && level <= 20) {
        batteryEl.style.color = '#e74c3c';
        batteryEl.style.fontWeight = 'bold';
    } else if (level !== null) {
        batteryEl.style.color = '#2ecc71';
        batteryEl.style.fontWeight = 'normal';
    }
}
function stopTelemetry() {
    if (telemetryInterval) {
        clearInterval(telemetryInterval);
        telemetryInterval = null;
    }
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
            updateDeviceStatus('succes', result.message);
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
        document.querySelectorAll('.dir-btn').forEach(btn => {
            btn.style.opacity = '1';
        });
        if (result.status === 'ok') {
            updateDeviceStatus('succes', result.message);
        }
    } catch (error) {
        console.error('Ошибка отправки команды:', error);
        updateDeviceStatus('error', result.message);    
    }
}
function startJoystickControl(event) {
    event.preventDefault();
    isJoystickActive = true;
    const joystick = document.getElementById('joystick-camera');
    const rect = joystick.getBoundingClientRect();
    joystickCenter = {
        x: rect.left + rect.width / 2, 
        y: rect.top + rect.height / 2
    };
    const knob = joystick.querySelector('.joystick-knob');
    knob.style.transform = 'translate(0, 0)';
}
function updateJoystickPosition(e) {
    if (!isJoystickActive) return;
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const deltaX = clientX - joystickCenter.x;
    const deltaY = clientY - joystickCenter.y;
    const maxRadius = Math.min(joystickCenter.x, joystickCenter.y) * 0.7;
    const distance = Math.min(Math.sqrt(deltaX * deltaX + deltaY * deltaY), maxRadius);
    const angle = Math.atan2(deltaY, deltaX);
    const knobX = Math.cos(angle) * distance;
    const knobY = Math.sin(angle) * distance;
    const knob = document.querySelector('.joystick-knob');
    knob.style.transform = `translate(${knobX}px, ${knobY}px)`;
    let normalizedX = knobX / maxRadius;
    let normalizedY = knobY / maxRadius;
    const sensitivityThreshold = 0.05;
    if (Math.abs(normalizedX) < sensitivityThreshold &&
        Math.abs(normalizedY) < sensitivityThreshold) {
        normalizedX = 0;
        normalizedY = 0;
    }
    if (joystickTimeout) {
        clearTimeout(joystickTimeout);
    }
    joystickTimeout = setTimeout(() => {
        sendJoystickCommand(normalizedX, normalizedY);
    }, 50);
}
function stopJoystickControl() {
    isJoystickActive = false;
    const knob = document.querySelector('.joystick-knob');
    knob.style.transform = 'translate(0, 0)';
    sendJoystickCommand(0, 0);
}
async function sendJoystickCommand(x, y) {
    try {
        const url = `${device.address}/joystick?x=${x.toFixed(2)}&y=${y.toFixed(2)}`;
        const response = await fetch(url, {method: 'GET'});
        const text = await response.text();
        let result;
        try {
            result = JSON.parse(text);
        } catch (parseError) {
            console.error('Ответ сервера не JSON:', text);
            updateDeviceStatus('error', 'Ошибка формата ответа сервера');
            return;
        }
        if (result.status !== "ok") {
            console.error('Ошибка команды джойстика:', result.message);
            updateDeviceStatus('error', result.message);
        }
    } catch (error) {
        console.error(error);
        updateDeviceStatus('error', error);
    }
}