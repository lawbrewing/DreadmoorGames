/**
 * TAPROOM TAPPER - BIG & TALL EDITION
 * Features:
 * 1. Target Height (Sets size in pixels, not abstract scale)
 * 2. Auto-Frame Detection (Handles both animated sheets and static images)
 * 3. 0.70 Bar Height
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- 1. CONFIGURATION ---
const CONFIG = {
    // 70% down the screen (Your requested "Sweet Spot")
    BarHeight: window.innerHeight * 0.40, 
    
    // VISUAL SIZE SETTINGS
    // How tall should the characters be in pixels?
    // 100 was "very small". 300 is "3x bigger".
    CustomerHeight: 600, 
    
    Stations: [0.2, 0.5, 0.8], 
    SpawnRate: 2000, 
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

// --- 3. ENGINE ---

class Game {
    constructor() {
        this.width = canvas.width;
        this.height = canvas.height;
        this.customers = [];
        this.timer = 0;
        
        // Spawn one immediately to check size
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
        this.customers = this.customers.filter(c => c.x > -300); // Cleanup
    }

    draw() {
        // Draw BG
        if (assets.bg) ctx.drawImage(assets.bg, 0, 0, this.width, this.height);
        else { ctx.fillStyle = "#333"; ctx.fillRect(0,0,this.width, this.height); }

        // Draw Customers
        this.customers.forEach(c => c.draw());
    }
}

class Customer {
    constructor(lane, type) {
        this.type = type;
        this.targetX = canvas.width * CONFIG.Stations[lane];
        this.x = canvas.width + 200; 
        this.y = CONFIG.BarHeight; 
        
        this.state = 'walking';
        this.frameX = 0;
        this.tick = 0;
        
        // AUTO-DETECT FRAMES
        // We do this once when the customer spawns
        const sprite = assets.customers[this.type];
        if (sprite) {
            // If image is WIDE (Width > Height * 2), assume it's a strip of 4 frames
            if (sprite.width > sprite.height * 2) {
                this.frameCount = 4;
            } else {
                // Otherwise assume it's a single static image
                this.frameCount = 1;
            }
        } else {
            this.frameCount = 1; // Fallback
        }
    }

    update() {
        if (this.x > this.targetX) {
            this.x -= 8; // Move Left
            
            // Animation Loop (Only runs if we detected multiple frames)
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
            // 1. Calculate Crop Size
            // If frameCount is 4, we divide width by 4. If 1, we take full width.
            const frameW = sprite.width / this.frameCount;
            const frameH = sprite.height; 
            
            // 2. Calculate Draw Size (The "3x Bigger" Logic)
            // We want the final height to be exactly CONFIG.CustomerHeight (300px)
            // We calculate the ratio to maintain aspect ratio
            const ratio = frameW / frameH;
            const drawH = CONFIG.CustomerHeight;
            const drawW = drawH * ratio;

            // 3. Flip Logic (Face Left)
            ctx.save();
            ctx.translate(this.x + drawW, this.y); // Pivot
            ctx.scale(-1, 1); // Flip
            
            // 4. Draw
            ctx.drawImage(
                sprite,
                this.frameX * frameW, 0, frameW, frameH, // Crop Source
                0, 0, drawW, drawH                       // Draw Destination
            );
            
            ctx.restore();
        } else {
            // Fallback Red Box if image missing
            ctx.fillStyle = "red";
            ctx.fillRect(this.x, this.y, 100, CONFIG.CustomerHeight);
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
