//Функция сканирования локальной сети
async function scanLocalNetwork() {
    const resultsDiv = document.getElementById('discovery-results');
    resultsDiv.innerHTML = '<p>Поиск устройств...</p>';

    try {
        const network = await getNetworkInfo() 
        const {baseIp, range} = network;

        const [start, end] = range.split('-').map(Number);

        const devices = [];
        const promises = [];
        
        // Сканируем диапазон 192.168.1.1–254
        for (let i = start; i <= end; i++) {
            const ip = `${baseIp}.${i}`;
            promises.push(checkDevice(ip, devices));
        }

        await Promise.all(promises);

        if (devices.length > 0) {
            let html = `<h3>Найденные устройства: ${devices.length}</h3><ul>`;
            devices.forEach(device => {
                html += `
                    <li>
                        <strong>${device.ip}:5000<strong>
                        <button class="btn connect-device" data-ip="${device.ip}">
                            Подключиться
                        </button>
                    </li>
                    `;
            });
            html += '</ul>';
            resultsDiv.innerHTML = html;

            // Добавляем обработчики для кнопок подключения
            document.querySelectorAll('.connect-device').forEach(btn => {
                btn.addEventListener('click', function() {
                    const ip = this.getAttribute('data-ip');
                    setDeviceIp(ip);
                });
            });

        } else {
            resultsDiv.innerHTML = '<p>Устройства не найдены</p>';
        }
    } catch {
        resultsDiv.innerHTML = `<p>Ошибка при сканировании: ${error.message}</p>`;
    }
}

// Проверка одного IP
async function checkDevice(ip, devices) {
    try {
        const response = await fetch(`http://${ip}:5000/discover`, {
            method: "GET", 
            timeout: 200
        });
        
        if (response.ok) {
            devices.push({ip: ip, port: 5000});
            console.log(`Проверка ${ip}: ${response.status}`);
        }
        
    } catch (error) {
        
    }
}

// Эвристика для определения локальной сети (упрощённая)
async function getNetworkInfo() {
    return new Promise((resolve) => {
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        const ips = new Set();

        pc.onicecandidate = (event) => {
            if (!event.candidate) {
                // Все кандидаты получены — определяем подсеть
                if (ips.size > 0) {
                    const ip = Array.from(ips)[0]; // Берём первый IP
            const network = getSubnetFromIP(ip);
            resolve(network);
        } else {
            resolve({ baseIp: '192.168.0', range: '1-254' }); // Резервный вариант
        }
        return;
    }

    const candidate = event.candidate;
    if (candidate) {
        const ipMatch = candidate.address || candidate.candidate.match(/([0-9]{1,3}\.){3}[0-9]{1,3}/);
        if (ipMatch) {
            const ipStr = ipMatch[0] || candidate.address;
            if (ipStr && ipStr.startsWith('192.168') || ipStr.startsWith('10.') || ipStr.startsWith('172.')) {
                ips.add(ipStr);
            }
        }
    }
};

pc.createDataChannel('scan');
pc.createOffer().then(offer => pc.setLocalDescription(offer));
});
}

// Вспомогательная функция: вычисляет базовую часть IP и диапазон
function getSubnetFromIP(ip) {
    const parts = ip.split('.');
    if (parts[0] === '192' && parts[1] === '168' && parts[2] === '0') {
        return {
            baseIp: '192.168.0',
            range: '1-254'
        };  
        if (parts.length !== 4) return { baseIp: '192.168.0', range: '1-254' };
    }

    // Для сетей класса C (192.x.x.x, 10.x.x.x) используем /24 (254 хоста)
    if (parts[0] === '192' || parts[0] === '10') {
        return {
            baseIp: `${parts[0]}.${parts[1]}.${parts[2]}`,
            range: '1-254'
        };
    }
    // Для сетей 172.16.x.x–172.31.x.x (частные) тоже /24
    else if (parts[0] === '172' && parts[1] >= 16 && parts[1] <= 31) {
        return {
            baseIp: `${parts[0]}.${parts[1]}.${parts[2]}`,
            range: '1-254'
        };
    }
    // В остальных случаях — резервный вариант
    else {
        return { baseIp: '192.168.0', range: '1-254' };
    }
}
// Обработчик кнопки обнаружения
document.getElementById('discover-btn').addEventListener('click', scanLocalNetwork);