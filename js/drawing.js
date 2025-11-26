class DrawingApp {
    constructor() {
        this.canvas = document.getElementById('drawingCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        this.startX = 0;
        this.startY = 0;
        this.currentTool = 'pencil';
        this.currentColor = '#000000';
        this.brushSize = 5;
        this.points = [];
        this.tempCanvas = document.createElement('canvas');
        this.tempCtx = this.tempCanvas.getContext('2d');
        
        // История для отмены/повтора
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 20;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupCanvas();
        this.setDefaultStyles();
        this.setupPremiumModal();
        this.saveState();
    }

    setupEventListeners() {
        // События мыши
        this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
        this.canvas.addEventListener('mousemove', this.draw.bind(this));
        this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
        this.canvas.addEventListener('mouseout', this.stopDrawing.bind(this));

        // События касания
        this.canvas.addEventListener('touchstart', this.handleTouch.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouch.bind(this));
        this.canvas.addEventListener('touchend', this.stopDrawing.bind(this));

        // Инструменты
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setTool(e.target.dataset.tool);
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        // Цвет
        document.getElementById('colorPicker').addEventListener('input', (e) => {
            this.currentColor = e.target.value;
        });

        document.querySelectorAll('.color-preset').forEach(preset => {
            preset.addEventListener('click', (e) => {
                this.currentColor = e.target.dataset.color;
                document.getElementById('colorPicker').value = this.currentColor;
            });
        });

        // Размер кисти
        document.getElementById('brushSize').addEventListener('input', (e) => {
            this.brushSize = parseInt(e.target.value);
            document.getElementById('brushSizeValue').textContent = this.brushSize + 'px';
            this.updateBrushStyles();
        });

        // Кнопки управления
        document.getElementById('newCanvas').addEventListener('click', () => {
            if (confirm('Создать новый рисунок? Текущий будет потерян.')) {
                this.clearCanvas();
            }
        });

        document.getElementById('saveBtn').addEventListener('click', () => {
            this.saveImage();
        });

        document.getElementById('clearBtn').addEventListener('click', () => {
            if (confirm('Очистить холст?')) {
                this.clearCanvas();
            }
        });

        document.getElementById('premiumBtn').addEventListener('click', () => {
            this.showPremiumModal();
        });

        // Кнопки отмены/повтора
        document.getElementById('undoBtn').addEventListener('click', () => {
            this.undo();
        });
        
        document.getElementById('redoBtn').addEventListener('click', () => {
            this.redo();
        });
    }

    setupCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        this.tempCanvas.width = this.canvas.width;
        this.tempCanvas.height = this.canvas.height;
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        
        this.canvas.width = rect.width - 40;
        this.canvas.height = Math.min(600, rect.height - 40);
        
        this.tempCanvas.width = this.canvas.width;
        this.tempCanvas.height = this.canvas.height;
        
        this.redraw();
    }

    setDefaultStyles() {
        this.updateBrushStyles();
    }

    updateBrushStyles() {
        this.ctx.lineJoin = 'round';
        this.ctx.lineCap = 'round';
        this.ctx.lineWidth = this.brushSize;
        this.ctx.strokeStyle = this.currentColor;
        this.ctx.fillStyle = this.currentColor;
        
        this.tempCtx.lineJoin = 'round';
        this.tempCtx.lineCap = 'round';
        this.tempCtx.lineWidth = this.brushSize;
        this.tempCtx.strokeStyle = this.currentColor;
        this.tempCtx.fillStyle = this.currentColor;
    }

    setTool(tool) {
        this.currentTool = tool;
        this.canvas.style.cursor = this.getCursorForTool(tool);
    }

    getCursorForTool(tool) {
        const cursors = {
            pencil: 'crosshair',
            brush: 'crosshair',
            eraser: 'cell',
            fill: 'crosshair',
            line: 'crosshair',
            rectangle: 'crosshair',
            circle: 'crosshair'
        };
        return cursors[tool] || 'default';
    }

    startDrawing(e) {
        this.isDrawing = true;
        const pos = this.getMousePos(e);
        
        [this.lastX, this.lastY] = [pos.x, pos.y];
        [this.startX, this.startY] = [pos.x, pos.y];
        
        this.points = [{x: pos.x, y: pos.y}];
        
        if (this.currentTool === 'fill') {
            this.fillArea(pos.x, pos.y);
            this.isDrawing = false;
            return;
        }
        
        if (this.isShapeTool()) {
            this.tempCtx.clearRect(0, 0, this.tempCanvas.width, this.tempCanvas.height);
            this.tempCtx.drawImage(this.canvas, 0, 0);
        } else {
            this.ctx.beginPath();
            this.ctx.moveTo(pos.x, pos.y);
        }
    }

    draw(e) {
        if (!this.isDrawing) return;
        
        const pos = this.getMousePos(e);
        const currentX = pos.x;
        const currentY = pos.y;

        const strokeStyle = this.currentTool === 'eraser' ? '#FFFFFF' : this.currentColor;
        this.ctx.strokeStyle = strokeStyle;
        this.ctx.lineWidth = this.brushSize;

        if (this.isShapeTool()) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(this.tempCanvas, 0, 0);
            this.drawShape(this.ctx, this.startX, this.startY, currentX, currentY);
        } else {
            this.drawSmoothLine(currentX, currentY);
        }

        [this.lastX, this.lastY] = [currentX, currentY];
    }

    drawSmoothLine(x, y) {
        this.points.push({x, y});
        
        if (this.points.length > 5) {
            this.points.shift();
        }
        
        if (this.points.length > 1) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.points[0].x, this.points[0].y);
            
            for (let i = 1; i < this.points.length - 2; i++) {
                const xc = (this.points[i].x + this.points[i + 1].x) / 2;
                const yc = (this.points[i].y + this.points[i + 1].y) / 2;
                this.ctx.quadraticCurveTo(this.points[i].x, this.points[i].y, xc, yc);
            }
            
            if (this.points.length >= 2) {
                const last = this.points.length - 1;
                this.ctx.quadraticCurveTo(
                    this.points[last - 1].x, 
                    this.points[last - 1].y,
                    this.points[last].x,
                    this.points[last].y
                );
            }
            
            this.ctx.stroke();
        }
    }

    drawShape(ctx, startX, startY, endX, endY) {
        ctx.beginPath();
        ctx.strokeStyle = this.currentTool === 'eraser' ? '#FFFFFF' : this.currentColor;
        ctx.lineWidth = this.brushSize;
        
        switch (this.currentTool) {
            case 'line':
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                break;
                
            case 'rectangle':
                const rectWidth = endX - startX;
                const rectHeight = endY - startY;
                ctx.rect(startX, startY, rectWidth, rectHeight);
                break;
                
            case 'circle':
                const radius = Math.sqrt(
                    Math.pow(endX - startX, 2) + 
                    Math.pow(endY - startY, 2)
                );
                ctx.arc(startX, startY, radius, 0, Math.PI * 2);
                break;
        }
        ctx.stroke();
    }

    stopDrawing() {
        if (!this.isDrawing) return;
        
        if (this.isShapeTool() && this.tempCanvas) {
            this.ctx.drawImage(this.tempCanvas, 0, 0);
            this.drawShape(this.ctx, this.startX, this.startY, this.lastX, this.lastY);
            this.saveState();
        }
        
        this.isDrawing = false;
        this.points = [];
        
        if (!this.isShapeTool()) {
            this.saveState();
        }
    }

    // ИСПРАВЛЕННАЯ ФУНКЦИЯ ЗАЛИВКИ
    fillArea(startX, startY) {
        this.saveState();
        
        // Создаем временный canvas для работы с пикселями
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        
        // Копируем текущее изображение
        tempCtx.drawImage(this.canvas, 0, 0);
        
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const targetColor = this.getPixelColor(imageData, Math.floor(startX), Math.floor(startY));
        const fillColor = this.hexToRgb(this.currentColor);
        
        // Если цвет уже совпадает, выходим
        if (this.colorsMatch(targetColor, fillColor)) {
            return;
        }
        
        const stack = [[Math.floor(startX), Math.floor(startY)]];
        const width = tempCanvas.width;
        const height = tempCanvas.height;
        const visited = new Set();
        
        while (stack.length > 0) {
            const [x, y] = stack.pop();
            const key = `${x},${y}`;
            
            if (x < 0 || x >= width || y < 0 || y >= height || visited.has(key)) {
                continue;
            }
            
            visited.add(key);
            const currentColor = this.getPixelColor(imageData, x, y);
            
            if (!this.colorsMatch(currentColor, targetColor)) {
                continue;
            }
            
            // Заливаем пиксель
            this.setPixelColor(imageData, x, y, fillColor);
            
            // Добавляем соседние пиксели
            stack.push([x + 1, y]);
            stack.push([x - 1, y]);
            stack.push([x, y + 1]);
            stack.push([x, y - 1]);
        }
        
        // Применяем изменения к основному canvas
        this.ctx.putImageData(imageData, 0, 0);
    }

    getPixelColor(imageData, x, y) {
        const index = (y * imageData.width + x) * 4;
        return {
            r: imageData.data[index],
            g: imageData.data[index + 1],
            b: imageData.data[index + 2],
            a: imageData.data[index + 3]
        };
    }

    setPixelColor(imageData, x, y, color) {
        const index = (y * imageData.width + x) * 4;
        imageData.data[index] = color.r;
        imageData.data[index + 1] = color.g;
        imageData.data[index + 2] = color.b;
        imageData.data[index + 3] = 255;
    }

    hexToRgb(hex) {
        // Убираем # если есть
        hex = hex.replace('#', '');
        
        // Преобразуем 3-значный HEX в 6-значный
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        
        const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : {r: 0, g: 0, b: 0};
    }

    colorsMatch(color1, color2) {
        // Сравниваем цвета с допуском (из-за антиалиасинга)
        const tolerance = 10;
        return Math.abs(color1.r - color2.r) <= tolerance &&
               Math.abs(color1.g - color2.g) <= tolerance &&
               Math.abs(color1.b - color2.b) <= tolerance;
    }

    isShapeTool() {
        return ['line', 'rectangle', 'circle'].includes(this.currentTool);
    }

    handleTouch(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 'mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        
        this.canvas.dispatchEvent(mouseEvent);
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    // История действий
    saveState() {
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        
        this.history.push(this.canvas.toDataURL());
        this.historyIndex++;
        
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.historyIndex--;
        }
        
        this.updateUndoRedoButtons();
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.redrawFromHistory();
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.redrawFromHistory();
        }
    }

    redrawFromHistory() {
        const img = new Image();
        img.onload = () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(img, 0, 0);
        };
        img.src = this.history[this.historyIndex];
        
        this.updateUndoRedoButtons();
    }

    updateUndoRedoButtons() {
        document.getElementById('undoBtn').disabled = this.historyIndex <= 0;
        document.getElementById('redoBtn').disabled = this.historyIndex >= this.history.length - 1;
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.tempCtx.clearRect(0, 0, this.tempCanvas.width, this.tempCanvas.height);
        this.saveState();
    }

    saveImage() {
        if (!this.isPremiumUser()) {
            this.showAdBeforeSave();
        }

        const link = document.createElement('a');
        link.download = `drawing-${new Date().getTime()}.png`;
        link.href = this.canvas.toDataURL();
        link.click();
    }

    showPremiumModal() {
        document.getElementById('premiumModal').style.display = 'flex';
    }

    hidePremiumModal() {
        document.getElementById('premiumModal').style.display = 'none';
    }

    setupPremiumModal() {
        document.getElementById('learnMoreBtn').addEventListener('click', () => {
            this.showPremiumDetails();
        });
        
        document.querySelectorAll('.premium-buy').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const plan = e.target.dataset.plan;
                this.handlePremiumPurchase(plan);
            });
        });
        
        document.getElementById('laterBtn').addEventListener('click', () => {
            this.hidePremiumModal();
        });
        
        document.getElementById('closeModal').addEventListener('click', () => {
            this.hidePremiumModal();
        });
        
        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('premiumModal')) {
                this.hidePremiumModal();
            }
        });
    }

    showPremiumDetails() {
        const detailModal = document.createElement('div');
        detailModal.className = 'modal';
        detailModal.style.display = 'flex';
        detailModal.innerHTML = `
            <div class="modal-content">
                <span class="close-modal" onclick="this.parentElement.parentElement.remove()">&times;</span>
                <h2>🎨 Что входит в премиум?</h2>
                <div class="premium-details">
                    <div class="detail-section">
                        <h3>🚫 Без рекламы</h3>
                        <p>Полностью убираем всю рекламу с сайта. Рисуйте без отвлекающих баннеров!</p>
                    </div>
                    <div class="detail-section">
                        <h3>🖌️ Расширенные кисти</h3>
                        <p>Доступ к 50+ профессиональным кистям: акварель, масло, каллиграфия и многое другое!</p>
                    </div>
                    <div class="detail-section">
                        <h3>💾 Сохранение в HQ</h3>
                        <p>Скачивайте рисунки в высоком качестве (до 4K) без водяных знаков.</p>
                    </div>
                </div>
                <button class="btn premium-buy" onclick="this.parentElement.parentElement.remove()">Понятно</button>
            </div>
        `;
        document.body.appendChild(detailModal);
    }

    handlePremiumPurchase(plan) {
        alert(`Спасибо за интерес! Вы выбрали план: ${plan === 'monthly' ? 'Месячный (299 ₽)' : 'Годовой (2 990 ₽)'}\n\nВ реальном приложении здесь будет платежная форма.`);
        this.hidePremiumModal();
    }

    isPremiumUser() {
        return localStorage.getItem('premiumUser') === 'true';
    }

    showAdBeforeSave() {
        if (Math.random() < 0.3) {
            this.showInterstitialAd();
        }
    }

    showInterstitialAd() {
        const adOverlay = document.createElement('div');
        adOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            z-index: 3000;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
        `;
        
        adOverlay.innerHTML = `
            <h2>Реклама</h2>
            <p>Поддержите разработчиков - просмотрите рекламу</p>
            <div style="width: 300px; height: 250px; background: #333; margin: 20px; display: flex; align-items: center; justify-content: center;">
                Баннер 300x250
            </div>
            <button id="closeAd" style="padding: 10px 20px; background: #4F46E5; color: white; border: none; border-radius: 5px; cursor: pointer;">
                Закрыть через 3s
            </button>
        `;
        
        document.body.appendChild(adOverlay);
        
        let seconds = 3;
        const button = document.getElementById('closeAd');
        const timer = setInterval(() => {
            seconds--;
            button.textContent = `Закрыть через ${seconds}s`;
            if (seconds <= 0) {
                clearInterval(timer);
                button.textContent = 'Закрыть';
                button.onclick = () => document.body.removeChild(adOverlay);
            }
        }, 1000);
    }

    redraw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    new DrawingApp();
});