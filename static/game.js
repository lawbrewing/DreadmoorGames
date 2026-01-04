/**
 * LAW ON TAP - PHASE 3: THE POURING ENGINE
 * Optimized for Mobile Landscape
 */

// ==========================================
// 1. CONFIGURATION
// ==========================================
const CONFIG = {
    ASSET_PATH: "https://lawbrewing.github.io/DreadmoorGames/assets/",
    WIDTH: 960,
    HEIGHT: 540,
    DEBUG: true, // SET TO FALSE WHEN DONE TESTING to hide red boxes

    // Pouring Physics
    POUR_SPEED: 40,       // How fast beer rises (0-100 scale)
    PERFECT_MIN: 80,      // Green Zone Start
    PERFECT_MAX: 96,      // Green Zone End
    OVERFLOW: 100,        // Spill Threshold
    SPILL_PENALTY: 2000   // Milliseconds tap is locked after spilling
};

// ==========================================
// 2. ASSETS
// ==========================================
const ASSETS = {
    // Visuals
    background: "background.png",
    tower:      "tower.png",
    taps:       "taps.png",
    spill:      "spill.png",
    paddles:    "paddles.png",
    fullpints:  "fullpints.png", // Ensure this sprite sheet has [Stout, IPA, Lager, Empty]
    
    // Audio
    sfx_pour:     "pour_start.mp3",
    sfx_stop:     "pour_stop.mp3",
    sfx_ding:     "perfect_ding.mp3",
    sfx_crash:    "crash.mp3",
    bgm_gameplay: "bgm_gameplay.mp3"
};

// ==========================================
// 3. THE TAP CLASS (Logic for one single tap)
// ==========================================
class Tap {
    constructor(id, x, beerType) {
        this.id = id;
        this.x = x;
        this.y = 180; // Vertical position of the tap handle
        this.width = 100;
        this.height = 250;
        
        this.beerType = beerType; // 0=Stout, 1=IPA, 2=Lager
        this.isPouring = false;
        this.fillLevel = 0; // 0 to 100
        this.isLocked = false; // True if spilled
        this.lockTimer = 0;
    }

