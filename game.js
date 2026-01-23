/**
 * TAPROOM TAPPER - FINAL TUNED ENGINE
 * Visuals: Waist-Up View
 * Logic: Single Frame Cropping
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- 1. CONFIGURATION ---
const CONFIG = {
    // HEIGHT ADJUSTMENT
    // 0.5 = Middle of screen
    // 0.65 = Lower Middle (Should be perfect for a bar)
    // 0.85 = Too low (What you had before)
    BarHeight: window.innerHeight * 0.75, 
    
    Stations: [0.2, 0.5, 0.8], 
    SpawnRate: 2000, 
};

// --- 2. SPRITE SETTINGS (THE CROPPER) ---
const SPRITE_DATA = {
    // IMPORTANT: How many "Guys" are in your sprite sheet image?
    // If you see 4 guys in the sheet, set this to 4.
    // If you see 6 guys, set this to 6.
    FrameCount: 3, 
    
    // How much to zoom in on them
    Scale: 4.0 
};

// --- 3. ASSETS ---
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

// --- 4. ENGINE ---

class Game {
    constructor() {
        this.width = canvas.width;
        this.height = canvas.height;
        this.customers = [];
        this.timer = 0;
        this.spawnCustomer(); // Test spawn
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
        // Clean up off-screen
        this.customers = this.customers.filter(c => c.x > -200);
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
        this.x = canvas.width + 100; // Start off screen right
        
        // Y Position Calculation
        // We need to know the sprite height to place their feet (or waist) correctly
        // For now, we place them at the BarHeight line
        this.y = CONFIG.BarHeight; 
        
        this.state = 'walking';
        this.frameX = 0; // Current animation frame
        this.tick = 0;
    }

    update() {
        if (this.x > this.targetX) {
            this.x -= 8; // Move Left
            
            // Animation Loop
            this.tick++;
            if (this.tick > 10) {
                // Cycle through frames 0 to (FrameCount - 1)
                this.frameX = (this.frameX + 1) % SPRITE_DATA.FrameCount;
                this.tick = 0;
            }
        }
    }

    draw() {
        const sprite = assets.customers[this.type];
        if (sprite) {
            // 1. Calculate Single Frame Size
            const frameW = sprite.width / SPRITE_DATA.FrameCount;
            const frameH = sprite.height; // Assuming 1 row
            
            // 2. Flip Logic (Face Left)
            ctx.save();
            // Move "Pivot Point" to where the character is
            ctx.translate(this.x + (frameW * SPRITE_DATA.Scale), this.y);
            ctx.scale(-1, 1); // Flip
            
            // 3. Draw The CROP (Single Frame)
            ctx.drawImage(
                sprite,
                this.frameX * frameW, 0, frameW, frameH, // Source (Crop)
                0, 0, frameW * SPRITE_DATA.Scale, frameH * SPRITE_DATA.Scale // Dest (Draw)
            );
            
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
