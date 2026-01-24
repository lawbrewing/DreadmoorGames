const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const WORLD = { w: 1920, h: 1080 }; 
let screenScale = 1;
let screenOffset = { x: 0, y: 0 };

// --- 1. SYSTEM CONFIG ---
// Use the W and S keys in the lab to find these perfect numbers
let CONFIG = { 
    BarHeight: 900, 
    TapY: 550, 
    Stations: [0.2, 0.5, 0.8] 
};

let SPRITE_DATA = {
    tower: { h: 433 },
    glasses: [
        { 
            empty: { x: -5, y: 510, s: 1.0 },
            half:  { x: 10, y: 490, s: 1.11 },
            mix_from_2: { x: -5, y: 478, s: 1.11 }, 
            mix_from_1: { x: 7, y: 473, s: 1.11 }, 
            full:  { x: 6, y: 510, s: 1.0 }
        },
        { 
            empty: { x: -42, y: 511, s: 1.0 },
            half:  { x: -28, y: 488, s: 1.11 },
            mix_from_1: { x: -16, y: 478, s: 1.11 }, 
            full:  { x: -25, y: 514, s: 1.0 }
        },
        { 
            empty: { x: -78, y: 508, s: 1.0 },
            half:  { x: -67, y: 482, s: 1.11 },
            full:  { x: -52, y: 513, s: 1.0 }
        }
    ],
    glassDefaults: { w: 64, scale: 2.2, clip: { sx: 2, sw: -4 } },
    taps: [
        { h: 150, closed: { x: -1, y: 133 }, open: { x: -66, y: 54, rot: Math.PI / 2 }, crop: { sx: 2, sy: 41, sw: -4, sh: -2 } },
        { h: 150, closed: { x: -32, y: 140 }, open: { x: -32, y: 13, rot: Math.PI }, crop: { sx: 2, sy: 42, sw: -2, sh: -4 } },
        { h: 150, closed: { x: -54, y: 137 }, open: { x: 8, y: 54, rot: -Math.PI / 2 }, crop: { sx: 4, sy: 43, sw: -6, sh: -2 } }
    ]
};

const ASSETS_PATHS = {
    bg: 'assets/background.png', tower: 'assets/tower.png', taps: 'assets/taps.png',
    empty: 'assets/fullpints.png', half: 'assets/halfpour.png', mix: 'assets/mixpour.png', full: 'assets/fullpints.png'
};

const assets = {}; 

class Game {
    constructor() {
        this.taps = [];
        this.activeGlasses = []; 
        this.selectedGlass = null;
        this.activeStationIdx = 0;
        this.labStage = 'empty'; 

        CONFIG.Stations.forEach((xRatio, i) => {
            this.taps.push(new TapStation(i, xRatio, SPRITE_DATA.taps[i]));
        });
        
        window.addEventListener('resize', () => this.resize());
        this.resize();
        this.initInput();
    }

    resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const scaleX = canvas.width / WORLD.w;
        const scaleY = canvas.height / WORLD.h;
        screenScale = Math.min(scaleX, scaleY);
        screenOffset.x = (canvas.width - WORLD.w * screenScale) / 2;
        screenOffset.y = (canvas.height - WORLD.h * screenScale) / 2;
    }

    initInput() {
        const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            const rawX = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
            const rawY = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
            return { x: (rawX - screenOffset.x) / screenScale, y: (rawY - screenOffset.y) / screenScale };
        };

        canvas.addEventListener('mousedown', (e) => {
            const pos = getPos(e);
            for (let g of this.activeGlasses) {
                if (Math.abs(pos.x - g.renderX) < 50 && Math.abs(pos.y - (g.renderY - 50)) < 80) {
                    this.selectedGlass = g;
                    this.activeStationIdx = g.station;
                    return;
                }
            }
            this.taps.forEach((tap, i) => {
                const worldX = WORLD.w * tap.xRatio;
                if (Math.abs(pos.x - worldX) < 60 && Math.abs(pos.y - CONFIG.TapY) < 250) {
                    this.activeStationIdx = i;
                    if (!this.activeGlasses.find(g => g.station === i)) {
                        this.activeGlasses.push(new BeerGlass(i, worldX));
                    }
                }
            });
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.selectedGlass) return;
            const pos = getPos(e);
            const data = SPRITE_DATA.glasses[this.selectedGlass.station][this.labStage];
            if (!data) return;
            data.x = Math.round(pos.x - this.selectedGlass.baseX);
            data.y = Math.round(pos.y - CONFIG.TapY);
        });

        window.addEventListener('mouseup', () => { this.selectedGlass = null; });

        window.addEventListener('keydown', (e) => {
            // GLOBAL SYSTEM NUDGE (W/S)
            if (e.key === 'w') { CONFIG.TapY -= 5; CONFIG.BarHeight -= 5; }
            if (e.key === 's') { CONFIG.TapY += 5; CONFIG.BarHeight += 5; }
            
            const data = SPRITE_DATA.glasses[this.activeStationIdx][this.labStage];
            if (data) {
                if (e.key === 'ArrowUp') data.s += 0.01;
                if (e.key === 'ArrowDown') data.s -= 0.01;
            }
            if (e.key === '1') this.labStage = 'empty';
            if (e.key === '2') this.labStage = 'half';
            if (e.key === '3') this.labStage = 'mix_from_2';
            if (e.key === '4') this.labStage = 'mix_from_1';
            if (e.key === '5') this.labStage = 'full';
        });
    }

    draw() {
        ctx.fillStyle = "#000"; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(screenOffset.x, screenOffset.y);
        ctx.scale(screenScale, screenScale);

        if (assets.bg) ctx.drawImage(assets.bg, 0, 0, WORLD.w, WORLD.h);
        this.taps.forEach(t => t.draw());
        this.activeGlasses.forEach(glass => glass.draw(this.labStage));

        // HUD
        ctx.fillStyle = "rgba(0,0,0,0.85)";
        ctx.fillRect(10, 10, 580, 240);
        ctx.fillStyle = "#0f0";
        ctx.font = "14px monospace";
        ctx.fillText(`🛠 BAR TOP ALIGNMENT LAB | STAGE: ${this.labStage.toUpperCase()}`, 20, 35);
        ctx.fillText(`CONFIG: TapY: ${CONFIG.TapY}, BarHeight: ${CONFIG.BarHeight}`, 20, 65);
        
        ctx.fillStyle = "#fff";
        ctx.fillText("W / S: Nudge EVERYTHING Up/Down", 20, 100);
        ctx.fillText("DRAG: Move active glass | 1-5: Switch stages", 20, 125);
        ctx.fillText("Align the system to the bar top first, then fix glass offsets.", 20, 160);
        
        ctx.restore();
    }
}

