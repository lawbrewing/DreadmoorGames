/**
 * TAPROOM TAPPER - HUD DEBUG MODE
 * This prints text on screen to tell us where the customers are hiding.
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- 1. CONFIG ---
const CONFIG = {
    BarHeight: window.innerHeight * 0.7, // Place bar at 70% down the screen
    Stations: [0.2, 0.5, 0.8], // 20%, 50%, 80% width
    SpawnRate: 1000, // Spawn fast (1 second) for testing!
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
    // Make them HUGE so we can't miss them
    beer: { w: 32, h: 32, scale: 3.0 },
    customer: { w: 64, h: 64, scale: 4.0 }
};

// --- 3. GAME ENGINE ---

class Game {
    constructor() {
        this.width = canvas.width;
        this.height = canvas.height;
        this.customers = [];
        this.timer = 2000; // Start ready to spawn
        
        // Force spawn immediately
        this.spawnCustomer();
    }

    spawnCustomer() {
        const lane = Math.floor(Math.random() * 3);
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
        
        this.customers.forEach(c => c.update());
    }

    draw() {
        // 1. Draw Background
        if (assets.bg) ctx.drawImage(assets.bg, 0, 0, this.width, this.height);
        
        // 2. Draw Customers
        this.customers.forEach(c => c.draw());

        // 3. DRAW DEBUG HUD (The important part!)
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, 300, 200);
        ctx.fillStyle = "#0f0"; // Bright Green
        ctx.font = "16px monospace";
        ctx.fillText(`Canvas: ${this.width}x${this.height}`, 10, 20);
        ctx.fillText(`Customers: ${this.customers.length}`, 10, 40);
        
        this.customers.forEach((c, i) => {
            if (i < 5) { // Only show first 5
                ctx.fillText(`C${i}: X=${Math.floor(c.x)} Y=${Math.floor(c.y)} Type=${c.type}`, 10, 70 + (i*20));
            }
        });
    }
}

class Customer {
    constructor(lane, type) {
        this.type = type;
        this.targetX = canvas.width * CONFIG.Stations[lane];
        this.x = canvas.width - 50; // Start visible on right edge
        this.y = CONFIG.BarHeight; 
        this.state = 'walking';
    }

    update() {
        // Move Left
        if (this.x > this.targetX) {
            this.x -= 5;
        }
    }

    draw() {
        const sprite = assets.customers[this.type];
        
        // DRAW RED BOX (In case sprite is invisible)
        ctx.fillStyle = "red";
        ctx.fillRect(this.x, this.y, 50, 50);

        // DRAW SPRITE
        if (sprite) {
             const s = SPRITE_DATA.customer;
             // Simple draw (no fancy flipping yet)
             ctx.drawImage(sprite, 0, 0, s.w, s.h, this.x, this.y, s.w*s.scale, s.h*s.scale);
        }
    }
}

// --- BOOTSTRAP ---
const assets = { customers: {} };
let game;

function loadImages() {
    const list = [
        {k:'bg', src: ASSETS.bg},
        ...Object.keys(ASSETS.customers).map(k => ({k:k, src:ASSETS.customers[k], isCust:true}))
    ];

    let loaded = 0;
    list.forEach(item => {
        const img = new Image();
        img.src = item.src;
        img.onload = () => {
            if(item.isCust) assets.customers[item.k] = img;
            else assets[item.k] = img;
            checkLoad(++loaded, list.length);
        };
        img.onerror = () => checkLoad(++loaded, list.length);
    });
}

function checkLoad(count, total) {
    if (count === total) init();
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

loadImages();
