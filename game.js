const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const WORLD = { w: 1920, h: 1080 }; 
let screenScale = 1;
let screenOffset = { x: 0, y: 0 };

let CONFIG = { BarHeight: 850, TapY: 500, Stations: [0.2, 0.5, 0.8] };

let SPRITE_DATA = {
    tower: { h: 433 },
    spills: [
        { x: 8, y: 451, s: .05, clip: { sx: 0, sy: 0, sw: 0, sh: 0 } }, 
        { x: -29, y: 454, s: .05, clip: { sx: 0, sy: 0, sw: 0, sh: 0 } }, 
        { x: -64, y: 450, s: .05, clip: { sx: 0, sy: 0, sw: 0, sh: 0 } }
    ],
    paddles: [
        { owner: 'judge', x: -300, y: 408, s: .16, clip: { sx: 0, sy: 0, sw: 0, sh: 0 }, sizeIdx: 0 }, 
        { owner: 'vip',   x: -270, y: 401, s: .16, clip: { sx: 0, sy: 0, sw: 0, sh: 0 }, sizeIdx: 0 }
    ],
    paddleDrinks: [
        [ // Judge (Sizes 2-5)
            [ {x:-103, y:0, s:.63}, {x:-4, y:-13, s:.63} ], 
            [ {x:-111, y:-6, s:.63}, {x:-19, y:-21, s:.63}, {x:61, y:-6, s:.63} ], 
            [ {x:-109, y:-11, s:.55}, {x:-29, y:-23, s:.55}, {x:40, y:-14, s:.55}, {x:100, y:-23, s:.55} ], 
            [ {x:-111, y:-18, s:.5}, {x:-39, y:-23, s:.5}, {x:28, y:-13, s:.5}, {x:90, y:-23, s:.5}, {x:157, y:-12, s:.5} ]
        ],
        [ // VIP (Sizes 2-3)
            [ {x:-104, y:-8, s:.55}, {x:-13, y:-8, s:.55} ], 
            [ {x:-106, y:-14, s:.5}, {x:-33, y:-12, s:.5}, {x:46, y:-11, s:.5} ]
        ]
    ],
    hud: {
        activeFrame: 0,
        notifications: [
            { x: 960, y: 150, s: 0.8, textX: 0, textY: 0, clip: { sx: 0, sy: 0, sw: 0, sh: 0 } },
            { x: 960, y: 150, s: 0.8, textX: 0, textY: 0, clip: { sx: 0, sy: 0, sw: 0, sh: 0 } },
            { x: 960, y: 150, s: 0.8, textX: 0, textY: 0, clip: { sx: 0, sy: 0, sw: 0, sh: 0 } },
            { x: 960, y: 150, s: 0.8, textX: 0, textY: 0, clip: { sx: 0, sy: 0, sw: 0, sh: 0 } }
        ]
    },
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
    spill: 'assets/spill.png', paddles: 'assets/paddles.png',
    notification: 'https://lawbrewing.github.io/DreadmoorGames/assets/notification.png', 
    numbers: 'https://lawbrewing.github.io/DreadmoorGames/assets/numbers.png'
};

const assets = {}; 