class TapStation {
    constructor(index, xRatio, calibration) {
        this.index = index;
        this.xRatio = xRatio; 
        this.cal = calibration;
    }
    draw() {
        const worldX = WORLD.w * this.xRatio;
        const fW = assets.tower.width / 3;
        const dW = SPRITE_DATA.tower.h * (fW / assets.tower.height);
        ctx.drawImage(assets.tower, this.index * fW, 0, fW, assets.tower.height, worldX - (dW/2), CONFIG.TapY, dW, SPRITE_DATA.tower.h);
        
        const fWt = assets.taps.width / 3;
        const fHt = assets.taps.height / 2;
        const dWt = this.cal.h * (fWt / fHt);
        const dHt = this.cal.h;
        ctx.save();
        ctx.translate(worldX + this.cal.closed.x, CONFIG.TapY + this.cal.closed.y);
        ctx.drawImage(assets.taps, (this.index * fWt) + this.cal.crop.sx, this.cal.crop.sy, fWt + this.cal.crop.sw, fHt + this.cal.crop.sh, -dWt / 2, -dHt, dWt, dHt);
        ctx.restore();
    }
}

class BeerGlass {
    constructor(station, worldX) {
        this.station = station;
        this.baseX = worldX;
        this.renderX = 0;
        this.renderY = 0;
    }
    draw(stage) {
        const data = SPRITE_DATA.glasses[this.station][stage];
        if (!data) return; 
        const def = SPRITE_DATA.glassDefaults;
        this.renderX = this.baseX + data.x;
        this.renderY = CONFIG.TapY + data.y;

        let img, cols, frameIdx;
        switch(stage) {
            case 'empty': img = assets.empty; cols = 4; frameIdx = 0; break;
            case 'half': img = assets.half; cols = 3; frameIdx = this.station; break;
            case 'mix_from_2': img = assets.mix; cols = 3; frameIdx = (this.station === 0) ? 0 : -1; break;
            case 'mix_from_1': img = assets.mix; cols = 3; frameIdx = (this.station === 0) ? 1 : (this.station === 1 ? 2 : -1); break;
            case 'full': img = assets.full; cols = 4; frameIdx = this.station + 1; break;
        }

        if (img && frameIdx !== -1) {
            const fW = img.width / cols;
            const drawW = def.w * def.scale * data.s;
            const drawH = drawW * (img.height / fW);
            ctx.drawImage(img, (frameIdx * fW) + def.clip.sx, 0, fW + def.clip.sw, img.height, this.renderX - drawW/2, this.renderY - drawH, drawW, drawH);
        }
    }
}

function loadImages() {
    let loaded = 0;
    const keys = Object.keys(ASSETS_PATHS);
    keys.forEach(key => {
        const img = new Image(); img.src = ASSETS_PATHS[key];
        img.onload = () => { assets[key] = img; if (++loaded === keys.length) {
            window.game = new Game();
            (function loop() { ctx.clearRect(0,0,canvas.width, canvas.height); window.game.draw(); requestAnimationFrame(loop); })();
        }};
    });
}
loadImages();
