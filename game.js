const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const CONFIG = { BarHeight: 719, TapY: 376, Stations: [0.2, 0.5, 0.8] };

let SPRITE_DATA = {
    customer: { h: 369 },
    tower: { h: 433 },
    // --- CALIBRATION DATA ---
    // x: offset, y: offset, s: scale adjustment
    glasses: [
        {
            empty: { x: -5, y: 510, s: 1.0 },
            half:  { x: -5, y: 510, s: 1.0 },
            mix:   { x: -5, y: 510, s: 1.0 },
            full:  { x: -5, y: 510, s: 1.0 }
        },
        {
            empty: { x: -35, y: 514, s: 1.0 },
            half:  { x: -35, y: 514, s: 1.0 },
            mix:   { x: -35, y: 514, s: 1.0 },
            full:  { x: -35, y: 514, s: 1.0 }
        },
        {
            empty: { x: -62, y: 514, s: 1.0 },
            half:  { x: -62, y: 514, s: 1.0 },
            mix:   { x: -62, y: 514, s: 1.0 },
            full:  { x: -62, y: 514, s: 1.0 }
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
        this.labStage = 'empty'; // 'empty', 'half', 'mix', 'full'

        CONFIG.Stations.forEach((xRatio, i) => {
            this.taps.push(new TapStation(i, xRatio, SPRITE_DATA.taps[i]));
        });
        this.initInput();
    }

    initInput() {
        const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            return { x: (e.clientX || e.touches[0].clientX) - rect.left, y: (e.clientY || e.touches[0].clientY) - rect.top };
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
                if (Math.abs(pos.x - tap.x) < 60 && Math.abs(pos.y - CONFIG.TapY) < 150) {
                    this.activeStationIdx = i;
                    if (!this.activeGlasses.find(g => g.station === i)) {
                        this.activeGlasses.push(new BeerGlass(i, tap.x));
                    }
                }
            });
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.selectedGlass) return;
            const pos = getPos(e);
            const data = SPRITE_DATA.glasses[this.selectedGlass.station][this.labStage];
            data.x = Math.round(pos.x - this.selectedGlass.baseX);
            data.y = Math.round(pos.y - CONFIG.TapY);
        });

        window.addEventListener('mouseup', () => { this.selectedGlass = null; });

        window.addEventListener('keydown', (e) => {
            const data = SPRITE_DATA.glasses[this.activeStationIdx][this.labStage];
            if (e.key === 'ArrowUp') data.s += 0.01;
            if (e.key === 'ArrowDown') data.s -= 0.01;
            // Stage Selector
            if (e.key === '1') this.labStage = 'empty';
            if (e.key === '2') this.labStage = 'half';
            if (e.key === '3') this.labStage = 'mix';
            if (e.key === '4') this.labStage = 'full';
        });
    }

    draw() {
        if (assets.bg) ctx.drawImage(assets.bg, 0, 0, canvas.width, canvas.height);
        this.taps.forEach(t => t.draw());
        this.activeGlasses.forEach(glass => glass.draw(this.labStage));

        ctx.fillStyle = "rgba(0,0,0,0.85)";
        ctx.fillRect(10, 10, 520, 200);
        ctx.fillStyle = "#0f0";
        ctx.font = "14px monospace";
        ctx.fillText(`🛠 MASTER LAB | STATION: ${this.activeStationIdx} | STAGE: ${this.labStage.toUpperCase()}`, 20, 35);
        
        const d = SPRITE_DATA.glasses[this.activeStationIdx][this.labStage];
        ctx.fillText(`CURRENT OFFSET: x: ${d.x}, y: ${d.y}, scale: ${d.s.toFixed(2)}`, 20, 65);
        
        ctx.fillStyle = "#aaa";
        ctx.fillText("KEYS: [1] Empty  [2] Half  [3] Mix  [4] Full", 20, 100);
        ctx.fillText("DRAG glass to position | UP/DOWN to scale", 20, 125);
        ctx.fillText("Switch stages and align each one independently.", 20, 150);
    }
}

class TapStation {
    constructor(index, xRatio, calibration) {
        this.index = index;
        this.x = window.innerWidth * xRatio;
        this.cal = calibration;
    }
    draw() {
        const fW = assets.tower.width / 3;
        const dW = SPRITE_DATA.tower.h * (fW / assets.tower.height);
        ctx.drawImage(assets.tower, this.index * fW, 0, fW, assets.tower.height, this.x - (dW/2), CONFIG.TapY, dW, SPRITE_DATA.tower.h);
        
        const fWt = assets.taps.width / 3;
        const fHt = assets.taps.height / 2;
        const dWt = this.cal.h * (fWt / fHt);
        const dHt = this.cal.h;
        ctx.save();
        ctx.translate(this.x + this.cal.closed.x, CONFIG.TapY + this.cal.closed.y);
        ctx.drawImage(assets.taps, (this.index * fWt) + this.cal.crop.sx, this.cal.crop.sy, fWt + this.cal.crop.sw, fHt + this.cal.crop.sh, -dWt / 2, -dHt, dWt, dHt);
        ctx.restore();
    }
}

class BeerGlass {
    constructor(station, x) {
        this.station = station;
        this.baseX = x;
        this.renderX = 0;
        this.renderY = 0;
    }
    draw(stage) {
        const data = SPRITE_DATA.glasses[this.station][stage];
        const def = SPRITE_DATA.glassDefaults;
        this.renderX = this.baseX + data.x;
        this.renderY = CONFIG.TapY + data.y;

        let img = assets[stage];
        let cols = (stage === 'half' || stage === 'mix') ? 3 : 4;

        if (img && img.complete) {
            const fW = img.width / cols;
            const aspectRatio = img.height / fW;
            const drawW = def.w * def.scale * data.s;
            const drawH = drawW * aspectRatio;
            ctx.drawImage(img, (this.station * fW) + def.clip.sx, 0, fW + def.clip.sw, img.height, this.renderX - drawW/2, this.renderY - drawH, drawW, drawH);
        }
    }
}

function loadImages() {
    let loaded = 0;
    const keys = Object.keys(ASSETS_PATHS);
    keys.forEach(key => {
        const img = new Image(); img.src = ASSETS_PATHS[key];
        img.onload = () => { assets[key] = img; if (++loaded === keys.length) {
            canvas.width = window.innerWidth; canvas.height = window.innerHeight;
            window.game = new Game();
            (function loop() { ctx.clearRect(0,0,canvas.width, canvas.height); window.game.draw(); requestAnimationFrame(loop); })();
        }};
    });
}
loadImages();
