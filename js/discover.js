let isScanning = false;
let devices = [];

const scan_config = {
    subnet: '192.168.0.', 
    port: 5000, 
    timeout: 2000, 
    startRange: 1, 
    endRange: 254
};

const scanButton = document.getElementById('scan-button');
const deviceList = document.getElementById('device-list');
const statusElement = document.getElementById('scan-status');
const loadingEl = document.querySelector('.loading');

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    bindEvents();
});

function bindEvents() {
    if (scanButton) {
        scanButton.addEventListener('click', () => {
            startScan()
        });
    }
}

async function startScan() {
    if (isScanning) return;

    isScanning = true;
    updateStatus('Поиск устройств в локальной сети...', 'info');
    showLoading(true);
    claearDevices();
    devices = [];

    try {
        await scanLocalNetwork();
        displayDevices(devices);
        updateStatus(`Найдено ${devices.length} устройств`, 'success');
    } catch (error) {
        console.error('Ошибка сканирования:', error);
        updateStatus('Ошибка при сканировании сети', 'error');
    } finally {
        isScanning = false;
        showLoading(false);
    }
}

async function scanLocalNetwork() {
    const promises = [];
    for (let i = scan_config.startRange; i <= scan_config.endRange; i++) {
        const ip = `${scan_config.subnet}${i}`;
        promises.push(checkDeviceWithDiscover(ip));
    }

    // Ждём завершения всех проверок
    const results = await Promise.allSettled(promises);

    devices = results
        .filter(result => result.status === 'fulfilled' && result.value !== null)
        .map(result => result.value);
}

async function checkDeviceWithDiscover(ip) {
    return new Promise((resolve) => {
        const url = `http://${ip}:${scan_config.port}/discover`;

        fetch(url, {
            method: 'GET', 
            headers: {
                'Content-Type': 'application/json'
            }, 
            mode: 'cors'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.status === 'ok') {
                resolve({
                    id: Date.now() + Math.random(), // Уникальный ID
                    name: data.name || `Устройство ${ip}`,
                    address: `http://${ip}:${scan_config.port}`,
                    capabilities: data.capabilities || [],
                    version: data.version || 'unknown',
                    ip: ip  
                });
            } else {
                resolve(null);
            }
        })
        .catch(() => {
            resolve(null);
        });
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
                <div class="device-capabilities">Возможности: ${device.capabilities.join(', ')}</div>
            </div>
            <button class="connect-button" data-device-id="${device.id}">Подключиться</button>
        `;
        deviceList.appendChild(li);
    });

    document.querySelectorAll('.connect-btn').forEach(btn => {
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
    window.location.href = 'index.html';
}
function claearDevices(params) {
    deviceList.innerHTML = '';
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