class TapStation {
    constructor(index, xRatio, calibration) {
        this.index = index; this.xRatio = xRatio; this.cal = calibration;
    }
    draw() {
        if(!assets.tower || !assets.taps) return;
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
    draw(stage, overrideX, overrideY, overrideS = 1) {
        const data = SPRITE_DATA.glasses[this.station][stage];
        const def = SPRITE_DATA.glassDefaults;
        let img, cols, frameIdx;
        switch(stage) {
            case 'empty': img = assets.empty; cols = 4; frameIdx = 0; break;
            case 'half': img = assets.half; cols = 3; frameIdx = this.station; break;
            case 'mix_from_1': img = assets.mix; cols = 3; frameIdx = (this.station === 0) ? 1 : (this.station === 1 ? 2 : -1); break;
            case 'mix_from_2': img = assets.mix; cols = 3; frameIdx = (this.station === 0) ? 0 : -1; break;
            case 'full': img = assets.full; cols = 4; frameIdx = this.station + 1; break;
        }
        if (img && frameIdx !== -1) {
            const fW = img.width / cols;
            const dS = data ? data.s : 1;
            const drawW = def.w * def.scale * dS * overrideS;
            const drawH = drawW * (img.height / fW);
            const rX = overrideX !== undefined ? overrideX : this.baseX + (data ? data.x : 0);
            const rY = overrideY !== undefined ? overrideY : CONFIG.TapY + (data ? data.y : 0);
            ctx.drawImage(img, (frameIdx * fW) + def.clip.sx, 0, fW + def.clip.sw, img.height, rX - drawW/2, rY - drawH, drawW, drawH);
        }
    }
}

class Game {
    constructor() {
        this.taps = [];
        this.activeCharIdx = 0; this.activePoseIdx = 0; this.activeStationIdx = 0;
        this.activePaddleIdx = 0; this.activeSlotIdx = 0;
        this.labMode = 'customer'; this.editTarget = 'paddle'; this.selectedObject = null;
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
            if (pos.y < 150 && pos.x < 450) {
                 if(this.labMode === 'paddle') this.editTarget = (this.editTarget === 'paddle') ? 'drink' : 'paddle';
                 if(this.labMode === 'hud') this.editTarget = (this.editTarget === 'bar') ? 'text' : 'bar';
                 if (this.editTarget === 'drink') this.showGhostDrink = true;
                 return;
            }
            if (this.labMode === 'customer') {
                const p = SPRITE_DATA.customers[this.activeCharIdx].poses[this.activePoseIdx];
                if (Math.abs(pos.x - p.x) < 150 && Math.abs(pos.y - p.y + 200) < 400) this.selectedObject = p;
            } else if (this.labMode === 'spill') {
                this.selectedObject = SPRITE_DATA.spills[this.activeStationIdx];
            } else if (this.labMode === 'paddle') {
                const p = SPRITE_DATA.paddles[this.activePaddleIdx];
                this.selectedObject = (this.editTarget === 'paddle') ? p : SPRITE_DATA.paddleDrinks[this.activePaddleIdx][p.sizeIdx][this.activeSlotIdx];
            } else if (this.labMode === 'hud') {
                this.selectedObject = SPRITE_DATA.hud.notifications[SPRITE_DATA.hud.activeFrame];
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.selectedObject) return;
            const pos = getPos(e);
            if (this.labMode === 'customer') {
                this.selectedObject.x = Math.round(pos.x); this.selectedObject.y = Math.round(pos.y);
            } else if (this.labMode === 'hud') {
                if (this.editTarget === 'text') {
                    this.selectedObject.textX = Math.round(pos.x - this.selectedObject.x);
                    this.selectedObject.textY = Math.round(pos.y - this.selectedObject.y);
                } else {
                    this.selectedObject.x = Math.round(pos.x); this.selectedObject.y = Math.round(pos.y);
                }
            } else if (this.labMode === 'paddle') {
                const p = SPRITE_DATA.paddles[this.activePaddleIdx];
                const worldX = WORLD.w * CONFIG.Stations[p.owner === 'judge' ? 1 : 2];
                if (this.editTarget === 'drink') {
                    this.selectedObject.x = Math.round(pos.x - (worldX + p.x));
                    this.selectedObject.y = Math.round(pos.y - (CONFIG.TapY + p.y));
                } else {
                    this.selectedObject.x = Math.round(pos.x - worldX); this.selectedObject.y = Math.round(pos.y - CONFIG.TapY);
                }
            } else if (this.labMode === 'spill') {
                const worldX = WORLD.w * CONFIG.Stations[this.activeStationIdx];
                this.selectedObject.x = Math.round(pos.x - worldX); this.selectedObject.y = Math.round(pos.y - CONFIG.TapY);
            }
        });

        window.addEventListener('mouseup', () => { this.selectedObject = null; });

