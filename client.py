import tkinter as tk
from tkinter import ttk
import requests
import cv2
import numpy as np
from PIL import Image, ImageTk
import threading
import time


class ClientApp:
    def __init__(self, root: tk.Tk):
        # Настройка окна
        self.root = root
        self.root.title("Управление Arduino машинкой")
        self.root.geometry("800x600")
        self.root.resizable(False, False)

        # Настройки сервера
        self.base_url = "http://192.168.0.83:5000"
        self.fps = 25
        self.frame_delay = int(1000 / self.fps)
        self.timer = None
        self.stop_delay = 1

        self.streaming = True  # Флаг потока
        self.current_imgtk = None  # Кешированный PhotoImage
        self.start_video_stream()

        self.setup_ui()

    def setup_ui(self):
        self.video_label = tk.Label(self.root)
        self.video_label.pack(pady=10)

        control_frame = ttk.Frame(self.root)
        control_frame.pack(pady=10)
        # Кнопки управления
        tk.Button(control_frame, text="Вперёд", command=self.forward).grid(row=0, column=0, pady=5, padx=5)
        tk.Button(control_frame, text="Назад", command=self.backward).grid(row=0, column=1, pady=5, padx=5)
        tk.Button(control_frame, text="Влево", command=self.left).grid(row=1, column=0, pady=5, padx=5)
        tk.Button(control_frame, text="Вправо", command=self.right).grid(row=1, column=1, pady=5, padx=5)
        tk.Button(control_frame, text="Стоп", command=self.stop).grid(row=2, column=0, pady=10)
        tk.Button(control_frame, text="Снимок", command=self.capture).grid(row=2, column=1, pady=10)

        
        ttk.Button(self.root, text="Включить/Выключить видео",
           command=self.toggle_video).pack(pady=5)

        # Статус
        self.status_label = ttk.Label(self.root, text="Готов", background="white", relief="solid", width=40)
        self.status_label.pack(pady=10, padx=5)

    def start_video_stream(self):
        """Запускает поток видео в отдельном потоке."""
        threading.Thread(target=self.stream_video, daemon=True).start()
    
    def toggle_video(self):
        """Отправляет запрос на включение/выключение видеопотока."""
        url = f"{self.base_url}/toggle_video"
        try:
            response = requests.post(url, timeout=3)
            if response.status_code == 200:
                data = response.json()
                self.status_label.config(text=data["message"], foreground="blue")
            else:
                self.status_label.config(text=f"HTTP {response.status_code}", foreground="red")
        except Exception as e:
            self.status_label.config(text=f"Ошибка: {e}", foreground="red")


    def stream_video(self):
        """Получает и отображает кадры с ограничением FPS."""
        url = f"{self.base_url}/stream"
        try:
            response = requests.get(url, stream=True, timeout=1)
            if response.status_code != 200:
                self.status_label.config(text=f"Ошибка: HTTP {response.status_code}", foreground="red")
                return

            bytes_data = bytes()
            for chunk in response.iter_content(chunk_size=1024):
                bytes_data += chunk
                a = bytes_data.find(b'\xff\xd8')
                b = bytes_data.find(b'\xff\xd9')
                if a != -1 and b != -1:
                    jpg = bytes_data[a:b+2]
                    bytes_data = bytes_data[b+2:]
                    break

            if len(jpg) == 0:
                # Планируем следующий кадр без задержки
                if self.streaming:
                    self.root.after(1, self.fetch_frame)
                return

            frame = cv2.imdecode(np.frombuffer(jpg, dtype=np.uint8), cv2.IMREAD_COLOR)
            if frame is not None:
                img = Image.frombytes(
                    'RGB',
                    (frame.shape[1], frame.shape[0]),
                    cv2.cvtColor(frame, cv2.COLOR_BGR2RGB).tobytes()
                )
                if self.current_imgtk is None:
                    self.current_imgtk = ImageTk.PhotoImage(image=img)
                else:
                    self.current_imgtk.paste(img)
                self.video_label.config(image=self.current_imgtk)

        except Exception as e:
            self.status_label.config(text=f"Ошибка видео: {e}", foreground="red")

        # Планируем следующий кадр с минимальной задержкой
        if self.streaming:
            self.root.after(1, self.stream_video)  # 1 мс между запросами


    def send_command(self, cmd):
        """Отправляет команду на сервер."""
        url = f"{self.base_url}/{cmd}"
        try:
            response = requests.get(url, timeout=3)
            if response.status_code == 200:
                data = response.json()
                self._update_status(data["message"], "green")
            else:
                self._update_status(f"HTTP {response.status_code}", "red")
        except Exception as e:
            self._update_status(f"Ошибка: {e}", "red")

    def _update_status(self, message, color="black"):
        """Обновляет статус-лейбл."""
        self.status_label.config(text=message, foreground=color)
    
    def schedule_stop(self):
        if self.timer:
            self.timer.cancel()
        self.timer = threading.Timer(self.stop_delay, self.stop)
    
    def forward(self):
        self.send_command("forward")
        self.schedule_stop()

    def backward(self):
        self.send_command("backward")
        self.schedule_stop()

    def left(self):
        self.send_command("left")
        self.schedule_stop()

    def right(self):
        self.send_command("right")
        self.schedule_stop()

    def stop(self):
        if self.timer:
            self.timer.cancel()
            self.timer = None
        self.send_command("stop")

    def capture(self):
        self.send_command("capture")

if __name__ == "__main__":
    root = tk.Tk()
    app = ClientApp(root)
    root.mainloop()