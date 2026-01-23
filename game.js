const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- 1. CONFIGURATION ---
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
    // Individual Calibration
    taps: [
        { h: 150, offsetX: -1, offsetY: -15 }, 
        { h: 150, offsetX: -32, offsetY: -9 }, 
        { h: 150, offsetX: -54, offsetY: -15 }  
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
        this.selectedItem = null; 

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
            // Check Taps
            this.taps.forEach(tap => {
                const hX = tap.x + tap.cal.offsetX;
                const hY = tap.y + tap.cal.offsetY;
                if (Math.abs(pos.x - hX) < 50 && Math.abs(pos.y - hY) < 50) {
                    this.selectedItem = { type: 'handle', obj: tap };
                } else if (Math.abs(pos.x - tap.x) < 60 && Math.abs(pos.y - tap.y) < 150) {
                    tap.pull();
                    this.selectedItem = { type: 'tower', obj: tap };
                }
            });
            // Check Customer
            const c = this.testCustomer;
            if (pos.x > c.x && pos.x < c.x + 200 && pos.y > c.y && pos.y < c.y + SPRITE_DATA.customer.h) {
                this.selectedItem = { type: pos.y < c.y + 100 ? 'custSize' : 'bar' };
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.selectedItem) return;
            const pos = getPos(e);
            if (this.selectedItem.type === 'tower') CONFIG.TapY = pos.y;
            else if (this.selectedItem.type === 'handle') {
                this.selectedItem.obj.cal.offsetX = pos.x - this.selectedItem.obj.x;
                this.selectedItem.obj.cal.offsetY = pos.y - this.selectedItem.obj.y;
            } else if (this.selectedItem.type === 'bar') CONFIG.BarHeight = pos.y;
            else if (this.selectedItem.type === 'custSize') {
                SPRITE_DATA.customer.h = Math.max(50, CONFIG.BarHeight - pos.y);
            }
        });

        window.addEventListener('mouseup', () => this.selectedItem = null);
    }

    update() {
        this.taps.forEach(t => t.update());
    }

    draw() {
        if (assets.bg) ctx.drawImage(assets.bg, 0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "yellow";
        ctx.strokeRect(0, CONFIG.BarHeight, canvas.width, 1);
        
        if (this.testCustomer) this.testCustomer.draw();
        this.taps.forEach(t => t.draw());

        // HUD
        ctx.fillStyle = "rgba(0,0,0,0.85)";
        ctx.fillRect(10, 10, 480, 240);
        ctx.fillStyle = "#0f0";
        ctx.font = "14px monospace";
        ctx.fillText("🛠 HINGE-PIVOT LAB", 20, 35);
        ctx.fillText(`BAR HEIGHT: ${Math.round(CONFIG.BarHeight)} | TOWER Y: ${Math.round(CONFIG.TapY)}`, 20, 65);
        this.taps.forEach((t, i) => {
            ctx.fillText(`Tap ${i}: X:${Math.round(t.cal.offsetX)} Y:${Math.round(t.cal.offsetY)}`, 20, 100 + (i * 22));
        });
        ctx.fillStyle = "#aaa";
        ctx.fillText("HOLD MOUSE on Tower to freeze 'Open' state for alignment.", 20, 210);
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
        // Logic: if being dragged, stay pulled
        const isDragging = (window.gameInstance && window.gameInstance.selectedItem && window.gameInstance.selectedItem.obj === this);
        if (isDragging) { this.pulled = true; this.pullTimer = 5; }
        else if (this.pulled && --this.pullTimer <= 0) this.pulled = false; 
    }
    draw() {
        this.y = CONFIG.TapY;
        if (assets.tower) {
            const fW = assets.tower.width / 3;
            const dW = SPRITE_DATA.tower.h * (fW / assets.tower.height);
            ctx.drawImage(assets.tower, this.index * fW, 0, fW, assets.tower.height, this.x - (dW/2), this.y, dW, SPRITE_DATA.tower.h);
        }
        if (assets.taps) {
            const fW = assets.taps.width / 3;
            const fH = assets.taps.height / 2;
            const dW = this.cal.h * (fW / fH);
            const dH = this.cal.h;
            ctx.save();
            ctx.translate(this.x + this.cal.offsetX, this.y + this.cal.offsetY);
            if (this.pulled) {
                if (this.index === 0) ctx.rotate(Math.PI / 2); // Left
                if (this.index === 1) ctx.rotate(Math.PI);     // Mid
                if (this.index === 2) ctx.rotate(-Math.PI / 2); // Right
            }
            // Draw from bottom-middle anchor
            ctx.drawImage(assets.taps, this.index * fW, this.pulled ? fH : 0, fW, fH, -dW/2, -dH, dW, dH);
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
        this.y = CONFIG.BarHeight - dH;
        ctx.save();
        ctx.translate(this.x + dW, this.y + 40);
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
