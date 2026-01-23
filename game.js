const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const CONFIG = { 
    BarHeight: 719, 
    TapY: 376, 
    Stations: [0.2, 0.5, 0.8],
    PourSpeed: 0.01 // Speed from 0 to 1
};

let SPRITE_DATA = {
    customer: { h: 369 },
    tower: { h: 433 },
    // --- GLASS DATA ---
    // Adjust glassY to sit on the bar, glassX to center under the tap
    glass: { 
        w: 64, h: 64, scale: 2.2,
        offsets: [
            { x: 0, y: 350 }, // Station 0
            { x: 0, y: 350 }, // Station 1
            { x: 0, y: 350 }  // Station 2
        ]
    },
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
    empty: 'assets/fullpints.png', // We use frame 0/1/2 for empty
    half: 'assets/halfpour.png',
    full: 'assets/fullpints.png'  // We use the full states here
};

const assets = {}; 

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
            return {
                x: (e.touches ? e.touches[0].clientX : e.clientX) - rect.left,
                y: (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
            };
        };

        canvas.addEventListener('mousedown', (e) => {
            const pos = getPos(e);
            
            // Check for Glass Dragging (Calibration)
            this.activeGlasses.forEach(g => {
                if (Math.abs(pos.x - g.renderX) < 40 && Math.abs(pos.y - g.renderY) < 60) {
                    this.selectedGlass = g;
                }
            });

            if (this.selectedGlass) return;

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
            const off = SPRITE_DATA.glass.offsets[this.selectedGlass.station];
            off.x = Math.round(pos.x - this.selectedGlass.baseX);
            off.y = Math.round(pos.y - CONFIG.TapY);
        });

        window.addEventListener('mouseup', () => this.selectedGlass = null);
    }

    update() {
        this.activeGlasses.forEach(glass => {
            const tap = this.taps[glass.station];
            if (tap.pulled && glass.fillLevel < 1) {
                glass.fillLevel += CONFIG.PourSpeed;
            }
        });
    }

    draw() {
        if (assets.bg) ctx.drawImage(assets.bg, 0, 0, canvas.width, canvas.height);
        
        // Glasses drawn behind Taps for perspective
        this.activeGlasses.forEach(glass => glass.draw());
        this.taps.forEach(t => t.draw());

        // GLASS HUD
        ctx.fillStyle = "rgba(0,0,0,0.85)";
        ctx.fillRect(10, 10, 450, 150);
        ctx.fillStyle = "#0f0";
        ctx.font = "13px monospace";
        ctx.fillText("🍺 GLASS CALIBRATION LAB", 20, 30);
        this.activeGlasses.forEach((g, i) => {
            const off = SPRITE_DATA.glass.offsets[g.station];
            ctx.fillText(`Glass ${g.station} Offset: { x: ${off.x}, y: ${off.y} }`, 20, 60 + (i * 20));
        });
        ctx.fillStyle = "#aaa";
        ctx.fillText("1. Click tower to spawn glass.", 20, 120);
        ctx.fillText("2. Drag glass to align under nozzle.", 20, 140);
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
}

class BeerGlass {
    constructor(station, x) {
        this.station = station;
        this.baseX = x;
        this.fillLevel = 0; // 0 to 1
    }

    draw() {
        const off = SPRITE_DATA.glass.offsets[this.station];
        const s = SPRITE_DATA.glass;
        this.renderX = this.baseX + off.x;
        this.renderY = CONFIG.TapY + off.y;

        let img = assets.empty;
        if (this.fillLevel > 0.8) img = assets.full;
        else if (this.fillLevel > 0.2) img = assets.half;

        if (img) {
            const fW = img.width / 3;
            const drawW = s.w * s.scale;
            const drawH = s.h * s.scale;
            
            ctx.drawImage(
                img, 
                this.station * fW, 0, fW, img.height, 
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
                (function loop() {
                    ctx.clearRect(0,0,canvas.width, canvas.height);
                    window.game.update();
                    window.game.draw();
                    requestAnimationFrame(loop);
                })();
            }
        };
    });
}
loadImages();
