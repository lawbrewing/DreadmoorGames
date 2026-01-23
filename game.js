const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const CONFIG = {
    BarHeight: window.innerHeight * 0.40, 
    TapY: window.innerHeight * 0.55, // Adjusted higher as requested
    Stations: [0.2, 0.5, 0.8], 
    SpawnRate: 2500, 
    BeerSpeed: 12,
};

const ASSETS = {
    bg: 'assets/background.png',
    beers: 'assets/fullpints.png',
    tower: 'assets/tower.png', 
    taps: 'assets/taps.png',    
    customers: {
        regular: 'assets/regular.png',
        hipster: 'assets/hipster.png',
        viking: 'assets/viking.png',
        karen: 'assets/karen.png',
        vip: 'assets/vip.png',
        judge: 'assets/judge.png'
    }
};

// --- STARTING VALUES (Copy your final results from the screen back to here!) ---
const SPRITE_DATA = {
    customer: { h: 600 },
    tower: { h: 350, cols: 3 },
    beer: { w: 64, h: 64, scale: 2.0 },
    taps: [
        { h: 150, offsetX: 0, offsetY: -110 }, 
        { h: 150, offsetX: 0, offsetY: -110 }, 
        { h: 150, offsetX: 0, offsetY: -110 }  
    ]
};

class Game {
    constructor() {
        this.width = canvas.width;
        this.height = canvas.height;
        this.customers = [];
        this.beers = [];
        this.taps = [];
        this.timer = 0;
        this.selectedTap = null; // For Calibration
        
        CONFIG.Stations.forEach((xRatio, index) => {
            const calibration = SPRITE_DATA.taps[index];
            this.taps.push(new TapStation(index, xRatio, calibration));
        });

        // --- CALIBRATION INPUT ---
        const handleDown = (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
            const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
            
            this.taps.forEach(tap => {
                // If you click near a handle, select it
                if (Math.abs(x - tap.x) < 50 && Math.abs(y - (tap.y + tap.cal.offsetY)) < 100) {
                    this.selectedTap = tap;
                }
            });
        };

        const handleMove = (e) => {
            if (!this.selectedTap) return;
            const rect = canvas.getBoundingClientRect();
            const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
            const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

            // Update offsets in real-time
            this.selectedTap.cal.offsetX = x - this.selectedTap.x;
            this.selectedTap.cal.offsetY = y - this.selectedTap.y;
        };

        const handleUp = () => { this.selectedTap = null; };

        canvas.addEventListener('mousedown', handleDown);
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        
        canvas.addEventListener('touchstart', handleDown, {passive: false});
        window.addEventListener('touchmove', handleMove, {passive: false});
        window.addEventListener('touchend', handleUp);
    }

    update() {
        this.timer += 16;
        if (this.timer > CONFIG.SpawnRate) {
            const lane = Math.floor(Math.random() * 3);
            const types = Object.keys(ASSETS.customers);
            this.customers.push(new Customer(lane, types[Math.floor(Math.random() * types.length)]));
            this.timer = 0;
        }
        this.customers.forEach(c => c.update());
        this.taps.forEach(t => t.update());
        this.beers.forEach(b => b.update());
    }

    draw() {
        if (assets.bg) ctx.drawImage(assets.bg, 0, 0, this.width, this.height);
        this.customers.forEach(c => c.draw());
        this.beers.forEach(b => b.draw());
        this.taps.forEach(t => t.draw());

        // --- CALIBRATION HUD ---
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(10, 10, 350, 120);
        ctx.fillStyle = "#0f0";
        ctx.font = "14px monospace";
        ctx.fillText("DRAG HANDLES TO ALIGN", 20, 30);
        this.taps.forEach((t, i) => {
            ctx.fillText(`Tap ${i}: offsetX: ${Math.round(t.cal.offsetX)}, offsetY: ${Math.round(t.cal.offsetY)}`, 20, 55 + (i * 20));
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

    pull() { /* Disabled pull during calibration to prevent beer spam */ }

    update() {}

    draw() {
        if (assets.tower) {
            const frameW = assets.tower.width / 3;
            const frameH = assets.tower.height;
            const drawW = SPRITE_DATA.tower.h * (frameW / frameH);
            ctx.drawImage(assets.tower, this.index * frameW, 0, frameW, frameH, this.x - (drawW/2), this.y, drawW, SPRITE_DATA.tower.h);
        }

        if (assets.taps) {
            const frameW = assets.taps.width / 3;
            const frameH = assets.taps.height / 2;
            const drawW = this.cal.h * (frameW / frameH);
            ctx.drawImage(assets.taps, this.index * frameW, 0, frameW, frameH, (this.x - (drawW/2)) + this.cal.offsetX, this.y + this.cal.offsetY, drawW, this.cal.h);
            
            // Draw a small selection circle if being dragged
            if (this.pulled) {
                ctx.strokeStyle = "yellow";
                ctx.strokeRect((this.x - (drawW/2)) + this.cal.offsetX, this.y + this.cal.offsetY, drawW, this.cal.h);
            }
        }
    }
}

// ... Beer and Customer classes remain same as previous version ...
class Beer {
    constructor(x, y, typeIndex) { this.x = x; this.y = y; this.typeIndex = typeIndex; }
    update() { this.y -= CONFIG.BeerSpeed; }
    draw() {
        if (assets.beers) {
            const s = SPRITE_DATA.beer;
            ctx.drawImage(assets.beers, this.typeIndex * s.w, 0, s.w, s.h, this.x - (s.w * s.scale / 2), this.y, s.w * s.scale, s.h * s.scale);
        }
    }
}

class Customer {
    constructor(lane, type) {
        this.type = type;
        this.targetX = canvas.width * CONFIG.Stations[lane];
        this.x = canvas.width + 200; this.y = CONFIG.BarHeight; 
        this.frameCount = 1;
        const sprite = assets.customers[this.type];
        if (sprite && sprite.width > sprite.height * 2) this.frameCount = 4;
        this.frameX = 0; this.tick = 0;
    }
    update() {
        if (this.x > this.targetX) {
            this.x -= 8;
            this.tick++;
            if (this.tick > 10) { this.frameX = (this.frameX + 1) % this.frameCount; this.tick = 0; }
        }
    }
    draw() {
        const sprite = assets.customers[this.type];
        if (sprite) {
            const frameW = sprite.width / this.frameCount;
            const ratio = frameW / sprite.height;
            const drawH = SPRITE_DATA.customer.h;
            const drawW = drawH * ratio;
            ctx.save();
            ctx.translate(this.x + drawW, this.y); 
            ctx.scale(-1, 1); 
            ctx.drawImage(sprite, this.frameX * frameW, 0, frameW, sprite.height, 0, 0, drawW, drawH);
            ctx.restore();
        }
    }
}

const assets = { customers: {} };
function loadImages() {
    const list = [
        {k:'bg', src: ASSETS.bg}, {k:'tower', src: ASSETS.tower},
        {k:'taps', src: ASSETS.taps}, {k:'beers', src: ASSETS.beers},
        ...Object.keys(ASSETS.customers).map(k => ({k:k, src:ASSETS.customers[k], isCust:true}))
    ];
    let loaded = 0;
    list.forEach(item => {
        const img = new Image();
        img.src = item.src;
        img.onload = () => {
            if(item.isCust) assets.customers[item.k] = img;
            else assets[item.k] = img;
            if(++loaded === list.length) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
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
