const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- 1. FIXED CONFIGURATION (LOCKED) ---
let CONFIG = {
    BarHeight: 719, 
    TapY: 376,
    Stations: [0.2, 0.5, 0.8], 
    SpawnRate: 2000,
    BeerSpeed: 12
};

let SPRITE_DATA = {
    customer: { h: 369 },
    tower: { h: 433, cols: 3 },
    // --- CALIBRATION TABLE ---
    // Adjust pivotY to stop the "jumping" when the tap opens.
    taps: [
        { h: 150, offsetX: -1, offsetY: -15, pivotY: 0 }, 
        { h: 150, offsetX: -32, offsetY: -9, pivotY: 0 }, 
        { h: 150, offsetX: -54, offsetY: -15, pivotY: 0 }  
    ]
};

const ASSETS_PATHS = {
    bg: 'assets/background.png',
    beers: 'assets/fullpints.png',
    tower: 'assets/tower.png', 
    taps: 'assets/taps.png',    
    reg: 'assets/regular.png',
    vik: 'assets/viking.png'
};

const assets = {}; 

class Game {
    constructor() {
        this.width = canvas.width;
        this.height = canvas.height;
        this.taps = [];
        this.selectedHandle = null; 

        CONFIG.Stations.forEach((xRatio, index) => {
            this.taps.push(new TapStation(index, xRatio, SPRITE_DATA.taps[index]));
        });

        this.testCustomer = new Customer(1, assets.reg);
        this.initInput();
    }

    initInput() {
        const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            return {
                x: (e.touches ? e.touches[0].clientX : e.clientX) - rect.left,
                y: (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
            };
        };

        canvas.addEventListener('mousedown', (e) => {
            const pos = getPos(e);
            this.taps.forEach(tap => {
                const hX = tap.x + tap.cal.offsetX;
                const hY = tap.y + tap.cal.offsetY;
                // Only selecting handles now
                if (Math.abs(pos.x - hX) < 60 && Math.abs(pos.y - hY) < 60) {
                    this.selectedHandle = tap;
                } else if (Math.abs(pos.x - tap.x) < 60 && Math.abs(pos.y - tap.y) < 150) {
                    tap.pull(); // Click tower to test animation
                }
            });
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.selectedHandle) return;
            const pos = getPos(e);
            // Move handle independently
            this.selectedHandle.cal.offsetX = pos.x - this.selectedHandle.x;
            this.selectedHandle.cal.offsetY = pos.y - this.selectedHandle.y;
        });

        window.addEventListener('mouseup', () => this.selectedHandle = null);
        
        // Key listener for fine-tuning pivotY
        window.addEventListener('keydown', (e) => {
            if (!this.selectedHandle) return;
            if (e.key === 'ArrowUp') this.selectedHandle.cal.pivotY++;
            if (e.key === 'ArrowDown') this.selectedHandle.cal.pivotY--;
        });
    }

    update() {
        this.taps.forEach(t => t.update());
    }

    draw() {
        if (assets.bg) ctx.drawImage(assets.bg, 0, 0, canvas.width, canvas.height);
        
        // Locked Bar Line
        ctx.strokeStyle = "rgba(255, 255, 0, 0.3)";
        ctx.strokeRect(0, CONFIG.BarHeight, canvas.width, 1);
        
        if (this.testCustomer) this.testCustomer.draw();
        this.taps.forEach(t => t.draw());

        // HUD
        ctx.fillStyle = "rgba(0,0,0,0.85)";
        ctx.fillRect(10, 10, 500, 200);
        ctx.fillStyle = "#0f0";
        ctx.font = "14px monospace";
        ctx.fillText("🛠 HANDLE-ONLY CALIBRATION", 20, 35);
        this.taps.forEach((t, i) => {
            const isSel = (this.selectedHandle === t) ? "> " : "  ";
            ctx.fillText(`${isSel}Tap ${i}: X:${Math.round(t.cal.offsetX)} Y:${Math.round(t.cal.offsetY)} | PivotY: ${t.cal.pivotY}`, 20, 70 + (i * 25));
        });
        ctx.fillStyle = "#aaa";
        ctx.fillText("1. Drag handles to align.", 20, 160);
        ctx.fillText("2. Hold Mouse on Tower to freeze 'Open'.", 20, 180);
        ctx.fillText("3. Use UP/DOWN Arrows to tune PivotY while dragging.", 20, 200);
    }
}

class TapStation {
    constructor(index, xRatio, calibration) {
        this.index = index;
        this.x = (canvas.width || window.innerWidth) * xRatio;
        this.y = CONFIG.TapY;
        this.cal = calibration;
        this.pulled = false;
        this.pullTimer = 0;
    }
    pull() { this.pulled = true; this.pullTimer = 20; }
    update() { 
        const isDragging = (window.gameInstance && window.gameInstance.selectedHandle === this);
        if (isDragging) { this.pulled = true; this.pullTimer = 5; }
        else if (this.pulled && --this.pullTimer <= 0) this.pulled = false; 
    }
    draw() {
        if (assets.tower) {
            const fW = assets.tower.width / 3;
            const dW = SPRITE_DATA.tower.h * (fW / assets.tower.height);
            ctx.drawImage(assets.tower, this.index * fW, 0, fW, assets.tower.height, this.x - (dW/2), CONFIG.TapY, dW, SPRITE_DATA.tower.h);
        }
        if (assets.taps) {
            const fW = assets.taps.width / 3;
            const fH = assets.taps.height / 2;
            const dW = this.cal.h * (fW / fH);
            const dH = this.cal.h;
            ctx.save();
            ctx.translate(this.x + this.cal.offsetX, CONFIG.TapY + this.cal.offsetY);
            if (this.pulled) {
                if (this.index === 0) ctx.rotate(Math.PI / 2);
                if (this.index === 1) ctx.rotate(Math.PI);
                if (this.index === 2) ctx.rotate(-Math.PI / 2);
            }
            // PivotY Correction
            ctx.drawImage(assets.taps, this.index * fW, this.pulled ? fH : 0, fW, fH, -dW/2, -dH - this.cal.pivotY, dW, dH);
            ctx.restore();
        }
    }
}

class Customer {
    constructor(lane, img) { this.img = img; this.x = (canvas.width || window.innerWidth) * CONFIG.Stations[lane] - 100; }
    draw() {
        if (!this.img) return;
        const fW = this.img.width / (this.img.width > this.img.height * 2 ? 4 : 1);
        const dH = SPRITE_DATA.customer.h;
        const dW = dH * (fW / this.img.height);
        const y = CONFIG.BarHeight - dH;
        ctx.save();
        ctx.translate(this.x + dW, y + 40);
        ctx.scale(-1, 1);
        ctx.drawImage(this.img, 0, 0, fW, this.img.height, 0, 0, dW, dH);
        ctx.restore();
    }
}

function loadImages() {
    let loaded = 0;
    const keys = Object.keys(ASSETS_PATHS);
    keys.forEach(key => {
        const img = new Image();
        img.src = ASSETS_PATHS[key];
        img.onload = () => {
            assets[key] = img;
            if (++loaded === keys.length) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                window.gameInstance = new Game();
                (function loop() {
                    ctx.clearRect(0,0,canvas.width, canvas.height);
                    window.gameInstance.update();
                    window.gameInstance.draw();
                    requestAnimationFrame(loop);
                })();
            }
        };
    });
}
loadImages();
