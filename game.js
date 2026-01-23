const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- 1. CONFIGURATION ---
const CONFIG = {
    BarHeight: window.innerHeight * 0.40, 
    TapY: window.innerHeight * 0.65, 
    Stations: [0.2, 0.5, 0.8], 
    SpawnRate: 2000, 
    BeerSpeed: 12,
};

// --- 2. ASSETS ---
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

// --- 3. THE CALIBRATION TABLE ---
const SPRITE_DATA = {
    customer: { h: 600 },
    tower: { h: 350, cols: 3 },
    beer: { w: 64, h: 64, scale: 2.0 },
    
    // ADJUST THESE INDEPENDENTLY
    // 0 = Left, 1 = Center, 2 = Right
    taps: [
        { h: 150, offsetX: 0, offsetY: -130 }, // Left
        { h: 150, offsetX: 0, offsetY: -130 }, // Center
        { h: 150, offsetX: 0, offsetY: -130 }  // Right
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
        
        // Initialize Taps safely
        CONFIG.Stations.forEach((xRatio, index) => {
            const calibration = SPRITE_DATA.taps[index] || { h: 150, offsetX: 0, offsetY: -110 };
            this.taps.push(new TapStation(index, xRatio, calibration));
        });

        const handleInput = (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
            const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
            
            this.taps.forEach(tap => {
                if (Math.abs(x - tap.x) < 100 && y > CONFIG.BarHeight) {
                    tap.pull();
                    this.beers.push(new Beer(tap.x, tap.y, tap.index));
                }
            });
        };
        canvas.addEventListener('touchstart', handleInput, {passive: false});
        canvas.addEventListener('mousedown', handleInput);
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
        this.beers = this.beers.filter(b => b.y > -100);
    }

    draw() {
        if (assets.bg) ctx.drawImage(assets.bg, 0, 0, this.width, this.height);
        this.customers.forEach(c => c.draw());
        this.beers.forEach(b => b.draw());
        this.taps.forEach(t => t.draw());
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
        this.pullTimer = 10;
    }

    update() {
        if (this.pulled) {
            this.pullTimer--;
            if (this.pullTimer <= 0) this.pulled = false;
        }
    }

    draw() {
        if (assets.tower) {
            const sT = SPRITE_DATA.tower;
            const frameW = assets.tower.width / sT.cols;
            const frameH = assets.tower.height;
            const drawW = sT.h * (frameW / frameH);
            ctx.drawImage(assets.tower, this.index * frameW, 0, frameW, frameH, this.x - (drawW/2), this.y, drawW, sT.h);
        }

        if (assets.taps) {
            const frameW = assets.taps.width / 3;
            const frameH = assets.taps.height / 2;
            const drawW = this.cal.h * (frameW / frameH);
            const row = this.pulled ? 1 : 0;

            ctx.drawImage(
                assets.taps,
                this.index * frameW, row * frameH, frameW, frameH,
                (this.x - (drawW/2)) + this.cal.offsetX, 
                this.y + this.cal.offsetY, 
                drawW, 
                this.cal.h
            );
        }
    }
}

class Beer {
    constructor(x, y, typeIndex) {
        this.x = x; this.y = y; this.typeIndex = typeIndex; 
    }
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
