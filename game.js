/**
 * TAPROOM TAPPER - PHASE 3: REAL TAPS
 * Features: 
 * 1. Static Towers + Animated Handles
 * 2. "Waist Up" Perspective
 * 3. Auto-Scaling Assets
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- 1. CONFIGURATION ---
const CONFIG = {
    BarHeight: window.innerHeight * 0.40, // Where customers stand
    
    // TAP POSITIONING
    TapY: window.innerHeight * 0.55, // Where the Taps sit (Lower than bar top)
    Stations: [0.2, 0.5, 0.8],       // Left, Center, Right (Screen %)
    
    // GAMEPLAY
    SpawnRate: 2000, 
    BeerSpeed: 15,
};

// --- 2. ASSETS ---
const ASSETS = {
    bg: 'assets/background.png',
    beers: 'assets/fullpints.png',
    // NEW FILES
    tower: 'assets/towers.png', 
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

// --- 3. SPRITE CONFIG (THE CONTROL PANEL) ---
const SPRITE_DATA = {
    // CUSTOMERS
    customer: { h: 600, frames: 4 }, // Target Height: 600px

    // TOWER (The Metal Base)
    tower: { 
        h: 300, // Target Height: 300px
        w: 150  // Approximate Width (Auto-corrected by ratio)
    },

    // TAP HANDLES (The Moving Part)
    taps: {
        h: 120, // Target Height for handle
        // IMPORTANT: How is taps.png organized?
        // If it has 3 columns (Left, Center, Right handles)
        // And 2 Rows (Row 0 = Closed, Row 1 = Open)
        cols: 3, 
        rows: 2,
        
        // Offset: Where does the handle connect to the tower?
        // (0,0 is top-left of tower). Try tweaking these!
        offsetX: 50, 
        offsetY: 20  
    }
};

// --- 4. ENGINE ---

class Game {
    constructor() {
        this.width = canvas.width;
        this.height = canvas.height;
        this.customers = [];
        this.beers = [];
        this.taps = [];
        this.timer = 0;
        
        // Initialize 3 Taps
        CONFIG.Stations.forEach((xRatio, index) => {
            this.taps.push(new TapStation(index, xRatio));
        });

        // Input
        const handleInput = (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
            const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
            
            // Check Taps
            this.taps.forEach(tap => {
                // Hitbox: 150px wide around the tap center
                if (Math.abs(x - tap.x) < 80 && y > CONFIG.TapY) {
                    tap.pull();
                    this.spawnBeer(tap);
                }
            });
        };
        canvas.addEventListener('touchstart', handleInput, {passive: false});
        canvas.addEventListener('mousedown', handleInput);

        this.spawnCustomer();
    }

    spawnBeer(tap) {
        this.beers.push(new Beer(tap.x, tap.y));
    }

    spawnCustomer() {
        const lane = Math.floor(Math.random() * 3);
        const types = Object.keys(ASSETS.customers);
        const type = types[Math.floor(Math.random() * types.length)];
        this.customers.push(new Customer(lane, type));
    }

    update() {
        this.timer += 16;
        if (this.timer > CONFIG.SpawnRate) {
            this.spawnCustomer();
            this.timer = 0;
        }
        
        this.customers.forEach(c => c.update());
        this.taps.forEach(t => t.update());
        this.beers.forEach(b => b.update());
        
        // Cleanup
        this.customers = this.customers.filter(c => c.x > -300);
        this.beers = this.beers.filter(b => b.y > 0);
    }

    draw() {
        // 1. BG
        if (assets.bg) ctx.drawImage(assets.bg, 0, 0, this.width, this.height);
        else { ctx.fillStyle = "#333"; ctx.fillRect(0,0,this.width, this.height); }

        // 2. Customers
        this.customers.forEach(c => c.draw());

        // 3. Beers
        this.beers.forEach(b => b.draw());

        // 4. Taps
        this.taps.forEach(t => t.draw());
    }
}

class TapStation {
    constructor(index, xRatio) {
        this.index = index; // 0, 1, or 2
        this.x = canvas.width * xRatio;
        this.y = CONFIG.TapY;
        this.pulled = false;
        this.pullTimer = 0;
    }

    pull() {
        if (!this.pulled) {
            this.pulled = true;
            this.pullTimer = 15; // Handle stays down for 15 frames
            // playSound('pour');
        }
    }

    update() {
        if (this.pulled) {
            this.pullTimer--;
            if (this.pullTimer <= 0) this.pulled = false;
        }
    }

    draw() {
        // A. DRAW TOWER (Static Base)
        if (assets.tower) {
            const s = SPRITE_DATA.tower;
            const ratio = assets.tower.width / assets.tower.height;
            const drawW = s.h * ratio;
            
            // Draw centered on station X
            ctx.drawImage(assets.tower, this.x - (drawW/2), this.y, drawW, s.h);
        }

        // B. DRAW HANDLE (Animated)
        if (assets.taps) {
            const s = SPRITE_DATA.taps;
            
            // Calculate Frame Logic
            // Column = The Station Index (0, 1, 2)
            // Row = State (0 = Closed, 1 = Open)
            const col = this.index; 
            const row = this.pulled ? 1 : 0; 

            // Calculate Crop (Source)
            const frameW = assets.taps.width / s.cols;
            const frameH = assets.taps.height / s.rows;

            // Calculate Draw Size (Dest)
            const ratio = frameW / frameH;
            const drawH = s.h;
            const drawW = drawH * ratio;

            // Positioning offset (relative to Tower center)
            const drawX = (this.x - (drawW/2)); // Centered
            const drawY = this.y + s.offsetY;   // Nudged down slightly

            ctx.drawImage(
                assets.taps,
                col * frameW, row * frameH, frameW, frameH, // Crop
                drawX, drawY, drawW, drawH                  // Draw
            );
        } else {
            // Fallback Red Box
            ctx.fillStyle = this.pulled ? "orange" : "red";
            ctx.fillRect(this.x - 25, this.y, 50, 100);
        }
    }
}

class Beer {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vy = -CONFIG.BeerSpeed;
    }
    update() { this.y += this.vy; }
    draw() {
        ctx.fillStyle = "gold";
        ctx.beginPath(); ctx.arc(this.x, this.y, 20, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "white"; // Foam
        ctx.beginPath(); ctx.arc(this.x, this.y-10, 15, 0, Math.PI*2); ctx.fill();
    }
}

// ... (Customer Logic - Same as before, included for completeness) ...
class Customer {
    constructor(lane, type) {
        this.type = type;
        this.targetX = canvas.width * CONFIG.Stations[lane];
        this.x = canvas.width + 200; 
        this.y = CONFIG.BarHeight; 
        this.state = 'walking';
        this.frameX = 0;
        this.tick = 0;
        
        // Auto-Detect Frames
        const sprite = assets.customers[this.type];
        if (sprite && sprite.width > sprite.height * 2) this.frameCount = 4;
        else this.frameCount = 1;
    }

    update() {
        if (this.x > this.targetX) {
            this.x -= 8;
            if (this.frameCount > 1) {
                this.tick++;
                if (this.tick > 10) {
                    this.frameX = (this.frameX + 1) % this.frameCount;
                    this.tick = 0;
                }
            }
        }
    }

    draw() {
        const sprite = assets.customers[this.type];
        if (sprite) {
            const frameW = sprite.width / this.frameCount;
            const frameH = sprite.height; 
            const ratio = frameW / frameH;
            const drawH = SPRITE_DATA.customer.h;
            const drawW = drawH * ratio;

            ctx.save();
            ctx.translate(this.x + drawW, this.y); 
            ctx.scale(-1, 1); 
            ctx.drawImage(sprite, this.frameX * frameW, 0, frameW, frameH, 0, 0, drawW, drawH);
            ctx.restore();
        }
    }
}

// --- BOOTSTRAP ---
const assets = { customers: {} };
let game;

function loadImages() {
    const list = [
        {k:'bg', src: ASSETS.bg},
        {k:'towers', src: ASSETS.tower}, // Load Towers
        {k:'taps', src: ASSETS.taps},    // Load Taps
        {k:'beers', src: ASSETS.beers},
        ...Object.keys(ASSETS.customers).map(k => ({k:k, src:ASSETS.customers[k], isCust:true}))
    ];

    list.forEach(item => {
        const img = new Image();
        img.src = item.src;
        img.onload = () => {
            if(item.isCust) assets.customers[item.k] = img;
            else if(item.k === 'towers') assets.tower = img;
            else if(item.k === 'taps') assets.taps = img;
            else assets[item.k] = img;
        };
    });
    setTimeout(init, 500); 
}

function init() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    game = new Game();
    animate();
}

function animate() {
    ctx.clearRect(0,0,canvas.width, canvas.height);
    if(game) { game.update(); game.draw(); }
    requestAnimationFrame(animate);
}

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if(game) { game.width = canvas.width; game.height = canvas.height; }
});

loadImages();
