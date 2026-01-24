// ==========================================
// 1. SETUP
// ==========================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Internal resolution (high quality)
const GAME_W = 1920;
const GAME_H = 1080;
canvas.width = GAME_W;
canvas.height = GAME_H;

// TAPS: 0=Stout (Left), 1=IPA (Mid), 2=Lager (Right)
const TAPS = { STOUT: 0, IPA: 1, LAGER: 2 };

// ==========================================
// 2. DATA & CONFIG
// ==========================================
const RECIPES = {
    'stout': { name: "STOUT", steps: [{ tap: TAPS.STOUT, limit: 1.0 }] },
    'ipa':   { name: "IPA",   steps: [{ tap: TAPS.IPA,   limit: 1.0 }] },
    'lager': { name: "LAGER", steps: [{ tap: TAPS.LAGER, limit: 1.0 }] },
    'black_tan': { name: "BLACK & TAN", steps: [{ tap: TAPS.LAGER, limit: 0.5 }, { tap: TAPS.STOUT, limit: 1.0 }] },
    'black_bitter': { name: "BLACK & BITTER", steps: [{ tap: TAPS.IPA, limit: 0.5 }, { tap: TAPS.STOUT, limit: 1.0 }] },
    'lawnmower': { name: "LAWNMOWER HOP", steps: [{ tap: TAPS.LAGER, limit: 0.5 }, { tap: TAPS.IPA, limit: 1.0 }] }
};

const CUSTOMER_TYPES = {
    'viking':  { id: 'viking',  patience: 15000, orders: ['stout'] },
    'judge':   { id: 'judge',   patience: 25000, orders: ['flight'] }
};

// Calibrated Data
const SPRITE_DATA = {
    menu: { x: 218, targetY: 295, s: 0.60 },
    hud: { score: { x: 1800, y: 100 }, lives: { x: 1600, y: 180 } },
    customers: [
        { id: 'viking', poses: [{x: 400, y: 550, s: 0.6}] }, // Adjusted Y to stand on floor
        { id: 'judge',  poses: [{x: 400, y: 550, s: 0.5}] }
    ]
};

const ASSETS_PATHS = {
    menu: 'assets/menu.png', // Ensure this exists or use external link
    viking: 'assets/viking.png',
    judge: 'assets/judge.png',
    spill: 'assets/spill.png'
};
const assets = {};

// ==========================================
// 3. LOGIC CLASSES
// ==========================================

class Game {
    constructor() {
        this.score = 0;
        this.lives = 3;
        this.customer = null;
        this.activePour = { active: false, tapIndex: -1 };
        
        // Link Inputs to DOM
        this.initDOMInputs();
        
        // Start Loop
        this.lastTime = 0;
        this.spawnCustomer();
        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
    }

    initDOMInputs() {
        const hitboxes = document.querySelectorAll('.hitbox');
        
        const startPour = (e) => {
            e.preventDefault();
            const tapIdx = parseInt(e.target.dataset.tap);
            this.activePour = { active: true, tapIndex: tapIdx };
            
            // Add CSS Class for animation
            document.getElementById(`tap-${tapIdx}`).classList.add('pouring');
        };

        const endPour = (e) => {
            e.preventDefault();
            if (this.activePour.active) {
                // Remove CSS Class
                document.getElementById(`tap-${this.activePour.tapIndex}`).classList.remove('pouring');
                this.activePour = { active: false, tapIndex: -1 };
            }
        };

        hitboxes.forEach(el => {
            el.addEventListener('mousedown', startPour);
            el.addEventListener('touchstart', startPour);
            el.addEventListener('mouseup', endPour);
            el.addEventListener('touchend', endPour);
            el.addEventListener('mouseleave', endPour);
        });
    }

    spawnCustomer() {
        if (this.customer) return;
        const type = Math.random() > 0.5 ? 'viking' : 'judge';
        this.customer = {
            type: type,
            data: CUSTOMER_TYPES[type],
            x: -300,
            targetX: 960,
            state: 'walking_in',
            patience: CUSTOMER_TYPES[type].patience,
            order: CUSTOMER_TYPES[type].orders, // Simplification
            drinkProgress: 0
        };
    }

    update(dt) {
        // 1. Pour Logic
        if (this.activePour.active && this.customer && this.customer.state === 'waiting') {
            this.customer.drinkProgress += 0.01;
            
            // Update CSS Liquid Height
            const liquid = document.querySelector(`#tap-${this.activePour.tapIndex} .liquid-mask`);
            if (liquid) liquid.style.height = `${Math.min(this.customer.drinkProgress * 100, 100)}%`;

            if (this.customer.drinkProgress >= 1.0) {
                // Done
                this.customer.state = 'walking_out';
                this.score += 50;
                // Reset Liquid visually (optional delay)
                setTimeout(() => { if(liquid) liquid.style.height = '0%'; }, 500);
            }
        }

        // 2. Customer Logic
        if (this.customer) {
            const c = this.customer;
            if (c.state === 'walking_in') {
                c.x += (c.targetX - c.x) * 0.05;
                if (Math.abs(c.x - c.targetX) < 5) c.state = 'waiting';
            } else if (c.state === 'walking_out') {
                c.x += (-400 - c.x) * 0.05;
                if (c.x < -300) {
                    this.customer = null;
                    setTimeout(() => this.spawnCustomer(), 1000);
                }
            }
        }
    }

    draw() {
        // Clear Canvas (Transparent!)
        ctx.clearRect(0, 0, GAME_W, GAME_H);

        // Draw Customer (Behind the CSS Bar, z-index handles this mostly, but we draw here)
        if (this.customer && assets[this.customer.data.id]) {
            const img = assets[this.customer.data.id];
            const meta = SPRITE_DATA.customers.find(x => x.id === this.customer.data.id).poses[0];
            
            // SLICING LOGIC: Frame Width = Image Width / 3
            const frameW = img.width / 3;
            const frameH = img.height;
            
            ctx.drawImage(img,
                0, 0, frameW, frameH, // Source (First Frame)
                this.customer.x - (frameW * meta.s)/2, meta.y, // Dest X, Y
                frameW * meta.s, frameH * meta.s // Dest W, H
            );
        }

        // Draw HUD
        ctx.fillStyle = "white";
        ctx.font = "bold 40px Arial";
        ctx.fillText(`Score: ${this.score}`, 50, 50);
    }

    loop(timestamp) {
        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;
        this.update(dt);
        this.draw();
        requestAnimationFrame(this.loop);
    }
}

// Load Assets
let loaded = 0;
const keys = Object.keys(ASSETS_PATHS);
keys.forEach(k => {
    const img = new Image();
    img.src = ASSETS_PATHS[k];
    img.onload = () => {
        assets[k] = img;
        loaded++;
        if (loaded === keys.length) new Game();
    };
});
