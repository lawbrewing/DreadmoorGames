
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- 1. CONFIGURATION (Live State) ---
let CONFIG = {
    BarHeight: 719, 
    TapY: 376,
    Stations: [0.2, 0.5, 0.8], 
};

let SPRITE_DATA = {
    customer: { h: 369, frames: 1 }, // We'll detect frames automatically
    tower: { h: 433, cols: 3 },
    taps: [
        { h: 150, offsetX: -1, offsetY: -15 }, 
        { h: 150, offsetX: -32, offsetY: -9 }, 
        { h: 150, offsetX: -54, offsetY: -15 }  
    ]
};

const ASSETS = {
    bg: 'assets/background.png',
    beers: 'assets/fullpints.png',
    tower: 'assets/tower.png', 
    taps: 'assets/taps.png',    
    customers: { regular: 'assets/regular.png', viking: 'assets/viking.png' } 
};

class Game {
    constructor() {
        this.width = canvas.width;
        this.height = canvas.height;
        this.taps = [];
        this.testCustomer = null; 
        this.selectedItem = null; 
        
        CONFIG.Stations.forEach((xRatio, index) => {
            this.taps.push(new TapStation(index, xRatio, SPRITE_DATA.taps[index]));
        });

        // Spawn one permanent test customer for dragging
        this.testCustomer = new Customer(1, 'regular');

        const handleDown = (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
            const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
            
            // 1. Check Customer (Drag body to move BarHeight, drag head/top to change Size)
            const c = this.testCustomer;
            const cWidth = SPRITE_DATA.customer.h * 0.6; // Approx width
            if (x > c.x && x < c.x + cWidth && y > c.y && y < c.y + SPRITE_DATA.customer.h) {
                if (y < c.y + 100) this.selectedItem = { type: 'custSize' };
                else this.selectedItem = { type: 'bar' };
                return;
            }

            // 2. Check Taps and Towers
            this.taps.forEach(tap => {
                if (Math.abs(x - (tap.x + tap.cal.offsetX)) < 40 && Math.abs(y - (tap.y + tap.cal.offsetY)) < 60) {
                    this.selectedItem = { type: 'handle', obj: tap };
                } 
                else if (Math.abs(x - tap.x) < 60 && Math.abs(y - tap.y) < 150) {
                    this.selectedItem = { type: 'tower', obj: tap };
                }
            });
        };

        const handleMove = (e) => {
            if (!this.selectedItem) return;
            const rect = canvas.getBoundingClientRect();
            const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

            if (this.selectedItem.type === 'tower') {
                CONFIG.TapY = y;
            } else if (this.selectedItem.type === 'handle') {
                const t = this.selectedItem.obj;
                const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
                t.cal.offsetX = x - t.x;
                t.cal.offsetY = y - t.y;
            } else if (this.selectedItem.type === 'bar') {
                CONFIG.BarHeight = y;
            } else if (this.selectedItem.type === 'custSize') {
                // Changing height based on distance from the bar line
                SPRITE_DATA.customer.h = Math.max(100, CONFIG.BarHeight - y);
            }
        };

        const handleUp = () => { this.selectedItem = null; };

        canvas.addEventListener('mousedown', handleDown);
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        canvas.addEventListener('touchstart', handleDown, {passive: false});
        window.addEventListener('touchmove', handleMove, {passive: false});
        window.addEventListener('touchend', handleUp);
    }

    draw() {
        if (assets.bg) ctx.drawImage(assets.bg, 0, 0, this.width, this.height);
        
        // Visual Guide for BarHeight
        ctx.strokeStyle = "yellow";
        ctx.beginPath(); ctx.moveTo(0, CONFIG.BarHeight); ctx.lineTo(this.width, CONFIG.BarHeight); ctx.stroke();

        if (this.testCustomer) {
            this.testCustomer.y = CONFIG.BarHeight - SPRITE_DATA.customer.h;
            this.testCustomer.draw();
        }

        this.taps.forEach(t => t.draw());

        // --- HUD ---
        ctx.fillStyle = "rgba(0,0,0,0.85)";
        ctx.fillRect(10, 10, 450, 220);
        ctx.fillStyle = "#0f0";
        ctx.font = "13px monospace";
        ctx.fillText("🛠 MASTER CALIBRATION LAB", 20, 30);
        ctx.fillText(`CUSTOMER HEIGHT (Drag head): ${Math.round(SPRITE_DATA.customer.h)}`, 20, 60);
        ctx.fillText(`BAR HEIGHT (Drag customer body): ${Math.round(CONFIG.BarHeight)}`, 20, 80);
        ctx.fillText(`TOWER Y (Drag metal towers): ${Math.round(CONFIG.TapY)}`, 20, 100);
        ctx.fillText("------------------------------------------", 20, 115);
        this.taps.forEach((t, i) => {
            ctx.fillText(`Tap ${i} Handle: offsetX: ${Math.round(t.cal.offsetX)}, offsetY: ${Math.round(t.cal.offsetY)}`, 20, 135 + (i * 20));
        });
        ctx.fillStyle = "#666";
        ctx.fillText("Drag Customer Head to Scale | Body to set Bar Line", 20, 205);
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
        this.pullTimer = 20; // Slightly longer to see the rotation
    }

