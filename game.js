/**
 * TAPROOM TAPPER - DIAGNOSTIC MODE
 * Use this to find broken images and invisible sprites.
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- DEBUG CONSOLE (On-Screen) ---
const debugLog = [];
function log(msg, color = 'white') {
    debugLog.push({ text: msg, color: color });
}

// --- CONFIG ---
const CONFIG = {
    Lanes: [200, 360, 520],
    BeerSpeed: 5,
    CustomerSpeed: 2,
    SpawnRate: 2000
};

// --- ASSETS ---
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

// --- SPRITE DATA (Check these!) ---
const SPRITE_DATA = {
    // If these numbers are wrong, the sprites will be invisible!
    beer: { w: 32, h: 32 }, 
    customer: { w: 64, h: 64, animSpeed: 10 }
};

// --- ENGINE ---

class Game {
    constructor() {
        this.width = canvas.width;
        this.height = canvas.height;
        this.beers = [];
        this.customers = [];
        this.timer = 0;
        
        // Spawn a test customer immediately to see if it works
        this.spawnCustomer(); 

        canvas.addEventListener('touchstart', (e) => this.handleInput(e), {passive: false});
        canvas.addEventListener('mousedown', (e) => this.handleInput(e));
    }

    handleInput(e) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
        
        CONFIG.Lanes.forEach((laneY, index) => {
            if (Math.abs(y - laneY) < 70) this.spawnBeer(index);
        });
    }

    spawnBeer(lane) {
        this.beers.push(new Beer(lane));
    }

    spawnCustomer() {
        const lane = Math.floor(Math.random() * CONFIG.Lanes.length);
        const types = Object.keys(ASSETS.customers);
        const type = types[Math.floor(Math.random() * types.length)];
        this.customers.push(new Customer(lane, type));
    }

    update() {
        // Spawner
        if (this.timer > CONFIG.SpawnRate) {
            this.spawnCustomer();
            this.timer = 0;
        } else {
            this.timer += 16;
        }

        this.beers.forEach(b => b.update());
        this.customers.forEach(c => c.update());
        
        // Cleanup (simple)
        this.beers = this.beers.filter(b => b.x < canvas.width);
        this.customers = this.customers.filter(c => c.x > 0);
    }

    draw() {
        // 1. Draw BG
        if (assets.bg) ctx.drawImage(assets.bg, 0, 0, this.width, this.height);
        else { ctx.fillStyle = '#333'; ctx.fillRect(0,0,this.width, this.height); }

        // 2. Draw Lanes (Visual Guide)
        CONFIG.Lanes.forEach(y => {
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.width, y); ctx.stroke();
        });

        // 3. Draw Entities
        this.beers.forEach(b => b.draw());
        this.customers.forEach(c => c.draw());

        // 4. Draw Debug Log
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.fillRect(0, 0, 400, 300);
        ctx.font = "14px monospace";
        debugLog.forEach((item, i) => {
            ctx.fillStyle = item.color;
            ctx.fillText(item.text, 10, 20 + (i * 20));
        });
    }
}

class Beer {
    constructor(lane) {
        this.lane = lane;
        this.x = 100;
        this.y = CONFIG.Lanes[lane] - 30;
        this.width = 64; this.height = 64;
    }
    update() { this.x += CONFIG.BeerSpeed; }
    draw() {
        // HITBOX (Green Box = Physics is working)
        ctx.fillStyle = "rgba(0, 255, 0, 0.5)";
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // SPRITE
        if (assets.beers) {
            ctx.drawImage(assets.beers, 
                0, 0, 32, 32, // Grab 32x32 from Top Left
                this.x, this.y, 64, 64);
        }
    }
}

class Customer {
    constructor(lane, type) {
        this.lane = lane;
        this.type = type;
        this.x = canvas.width - 100;
        this.y = CONFIG.Lanes[lane] - 50;
        this.width = 64; this.height = 64;
        this.frameX = 0;
        this.tick = 0;
    }
    update() { 
        this.x -= CONFIG.CustomerSpeed; 
        this.tick++;
        if (this.tick > 10) { this.frameX = (this.frameX + 1) % 2; this.tick = 0; }
    }
    draw() {
        // HITBOX (Red Box = Physics is working)
        ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // SPRITE
        const img = assets.customers[this.type];
        if (img) {
            // Trying to draw first frame
            ctx.drawImage(img, 
                this.frameX * 64, 0, 64, 64, // Source Slice
                this.x, this.y, 64, 64 // Dest
            );
        }
    }
}

// --- BOOTSTRAP ---
const assets = { customers: {} };
let game;

function loadImages() {
    log("System Check Started...");
    
    const list = [
        { key: 'bg', src: ASSETS.bg },
        { key: 'beers', src: ASSETS.beers },
        ...Object.keys(ASSETS.customers).map(k => ({ key: k, src: ASSETS.customers[k], isCust: true }))
    ];

    let loaded = 0;
    list.forEach(item => {
        const img = new Image();
        img.src = item.src;
        
        img.onload = () => {
            log("✔ Loaded: " + item.src, "#0f0");
            if (item.isCust) assets.customers[item.key] = img;
            else assets[item.key] = img;
            checkStart(++loaded, list.length);
        };
        
        img.onerror = () => {
            log("✖ FAILED: " + item.src, "#f00");
            checkStart(++loaded, list.length);
        };
    });
}

function checkStart(count, total) {
    if (count === total) {
        log("Starting Game Loop...", "yellow");
        init();
    }
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
    ctx.clearRect(0,0,canvas.width, canvas.height);
    if(game) { game.update(); game.draw(); }
    requestAnimationFrame(animate);
}

window.addEventListener('resize', resize);
loadImages();
