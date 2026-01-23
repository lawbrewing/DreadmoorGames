const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const CONFIG = { BarHeight: 719, TapY: 376, Stations: [0.2, 0.5, 0.8] };

let SPRITE_DATA = {
    customer: { h: 369 },
    tower: { h: 433 },
    taps: [
        { h: 150, 
          closed: { x: -1, y: 133 }, 
          open:   { x: -58, y: 51, rot: Math.PI / 2 },
          crop: { sx: 2, sy: 41, sw: -4, sh: -2 } 
        },
        { h: 150, 
          closed: { x: -31, y: 137 }, 
          open:   { x: -31, y: 21, rot: Math.PI },
          crop: { sx: 2, sy: 42, sw: -2, sh: -4 } 
        },
        { h: 150, 
          closed: { x: -53, y: 135 }, 
          open:   { x: 0, y: 53, rot: -Math.PI / 2 },
          crop: { sx: 4, sy: 43, sw: -6, sh: -2 } 
        }
    ]
};

const ASSETS_PATHS = {
    bg: 'assets/background.png',
    tower: 'assets/tower.png', 
    taps: 'assets/taps.png'
};

const assets = {}; 

class Game {
    constructor() {
        this.taps = [];
        this.activeTapIdx = 0;
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
            this.taps.forEach((tap, i) => {
                const state = tap.pulled ? tap.cal.open : tap.cal.closed;
                const hX = tap.x + state.x;
                const hY = CONFIG.TapY + state.y;
                
                // If clicking the handle, start dragging
                if (Math.abs(pos.x - hX) < 40 && Math.abs(pos.y - hY) < 40) {
                    this.selectedHandle = tap;
                    this.activeTapIdx = i;
                } 
                // If clicking the tower area, toggle open/closed
                else if (Math.abs(pos.x - tap.x) < 60 && Math.abs(pos.y - CONFIG.TapY) < 150) {
                    tap.pulled = !tap.pulled;
                    this.activeTapIdx = i;
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

        window.addEventListener('keydown', (e) => {
            const c = SPRITE_DATA.taps[this.activeTapIdx].crop;
            if (e.key === 'q') c.sx++; // Shave Left
            if (e.key === 'a') c.sx--;
            if (e.key === 'w') c.sy++; // Shave Top
            if (e.key === 's') c.sy--;
            if (e.key === 'e') c.sw--; // Shave Right
            if (e.key === 'd') c.sw++;
            if (e.key === 'r') c.sh--; // Shave Bottom
            if (e.key === 'f') c.sh++;
        });
    }

    draw() {
        if (assets.bg) ctx.drawImage(assets.bg, 0, 0, canvas.width, canvas.height);
        this.taps.forEach(t => t.draw());

        // SUPER HUD
        ctx.fillStyle = "rgba(0,0,0,0.85)";
        ctx.fillRect(10, 10, 580, 240);
        ctx.fillStyle = "#0f0";
        ctx.font = "13px monospace";
        ctx.fillText(`🛠 MASTER LAB: TAP ${this.activeTapIdx}`, 20, 30);
        
        const t = this.taps[this.activeTapIdx];
        const c = t.cal.crop;
        
        ctx.fillText(`[MOUSE] Position - Closed: {x:${t.cal.closed.x}, y:${t.cal.closed.y}}`, 20, 60);
        ctx.fillText(`                   Open:   {x:${t.cal.open.x}, y:${t.cal.open.y}}`, 20, 75);
        
        ctx.fillStyle = "#44ff44";
        ctx.fillText(`[KEYS]  Crop - SX:${c.sx} SY:${c.sy} SW:${c.sw} SH:${c.sh}`, 20, 110);
        ctx.fillStyle = "#aaa";
        ctx.fillText("Q/A: Left | W/S: Top | E/D: Right | R/F: Bottom", 20, 130);
        
        ctx.fillStyle = "#fff";
        ctx.fillText("1. Click Tower to toggle Open/Closed.", 20, 170);
        ctx.fillText("2. Drag Handle to position it.", 20, 190);
        ctx.fillText("3. Use keys to shave edges if neighbors show.", 20, 210);
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
            const c = this.cal.crop;

            ctx.save();
            ctx.translate(this.x + state.x, CONFIG.TapY + state.y);
            if (this.pulled) ctx.rotate(state.rot);

            ctx.drawImage(
                assets.taps,
                (this.index * fW) + c.sx, (this.pulled ? fH : 0) + c.sy, 
                fW + c.sw, fH + c.sh, 
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
                const game = new Game();
                (function loop() {
                    ctx.clearRect(0,0,canvas.width, canvas.height);
                    game.draw();
                    requestAnimationFrame(loop);
                })();
            }
        };
    });
}
loadImages();
