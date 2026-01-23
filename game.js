/**
 * TAPROOM TAPPER - MASTER CALIBRATION EDITION
 * Controls: 
 * - Drag Customer Body: Set Bar Height line
 * - Drag Customer Head: Set Customer Scale
 * - Drag Metal Towers: Set Tower Y (Global)
 * - Drag Tap Handles: Set individual X/Y offsets
 * - Click/Tap Tower: Test 'Pull' animation with rotation
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- 1. CONFIGURATION (Current State) ---
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
    // Individual Calibration for handles
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
    customers: { 
        regular: 'assets/regular.png', 
        viking: 'assets/viking.png' 
    } 
};

// --- 2. ENGINE ---

class Game {
    constructor() {
        this.width = canvas.width;
        this.height = canvas.height;
        this.taps = [];
        this.beers = [];
        this.testCustomer = null; 
        this.selectedItem = null; 
        
        // Initialize 3 Taps
        CONFIG.Stations.forEach((xRatio, index) => {
            this.taps.push(new TapStation(index, xRatio, SPRITE_DATA.taps[index]));
        });

        // Test Patron
        this.testCustomer = new Customer(1, 'regular');

        this.initInput();
    }

    initInput() {
        const handleDown = (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
            const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
            
            // 1. Check Customer (Drag body = BarHeight, Drag head = Size)
            const c = this.testCustomer;
            const cWidth = SPRITE_DATA.customer.h * 0.6; 
            if (x > c.x && x < c.x + cWidth && y > c.y && y < c.y + SPRITE_DATA.customer.h) {
                if (y < c.y + 100) this.selectedItem = { type: 'custSize' };
                else this.selectedItem = { type: 'bar' };
                return;
            }

            // 2. Check Taps and Towers
            this.taps.forEach(tap => {
                // Clicked Handle?
                if (Math.abs(x - (tap.x + tap.cal.offsetX)) < 50 && Math.abs(y - (tap.y + tap.cal.offsetY)) < 80) {
                    this.selectedItem = { type: 'handle', obj: tap };
                } 
                // Clicked Tower?
                else if (Math.abs(x - tap.x) < 60 && Math.abs(y - tap.y) < 200) {
                    tap.pull(); // Visual test
                    this.selectedItem = { type: 'tower', obj: tap };
                }
            });
        };

        const handleMove = (e) => {
            if (!this.selectedItem) return;
            const rect = canvas.getBoundingClientRect();
            const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
            const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

            if (this.selectedItem.type === 'tower') CONFIG.TapY = y;
            else if (this.selectedItem.type === 'handle') {
                const t = this.selectedItem.obj;
                t.cal.offsetX = x - t.x;
                t.cal.offsetY = y - t.y;
            } else if (this.selectedItem.type === 'bar') {
                CONFIG.BarHeight = y;
            } else if (this.selectedItem.type === 'custSize') {
                SPRITE_DATA.customer.h = Math.max(50, CONFIG.BarHeight - y);
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

    update() {
        this.taps.forEach(t => t.update());
    }

    draw() {
        // 1. Background
        if (assets.bg) ctx.drawImage(assets.bg, 0, 0, this.width, this.height);
        
        // 2. Bar Line Guide
        ctx.strokeStyle = "yellow";
        ctx.beginPath(); ctx.moveTo(0, CONFIG.BarHeight); ctx.lineTo(this.width, CONFIG.BarHeight); ctx.stroke();

        // 3. Customer
        if (this.testCustomer) this.testCustomer.draw();

        // 4. Taps & Towers
        this.taps.forEach(t => t.draw());

        // 5. Calibration HUD
        ctx.fillStyle = "rgba(0,0,0,0.85)";
        ctx.fillRect(10, 10, 480, 240);
        ctx.fillStyle = "#0f0";
        ctx.font = "13px monospace";
        ctx.fillText("🛠 MASTER CALIBRATION LAB", 20, 30);
        ctx.fillText(`CUSTOMER HEIGHT (Drag head): ${Math.round(SPRITE_DATA.customer.h)}`, 20, 60);
        ctx.fillText(`BAR HEIGHT (Drag customer): ${Math.round(CONFIG.BarHeight)}`, 20, 80);
        ctx.fillText(`TOWER Y (Drag towers): ${Math.round(CONFIG.TapY)}`, 20, 100);
        ctx.fillText("------------------------------------------", 20, 115);
        this.taps.forEach((t, i) => {
            ctx.fillText(`Tap ${i} Handle: offsetX: ${Math.round(t.cal.offsetX)}, offsetY: ${Math.round(t.cal.offsetY)}`, 20, 135 + (i * 20));
        });
        ctx.fillStyle = "#aaa";
        ctx.fillText("Drag items to align. Click Tower to test rotation.", 20, 210);
        ctx.fillText("Update CONFIG & SPRITE_DATA with these numbers.", 20, 230);
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
        if (this.pulled) {
            this.pullTimer--;
            if (this.pullTimer <= 0) this.pulled = false;
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

        // 2. Draw Handle with Rotation Fix
        if (assets.taps) {
            const frameW = assets.taps.width / 3;
            const frameH = assets.taps.height / 2;
            const drawW = this.cal.h * (frameW / frameH);
            const drawH = this.cal.h;
            const rowOffset = this.pulled ? frameH : 0;

            ctx.save();
            ctx.translate(this.x + this.cal.offsetX, this.y + this.cal.offsetY);

            if (this.pulled) {
                if (this.index === 0) ctx.rotate(-Math.PI / 2); // Left Side
                if (this.index === 1) ctx.rotate(Math.PI);      // Middle (Upside down)
                if (this.index === 2) ctx.rotate(Math.PI / 2);  // Right Side
            }

            ctx.drawImage(assets.taps, this.index * frameW, rowOffset, frameW, frameH, -drawW/2, -drawH/2, drawW, drawH);
            ctx.restore();
        }
    }
}

class Customer {
    constructor(lane, type) {
        this.type = type;
        this.x = canvas.width * CONFIG.Stations[lane] - 100;
    }
    draw() {
        const sprite = assets.customers[this.type];
        if (sprite) {
            const frameCount = (sprite.width > sprite.height * 2) ? 4 : 1;
            const frameW = sprite.width / frameCount;
            const drawH = SPRITE_DATA.customer.h;
            const drawW = drawH * (frameW / sprite.height);
            this.y = CONFIG.BarHeight - drawH;

            ctx.save();
            // Includes the 40px "sink" to ground them on the bar
            ctx.translate(this.x + drawW, this.y + 40);
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
                    game.update();
                    game.draw();
                    requestAnimationFrame(loop);
                });
            }
        };
    });
}
loadImages();
