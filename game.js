const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const WORLD = { w: 1920, h: 1080 }; 
let screenScale = 1;
let screenOffset = { x: 0, y: 0 };

let CONFIG = { BarHeight: 850, TapY: 500, Stations: [0.2, 0.5, 0.8] };

let SPRITE_DATA = {
    tower: { h: 433 },
    // --- SPILLS (One for each tap) ---
    spills: [
        { x: 0, y: 0, s: 1.0, clip: { sx: 0, sy: 0, sw: 0, sh: 0 } }, 
        { x: 0, y: 0, s: 1.0, clip: { sx: 0, sy: 0, sw: 0, sh: 0 } }, 
        { x: 0, y: 0, s: 1.0, clip: { sx: 0, sy: 0, sw: 0, sh: 0 } }
    ],
    // --- PADDLES (One for Judge/Middle, one for VIP/Right) ---
    paddles: [
        { owner: 'judge', x: 0, y: 0, s: 1.0, clip: { sx: 0, sy: 0, sw: 0, sh: 0 }, sizeIdx: 0 }, 
        { owner: 'vip',   x: 0, y: 0, s: 1.0, clip: { sx: 0, sy: 0, sw: 0, sh: 0 }, sizeIdx: 0 }
    ],
    customers: [
        { id: 'viking',  name: "Viking",  poses: [ {x:167, y:966, s:.48, clip:{sx:-98, sy:0, sw:0, sh:0}}, {x:214, y:967, s:.47, clip:{sx:-67, sy:0, sw:0, sh:0}}, {x:271, y:978, s:.51, clip:{sx:0, sy:0, sw:0, sh:0}} ] },
        { id: 'hipster', name: "Hipster", poses: [ {x:674, y:1056, s:.46, clip:{sx:0, sy:0, sw:0, sh:0}}, {x:709, y:1050, s:.45, clip:{sx:0, sy:0, sw:0, sh:0}}, {x:679, y:1056, s:.46, clip:{sx:0, sy:0, sw:0, sh:0}} ] },
        { id: 'regular', name: "Regular", poses: [ {x:1122,y:1015, s:.42, clip:{sx:0, sy:0, sw:0, sh:0}}, {x:1163,y:1013, s:.42, clip:{sx:0, sy:0, sw:0, sh:0}}, {x:1168,y:1014, s:.42, clip:{sx:27, sy:0, sw:0, sh:0}} ] },
        { id: 'judge',   name: "Judge",   poses: [ {x:703, y:911, s:.39, clip:{sx:0, sy:0, sw:0, sh:0}}, {x:739, y:913, s:.39, clip:{sx:0, sy:0, sw:0, sh:0}}, {x:738, y:908, s:.37, clip:{sx:14, sy:-2, sw:0, sh:0}} ] },
        { id: 'karen',   name: "Karen",   poses: [ {x:585, y:1053, s:.42, clip:{sx:0, sy:0, sw:0, sh:0}}, {x:583, y:1049, s:.41, clip:{sx:0, sy:0, sw:0, sh:0}}, {x:628, y:1043, s:.40, clip:{sx:0, sy:0, sw:0, sh:0}} ] },
        { id: 'vip',     name: "VIP",     poses: [ {x:1151, y:913, s:.35, clip:{sx:0, sy:0, sw:0, sh:0}}, {x:1173, y:887, s:.33, clip:{sx:0, sy:0, sw:0, sh:0}}, {x:1220, y:865, s:.35, clip:{sx:0, sy:0, sw:0, sh:0}} ] }
    ],
    glasses: [
        { empty: { x: -5, y: 510, s: 1.0 }, half: { x: 10, y: 490, s: 1.11 }, mix_from_2: { x: -5, y: 478, s: 1.11 }, mix_from_1: { x: 7, y: 473, s: 1.11 }, full: { x: 6, y: 510, s: 1.0 } },
        { empty: { x: -42, y: 511, s: 1.0 }, half: { x: -28, y: 488, s: 1.11 }, mix_from_1: { x: -16, y: 478, s: 1.11 }, full: { x: -25, y: 514, s: 1.0 } },
        { empty: { x: -78, y: 508, s: 1.0 }, half: { x: -67, y: 482, s: 1.11 }, full: { x: -52, y: 513, s: 1.0 } }
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
    empty: 'assets/fullpints.png', half: 'assets/halfpour.png', mix: 'assets/mixpour.png', full: 'assets/fullpints.png',
    hipster: 'assets/hipster.png', judge: 'assets/judge.png', karen: 'assets/karen.png',
    regular: 'assets/regular.png', viking: 'assets/viking.png', vip: 'assets/vip.png',
    spill: 'assets/spill.png', paddles: 'assets/paddles.png'
};

const assets = {}; 

class Game {
    constructor() {
        this.taps = [];
        this.activeCharIdx = 0;
        this.activePoseIdx = 0;
        this.activeStationIdx = 0;
        this.activePaddleIdx = 0;
        this.labMode = 'customer'; 
        this.selectedObject = null;
        this.showGhostDrink = false;

        CONFIG.Stations.forEach((xRatio, i) => {
            this.taps.push(new TapStation(i, xRatio, SPRITE_DATA.taps[i]));
        });
        
        window.addEventListener('resize', () => this.resize());
        this.resize();
        this.initInput();
    }

    resize() {
        canvas.width = window.innerWidth; canvas.height = window.innerHeight;
        const scaleX = canvas.width / WORLD.w; const scaleY = canvas.height / WORLD.h;
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
            if (this.labMode === 'customer') {
                const p = SPRITE_DATA.customers[this.activeCharIdx].poses[this.activePoseIdx];
                if (Math.abs(pos.x - p.x) < 150 && Math.abs(pos.y - p.y + 200) < 400) this.selectedObject = p;
            } else if (this.labMode === 'spill') {
                this.selectedObject = SPRITE_DATA.spills[this.activeStationIdx];
            } else if (this.labMode === 'paddle') {
                this.selectedObject = SPRITE_DATA.paddles[this.activePaddleIdx];
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.selectedObject) return;
            const pos = getPos(e);
            if (this.labMode === 'customer') {
                this.selectedObject.x = Math.round(pos.x);
                this.selectedObject.y = Math.round(pos.y);
            } else {
                const stationIdx = this.labMode === 'spill' ? this.activeStationIdx : (SPRITE_DATA.paddles[this.activePaddleIdx].owner === 'judge' ? 1 : 2);
                const worldX = WORLD.w * CONFIG.Stations[stationIdx];
                this.selectedObject.x = Math.round(pos.x - worldX);
                this.selectedObject.y = Math.round(pos.y - CONFIG.TapY);
            }
        });

        window.addEventListener('mouseup', () => { this.selectedObject = null; });

        window.addEventListener('keydown', (e) => {
            let p = null;
            if (this.labMode === 'customer') p = SPRITE_DATA.customers[this.activeCharIdx].poses[this.activePoseIdx];
            if (this.labMode === 'spill') p = SPRITE_DATA.spills[this.activeStationIdx];
            if (this.labMode === 'paddle') p = SPRITE_DATA.paddles[this.activePaddleIdx];

            if (e.key === '1') this.activePoseIdx = 0;
            if (e.key === '2') this.activePoseIdx = 1;
            if (e.key === '3') this.activePoseIdx = 2;
            if (e.key === '6') this.labMode = 'spill';
            if (e.key === '7') this.labMode = 'paddle';
            if (e.key === '8') this.labMode = 'customer';
            
            if (this.labMode === 'paddle') {
                if (e.key === 'v') p.sizeIdx = (p.sizeIdx + 1) % 4;
                if (e.key === 'g') this.showGhostDrink = !this.showGhostDrink;
            }

            if (e.key === 'Tab') { 
                e.preventDefault(); 
                if (this.labMode === 'customer') this.activeCharIdx = (this.activeCharIdx + 1) % SPRITE_DATA.customers.length;
                else if (this.labMode === 'spill') this.activeStationIdx = (this.activeStationIdx + 1) % 3;
                else this.activePaddleIdx = (this.activePaddleIdx + 1) % 2;
            }

            if (p) {
                if (e.key === 'ArrowUp') p.s += 0.01;
                if (e.key === 'ArrowDown') p.s -= 0.01;
                if (e.key === 'q') p.clip.sx++; if (e.key === 'a') p.clip.sx--;
                if (e.key === 'w') p.clip.sw--; if (e.key === 's') p.clip.sw++;
                if (e.key === 'e') p.clip.sy++; if (e.key === 'd') p.clip.sy--;
                if (e.key === 'r') p.clip.sh--; if (e.key === 'f') p.clip.sh++;
            }
        });
    }

    draw() {
        ctx.fillStyle = "#000"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(screenOffset.x, screenOffset.y);
        ctx.scale(screenScale, screenScale);

        if (assets.bg) ctx.drawImage(assets.bg, 0, 0, WORLD.w, WORLD.h);
        
        // Draw Customer
        const cData = SPRITE_DATA.customers[this.activeCharIdx];
        const pData = cData.poses[this.activePoseIdx];
        const cImg = assets[cData.id];
        if (cImg) {
            const fW = cImg.width / 3; const fH = cImg.height;
            const dW = fW * pData.s; const dH = fH * pData.s;
            ctx.drawImage(cImg, (this.activePoseIdx * fW) + pData.clip.sx, pData.clip.sy, fW + pData.clip.sw, fH + pData.clip.sh, pData.x - dW/2, pData.y - dH, dW, dH);
        }

        this.taps.forEach(t => t.draw());

        // Draw Spills
        if (this.labMode === 'spill') {
            const s = SPRITE_DATA.spills[this.activeStationIdx];
            const img = assets.spill;
            if (img) {
                const worldX = WORLD.w * CONFIG.Stations[this.activeStationIdx];
                const dW = img.width * s.s; const dH = img.height * s.s;
                ctx.drawImage(img, s.clip.sx, s.clip.sy, img.width + s.clip.sw, img.height + s.clip.sh, (worldX + s.x) - dW/2, (CONFIG.TapY + s.y) - dH, dW, dH);
            }
        }

        // Draw Paddles
        if (this.labMode === 'paddle') {
            const p = SPRITE_DATA.paddles[this.activePaddleIdx];
            const img = assets.paddles;
            const stationIdx = p.owner === 'judge' ? 1 : 2;
            const worldX = WORLD.w * CONFIG.Stations[stationIdx];
            if (img) {
                const fH = img.height / 4; 
                const dW = img.width * p.s; const dH = fH * p.s;
                ctx.drawImage(img, p.clip.sx, (p.sizeIdx * fH) + p.clip.sy, img.width + p.clip.sw, fH + p.clip.sh, (worldX + p.x) - dW/2, (CONFIG.TapY + p.y) - dH, dW, dH);
            }
            if (this.showGhostDrink) {
                const ghostType = p.owner === 'judge' ? 'mix_from_1' : 'full';
                const g = new BeerGlass(stationIdx, worldX);
                ctx.globalAlpha = 0.5;
                g.draw(ghostType);
                ctx.globalAlpha = 1.0;
            }
        }

        ctx.fillStyle = "rgba(0,0,0,0.85)";
        ctx.fillRect(10, 10, 650, 280);
        ctx.fillStyle = "#0f0";
        ctx.font = "16px monospace";
        ctx.fillText(`🛠 LAB MODE: ${this.labMode.toUpperCase()}`, 20, 40);
        ctx.fillText(`6: Spill | 7: Paddle | 8: Customer | TAB: Toggle Item`, 20, 70);
        
        let cur = null;
        if (this.labMode === 'customer') {
            cur = pData;
            ctx.fillText(`CHAR: ${cData.name} (Pose ${this.activePoseIdx+1})`, 20, 100);
        } else if (this.labMode === 'spill') {
            cur = SPRITE_DATA.spills[this.activeStationIdx];
            ctx.fillText(`SPILL: Tap ${this.activeStationIdx}`, 20, 100);
        } else {
            cur = SPRITE_DATA.paddles[this.activePaddleIdx];
            ctx.fillText(`PADDLE: ${cur.owner.toUpperCase()} | [V] Row: ${cur.sizeIdx+1} | [G] Ghost`, 20, 100);
        }

        if (cur) {
            ctx.fillText(`POS: x:${cur.x} y:${cur.y} scale:${cur.s.toFixed(2)}`, 20, 130);
            ctx.fillText(`CLIP: L:${cur.clip.sx} R:${cur.clip.sw} T:${cur.clip.sy} B:${cur.clip.sh}`, 20, 160);
        }
        ctx.restore();
    }
}

