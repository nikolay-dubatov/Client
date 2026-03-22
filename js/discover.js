let isScanning = false;
let devices = [];
let favorites = JSON.parse(localStorage.getItem('favoriteDevices')) || [];

const scan_config = {
    subnet: '192.168.0.', 
    port: 5000, 
    timeout: 2000, 
    startRange: 1, 
    endRange: 254
};

const scanButton = document.getElementById('scan-button');
const deviceList = document.getElementById('device-list');
const favoriteList = document.getElementById('favorite-list');
const statusElement = document.getElementById('scan-status');
const loadingEl = document.querySelector('.loading');

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    bindEvents();
    displayFavorites();
    // Делегирование событий на контейнер favoriteList
    favoriteList.addEventListener('click', (e) => {
        if (e.target.classList.contains('connect-favorite')) {
            const deviceId = e.target.getAttribute('data-device-id');
            connectToDevice(deviceId);
        }
    });
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
    clearDevices();
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
    try {
        const results = await Promise.allSettled(promises);

        devices = results
            .filter(result => result.status === 'fulfilled')
            .map(result => result.value);
    } catch (error) {
        console.error('Ошибка при сканировании:', error);
    }
    
}

async function checkDeviceWithDiscover(ip) {
    return new Promise((resolve, reject) => {
        const url = `http://${ip}:${scan_config.port}/discover`;
        const xhr = new XMLHttpRequest();

        xhr.open('GET', url, true);
        xhr.timeout = scan_config.timeout;

        xhr.onload = () => {
            if (xhr.status === 200) {
                const data = JSON.parse(xhr.responseText);
                if (data.status === 'ok') {
                    resolve({
                        id: Date.now() + Math.random(),
                        name: data.name || `Устройство ${ip}`,
                        address: `http://${ip}:${scan_config.port}`,
                        version: data.version || 'unknown',
                        ip: ip,
                        isFavorite: isFavorite(ip)
                    });
                } else {
                    reject();
                }
            } else {
                reject();
            }
        }
        xhr.ontimeout = () => {
            reject();
        };
        xhr.onerror = () => {   
            reject();
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
                <button class="favorite-button" data-ip="${device.ip}">
                    ${device.isFavorite ? '★' : '☆'}
                </button>
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
    document.querySelectorAll('.favorite-button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const ip = e.target.getAttribute('data-ip');
            toggleFavorite(ip);
        });
        
    });
}

function displayFavorites() {
    if (!favoriteList) return;

    if (favorites.length === 0) {
        favoriteList.innerHTML = '<li class="no-favorites">Избранных устройств нет</li>';
        return;
    }

    favoriteList.innerHTML = favorites.map(device => `
        <li class="favorite-item">
            <span class="favorite-name">${device.name}</span>
            <span class="favorite-address">${device.address}</span>
            <button class="remove-favorite" data-ip="${device.ip}">Удалить</button>
            <button class="connect-favorite" data-device-id="${device.id}">Подключиться</button>
        </li>
        `).join('');

    document.querySelectorAll('.remove-favorite').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const ip = e.target.getAttribute('data-ip');
            removeFromFavorites(ip);
        });
    });
    document.querySelectorAll('.connect-favorite').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const deviceId = e.target.getAttribute('data-device-id');
        connectToDevice(deviceId); // Используем существующую функцию подключения
    });
});
    
}

function toggleFavorite(ip) {
    const device = devices.find(d => d.ip === ip);
    if (!device) return;

    const index = favorites.findIndex(f => f.ip === ip);

    if (index === -1) {
        favorites.push(device);
        device.isFavorite = true;
        updateStatus(`Устройство "${device.name}" добавлено в избранное`, 'success');
    } else {
        favorites.splice(index, 1);
        device.isFavorite = false;
        updateStatus(`Устройство "${device.name}" удалено из избранного`, 'info');
    }

    localStorage.setItem('favoriteDevices', JSON.stringify(favorites));

    displayDevices(devices);
    displayFavorites();
}

function removeFromFavorites(ip) {
    const index = favorites.findIndex(f => f.ip === ip);
    if (index !== -1) {
        favorites.splice(index, 1);
        localStorage.setItem('favoriteDevices', JSON.stringify(favorites));
        displayFavorites();
        updateStatus('Устройство удалено из избранного', 'info');

        const device = devices.find(d => d.ip === ip);
        if (device) device.isFavorite = false;
        displayDevices(devices);
    }
}

function isFavorite(ip) {
    return favorites.some(f => f.ip === ip);
}

function connectToDevice(deviceId) {
    const device = devices.find(d => d.id == deviceId);
    if (!device) return;

    localStorage.setItem('selectedDevice', JSON.stringify(device));
    window.location.href = 'control.html';
}
function clearDevices() {
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