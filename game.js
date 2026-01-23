/**
 * TAPROOM TAPPER - WAIST UP EDITION (STABLE)
 * Features: Fixed Stations, Waist-Up Sprites, Crash Reporter
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- 1. CONFIGURATION ---
const CONFIG = {
    // VISUALS
    // Where the bar counter is (Y-coordinate). 
    // Increase this number to move customers DOWN.
    BarHeight: 600, 
    
    // The 3 "Seats" where customers stand (Left, Center, Right)
    Stations: [0.2, 0.5, 0.8], 

    // GAMEPLAY
    SpawnRate: 2500, // Milliseconds between customers
    BeerSpeed: 15,   // How fast beer slides UP/Across
};

// --- 2. ASSETS ---
const ASSETS = {
    bg: 'assets/background.png',
    beers: 'assets/fullpints.png',
    customers: {
        regular: 'assets/regular.png',
        hipster: 'assets/hipster.png',
        viking: 'assets/viking.png',
        karen: 'assets/karen.png',
        vip: 'assets/vip.png',
        judge: 'assets/judge.png'
    }
};

const SPRITE_DATA = {
    beer: { w: 32, h: 32, scale: 3.0 },
    customer: { 
        w: 64, h: 64, 
        scale: 4.0, // Big "Portrait" size (Waist Up)
        animSpeed: 15 
    }
};

// --- 3. GAME CLASSES ---

class Game {
    constructor() {
        this.width = canvas.width;
        this.height = canvas.height;
        this.beers = [];
        this.customers = [];
        this.timer = 0;
        
        // Input (Tap specific zones)
        canvas.addEventListener('touchstart', (e) => this.handleInput(e), {passive: false});
        canvas.addEventListener('mousedown', (e) => this.handleInput(e));
    }

    handleInput(e) {
        e.preventDefault();
        // Simple logic: Divide screen into 3 columns
        const x = (e.touches ? e.touches[0].clientX : e.clientX);
        const colWidth = this.width / 3;
        
        let laneIndex = 0;
        if (x > colWidth && x < colWidth * 2) laneIndex = 1;
        if (x > colWidth * 2) laneIndex = 2;

        this.spawnBeer(laneIndex);
    }

    spawnBeer(laneIndex) {
        // Spawn beer at the bottom of that column
        this.beers.push(new Beer(laneIndex));
    }

    spawnCustomer() {
        // Pick random lane (0, 1, 2)
        const lane = Math.floor(Math.random() * 3);
        
        // Pick random type
        const types = Object.keys(ASSETS.customers);
        const type = types[Math.floor(Math.random() * types.length)];
        
        this.customers.push(new Customer(lane, type));
    }

    update() {
        // Spawner
        this.timer += 16;
        if (this.timer > CONFIG.SpawnRate) {
            this.spawnCustomer();
            this.timer = 0;
        }

        // Update Entities
        this.beers.forEach(b => b.update());
        this.customers.forEach(c => c.update());

        // Simple Cleanup
        this.beers = this.beers.filter(b => !b.delete);
        this.customers = this.customers.filter(c => !c.delete);
    }

    draw() {
        // 1. Draw Background
        if (assets.bg) ctx.drawImage(assets.bg, 0, 0, this.width, this.height);
        else { ctx.fillStyle = "#222"; ctx.fillRect(0,0,this.width, this.height); }

        // 2. Draw Entities
        this.beers.forEach(b => b.draw());
        this.customers.forEach(c => c.draw());
    }
}

class Customer {
    constructor(lane, type) {
        this.lane = lane;
        this.type = type;
        
        // Target X: Convert percentage (0.2) to pixels
        this.targetX = canvas.width * CONFIG.Stations[lane];
        
        // Start from Right edge
        this.x = canvas.width + 100;
        
        // Y Position: Bar Height minus Sprite Height
        const s = SPRITE_DATA.customer;
        this.y = CONFIG.BarHeight - (s.h * s.scale) + 50; // +50 to tuck them behind bar slightly
        
        this.state = 'walking';
        this.frameX = 0;
        this.tick = 0;
    }

    update() {
        if (this.state === 'walking') {
            if (this.x > this.targetX) {
                this.x -= 8; // Walking Speed
                
                // Animate Legs
                this.tick++;
                if (this.tick > 10) {
                    this.frameX = (this.frameX + 1) % 2; // Toggle frames
                    this.tick = 0;
                }
            } else {
                this.x = this.targetX;
                this.state = 'waiting';
                this.frameX = 0; // Stand still
            }
        }
    }

    draw() {
        const sprite = assets.customers[this.type];
        if (!sprite) return; // Safety check

        const s = SPRITE_DATA.customer;
        
        // Flip Logic (Face Left)
        ctx.save();
        ctx.translate(this.x + (s.w * s.scale), this.y);
        ctx.scale(-1, 1);
        
        ctx.drawImage(
            sprite, 
            this.frameX * s.w, 0, s.w, s.h, 
            0, 0, s.w * s.scale, s.h * s.scale
        );
        ctx.restore();
    }
}

class Beer {
    constructor(lane) {
        this.lane = lane;
        // Start at user (Bottom of screen)
        this.x = (canvas.width * CONFIG.Stations[lane]) + 20; 
        this.y = canvas.height - 100; 
        this.delete = false;
    }

    update() {
        this.y -= CONFIG.BeerSpeed; // Slide UP towards the bar
        if (this.y < CONFIG.BarHeight - 50) this.delete = true; // Reached bar
    }

    draw() {
        const s = SPRITE_DATA.beer;
        if(assets.beers) {
            ctx.drawImage(assets.beers, 0,0, s.w, s.h, this.x, this.y, s.w*s.scale, s.h*s.scale);
        } else {
            ctx.fillStyle = "gold"; ctx.fillRect(this.x, this.y, 40, 60);
        }
    }
}

// --- 4. BOOTSTRAP WITH ERROR TRAPPING ---
const assets = { customers: {} };
let game;

function loadImages() {
    const list = [
        {k:'bg', src: ASSETS.bg},
        {k:'beers', src: ASSETS.beers},
        ...Object.keys(ASSETS.customers).map(k => ({k:k, src:ASSETS.customers[k], isCust:true}))
    ];

    let loaded = 0;
    list.forEach(item => {
        const img = new Image();
        img.src = item.src;
        img.onload = () => {
            if(item.isCust) assets.customers[item.k] = img;
            else assets[item.k] = img;
            loaded++;
            if(loaded === list.length) init();
        };
        // If image fails, don't crash, just log it
        img.onerror = () => {
            console.error("Failed to load: " + item.src);
            loaded++; // Count it anyway so game starts
            if(loaded === list.length) init();
        };
    });
}

function init() {
    resize();
    game = new Game();
    animate();
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if(game) { game.width = canvas.width; game.height = canvas.height; }
}

function animate() {
    // CRASH TRAP
    try {
        ctx.clearRect(0,0,canvas.width, canvas.height);
        if(game) {
            game.update();
            game.draw();
        }
        requestAnimationFrame(animate);
    } catch (err) {
        // DRAW ERROR ON SCREEN
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.fillRect(0,0,canvas.width, canvas.height);
        ctx.fillStyle = "red";
        ctx.font = "20px monospace";
        ctx.fillText("CRASH ERROR:", 50, 100);
        ctx.fillText(err.message, 50, 140);
        console.error(err);
    }
}

window.addEventListener('resize', resize);
loadImages();
