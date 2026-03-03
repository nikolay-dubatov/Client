let isScanning = false;
async function scanLocalNetwork() {
    if (document.getElementById('scan-section').classList.contains('hidden')) {
        alert('Секция сканирования отключена. Включите её в панели управления.');
        return;
    }
    const resultsDiv = document.getElementById('discovery-results');
    resultsDiv.innerHTML = 'Поиск устройств...';

    if (isScanning) {
        resultsDiv.innerHTML = '<p>Уже выполняется сканирование...</p>';
        return;
    }

    isScanning = true;

    try {
        // Показываем начальное состояние
        resultsDiv.innerHTML = `
            <p>Запуск сканирования сети...</p>
        `;

        const localIp = await getLocalIp();
        const baseIp = localIp.split('.').slice(0, 3).join('.');

        const devices = [];
        // Массив для всех промисов
        const promises = [];
        let scannedCount = 0;
        const totalIps = 254;


        for (let i = 1; i <= 254; i++) {
            const ip = `${baseIp}.${i}`;

            const checkPromise = checkDevice(ip, devices)
                .finally(() => {
                    console.log(ip);
                    console.log(devices);
                });
            promises.push(checkPromise);
        }

        // Запускаем паралельную обработку промисов
        await Promise.all(promises);
        console.log('Done');
        

        if (devices.length > 0) {
            let html = `<p>Найдено устройств: ${devices.length}</p><div class="devices-list">`;

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
            </div>`;
            });
            html += "</div>";
            resultsDiv.innerHTML = html;

            document.querySelectorAll('.connect-device').forEach(btn => {
                btn.addEventListener('click', function(){
                    const ip = this.getAttribute('data-ip');
                    setDeviceIp(ip);
                });
            });
        } else {
            resultsDiv.innerHTML = '<p>Устройства не найдены</p>';
        }
    } catch (error) {
        resultsDiv.innerHTML = `<p class="error">Ошибка при сканировании: ${error.message}</p>`;
        //console.error('Ошибка сканирования:', error);
    } finally {isScanning = false;}
}

async function checkDevice(ip, devices) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `http://${ip}:5000/discover`, true);

        // Обработчик успешного ответа (readyState === 4 и status === 200)
        xhr.onload = () => {
            console.log(`Успешно: ${ip}`); // Логируем успешные запросы
            if (xhr.status === 200) {
                const data = JSON.parse(xhr.responseText);
                devices.push({
                    ip: ip, 
                    port: 5000, 
                    device_type: data.device_type, 
                    name: data.name, 
                    version: data.version, 
                    capabilities: data.capabilities
                });
                resolve(data);
            } else {
                resolve(null);
            }
        };

        // Обработчик сетевых ошибок (тайм-аут, отказ соединения и т. д.)
        xhr.onerror = () => {
            resolve(null);
        }
        xhr.ontimeout = () => {
            resolve(null);
        }
        // Устанавливаем таймаут (в мс)
        xhr.timeout = 5000;

        // Отправляем запрос
        xhr.send()
    });
}


async function getLocalIp() {
    return '192.168.0.83';
    // return new Promise((resolve, reject) => {
    //     if (!window.RTCPeerConnection) {
    //         return reject(new Error('WebRTC не поддерживается'));
    //     }

    //     const pc = new RTCPeerConnection({iceServers: []});
    //     const localIps = new Set();
    //     let timeout;
        
    //     pc.createDataChannel('');

    //     pc.createOffer()
    //         .then(offer => pc.setLocalDescription(offer))
    //         .catch(reject);

        
    //     pc.onicecandidate = (event) => {
    //         if (!event.candidate) {
    //             if (localIps.size === 0) {
    //                 reject(new Error('Локальный IP не найден'));
    //             } else {
    //                 resolve(Array.from(localIps));
    //             }
    //             pc.close;
    //             return;
    //         }; 

    //         if (!event.candidate.candidate.includes('typ host')) return;

    //         const ipMatch = event.candidate.candidate.match(/([0-9]{1,3}\.){3}[0-9]{1,3}/);
    //         if (ipMatch) localIps.add(ipMatch);
    //     };
    //     timeout = setTimeout(() => {
    //         reject(new Error('Таймаут: ICE-кандидаты не получены')); 
    //         pc.close();
    //     }, 5000)
    // });
}

document.getElementById("discover-btn").addEventListener("click", function(){
    scanLocalNetwork();
});