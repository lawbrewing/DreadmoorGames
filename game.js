const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let CONFIG = { BarHeight: 719, TapY: 376, Stations: [0.2, 0.5, 0.8] };

// --- 1. DUAL-STATE DATA ---
let SPRITE_DATA = {
    customer: { h: 369 },
    tower: { h: 433 },
    taps: [
        { h: 150, 
          closed: { x: -1, y: 133 }, 
          open:   { x: -58, y: 51, rot: Math.PI / 2 } 
        },
        { h: 150, 
          closed: { x: -31, y: 137 }, 
          open:   { x: -31, y: 21, rot: Math.PI } 
        },
        { h: 150, 
          closed: { x: -53, y: 135 }, 
          open:   { x: 0, y: 53, rot: -Math.PI / 2 } 
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
        this.selectedHandle = null; 
        CONFIG.Stations.forEach((xRatio, i) => {
            this.taps.push(new TapStation(i, xRatio, SPRITE_DATA.taps[i]));
        });
        this.initInput();
    }

    initInput() {
        const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            return {
                x: (e.touches ? e.touches[0].clientX : e.clientX) - rect.left,
                y: (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
            };
        };

        canvas.addEventListener('mousedown', (e) => {
            const pos = getPos(e);
            this.taps.forEach(tap => {
                const state = tap.pulled ? tap.cal.open : tap.cal.closed;
                const hX = tap.x + state.x;
                const hY = CONFIG.TapY + state.y;
                
                if (Math.abs(pos.x - hX) < 50 && Math.abs(pos.y - hY) < 50) {
                    this.selectedHandle = tap;
                } else if (Math.abs(pos.x - tap.x) < 60 && Math.abs(pos.y - CONFIG.TapY) < 150) {
                    tap.pulled = !tap.pulled; // Toggle state for easy calibration
                }
            });
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.selectedHandle) return;
            const pos = getPos(e);
            const tap = this.selectedHandle;
            const state = tap.pulled ? tap.cal.open : tap.cal.closed;
            state.x = Math.round(pos.x - tap.x);
            state.y = Math.round(pos.y - CONFIG.TapY);
        });

        window.addEventListener('mouseup', () => this.selectedHandle = null);
    }

    draw() {
        if (assets.bg) ctx.drawImage(assets.bg, 0, 0, canvas.width, canvas.height);
        this.taps.forEach(t => t.draw());

        // HUD
        ctx.fillStyle = "rgba(0,0,0,0.85)";
        ctx.fillRect(10, 10, 520, 220);
        ctx.fillStyle = "#0f0";
        ctx.font = "13px monospace";
        ctx.fillText("🛠 DUAL-STATE CALIBRATOR (Click Tower to Toggle Open/Closed)", 20, 30);
        this.taps.forEach((t, i) => {
            ctx.fillText(`Tap ${i} [CLOSED]: x: ${t.cal.closed.x}, y: ${t.cal.closed.y}`, 20, 60 + (i * 45));
            ctx.fillText(`Tap ${i} [ OPEN ]: x: ${t.cal.open.x}, y: ${t.cal.open.y}`, 20, 75 + (i * 45));
        });
    }
}

class TapStation {
    constructor(index, xRatio, calibration) {
        this.index = index;
        this.x = window.innerWidth * xRatio;
        this.cal = calibration;
        this.pulled = false;
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

            ctx.save();
            ctx.translate(this.x + state.x, CONFIG.TapY + state.y);
            if (this.pulled) ctx.rotate(state.rot);

            // --- THE CROP FIX ---
            // We use +1 and -2 to "pull in" the edges by 1 pixel to prevent ghosting
            ctx.drawImage(
                assets.taps,
                (this.index * fW) + 1, (this.pulled ? fH : 0) + 1, 
                fW - 2, fH - 2, 
                -dW / 2, -dH, 
                dW, dH
            );
            ctx.restore();
        }
    }
}

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
                window.gameInstance = new Game();
                (function loop() {
                    ctx.clearRect(0,0,canvas.width, canvas.height);
                    window.gameInstance.draw();
                    requestAnimationFrame(loop);
                })();
            }
        };
    });
}
loadImages();
