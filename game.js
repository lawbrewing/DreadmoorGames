/**
 * TAPROOM TAPPER - FORCE VISIBILITY MODE
 * 1. Red Boxes show where customers are.
 * 2. Spinning Green Square shows if game is running.
 * 3. No fancy cropping - shows full image to prevent errors.
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- CONFIG ---
const CONFIG = {
    // 75% down the screen (The Sweet Spot?)
    BarHeight: window.innerHeight * 0.65, 
    Stations: [0.2, 0.5, 0.8], 
    SpawnRate: 1500, 
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

// --- GAME ENGINE ---

class Game {
    constructor() {
        this.width = canvas.width;
        this.height = canvas.height;
        this.customers = [];
        this.timer = 0;
        this.frame = 0; // For heartbeat animation
        
        // Spawn one immediately
        this.spawnCustomer();
    }

    spawnCustomer() {
        const lane = Math.floor(Math.random() * 3);
        const types = Object.keys(ASSETS.customers);
        const type = types[Math.floor(Math.random() * types.length)];
        this.customers.push(new Customer(lane, type));
    }

    update() {
        this.frame++;
        this.timer += 16;
        if (this.timer > CONFIG.SpawnRate) {
            this.spawnCustomer();
            this.timer = 0;
        }
        this.customers.forEach(c => c.update());
        
        // Keep list clean
        this.customers = this.customers.filter(c => c.x > -200);
    }

    draw() {
        // 1. Draw Background
        if (assets.bg) ctx.drawImage(assets.bg, 0, 0, this.width, this.height);
        else { ctx.fillStyle = "#333"; ctx.fillRect(0,0,this.width, this.height); }

        // 2. Draw "Heartbeat" (Spinning Square in Corner)
        // If this stops spinning, the game crashed.
        ctx.save();
        ctx.translate(50, 50);
        ctx.rotate(this.frame * 0.05);
        ctx.fillStyle = "#0f0";
        ctx.fillRect(-20, -20, 40, 40);
        ctx.restore();

        // 3. Draw Customers
        this.customers.forEach(c => c.draw());
    }
}

class Customer {
    constructor(lane, type) {
        this.type = type;
        this.targetX = canvas.width * CONFIG.Stations[lane];
        this.x = canvas.width + 50; 
        
        // Position at the Bar Height
        this.y = CONFIG.BarHeight; 
        
        this.state = 'walking';
    }

    update() {
        if (this.x > this.targetX) this.x -= 8;
    }

    draw() {
        // A. RED BOX (The Locator)
        ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
        ctx.fillRect(this.x, this.y, 100, 100);

        // B. FULL SPRITE (No Math, Just Draw)
        const sprite = assets.customers[this.type];
        if (sprite) {
            // Draw the WHOLE image squeezed into 100x100
            // This guarantees we see it if it exists
            ctx.drawImage(sprite, this.x, this.y, 100, 100);
            
            // Draw Name
            ctx.fillStyle = "white";
            ctx.font = "12px monospace";
            ctx.fillText(this.type, this.x, this.y - 10);
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
    
    // Start immediately
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
