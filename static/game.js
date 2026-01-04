/**
 * LAW ON TAP - VERSION 10.0: VISUAL TUNING
 * Fixed: Aggressive offsets for rotated handles & independent glass tuning.
 */

// ==========================================
// 1. THE TUNING BOARD (EDIT THESE NUMBERS!)
// ==========================================
const TUNING = {
    // --- TOWER ALIGNMENT ---
    // Nudge the towers Left/Right to fit the background
    towers: [
        { x: 5, y: 0 },    // Tap 1 (Left - Brass)
        { x: 0, y: 0 },    // Tap 2 (Center - Iron)
        { x: -5, y: 0 }    // Tap 3 (Right - Wood)
    ],

    // --- CLOSED HANDLE ALIGNMENT ---
    // Where the handle sits when IDLE
    handles: [
        { x: 0, y: 0 },    // Tap 1 Closed
        { x: 0, y: 0 },    // Tap 2 Closed
        { x: 0, y: 0 }     // Tap 3 Closed
    ],

    // --- OPEN HANDLE ALIGNMENT (THE CRITICAL FIX) ---
    // These numbers are guessed based on your sprite sheet rotation.
    openHandles: [
        // Tap 1 (Barrel): It is lying on its side (Stem is on Right).
        // We need to move it LEFT (-60) so the stem hits the tower.
        { x: -60, y: 20 },  

        // Tap 2 (Hops): It is upside down (Stem is on Top).
        // We need to move it DOWN (+60) so the stem hits the tower.
        { x: 0, y: 60 },    

        // Tap 3 (Wheat): It is lying on its side (Stem is on Left).
        // It is usually close, maybe just a small tweak.
        { x: 10, y: 20 }    
    ],

    // --- GLASS ALIGNMENT ---
    glass: {
        // 1. Move the EMPTY glass container
        empty_x: 0,
        empty_y: 0,

        // 2. Move the LIQUID inside the glass
        // If the beer spills "outside" the glass lines, tweak this.
        liquid_x: 0, 
        liquid_y: 0  
    }
};

// ==========================================
// 2. CONFIGURATION
// ==========================================
const CONFIG = {
    ASSET_PATH: "https://lawbrewing.github.io/DreadmoorGames/assets/",
    WIDTH: 960,
    HEIGHT: 540,
    DEBUG: false, 

    POUR_SPEED: 40,
    PERFECT_MIN: 80,
    PERFECT_MAX: 96,
    OVERFLOW: 100,
    SPILL_PENALTY: 2000
};

// ==========================================
// 3. ASSETS
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
// 4. TAP LOGIC
// ==========================================
class Tap {
    constructor(id, x, beerType) {
        this.id = id;
        this.x = x;
        this.y = 150; 
        this.width = 100;
        this.height = 200;
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
            this.fillLevel = 0; 
        } else if (this.fillLevel > 10) {
            this.fillLevel = 0;
        }
    }

    draw(ctx, images) {
        const towerAdj = TUNING.towers[this.id];
        const handleAdj = TUNING.handles[this.id];
        const openAdj = TUNING.openHandles[this.id];

        // 1. TOWER
        if (images.tower) {
            const towerW = images.tower.width / 3;
            const towerH = images.tower.height;
            ctx.drawImage(images.tower, this.id * towerW, 0, towerW, towerH, 
                (this.x - 15) + towerAdj.x, this.y + towerAdj.y, 130, 320);
        }

        // 2. HANDLE
        if (images.taps) {
            const tapW = images.taps.width / 3;  
            const tapH = images.taps.height / 2;
            const row = this.isPouring ? 1 : 0; 
            const col = this.beerType; 

            // Base position
            let drawX = this.x + 10 + handleAdj.x;
            let drawY = this.y + 20 + handleAdj.y;

            // Apply Pivot Correction
            if (this.isPouring) {
                drawX += openAdj.x;
                drawY += openAdj.y;
            }

            ctx.drawImage(images.taps, col * tapW, row * tapH, tapW, tapH, 
                drawX, drawY, 80, 80);
        }

        // 3. GLASS
        // Base Glass Position + Empty Offset
        const glassX = this.x + 10 + TUNING.glass.empty_x;
        const glassY = 380 + TUNING.glass.empty_y; 
        const glassW = 80;
        const glassH = 120;

        if (images.fullpints) {
            const spriteW = images.fullpints.width / 4;
            const spriteH = images.fullpints.height;
            
            // A. Draw EMPTY Sprite
            ctx.drawImage(images.fullpints, 0, 0, spriteW, spriteH, glassX, glassY, glassW, glassH);

            // B. Draw FULL Beer (Liquid)
            if (this.fillLevel > 0) {
                const beerFrame = this.beerType + 1;
                
                // Calculate separate liquid position (Base + Liquid Offset)
                const liqX = glassX + TUNING.glass.liquid_x;
                const liqY = glassY + TUNING.glass.liquid_y;

                ctx.save(); 
                const liquidH = (this.fillLevel / 100) * glassH;
                ctx.beginPath();
                ctx.rect(liqX, liqY + (glassH - liquidH), glassW, liquidH);
                ctx.clip();
                
                ctx.drawImage(images.fullpints, beerFrame * spriteW, 0, spriteW, spriteH, liqX, liqY, glassW, glassH);
                ctx.restore(); 
                
                // Line
                const perfectY = liqY + glassH - ((CONFIG.PERFECT_MIN/100) * glassH);
                ctx.fillStyle = "rgba(0,255,0,0.5)";
                ctx.fillRect(liqX, perfectY, glassW, 2);
            }
        }
    }
}

