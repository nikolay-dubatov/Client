let telemetryInterval = null;
let currentDeviceIp = null;

async function fetchTelemetry(ip) {
    try {
        const response = await fetch(`http://${ip}:5000/telemetry`);
        if (!response.ok) {
            throw new Error(`HTTP Error! status: ${response.status}`);
        }
        return await response.json()
    } catch (error) {
        console.error(`Ошибка получения телеметрии для ${ip}:`, error);
        throw error;
    }
}

// Обновление панели телеметрии. 
function updateTelemetryPanel(telemetry) {
    const data = telemetry.data || {};

    document.getElementById('battery-value').textContent =
        data.battery !== undefined ? `${data.battery}%` : 'Н/Д';
    document.getElementById('temperature-value').textContent =
        data.temperature !== undefined ? `${data.temperature}°C` : 'Н/Д';
    document.getElementById('speed-value').textContent =
        data.speed !== undefined ? `${data.speed} км/ч` : 'Н/Д';
    document.getElementById('heading-value').textContent =
        data.heading !== undefined ? `${data.heading}°` : 'Н/Д';
    document.getElementById('obstacle-value').textContent =
        data.obstacle_distance !== undefined ? `${data.obstacle_distance} см` : 'Н/Д';

    // Обновляем время
    const timestamp = new Date(telemetry.timestamp * 1000);
    document.getElementById('timestamp-value').textContent = 
        timestamp.toLocaleDateString();

    // Показываем панель, если она была скрыта
    document.getElementById('telemetry-panel').classList.remove('hidden');
}

// Запуск периодического обновления телеметрии
function startTelemetryUpdates(deviceIp) {
    stopTelemetryUpdates();

    currentDeviceIp = deviceIp;

    // Сразу получаем первую порцию данных
    fetchTelemetry(deviceIp)
        .then(telemetry => updateTelemetryPanel(telemetry))
        .catch(() => {
            // При ошибке указываем пустые данные с текущим временем
            updateTelemetryPanel({
                data: {}, 
                timestamp: Date.now() / 1000
            });
        });
    // Запускаем периодическое обновление каждые 2 минуты
    telemetryInterval = setInterval(async () => {
        try {
            const telemetry = await fetchTelemetry(deviceIp);
            updateTelemetryPanel(telemetry);
        } catch (error) {
            console.warn('Ошибка обновления телеметрии, продолжаем попытки...');
            // При ошибке показываем пустые данные с текущим временем
            updateTelemetryPanel({
                data: {}, 
                timestamp: Date.now() / 1000
            });
        }
    }, 2000);
    
}

// Остановка обновлений
function stopTelemetryUpdates() {
    if (telemetryInterval) {
        clearInterval(telemetryInterval);
        telemetryInterval = null;
    }
    // Скрываем панель телеметрии
    document.getElementById('telemetry-panel').classList.add('hidden');
    currentDeviceIp = null;1
}