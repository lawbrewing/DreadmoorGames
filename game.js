/**
 * LAW ON TAP - VISIBILITY FIX
 * This version forces the full image to draw so we can see the sprites.
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

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

// --- ENGINE ---

class Game {
    constructor() {
        this.width = canvas.width;
        this.height = canvas.height;
        this.beers = [];
        this.customers = [];
        this.timer = 0;
        this.score = 0;

        // Input
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
        if (this.timer > CONFIG.SpawnRate) {
            this.spawnCustomer();
            this.timer = 0;
        } else { this.timer += 16; }

        this.beers.forEach(b => b.update());
        this.customers.forEach(c => c.update());
        
        // Simple Cleanup
        this.beers = this.beers.filter(b => b.x < canvas.width);
        this.customers = this.customers.filter(c => c.x > 0);
    }

    draw() {
        // Draw Background
        if (assets.bg) {
            ctx.drawImage(assets.bg, 0, 0, this.width, this.height);
        } else {
            ctx.fillStyle = "#333"; ctx.fillRect(0,0,this.width, this.height);
        }

        this.beers.forEach(b => b.draw());
        this.customers.forEach(c => c.draw());
        
        // Score
        ctx.fillStyle = "white"; ctx.font = "30px Arial";
        ctx.fillText("Score: " + this.score, 20, 50);
    }
}

class Beer {
    constructor(lane) {
        this.lane = lane;
        this.x = 100;
        this.y = CONFIG.Lanes[lane] - 30;
    }
    update() { this.x += CONFIG.BeerSpeed; }
    draw() {
        // FORCE DRAW: Draw the FULL image scaled to 50x50
        if (assets.beers) {
            ctx.drawImage(assets.beers, this.x, this.y, 50, 50);
        } else {
            // Fallback yellow box
            ctx.fillStyle = "gold"; ctx.fillRect(this.x, this.y, 40, 40);
        }
    }
}

class Customer {
    constructor(lane, type) {
        this.lane = lane;
        this.type = type;
        this.x = canvas.width - 100;
        this.y = CONFIG.Lanes[lane] - 60;
    }
    update() { this.x -= CONFIG.CustomerSpeed; }
    draw() {
        const img = assets.customers[this.type];
        if (img) {
            // FORCE DRAW: Draw the FULL image scaled to 80x80
            // If your sprite sheet is a strip, you will see the WHOLE strip here.
            ctx.drawImage(img, this.x, this.y, 80, 80);
        } else {
            // Fallback red box
            ctx.fillStyle = "red"; ctx.fillRect(this.x, this.y, 50, 80);
        }
    }
}

// --- BOOTSTRAP ---
const assets = { customers: {} };
let game;

function loadImages() {
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
            if (item.isCust) assets.customers[item.key] = img;
            else assets[item.key] = img;
            if (++loaded === list.length) init();
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
    ctx.clearRect(0,0,canvas.width, canvas.height);
    if(game) { game.update(); game.draw(); }
    requestAnimationFrame(animate);
}

window.addEventListener('resize', resize);
loadImages();
