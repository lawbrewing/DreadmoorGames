/**
 * TAPROOM TAPPER - HUD DEBUG MODE
 * This prints text on screen to tell us where the customers are hiding.
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- 1. CONFIG ---
const CONFIG = {
    // Moved from 0.7 to 0.85 (Lower down the screen)
    BarHeight: window.innerHeight * 0.85, 
    Stations: [0.2, 0.5, 0.8], 
    SpawnRate: 1000, 
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
        const sprite = assets.customers[this.type];
        
        // 1. DRAW RED BOX (Keep this for now as a guide)
        ctx.fillStyle = "rgba(255, 0, 0, 0.3)"; // Semi-transparent red
        ctx.fillRect(this.x, this.y, 150, 150); // Made box bigger (150px)

        // 2. DRAW FULL SPRITE (The Scanner Fix)
        if (sprite) {
             // Instead of cropping, we draw the WHOLE image squeezed into the box
             // verify the image is loaded and see how many frames there are.
             ctx.drawImage(sprite, this.x, this.y, 150, 150);
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