    update(dt, input) {
        // 1. Handle Spills (Cooldown)
        if (this.isLocked) {
            this.lockTimer -= dt;
            if (this.lockTimer <= 0) {
                this.isLocked = false;
                this.fillLevel = 0; // Reset glass
            }
            return;
        }

        // 2. Check Input (Is finger touching this tap?)
        // Simple hitbox check: Is touch X/Y inside this box?
        const isTouching = input.isDown && 
                           input.x > this.x && 
                           input.x < this.x + this.width &&
                           input.y > this.y && 
                           input.y < this.y + this.height;

        // 3. State Machine
        if (isTouching) {
            if (!this.isPouring) {
                // START POURING
                this.isPouring = true;
                // Game.playSound("sfx_pour"); // TODO: Re-enable audio later
            }
            
            // Increase Fill Level
            this.fillLevel += (CONFIG.POUR_SPEED * (dt / 1000));

            // Check Overflow
            if (this.fillLevel >= CONFIG.OVERFLOW) {
                this.triggerSpill();
            }
        } else {
            if (this.isPouring) {
                // STOP POURING (Player let go)
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
        // Game.playSound("sfx_crash");
    }

    checkResult() {
        if (this.fillLevel >= CONFIG.PERFECT_MIN && this.fillLevel < CONFIG.PERFECT_MAX) {
            console.log(`TAP ${this.id}: PERFECT POUR! (${Math.floor(this.fillLevel)}%)`);
            // Reset for next beer
            this.fillLevel = 0; 
        } else if (this.fillLevel > 10) {
            console.log(`TAP ${this.id}: BAD POUR - DUMPED (${Math.floor(this.fillLevel)}%)`);
            // Too low? Just drain it.
            this.fillLevel = 0; 
        }
    }

    draw(ctx, images) {
        // Debug Hitbox
        if (CONFIG.DEBUG) {
            ctx.strokeStyle = this.isLocked ? "red" : "lime";
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        }

        // --- DRAW THE GLASS ---
        // Position of the glass is below the tap
        const glassX = this.x + 10;
        const glassY = 350; 
        const glassW = 80;
        const glassH = 120;

        // 1. Draw Empty Glass (Always visible)
        // Assuming 'fullpints' sprite sheet is a row: [Stout, IPA, Lager, Empty]
        // We need to know sprite width. Let's assume 100px wide per glass for now.
        // You might need to adjust 'sx' (source x) based on your actual sprite sheet.
        
        // Placeholder: Drawing a grey rectangle for empty glass
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.fillRect(glassX, glassY, glassW, glassH);

        // 2. Draw Beer (The Mask Logic)
        if (this.fillLevel > 0) {
            // Calculate height based on fill percentage
            const liquidHeight = (this.fillLevel / 100) * glassH;
            
            // Save context to apply clipping mask
            ctx.save();
            
            // Define the "Visible Area" (From bottom up)
            ctx.beginPath();
            ctx.rect(glassX, glassY + (glassH - liquidHeight), glassW, liquidHeight);
            ctx.clip();

            // Draw the "Full Beer" Image inside the clip area
            // Ideally: ctx.drawImage(images.fullpints, ... )
            // For Prototype: Just a colored rectangle
            ctx.fillStyle = this.getBeerColor();
            ctx.fillRect(glassX, glassY, glassW, glassH);

            ctx.restore();
        }

        // 3. Draw UI Indicators (Green Line)
        if (this.fillLevel > 0) {
            // Perfect Zone Line
            const perfectY = glassY + glassH - ((CONFIG.PERFECT_MIN/100) * glassH);
            ctx.fillStyle = "rgba(0,255,0,0.5)";
            ctx.fillRect(glassX, perfectY, glassW, 2);
        }
        
        // 4. Spill Icon
        if (this.isLocked) {
            if (images.spill) {
                ctx.drawImage(images.spill, glassX, glassY + 50, 80, 50);
            }
        }
    }

    getBeerColor() {
        if (this.beerType === 0) return "#3b2600"; // Stout (Dark)
        if (this.beerType === 1) return "#d48600"; // IPA (Orange)
        return "#ffd700"; // Lager (Yellow)
    }
}

// ==========================================
// 4. INPUT SYSTEM
// ==========================================
const Input = {
    x: 0, y: 0, isDown: false,
    init: function(canvas) {
        const handler = (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            this.x = (clientX - rect.left) * scaleX;
            this.y = (clientY - rect.top) * scaleY;
            this.isDown = (e.type === 'mousedown' || e.type === 'touchstart' || e.type === 'touchmove' || e.type === 'mousemove');
            if (e.type === 'mouseup' || e.type === 'touchend') this.isDown = false;
        };
        ['mousedown','mouseup','mousemove','touchstart','touchend','touchmove'].forEach(evt => 
            canvas.addEventListener(evt, handler, {passive: false})
        );
    }
};

// ==========================================
// 5. MAIN GAME LOOP
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
        
        // Initialize 4 Taps (spaced out)
        // x positions: 150, 350, 550, 750
        this.taps.push(new Tap(0, 150, 0)); // Stout
        this.taps.push(new Tap(1, 350, 1)); // IPA
        this.taps.push(new Tap(2, 550, 1)); // IPA
        this.taps.push(new Tap(3, 750, 2)); // Lager

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

        // Update
        this.taps.forEach(tap => tap.update(dt, Input));

        // Draw
        this.ctx.fillStyle = "black";
        this.ctx.fillRect(0,0, CONFIG.WIDTH, CONFIG.HEIGHT);
        
        // 1. Background
        if(this.images.background) this.ctx.drawImage(this.images.background, 0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

        // 2. Taps & Beer
        this.taps.forEach(tap => tap.draw(this.ctx, this.images));

        requestAnimationFrame(t => this.loop(t));
    }
};

window.onload = () => Game.init();
