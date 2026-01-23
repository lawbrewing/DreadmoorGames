/**
 * TAPROOM TAPPER - SAFE MODE (DATA DUMP)
 * This will tell us the exact size of your images without crashing.
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- 1. CONFIG ---
const CONFIG = {
    // 85% down the screen (Near bottom)
    BarHeight: window.innerHeight * 0.85, 
    Stations: [0.2, 0.5, 0.8], 
    SpawnRate: 1500, 
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

// --- 3. GAME ENGINE ---

class Game {
    constructor() {
        this.width = canvas.width;
        this.height = canvas.height;
        this.customers = [];
        this.timer = 0;
        
        // Spawn one immediately to test
        this.spawnCustomer();
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
        
        // Keep list clean
        this.customers = this.customers.filter(c => c.x > -100);
    }

    draw() {
        // 1. Draw Background
        if (assets.bg) ctx.drawImage(assets.bg, 0, 0, this.width, this.height);
        else {
            ctx.fillStyle = "#333"; 
            ctx.fillRect(0,0,this.width, this.height);
        }
        
        // 2. Draw Customers
        this.customers.forEach(c => c.draw());

        // 3. Global HUD
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, 250, 50);
        ctx.fillStyle = "white";
        ctx.font = "16px monospace";
        ctx.fillText(`Active Customers: ${this.customers.length}`, 10, 30);
    }
}

class Customer {
    constructor(lane, type) {
        this.lane = lane;
        this.type = type;
        this.targetX = canvas.width * CONFIG.Stations[lane];
        this.x = canvas.width; 
        this.y = CONFIG.BarHeight - 100; // Floating above bar
        this.state = 'walking';
    }

    update() {
        if (this.x > this.targetX) this.x -= 5;
    }

    draw() {
        // 1. DRAW RED BOX (Safe Visual)
        ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
        ctx.fillRect(this.x, this.y, 100, 100);

        // 2. DRAW DATA TEXT (Instead of the image)
        ctx.fillStyle = "white";
        ctx.font = "12px monospace";
        
        const sprite = assets.customers[this.type];
        
        if (sprite) {
            // If image is loaded, print its dimensions
            ctx.fillText(`${this.type}`, this.x, this.y + 20);
            ctx.fillText(`W: ${sprite.width}`, this.x, this.y + 40);
            ctx.fillText(`H: ${sprite.height}`, this.x, this.y + 60);
            
            // ATTEMPT TO DRAW TINY PREVIEW
            // (Wrapped in try/catch to prevent crashing)
            try {
                 ctx.drawImage(sprite, 0, 0, sprite.width, sprite.height, this.x, this.y, 50, 50);
            } catch(e) { /* Ignore */ }
            
        } else {
            // If image is missing
            ctx.fillText("LOADING...", this.x, this.y + 40);
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

    list.forEach(item => {
        const img = new Image();
        img.src = item.src;
        img.onload = () => {
            if(item.isCust) assets.customers[item.k] = img;
            else assets[item.k] = img;
        };
    });
    
    // Start game immediately (Images will pop in when ready)
    init();
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