// ==========================================
// 5. INPUT SYSTEM
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
        const start = (e) => { e.preventDefault(); const p=getPos(e); this.x=p.x; this.y=p.y; this.isDown=true; };
        const move = (e) => { e.preventDefault(); const p=getPos(e); this.x=p.x; this.y=p.y; };
        const end = (e) => { this.isDown=false; };

        canvas.addEventListener('mousedown', start);
        canvas.addEventListener('touchstart', start, {passive: false});
        canvas.addEventListener('mousemove', move);
        canvas.addEventListener('touchmove', move, {passive: false});
        window.addEventListener('mouseup', end);
        window.addEventListener('touchend', end);
    }
};

// ==========================================
// 6. MAIN ENGINE
// ==========================================
const Game = {
    canvas: null, ctx: null, images: {}, 
    loadedCount: 0, totalAssets: 0, lastTime: 0, taps: [],

    init: function() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = CONFIG.WIDTH;
        this.canvas.height = CONFIG.HEIGHT;
        Input.init(this.canvas);
        
        this.taps.push(new Tap(0, 250, 0)); 
        this.taps.push(new Tap(1, 430, 1)); 
        this.taps.push(new Tap(2, 610, 2)); 

        this.loadAssets();
    },

    loadAssets: function() {
        const keys = Object.keys(ASSETS);
        this.totalAssets = keys.length;
        const debugText = document.querySelector('#loading-screen p');

        keys.forEach(key => {
            if(ASSETS[key].endsWith('mp3')) { this.loadedCount++; this.checkLoad(); return; }
            const img = new Image();
            img.src = CONFIG.ASSET_PATH + ASSETS[key];
            img.onload = () => { this.images[key] = img; this.loadedCount++; this.checkLoad(); };
            img.onerror = () => { if(debugText) debugText.innerText = `MISSING: ${key}`; };
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

        this.ctx.fillStyle = "black";
        this.ctx.fillRect(0,0, CONFIG.WIDTH, CONFIG.HEIGHT);
        
        if(this.images.background) this.drawImageProp(this.ctx, this.images.background, 0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
        this.taps.forEach(tap => tap.draw(this.ctx, this.images));

        requestAnimationFrame(t => this.loop(t));
    },

    drawImageProp: function(ctx, img, x, y, w, h) {
        const r = Math.max(w / img.width, h / img.height);
        const nw = img.width * r;
        const nh = img.height * r;
        const cx = (w - nw) / 2;
        const cy = (h - nh) / 2;
        ctx.drawImage(img, cx, cy, nw, nh);
    }
};

window.onload = () => Game.init();
