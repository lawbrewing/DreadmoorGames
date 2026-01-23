/**
 * LAW ON TAP - GAME ENGINE
 * Mobile-First, Canvas-Based, Sprite-Sheet Ready
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- 1. THE CONTROL PANEL (Config) ---
const CONFIG = {
    // Lane positions (Y coordinates) - Adjust these to match your background.png!
    Lanes: [200, 360, 520], 
    
    // Game Physics
    BeerSpeed: 5,
    CustomerSpeed: 1.5,
    SpawnRate: 2000, // Time between customers (ms)
    
    // Debugging (Set to true to see hitboxes)
    Debug: false
};

const ASSETS = {
    // Graphics
    bg: 'assets/background.png',
    beers: 'assets/fullpints.png', 
    customers: {
        regular: 'assets/regular.png',
        hipster: 'assets/hipster.png',
        viking: 'assets/viking.png',
        karen: 'assets/karen.png',
        vip: 'assets/vip.png',
        judge: 'assets/judge.png'
    },
    // Audio (Uncomment when you upload sounds)
    // sounds: {
    //     pour: 'assets/pour.mp3',
    //     crash: 'assets/crash.mp3'
    // }
};

const SPRITE_DATA = {
    // Adjust these numbers based on your actual PNG dimensions
    beer: { w: 32, h: 32 }, 
    customer: { w: 64, h: 64, animSpeed: 10 }
};

// --- 2. THE ENGINE (Classes) ---

class Game {
    constructor() {
        this.width = canvas.width;
        this.height = canvas.height;
        this.beers = [];
        this.customers = [];
        this.score = 0;
        this.gameOver = false;
        this.timer = 0;
        
        // Mobile Touch Input
        canvas.addEventListener('touchstart', (e) => this.handleTap(e), {passive: false});
        // Mouse Input (for testing on PC)
        canvas.addEventListener('mousedown', (e) => this.handleTap(e));
    }

    handleTap(e) {
        if(this.gameOver) return this.restart();

        e.preventDefault();
        // Get touch coordinates relative to canvas
        const rect = canvas.getBoundingClientRect();
        const clientY = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
        
        // Check which lane was tapped
        CONFIG.Lanes.forEach((laneY, index) => {
            // If tap is within 60px of the lane line
            if (Math.abs(clientY - laneY) < 70) {
                this.spawnBeer(index);
            }
        });
    }

    spawnBeer(laneIndex) {
        this.beers.push(new Beer(laneIndex));
        // if(assets.sounds.pour) assets.sounds.pour.play();
    }

    spawnCustomer() {
        const lane = Math.floor(Math.random() * CONFIG.Lanes.length);
        // Pick a random customer type
        const types = Object.keys(ASSETS.customers);
        const type = types[Math.floor(Math.random() * types.length)];
        
        this.customers.push(new Customer(lane, type));
    }

    update() {
        if (this.gameOver) return;

        // Spawner Logic
        if (this.timer > CONFIG.SpawnRate) {
            this.spawnCustomer();
            this.timer = 0;
            // Make game harder over time
            if (CONFIG.SpawnRate > 800) CONFIG.SpawnRate -= 20; 
        } else {
            this.timer += 16;
        }

        // Update Objects
        this.beers.forEach(b => b.update());
        this.customers.forEach(c => c.update());

        // Collision Detection
        this.beers.forEach(beer => {
            this.customers.forEach(cust => {
                // If in same lane AND overlapping
                if (beer.lane === cust.lane &&
                    beer.x < cust.x + cust.width &&
                    beer.x + beer.width > cust.x) {
                    
                    // Success!
                    beer.delete = true;
                    cust.delete = true;
                    this.score += 10;
                    // if(assets.sounds.catch) assets.sounds.catch.play();
                }
            });
        });

        // Cleanup deleted objects
        this.beers = this.beers.filter(b => !b.delete);
        this.customers = this.customers.filter(c => !c.delete);
    }

    draw() {
        // 1. Draw Background
        if (assets.bg) {
            ctx.drawImage(assets.bg, 0, 0, this.width, this.height);
        } else {
            ctx.fillStyle = "#333"; ctx.fillRect(0,0,this.width, this.height);
        }

        // 2. Draw Entities
        this.beers.forEach(b => b.draw());
        this.customers.forEach(c => c.draw());

        // 3. Draw UI
        ctx.fillStyle = "white";
        ctx.font = "bold 30px Courier New";
        ctx.shadowColor="black"; ctx.shadowBlur=4;
        ctx.fillText("TIPS: $" + this.score, 20, 50);
        ctx.shadowBlur=0;

        if (this.gameOver) {
            ctx.fillStyle = "rgba(0,0,0,0.7)";
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.fillStyle = "red";
            ctx.font = "50px Courier New";
            ctx.fillText("BAR CLOSED", this.width/2 - 140, this.height/2);
            ctx.fillStyle = "white";
            ctx.font = "20px Courier New";
            ctx.fillText("Tap to Re-open", this.width/2 - 80, this.height/2 + 50);
        }
    }

    restart() {
        this.beers = [];
        this.customers = [];
        this.score = 0;
        this.gameOver = false;
        CONFIG.SpawnRate = 2000;
    }
}

class Beer {
    constructor(lane) {
        this.lane = lane;
        this.x = 100; // Start at Left (Tap)
        this.y = CONFIG.Lanes[lane] - 30; // Center on lane
        this.width = SPRITE_DATA.beer.w;
        this.height = SPRITE_DATA.beer.h;
        this.delete = false;
    }
    update() {
        this.x += CONFIG.BeerSpeed;
        if (this.x > canvas.width) this.delete = true; // Wasted beer!
    }
    draw() {
        if (assets.beers) {
            // Draw first frame of beer sprite sheet
            ctx.drawImage(assets.beers, 0, 0, this.width, this.height, this.x, this.y, this.width*1.5, this.height*1.5);
        } else {
            ctx.fillStyle = "gold"; ctx.fillRect(this.x, this.y, 30, 40);
        }
    }
}

class Customer {
    constructor(lane, type) {
        this.lane = lane;
        this.type = type;
        this.x = canvas.width; // Start at Right (Door)
        this.y = CONFIG.Lanes[lane] - 50; 
        this.width = SPRITE_DATA.customer.w;
        this.height = SPRITE_DATA.customer.h;
        this.delete = false;
        
        // Animation State
        this.frameX = 0; 
        this.animTimer = 0;
    }
    update() {
        this.x -= CONFIG.CustomerSpeed;
        if (this.x < 80) {
            // Reached the bar! Game Over.
            game.gameOver = true;
        }

        // Animate (Cycle through 3 frames)
        this.animTimer++;
        if (this.animTimer > SPRITE_DATA.customer.animSpeed) {
            this.frameX = (this.frameX + 1) % 3; 
            this.animTimer = 0;
        }
    }
    draw() {
        const sprite = assets.customers[this.type];
        if (sprite) {
            ctx.drawImage(sprite, 
                this.frameX * this.width, 0, this.width, this.height, // Source Slice
                this.x, this.y, this.width*1.5, this.height*1.5       // Dest (Scaled 1.5x)
            );
        } else {
            ctx.fillStyle = "red"; ctx.fillRect(this.x, this.y, 40, 60);
        }
    }
}

// --- 3. BOOTSTRAP (Asset Loading) ---
const assets = { customers: {} };
let game;
let loadedCount = 0;
// Create list of images to load
const toLoad = [
    {k: 'bg', src: ASSETS.bg},
    {k: 'beers', src: ASSETS.beers},
    ...Object.keys(ASSETS.customers).map(key => ({k: key, src: ASSETS.customers[key], isCust: true}))
];

toLoad.forEach(item => {
    const img = new Image();
    img.src = item.src;
    img.onload = () => {
        if(item.isCust) assets.customers[item.k] = img;
        else assets[item.k] = img;
        
        loadedCount++;
        if(loadedCount === toLoad.length) initGame();
    };
});

function initGame() {
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
    if(game) game.update();
    if(game) game.draw();
    requestAnimationFrame(animate);
}

window.addEventListener('resize', resize);
