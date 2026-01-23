const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- 1. CONFIGURATION ---
const CONFIG = { 
    BarHeight: 719, 
    TapY: 376, 
    Stations: [0.2, 0.5, 0.8],
    PourSpeed: 0.008 // Slightly slower for smoother visual transitions
};

let SPRITE_DATA = {
    customer: { h: 369 },
    tower: { h: 433 },
    // --- GLASS CALIBRATION ---
    glasses: [
        { w: 64, scale: 2.2, clip: { sx: 2, sw: -4 }, x: -5, y: 510 },  // Station 0
        { x: -35, y: 514 }, // Station 1
        { x: -62, y: 514 }  // Station 2
    ],
    taps: [
        { h: 150, closed: { x: -1, y: 133 }, open: { x: -66, y: 54, rot: Math.PI / 2 }, crop: { sx: 2, sy: 41, sw: -4, sh: -2 } },
        { h: 150, closed: { x: -32, y: 140 }, open: { x: -32, y: 13, rot: Math.PI }, crop: { sx: 2, sy: 42, sw: -2, sh: -4 } },
        { h: 150, closed: { x: -54, y: 137 }, open: { x: 8, y: 54, rot: -Math.PI / 2 }, crop: { sx: 4, sy: 43, sw: -6, sh: -2 } }
    ]
};

const ASSETS_PATHS = {
    bg: 'assets/background.png',
    tower: 'assets/tower.png', 
    taps: 'assets/taps.png',
    empty: 'assets/fullpints.png', 
    half: 'assets/halfpour.png',
    mix: 'assets/mixpour.png',
    full: 'assets/fullpints.png'
};

const assets = {}; 

// --- 2. GAME ENGINE ---

class Game {
    constructor() {
        this.taps = [];
        this.activeGlasses = []; 
        this.selectedGlass = null;

        CONFIG.Stations.forEach((xRatio, i) => {
            this.taps.push(new TapStation(i, xRatio, SPRITE_DATA.taps[i]));
        });
        
        this.initInput();
    }

    initInput() {
        const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return { x: clientX - rect.left, y: clientY - rect.top };
        };

        canvas.addEventListener('mousedown', (e) => {
            const pos = getPos(e);
            
            // Check for Glass Dragging
            for (let g of this.activeGlasses) {
                if (Math.abs(pos.x - g.renderX) < 50 && Math.abs(pos.y - (g.renderY - 50)) < 80) {
                    this.selectedGlass = g;
                    return;
                }
            }

            // Check for Tap Pull
            this.taps.forEach((tap, i) => {
                if (Math.abs(pos.x - tap.x) < 60 && Math.abs(pos.y - CONFIG.TapY) < 150) {
                    tap.pulled = !tap.pulled;
                    if (tap.pulled && !this.activeGlasses.find(g => g.station === i)) {
                        this.activeGlasses.push(new BeerGlass(i, tap.x));
                    }
                }
            });
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.selectedGlass) return;
            const pos = getPos(e);
            const cal = SPRITE_DATA.glasses[this.selectedGlass.station];
            cal.x = Math.round(pos.x - this.selectedGlass.baseX);
            cal.y = Math.round(pos.y - CONFIG.TapY);
        });

        window.addEventListener('mouseup', () => { this.selectedGlass = null; });
    }

    update() {
        this.activeGlasses.forEach(glass => {
            const tap = this.taps[glass.station];
            if (tap && tap.pulled && glass.fillLevel < 1) {
                glass.fillLevel += CONFIG.PourSpeed;
            }
        });
    }

    draw() {
        if (assets.bg) ctx.drawImage(assets.bg, 0, 0, canvas.width, canvas.height);
        
        // 1. Draw Towers & Streams
        this.taps.forEach(t => {
            t.draw();
            t.drawStream(); 
        });

        // 2. Draw Glasses (On top of stream)
        this.activeGlasses.forEach(glass => glass.draw());

        // HUD
        ctx.fillStyle = "rgba(0,0,0,0.85)";
        ctx.fillRect(10, 10, 420, 160);
        ctx.fillStyle = "#0f0";
        ctx.font = "13px monospace";
        ctx.fillText("🍺 MASTER POUR LAB", 20, 30);
        this.activeGlasses.forEach((g, i) => {
            const cal = SPRITE_DATA.glasses[g.station];
            ctx.fillText(`Station ${g.station}: x:${cal.x}, y:${cal.y}`, 20, 55 + (i * 20));
        });
        ctx.fillStyle = "#aaa";
        ctx.fillText("Adjust 'sizeAdjust' in BeerGlass to fix jumps.", 20, 145);
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
            ctx.drawImage(assets.taps, (this.index * fW) + c.sx, (this.pulled ? fH : 0) + c.sy, fW + c.sw, fH + c.sh, -dW / 2, -dH, dW, dH);
            ctx.restore();
        }
    }

    drawStream() {
        if (!this.pulled) return;
        const state = this.cal.open;
        const streamX = this.x + state.x;
        const streamY = CONFIG.TapY + state.y;
        
        ctx.fillStyle = "rgba(255, 190, 0, 0.7)"; // Beer stream color
        ctx.fillRect(streamX - 3, streamY, 6, CONFIG.BarHeight - streamY);
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)"; // Shine line
        ctx.fillRect(streamX - 1, streamY, 2, CONFIG.BarHeight - streamY);
    }
}

class BeerGlass {
    constructor(station, x) {
        this.station = station;
        this.baseX = x;
        this.fillLevel = 0; 
        this.renderX = 0;
        this.renderY = 0;
    }

    draw() {
        const cal = SPRITE_DATA.glasses[this.station] || SPRITE_DATA.glasses[0];
        const baseCal = SPRITE_DATA.glasses[0]; 
        
        this.renderX = this.baseX + (cal.x || 0);
        this.renderY = CONFIG.TapY + (cal.y || 0);

        let img = assets.empty;
        let cols = 4; 
        let sizeAdjust = 1.0; // TWEAK THESE TO PREVENT JUMPS

        if (this.fillLevel > 0.8) {
            img = assets.full; cols = 4; sizeAdjust = 1.0; 
        } else if (this.fillLevel > 0.5) {
            img = assets.mix; cols = 3; sizeAdjust = 0.98; // Example adjustment
        } else if (this.fillLevel > 0.2) {
            img = assets.half; cols = 3; sizeAdjust = 1.02; // Example adjustment
        }

        if (img && img.complete) {
            const fW = img.width / cols;
            const fH = img.height; 
            const aspectRatio = fH / fW;
            const drawW = baseCal.w * baseCal.scale * sizeAdjust;
            const drawH = drawW * aspectRatio; 
            const clip = baseCal.clip;

            ctx.drawImage(
                img, 
                (this.station * fW) + clip.sx, 0, 
                fW + clip.sw, fH, 
                this.renderX - drawW/2, this.renderY - drawH, 
                drawW, drawH
            );
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
                window.game = new Game();
                function loop() {
                    ctx.clearRect(0,0,canvas.width, canvas.height);
                    window.game.update();
                    window.game.draw();
                    requestAnimationFrame(loop);
                }
                loop();
            }
        };
    });
}
loadImages();
