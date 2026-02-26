const { version } = require("react");

async function scanLocalNetwork() {
    const resultsDiv = document.getElementById('discovery-results');
    resultsDiv.innerHTML = 'Поиск устройств...';

    const localIp = await getLocalIp();
    const baseIp = localIp.split('.').slice(0, 3).join('.');

    const devices = [];
    const promises = [];

    for (let i = 1; i <= 254; i++) {
        const ip = `${baseIp}.${i}`;
        promises.push(checkDevice(ip, devices));
    }

    await Promise.all(promises);
    if (devices.length > 0) {
        resultsDiv.innerHTML = `<p>Найдено устройств: ${devices.length}</p><div class="devices-list">`;
        devices.forEach(device => {
            html += `
            <div class="device-card">
                <div class="device-header">
                    <strong>${device.ip}:5000</strong>
                    <span class="device-status online">Онлайн</span>
                </div>
                    <div class="device-info">
                    <p><strong>Тип:</strong> ${device.device_type || 'Неизвестно'}</p>
                    <p><strong>Имя:</strong> ${device.name || 'Без имени'}</p>
                    <p><strong>Версия:</strong> ${device.version || 'Не указана'}</p>
                    <p><strong>Возможности:</strong> ${
                        device.capabilities ? device.capabilities.join(', ') : 'Не указаны'
                    }</p>
                </div>
                <button class="btn connect-device" data-ip="${device.ip}">
                    Подключиться
                </button>

            `;
        });
        html += "</div>";
        resultsDiv = html;

        document.querySelectorAll('.connect-device').forEach(btn => {
            btn.addEventListener('click', function(){
                const ip = this.getAttribute('data-ip');
                setDeviceIp(ip);
            });
        });
    } else {
        resultsDiv.innerHTML = '<p>Устройства не найдены</p>';
    }
}

async function checkDevice(ip, devices) {
    try {
        const response = await fetch(`http://${ip}:5000/discover`, {
            method: 'GET', 
            mode: 'no-cors', 
            timeout: 200
        })

        if (response.ok) {
            try {
                const data = await response.json()
                devices.push({
                    ip: ip, 
                    port: 5000, 
                    device_type: data.device_type, 
                    name: data.name, 
                    version:data.version, 
                    capabilities: data.capabilities
                });

            } catch(parseError) {
                // Если не удалось распарсить JSON (из‑за no-cors), добавляем минимум данных
                devices.push({ ip: ip, port: 5000 });
            }
        }
    } catch(error) {
        // Игнорируем ошибки (устройство не отвечает)
    }
}

async function getLocalIp(params) {
    return new Promise((resolve) => {
        const pc = new RTCPeerConnection();
        pc.createDataChannel('dummy');
        pc.onicecandidate = (event) => {
            if (!event.candidate) return; 
            const ipMatch = event.candidate.candidate.match(/([0-9]{1,3}\.){3}[0-9]{1,3}/);
            if (ipMatch) {
                resolve(ipMatch[0]);
                pc.close();
            }
        };
        pc.createOffer().then(offer => pc.setLocalDescription(offer));
    });
}