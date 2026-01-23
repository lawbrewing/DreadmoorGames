const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- 1. FINAL LOCKED CONFIGURATION ---
const CONFIG = { 
    BarHeight: 719, 
    TapY: 376, 
    Stations: [0.2, 0.5, 0.8] 
};

const SPRITE_DATA = {
    customer: { h: 369 },
    tower: { h: 433 },
    taps: [
        { h: 150, 
          closed: { x: -1, y: 133 }, 
          open:   { x: -58, y: 51, rot: Math.PI / 2 },
          clip: { x: 1, y: 1, w: -3, h: -2 } // Extra clip on right
        },
        { h: 150, 
          closed: { x: -31, y: 137 }, 
          open:   { x: -31, y: 21, rot: Math.PI },
          clip: { x: 1, y: 1, w: -2, h: -4 } // Extra clip on bottom
        },
        { h: 150, 
          closed: { x: -53, y: 135 }, 
          open:   { x: 0, y: 53, rot: -Math.PI / 2 },
          clip: { x: 3, y: 1, w: -4, h: -2 } // Extra clip on left
        }
    ]
};

const ASSETS_PATHS = {
    bg: 'assets/background.png',
    tower: 'assets/tower.png', 
    taps: 'assets/taps.png',    
    reg: 'assets/regular.png'
};

const assets = {}; 

class Game {
    constructor() {
        this.taps = [];
        CONFIG.Stations.forEach((xRatio, i) => {
            this.taps.push(new TapStation(i, xRatio, SPRITE_DATA.taps[i]));
        });
        
        // Locked Input: Only for gameplay (pulling taps)
        canvas.addEventListener('mousedown', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX) - rect.left;
            const y = (e.clientY) - rect.top;
            
            this.taps.forEach(tap => {
                if (Math.abs(x - tap.x) < 60 && Math.abs(y - CONFIG.TapY) < 200) {
                    tap.pull();
                }
            });
        });
    }

    update() {
        this.taps.forEach(t => t.update());
    }

    draw() {
        if (assets.bg) ctx.drawImage(assets.bg, 0, 0, canvas.width, canvas.height);
        this.taps.forEach(t => t.draw());
    }
}

class TapStation {
    constructor(index, xRatio, calibration) {
        this.index = index;
        this.x = window.innerWidth * xRatio;
        this.cal = calibration;
        this.pulled = false;
        this.pullTimer = 0;
    }

    pull() {
        this.pulled = true;
        this.pullTimer = 15; // Pull duration
    }

    update() {
        if (this.pulled && --this.pullTimer <= 0) this.pulled = false;
    }

    draw() {
        if (assets.tower) {
            const fW = assets.tower.width / 3;
            const dW = SPRITE_DATA.tower.h * (fW / assets.tower.height);
            ctx.drawImage(assets.tower, this.index * fW, 0, fW, assets.tower.height, this.x - (dW/2), CONFIG.TapY, dW, SPRITE_DATA.tower.h);
        }
        
        if (assets.taps) {
            const fW = assets.taps.width / 3;
            const fH = assets.taps.height / 2;
            const dW = this.cal.h * (fW / fH);
            const dH = this.cal.h;
            const state = this.pulled ? this.cal.open : this.cal.closed;
            const c = this.cal.clip;

            ctx.save();
            ctx.translate(this.x + state.x, CONFIG.TapY + state.y);
            if (this.pulled) ctx.rotate(state.rot);

            // Using the custom clip data to stop artifacts on a per-tap basis
            ctx.drawImage(
                assets.taps,
                (this.index * fW) + c.x, (this.pulled ? fH : 0) + c.y, 
                fW + c.w, fH + c.h, 
                -dW / 2, -dH, 
                dW, dH
            );
            ctx.restore();
        }
    }
}

// ... Image Loading Bootstrap ...
function loadImages() {
    let loaded = 0;
    const keys = Object.keys(ASSETS_PATHS);
    keys.forEach(key => {
        const img = new Image();
        img.src = ASSETS_PATHS[key];
        img.onload = () => {
            assets[key] = img;
            if (++loaded === keys.length) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                const game = new Game();
                (function loop() {
                    ctx.clearRect(0,0,canvas.width, canvas.height);
                    game.update();
                    game.draw();
                    requestAnimationFrame(loop);
                })();
            }
        };
    });
}
loadImages();