    update() {
        if (this.pulled) {
            this.pullTimer--;
            if (this.pullTimer <= 0) this.pulled = false;
        }
    }

    draw() {
        this.y = CONFIG.TapY;
        // 1. Tower
        if (assets.tower) {
            const frameW = assets.tower.width / 3;
            const drawW = SPRITE_DATA.tower.h * (frameW / assets.tower.height);
            ctx.drawImage(assets.tower, this.index * frameW, 0, frameW, assets.tower.height, this.x - (drawW/2), this.y, drawW, SPRITE_DATA.tower.h);
        }

        // 2. Handle with Smart Rotation & Calibration
        if (assets.taps) {
            const frameW = assets.taps.width / 3;
            const frameH = assets.taps.height / 2;
            const drawW = this.cal.h * (frameW / frameH);
            const drawH = this.cal.h;
            const rowOffset = this.pulled ? frameH : 0;
            
            ctx.save();
            // Translate to the calibrated position
            ctx.translate(this.x + this.cal.offsetX, this.y + this.cal.offsetY);

            // APPLY ROTATION IF PULLED
            if (this.pulled) {
                if (this.index === 0) ctx.rotate(-Math.PI / 2); // Left: -90°
                if (this.index === 1) ctx.rotate(Math.PI);      // Middle: 180°
                if (this.index === 2) ctx.rotate(Math.PI / 2);  // Right: 90°
            }

            // Draw centered on pivot
            ctx.drawImage(
                assets.taps,
                this.index * frameW, rowOffset, frameW, frameH, 
                -drawW / 2, -drawH / 2, drawW, drawH
            );
            
            // Visual feedback for calibration selection
            if (game.selectedItem && game.selectedItem.obj === this) {
                ctx.strokeStyle = "#0f0";
                ctx.strokeRect(-drawW/2, -drawH/2, drawW, drawH);
            }

            ctx.restore();
        }
    }
}

class Customer {
    constructor(lane, type) {
        this.type = type;
        this.x = canvas.width * CONFIG.Stations[lane] - 100;
        this.y = CONFIG.BarHeight - SPRITE_DATA.customer.h;
    }
    draw() {
        const sprite = assets.customers[this.type];
        if (sprite) {
            const frameCount = (sprite.width > sprite.height * 2) ? 4 : 1;
            const frameW = sprite.width / frameCount;
            const ratio = frameW / sprite.height;
            const drawH = SPRITE_DATA.customer.h;
            const drawW = drawH * ratio;
            
            ctx.save();
            // Added "+ 40" here to sink them 40 pixels INTO the bar
            // Adjust this number until they look grounded
            ctx.translate(this.x + drawW, (CONFIG.BarHeight - drawH) + 40);
            ctx.scale(-1, 1);
            ctx.drawImage(sprite, 0, 0, frameW, sprite.height, 0, 0, drawW, drawH);
            ctx.restore();
        }
    }
}

// --- BOOTSTRAP ---
const assets = { customers: {} };
function loadImages() {
    const list = [
        {k:'bg', src: ASSETS.bg}, {k:'tower', src: ASSETS.tower},
        {k:'taps', src: ASSETS.taps}, {k:'beers', src: ASSETS.beers},
        ...Object.keys(ASSETS.customers).map(k => ({k:k, src:ASSETS.customers[k], isCust:true}))
    ];
    let loaded = 0;
    list.forEach(item => {
        const img = new Image(); img.src = item.src;
        img.onload = () => {
            if(item.isCust) assets.customers[item.k] = img;
            else assets[item.k] = img;
            if(++loaded === list.length) {
                canvas.width = window.innerWidth; canvas.height = window.innerHeight;
                let game = new Game();
                requestAnimationFrame(function loop() {
                    ctx.clearRect(0,0,canvas.width, canvas.height);
                    game.draw();
                    requestAnimationFrame(loop);
                });
            }
        };
    });
}
loadImages();