class TapStation {
    constructor(index, xRatio, calibration) {
        this.index = index; this.xRatio = xRatio; this.cal = calibration;
    }
    draw() {
        const worldX = WORLD.w * this.xRatio;
        const fW = assets.tower.width / 3;
        const dW = SPRITE_DATA.tower.h * (fW / assets.tower.height);
        ctx.drawImage(assets.tower, this.index * fW, 0, fW, assets.tower.height, worldX - (dW/2), CONFIG.TapY, dW, SPRITE_DATA.tower.h);
        const fWt = assets.taps.width / 3; const fHt = assets.taps.height / 2;
        const dWt = this.cal.h * (fWt / fHt); const dHt = this.cal.h;
        ctx.save(); ctx.translate(worldX + this.cal.closed.x, CONFIG.TapY + this.cal.closed.y);
        ctx.drawImage(assets.taps, (this.index * fWt) + this.cal.crop.sx, this.cal.crop.sy, fWt + this.cal.crop.sw, fHt + this.cal.crop.sh, -dWt / 2, -dHt, dWt, dHt);
        ctx.restore();
    }
}

class BeerGlass {
    constructor(station, worldX) {
        this.station = station; this.baseX = worldX;
    }
    draw(stage) {
        const data = SPRITE_DATA.glasses[this.station][stage];
        if (!data) return; 
        const def = SPRITE_DATA.glassDefaults;
        const renderX = this.baseX + data.x;
        const renderY = CONFIG.TapY + data.y;
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
            ctx.drawImage(img, (frameIdx * fW) + def.clip.sx, 0, fW + def.clip.sw, img.height, renderX - drawW/2, renderY - drawH, drawW, drawH);
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