        window.addEventListener('keydown', (e) => {
            if (e.key === '6') this.labMode = 'spill';
            if (e.key === '7') this.labMode = 'paddle';
            if (e.key === '8') this.labMode = 'customer';
            if (e.key === '9') { this.labMode = 'hud'; this.editTarget = 'bar'; }
            
            if (this.labMode === 'hud' && e.key === 'v') {
                SPRITE_DATA.hud.activeFrame = (SPRITE_DATA.hud.activeFrame + 1) % 4;
            }

            const curP = SPRITE_DATA.paddles[this.activePaddleIdx];
            let target = this.labMode === 'customer' ? SPRITE_DATA.customers[this.activeCharIdx].poses[this.activePoseIdx] : 
                      (this.labMode === 'spill' ? SPRITE_DATA.spills[this.activeStationIdx] : 
                      (this.labMode === 'paddle' ? (this.editTarget === 'paddle' ? curP : SPRITE_DATA.paddleDrinks[this.activePaddleIdx][curP.sizeIdx][this.activeSlotIdx]) :
                      SPRITE_DATA.hud.notifications[SPRITE_DATA.hud.activeFrame]));

            if (target) {
                if (e.key === 'ArrowUp') target.s += 0.01;
                if (e.key === 'ArrowDown') target.s -= 0.01;
                if (target.clip && (this.labMode !== 'paddle' || this.editTarget === 'paddle')) {
                    if (e.key === 'q') target.clip.sx++; if (e.key === 'a') target.clip.sx--;
                    if (e.key === 'w') target.clip.sw--; if (e.key === 's') target.clip.sw++;
                    if (e.key === 'e') target.clip.sy++; if (e.key === 'd') target.clip.sy--;
                    if (e.key === 'r') target.clip.sh--; if (e.key === 'f') target.clip.sh++;
                }
            }

            if (e.key === 'Tab') { 
                e.preventDefault(); 
                if (this.labMode === 'customer' || this.labMode === 'hud') this.activeCharIdx = (this.activeCharIdx + 1) % SPRITE_DATA.customers.length;
                else if (this.labMode === 'spill') this.activeStationIdx = (this.activeStationIdx + 1) % 3;
                else this.activePaddleIdx = (this.activePaddleIdx + 1) % 2;
            }
        });
    }

    draw() {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#000"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.save(); ctx.translate(screenOffset.x, screenOffset.y); ctx.scale(screenScale, screenScale);
        if (assets.bg) ctx.drawImage(assets.bg, 0, 0, WORLD.w, WORLD.h);
        
        const cData = SPRITE_DATA.customers[this.activeCharIdx];
        const pData = cData.poses[0]; 
        if (assets[cData.id]) {
            const img = assets[cData.id]; const fW = img.width / 3; const dW = fW * pData.s; const dH = img.height * pData.s;
            ctx.drawImage(img, pData.clip.sx, pData.clip.sy, fW + pData.clip.sw, img.height + pData.clip.sh, pData.x - dW/2, pData.y - dH, dW, dH);
        }

        this.taps.forEach(t => t.draw());

        if (this.labMode === 'hud' && assets.notification) {
            const frameIdx = SPRITE_DATA.hud.activeFrame;
            const n = SPRITE_DATA.hud.notifications[frameIdx];
            const fw = assets.notification.width / 2; const fh = assets.notification.height / 2;
            const sx = (frameIdx % 2) * fw; const sy = Math.floor(frameIdx / 2) * fh;
            const dw = fw * n.s; const dh = fh * n.s;
            
            ctx.drawImage(assets.notification, 
                sx + n.clip.sx, sy + n.clip.sy, fw + n.clip.sw, fh + n.clip.sh, 
                n.x - dw/2, n.y - dh/2, dw, dh
            );

            ctx.fillStyle = "#fff"; ctx.font = `${Math.round(24 * n.s)}px monospace`; ctx.textAlign = "center";
            ctx.fillText("GUIDE TEXT", n.x + n.textX, n.y + n.textY);
        }

        if (this.labMode === 'paddle') {
            const p = SPRITE_DATA.paddles[this.activePaddleIdx];
            const stationIdx = p.owner === 'judge' ? 1 : 2;
            const worldX = WORLD.w * CONFIG.Stations[stationIdx];
            if (assets.paddles) {
                const img = assets.paddles; const fH = img.height / 4; 
                const dW = img.width * p.s; const dH = fH * p.s;
                ctx.drawImage(img, p.clip.sx, (p.sizeIdx * fH) + p.clip.sy, img.width + p.clip.sw, fH + p.clip.sh, (worldX + p.x) - dW/2, (CONFIG.TapY + p.y) - dH, dW, dH);
            }
            if (this.showGhostDrink || this.editTarget === 'drink') {
                const currentSlots = SPRITE_DATA.paddleDrinks[this.activePaddleIdx][p.sizeIdx];
                currentSlots.forEach((d, i) => {
                    ctx.globalAlpha = (this.editTarget === 'drink' && i === this.activeSlotIdx) ? 1.0 : 0.4;
                    const stage = (p.owner === 'vip') ? 'full' : (i % 2 === 0 ? 'full' : 'mix_from_1');
                    const g = new BeerGlass(i % 3, worldX); g.draw(stage, worldX + p.x + d.x, CONFIG.TapY + p.y + d.y, d.s);
                });
                ctx.globalAlpha = 1.0;
            }
        }

        ctx.fillStyle = "rgba(0,0,0,0.85)"; ctx.fillRect(10, 10, 650, 240);
        ctx.fillStyle = "#0f0"; ctx.font = "16px monospace"; ctx.textAlign = "left";
        ctx.fillText(`🛠 MODE: ${this.labMode.toUpperCase()}`, 20, 40);
        let cur = (this.labMode === 'customer') ? SPRITE_DATA.customers[this.activeCharIdx].poses[this.activePoseIdx] : 
                  (this.labMode === 'spill' ? SPRITE_DATA.spills[this.activeStationIdx] : 
                  (this.labMode === 'paddle' ? (this.editTarget === 'paddle' ? SPRITE_DATA.paddles[this.activePaddleIdx] : SPRITE_DATA.paddleDrinks[this.activePaddleIdx][SPRITE_DATA.paddles[this.activePaddleIdx].sizeIdx][this.activeSlotIdx]) :
                  SPRITE_DATA.hud.notifications[SPRITE_DATA.hud.activeFrame]));
        if (cur) {
            ctx.fillText(`X:${cur.x} Y:${cur.y} S:${cur.s.toFixed(2)}`, 20, 130);
            if (cur.clip) ctx.fillText(`CLIP L:${cur.clip.sx} R:${cur.clip.sw} T:${cur.clip.sy} B:${cur.clip.sh}`, 20, 160);
        }
        ctx.restore();
    }
}

function loadImages() {
    let loaded = 0; const keys = Object.keys(ASSETS_PATHS);
    keys.forEach(key => {
        const img = new Image(); img.src = ASSETS_PATHS[key];
        img.onload = () => { assets[key] = img; if (++loaded === keys.length) {
            window.game = new Game();
            (function loop() { ctx.clearRect(0,0,canvas.width, canvas.height); if(window.game) window.game.draw(); requestAnimationFrame(loop); })();
        }};
    });
}
loadImages();
