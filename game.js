/**
 * TAPROOM TAPPER - RECOVERY EDITION
 * 1. Fixed Asset Loader (All 3 towers should show)
 * 2. Fixed Input Handler (Drag & HUD restored)
 * 3. Fixed Sprite Slicing (Rotation and Rows)
 */

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
    beer: { w: 64, h: 64, scale: 2.0 },
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

const assets = {}; // Global store for loaded images

class Game {
    constructor() {
        this.width = canvas.width;
        this.height = canvas.height;
        this.taps = [];
        this.selectedItem = null; 

        // Initialize Taps
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

        const handleDown = (e) => {
            const pos = getPos(e);
            
            // Check Customer
            const c = this.testCustomer;
            if (pos.x > c.x && pos.x < c.x + 200 && pos.y > c.y && pos.y < c.y + SPRITE_DATA.customer.h) {
                if (pos.y < c.y + 100) this.selectedItem = { type: 'custSize' };
                else this.selectedItem = { type: 'bar' };
                return;
            }

            // Check Taps
            this.taps.forEach(tap => {
                const handleX = tap.x + tap.cal.offsetX;
                const handleY = tap.y + tap.cal.offsetY;
                if (Math.abs(pos.x - handleX) < 50 && Math.abs(pos.y - handleY) < 50) {
                    this.selectedItem = { type: 'handle', obj: tap };
                } else if (Math.abs(pos.x - tap.x) < 60 && Math.abs(pos.y - tap.y) < 150) {
                    tap.pull();
                    this.selectedItem = { type: 'tower', obj: tap };
                }
            });
        };

        const handleMove = (e) => {
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
        };

        const handleUp = () => this.selectedItem = null;

        canvas.addEventListener('mousedown', handleDown);
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleDown(e); }, {passive: false});
        window.addEventListener('touchmove', (e) => { e.preventDefault(); handleMove(e); }, {passive: false});
        window.addEventListener('touchend', handleUp);
    }

    update() {
        this.taps.forEach(t => t.update());
    }

    draw() {
        if (assets.bg) ctx.drawImage(assets.bg, 0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = "yellow";
        ctx.beginPath(); ctx.moveTo(0, CONFIG.BarHeight); ctx.lineTo(canvas.width, CONFIG.BarHeight); ctx.stroke();

        if (this.testCustomer) this.testCustomer.draw();
        this.taps.forEach(t => t.draw());

        // HUD
        ctx.fillStyle = "rgba(0,0,0,0.85)";
        ctx.fillRect(10, 10, 480, 240);
        ctx.fillStyle = "#0f0";
        ctx.font = "14px monospace";
        ctx.fillText("🛠 MASTER CALIBRATION LAB", 20, 35);
        ctx.fillText(`CUSTOMER H: ${Math.round(SPRITE_DATA.customer.h)}`, 20, 65);
        ctx.fillText(`BAR HEIGHT: ${Math.round(CONFIG.BarHeight)}`, 20, 90);
        ctx.fillText(`TOWER Y:    ${Math.round(CONFIG.TapY)}`, 20, 115);
        this.taps.forEach((t, i) => {
            ctx.fillText(`Tap ${i}: X:${Math.round(t.cal.offsetX)} Y:${Math.round(t.cal.offsetY)}`, 20, 150 + (i * 22));
        });
    }
}

class TapStation {
    constructor(index, xRatio, calibration) {
        this.index = index;
        this.x = canvas.width * xRatio;
        this.y = CONFIG.TapY;
        this.cal = calibration;
        this.pulled = false;
        this.pullTimer = 0;
    }

    pull() {
        this.pulled = true;
        this.pullTimer = 20; 
    }

    update() {
        // Freeze open if being dragged or recently pulled
        if (game.selectedItem && game.selectedItem.obj === this) {
            this.pulled = true;
            this.pullTimer = 20;
        } else if (this.pulled && --this.pullTimer <= 0) {
            this.pulled = false;
        }
    }

    draw() {
        this.y = CONFIG.TapY;
        
        // 1. Draw Tower
        if (assets.tower) {
            const frameW = assets.tower.width / 3;
            const drawW = SPRITE_DATA.tower.h * (frameW / assets.tower.height);
            ctx.drawImage(assets.tower, this.index * frameW, 0, frameW, assets.tower.height, this.x - (drawW/2), this.y, drawW, SPRITE_DATA.tower.h);
        }

        // 2. Draw Handle with Bottom-Anchor Pivot
        if (assets.taps) {
            const frameW = assets.taps.width / 3;
            const frameH = assets.taps.height / 2;
            const drawW = this.cal.h * (frameW / frameH);
            const drawH = this.cal.h;
            
            ctx.save();
            // Move to the 'Base' of where the handle should connect
            ctx.translate(this.x + this.cal.offsetX, this.y + this.cal.offsetY);

            if (this.pulled) {
                // FIXED ROTATIONS
                // If they are upside down, we flip the math (adding/subtracting PI)
                if (this.index === 0) ctx.rotate(Math.PI / 2);  // Left Tap
                if (this.index === 1) ctx.rotate(0);            // Middle (Stay upright if sheet is upside down)
                if (this.index === 2) ctx.rotate(-Math.PI / 2); // Right Tap
                
                // If the middle one is upside down on your SHEET, 
                // we rotate it 180 (Math.PI) to make it look right.
                if (this.index === 1) ctx.rotate(Math.PI); 
            }

            // PIVOT FIX: 
            // Instead of drawing from -drawW/2, -drawH/2 (Center)
            // We draw from -drawW/2, -drawH (Bottom)
            // This makes the (0,0) point the BOTTOM MIDDLE of the handle.
            ctx.drawImage(
                assets.taps,
                this.index * frameW, this.pulled ? frameH : 0, 
                frameW, frameH, 
                -drawW / 2, -drawH, // <--- This anchors it to the bottom
                drawW, drawH
            );
            
            ctx.restore();
        }
    }
}

class Customer {
    constructor(lane, img) { this.img = img; this.x = canvas.width * CONFIG.Stations[lane] - 100; }
    draw() {
        if (!this.img) return;
        const frameW = this.img.width / (this.img.width > this.img.height * 2 ? 4 : 1);
        const drawH = SPRITE_DATA.customer.h;
        const drawW = drawH * (frameW / this.img.height);
        this.y = CONFIG.BarHeight - drawH;
        ctx.save();
        ctx.translate(this.x + drawW, this.y + 40);
        ctx.scale(-1, 1);
        ctx.drawImage(this.img, 0, 0, frameW, this.img.height, 0, 0, drawW, drawH);
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
                const game = new Game();
                (function loop() {
                    ctx.clearRect(0,0,canvas.width, canvas.height);
                    game.update();
                    game.draw();
                    requestAnimationFrame(loop);
                })();
            }
        };
    });
}
loadImages();
