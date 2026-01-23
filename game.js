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
          crop: { sx: 2, sy: 2, sw: -4, sh: -2 } 
        },
        { h: 150, 
          closed: { x: -31, y: 137 }, 
          open:   { x: -31, y: 21, rot: Math.PI },
          crop: { sx: 2, sy: 2, sw: -2, sh: -4 } 
        },
        { h: 150, 
          closed: { x: -53, y: 135 }, 
          open:   { x: 0, y: 53, rot: -Math.PI / 2 },
          crop: { sx: 4, sy: 2, sw: -6, sh: -2 } 
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
        this.activeTapIdx = 0; // Which tap are we currently "shaving"?
        CONFIG.Stations.forEach((xRatio, i) => {
            this.taps.push(new TapStation(i, xRatio, SPRITE_DATA.taps[i]));
        });
        
        // Input: Click tower to toggle pulled state
        canvas.addEventListener('mousedown', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            this.taps.forEach((tap, i) => {
                if (Math.abs(x - tap.x) < 60) {
                    tap.pulled = !tap.pulled;
                    this.activeTapIdx = i; // Focus this tap for keyboard cropping
                }
            });
        });

        // KEYBOARD CONTROLS FOR CROPPING
        window.addEventListener('keydown', (e) => {
            const c = SPRITE_DATA.taps[this.activeTapIdx].crop;
            if (e.key === 'q') c.sx++; // Shave Left
            if (e.key === 'a') c.sx--;
            if (e.key === 'w') c.sy++; // Shave Top
            if (e.key === 's') c.sy--;
            if (e.key === 'e') c.sw--; // Shave Right (Decrease width)
            if (e.key === 'd') c.sw++;
            if (e.key === 'r') c.sh--; // Shave Bottom (Decrease height)
            if (e.key === 'f') c.sh++;
        });
    }

    draw() {
        if (assets.bg) ctx.drawImage(assets.bg, 0, 0, canvas.width, canvas.height);
        this.taps.forEach(t => t.draw());

        // CROP HUD
        ctx.fillStyle = "rgba(0,0,0,0.85)";
        ctx.fillRect(10, 10, 550, 220);
        ctx.fillStyle = "#0f0";
        ctx.font = "14px monospace";
        ctx.fillText(`🛠 CROPPING TAP ${this.activeTapIdx} (Click a tower to switch)`, 20, 35);
        
        const cur = SPRITE_DATA.taps[this.activeTapIdx].crop;
        ctx.fillText(`SX (Left): ${cur.sx} [Q/A]`, 20, 70);
        ctx.fillText(`SY (Top):  ${cur.sy} [W/S]`, 20, 95);
        ctx.fillText(`SW (Width Adjustment): ${cur.sw} [E/D]`, 20, 120);
        ctx.fillText(`SH (Height Adjustment): ${cur.sh} [R/F]`, 20, 145);
        
        ctx.fillStyle = "#aaa";
        ctx.fillText("Adjust until neighbors disappear, then save numbers.", 20, 190);
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
