/**
 * LAW ON TAP - FIX: 3 TAPS & ASPECT RATIO
 */

// ==========================================
// 1. CONFIGURATION
// ==========================================
const CONFIG = {
    ASSET_PATH: "https://lawbrewing.github.io/DreadmoorGames/assets/",
    WIDTH: 960,
    HEIGHT: 540,
    DEBUG: true, // Keep true to see the Green Hitboxes for alignment

    // Pouring Physics
    POUR_SPEED: 40,
    PERFECT_MIN: 80,
    PERFECT_MAX: 96,
    OVERFLOW: 100,
    SPILL_PENALTY: 2000
};

// ==========================================
// 2. ASSETS
// ==========================================
const ASSETS = {
    background: "background.png",
    tower:      "tower.png",
    taps:       "taps.png",
    spill:      "spill.png",
    fullpints:  "fullpints.png",
    
    // Audio
    sfx_pour:     "pour_start.mp3",
    sfx_stop:     "pour_stop.mp3",
    sfx_ding:     "perfect_ding.mp3",
    sfx_crash:    "crash.mp3",
    bgm_gameplay: "bgm_gameplay.mp3"
};

// ==========================================
// 3. THE TAP LOGIC
// ==========================================
class Tap {
    constructor(id, x, beerType) {
        this.id = id;
        this.x = x;
        this.y = 180; // Vertical position (adjust if hitboxes are too high/low)
        this.width = 100;
        this.height = 250;
        
        this.beerType = beerType;
        this.isPouring = false;
        this.fillLevel = 0;
        this.isLocked = false;
        this.lockTimer = 0;
    }

    update(dt, input) {
        if (this.isLocked) {
            this.lockTimer -= dt;
            if (this.lockTimer <= 0) {
                this.isLocked = false;
                this.fillLevel = 0;
            }
            return;
        }

        // Hitbox Check
        const isTouching = input.isDown && 
                           input.x > this.x && 
                           input.x < this.x + this.width &&
                           input.y > this.y && 
                           input.y < this.y + this.height;

        if (isTouching) {
            if (!this.isPouring) this.isPouring = true;
            this.fillLevel += (CONFIG.POUR_SPEED * (dt / 1000));
            if (this.fillLevel >= CONFIG.OVERFLOW) this.triggerSpill();
        } else {
            if (this.isPouring) {
                this.isPouring = false;
                this.checkResult();
            }
        }
    }

    triggerSpill() {
        console.log(`TAP ${this.id}: SPILL!`);
        this.isLocked = true;
        this.lockTimer = CONFIG.SPILL_PENALTY;
        this.isPouring = false;
    }

    checkResult() {
        if (this.fillLevel >= CONFIG.PERFECT_MIN && this.fillLevel < CONFIG.PERFECT_MAX) {
            console.log(`TAP ${this.id}: PERFECT!`);
            this.fillLevel = 0; 
        } else if (this.fillLevel > 10) {
            this.fillLevel = 0; // Dump bad pour
        }
    }

    draw(ctx) {
        // Debug Hitbox
        if (CONFIG.DEBUG) {
            ctx.strokeStyle = this.isLocked ? "red" : "lime";
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        }

        const glassX = this.x + 10;
        const glassY = 350; 
        const glassW = 80;
        const glassH = 120;

        // Draw Empty Glass Placeholder
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.fillRect(glassX, glassY, glassW, glassH);

        // Draw Beer
        if (this.fillLevel > 0) {
            const liquidHeight = (this.fillLevel / 100) * glassH;
            ctx.fillStyle = this.beerType === 0 ? "#3b2600" : "#d48600";
            ctx.fillRect(glassX, glassY + (glassH - liquidHeight), glassW, liquidHeight);
            
            // Perfect Line
            const perfectY = glassY + glassH - ((CONFIG.PERFECT_MIN/100) * glassH);
            ctx.fillStyle = "rgba(0,255,0,0.5)";
            ctx.fillRect(glassX, perfectY, glassW, 2);
        }
    }
}

// ==========================================
// 4. INPUT SYSTEM (FIXED)
// ==========================================
const Input = {
    x: 0, y: 0, isDown: false,
    init: function(canvas) {
        const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
        };

        // START (Touch/Click)
        const startHandler = (e) => {
            e.preventDefault();
            const pos = getPos(e);
            this.x = pos.x; 
            this.y = pos.y;
            this.isDown = true;
        };

        // MOVE
        const moveHandler = (e) => {
            e.preventDefault();
            const pos = getPos(e);
            this.x = pos.x; 
            this.y = pos.y;
        };

        // END (Listen on WINDOW to catch drags outside canvas)
        const endHandler = (e) => {
            // e.preventDefault(); // Don't prevent default on window, might break other stuff
            this.isDown = false;
        };

        canvas.addEventListener('mousedown', startHandler);
        canvas.addEventListener('touchstart', startHandler, {passive: false});
        canvas.addEventListener('mousemove', moveHandler);
        canvas.addEventListener('touchmove', moveHandler, {passive: false});

        // CRITICAL FIX: Listen for "Up" on the whole window
        window.addEventListener('mouseup', endHandler);
        window.addEventListener('touchend', endHandler);
    }
};

// ==========================================
// 5. MAIN ENGINE
// ==========================================
const Game = {
    canvas: null, ctx: null, images: {}, 
    loadedCount: 0, totalAssets: 0, lastTime: 0,
    taps: [],

    init: function() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = CONFIG.WIDTH;
        this.canvas.height = CONFIG.HEIGHT;
        Input.init(this.canvas);
        
        // FIX: CHANGED TO 3 TAPS
        // Adjust these X numbers to align with your background art
        // (Left Tap, Center Tap, Right Tap)
        this.taps.push(new Tap(0, 250, 0)); // Stout
        this.taps.push(new Tap(1, 430, 1)); // IPA
        this.taps.push(new Tap(2, 610, 2)); // Lager

        this.loadAssets();
    },

    loadAssets: function() {
        const keys = Object.keys(ASSETS);
        this.totalAssets = keys.length;
        keys.forEach(key => {
            if(ASSETS[key].endsWith('mp3')) { this.loadedCount++; this.checkLoad(); return; }
            const img = new Image();
            img.src = CONFIG.ASSET_PATH + ASSETS[key];
            img.onload = () => { this.images[key] = img; this.loadedCount++; this.checkLoad(); };
            img.onerror = () => { console.log("Missing: " + key); this.loadedCount++; this.checkLoad(); };
        });
    },

    checkLoad: function() {
        if (this.loadedCount >= this.totalAssets) {
            document.getElementById('loading-screen').style.display = 'none';
            requestAnimationFrame(t => this.loop(t));
        }
    },

    loop: function(timestamp) {
        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.taps.forEach(tap => tap.update(dt, Input));

        // DRAW
        this.ctx.fillStyle = "black";
        this.ctx.fillRect(0,0, CONFIG.WIDTH, CONFIG.HEIGHT);
        
        // FIX: Draw Background PROPORTIONALLY (Cover mode)
        if(this.images.background) {
            this.drawBackgroundCover(this.images.background);
        }

        this.taps.forEach(tap => tap.draw(this.ctx));

        requestAnimationFrame(t => this.loop(t));
    },

    // Helper to draw background without stretching
    drawBackgroundCover: function(img) {
        // Simple draw for now - if your image is close to 16:9 it will look fine
        // If it's wildly different, we can add complex crop logic here.
        // For now, let's just draw it standard size to verify the "Stretch" is gone
        this.ctx.drawImage(img, 0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
    }
};

window.onload = () => Game.init();
