let isScanning = false;
let devices = [];
const scanButton = document.getElementById('scan-button');
const deviceList = document.getElementById('device-list');
const statusElement = document.getElementById('scan-status');
const loadingEl = document.querySelector('.loading');
const clearButton = document.getElementById('clear-btn');

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    bindEvents();
});

function bindEvents() {
    if (scanButton) {
        scanButton.addEventListener('click', startScan);
    }
    if (clearButton) {
        clearButton.addEventListener('click', clearScan)
    }
}
function clearScan() {
    isScanning = false;
    showLoading(false);
    clearDevices();
    updateStatus('Нажмите «Начать сканирование» для поиска устройств', 'info');
}
async function startScan() {
    if (isScanning) return;
    try {
        isScanning = true;
        updateStatus('Поиск устройств в локальной сети...', 'info');
        showLoading(true);
        clearDevices();
        devices = await scanLocalNetwork();
        if (devices && devices.length > 0) {
            displayDevices(devices);
            updateStatus(`Найдено ${devices.length} устройств`, 'success');
        } else {
            updateStatus('Устройства не найдены', 'warning');
        }
    } catch (error) {
        console.error('Ошибка сканирования:', error);
        updateStatus('Ошибка при сканировании сети', 'error');        
    } finally {
        isScanning = false;
        showLoading(false);
    }
}
function handleRefresh() {
    const refreshButton = document.getElementById('refresh-button');
    if (refreshButton) {
        refreshButton.addEventListener('click', async () => {
            if (isScanning) {

            }
        });
    }
}
async function scanLocalNetwork() {
    const ips = getIps()
    const results = await Promise.allSettled(
        ips.map(ip => checkDevice(ip))
    );
    return results
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);
}
function getIps() {
    const baseIp = '192.168.0.';
    const ips = [];
    for (let i = 1; i <= 254; i++) {
        ips.push(`${baseIp}${i}`);
    }
    return ips;
}
async function checkDevice(ip) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `http://${ip}:5000/discover`, true);
        xhr.timeout = 5000;
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    resolve({
                        id: Date.now() + Math.random(), 
                        name: data.name || `Устройство ${ip}`,
                        address: `http://${ip}:5000`,
                        version: data.version || 'unknown'
                    });
                } catch (error) {
                    reject(new Error('Ошибка парсинга ответа'));
                }
            } else {
                reject(new Error(`HTTP ошибка: ${xhr.status}`));
            }
        };
        xhr.onerror = () => {
            reject(new Error('Сетевая ошибка'));
        };
        xhr.ontimeout = () => {
            reject(new Error('Превышено время ожидания'));
        };
        xhr.send();
    });
}
function displayDevices(devicesList) {
    deviceList.innerHTML = '';
    if (devicesList.length === 0) {
        deviceList.innerHTML = '<li class="no-devices">Устройства не найдены</li>';
        return;
    }
    devicesList.forEach(device => {
        if (!device) return;
        const li = document.createElement('li');
        li.className = 'device-item'
        li.innerHTML = `
            <div class="device-info">
                <div class="device-name">${device.name}</div>
                <div class="device-address">${device.address}</div>
                ${device.version !== 'unknown' ? `<div class="device-version">Версия: ${device.version}</div>` : ''}
            </div>
            <div class="device-actions">
                <button class="connect-button" data-device-id="${device.id}">Подключиться</button>
            </div>
        `;
        deviceList.appendChild(li);
    });
    document.querySelectorAll('.connect-button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const deviceId = e.target.getAttribute('data-device-id');
            connectToDevice(deviceId);
        });
    });
}
function connectToDevice(deviceId) {
    const device = devices.find(d => d.id == deviceId);
    if (!device) return;

    localStorage.setItem('selectedDevice', JSON.stringify(device));
    window.location.href = 'control.html';
}
function clearDevices() {
    deviceList.innerHTML = '';
    devices = [];
}
function updateStatus(message, type = 'info') {
    if (!statusElement) return;
    statusElement.textContent = message;
    statusElement.className = `scan-status ${type}`;
}
function showLoading(show) {
    if (loadingEl) {
        loadingEl.style.display = show ? 'block' : 'none';
    }
}