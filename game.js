const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const WORLD = { w: 1920, h: 1080 }; 
let screenScale = 1;
let screenOffset = { x: 0, y: 0 };

let CONFIG = { BarHeight: 850, TapY: 500, Stations: [0.2, 0.5, 0.8] };

let SPRITE_DATA = {
    tower: { h: 433 },
    // --- CHARACTER POSE REPOSITORY ---
    customers: [
        { id: 'viking',  name: "Viking",  poses: [ {x:384, y:800, s:1.0, clip:{sx:0, sy:0, sw:0, sh:0}}, {x:384, y:800, s:1.0, clip:{sx:0, sy:0, sw:0, sh:0}}, {x:384, y:800, s:1.0, clip:{sx:0, sy:0, sw:0, sh:0}} ] },
        { id: 'hipster', name: "Hipster", poses: [ {x:960, y:800, s:1.0, clip:{sx:0, sy:0, sw:0, sh:0}}, {x:960, y:800, s:1.0, clip:{sx:0, sy:0, sw:0, sh:0}}, {x:960, y:800, s:1.0, clip:{sx:0, sy:0, sw:0, sh:0}} ] },
        { id: 'regular', name: "Regular", poses: [ {x:1536,y:800, s:1.0, clip:{sx:0, sy:0, sw:0, sh:0}}, {x:1536,y:800, s:1.0, clip:{sx:0, sy:0, sw:0, sh:0}}, {x:1536,y:800, s:1.0, clip:{sx:0, sy:0, sw:0, sh:0}} ] },
        { id: 'judge',   name: "Judge",   poses: [ {x:960, y:800, s:1.0, clip:{sx:0, sy:0, sw:0, sh:0}}, {x:960, y:800, s:1.0, clip:{sx:0, sy:0, sw:0, sh:0}}, {x:960, y:800, s:1.0, clip:{sx:0, sy:0, sw:0, sh:0}} ] },
        { id: 'karen',   name: "Karen",   poses: [ {x:960, y:800, s:1.0, clip:{sx:0, sy:0, sw:0, sh:0}}, {x:960, y:800, s:1.0, clip:{sx:0, sy:0, sw:0, sh:0}}, {x:960, y:800, s:1.0, clip:{sx:0, sy:0, sw:0, sh:0}} ] },
        { id: 'vip',     name: "VIP",     poses: [ {x:960, y:800, s:1.0, clip:{sx:0, sy:0, sw:0, sh:0}}, {x:960, y:800, s:1.0, clip:{sx:0, sy:0, sw:0, sh:0}}, {x:960, y:800, s:1.0, clip:{sx:0, sy:0, sw:0, sh:0}} ] }
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
    regular: 'assets/regular.png', viking: 'assets/viking.png', vip: 'assets/vip.png'
};

const assets = {}; 

class Game {
    constructor() {
        this.taps = [];
        this.activeCharIdx = 0;
        this.activePoseIdx = 0;
        this.selectedObject = null;

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
            const c = SPRITE_DATA.customers[this.activeCharIdx];
            const p = c.poses[this.activePoseIdx];
            if (Math.abs(pos.x - p.x) < 150 && Math.abs(pos.y - p.y + 200) < 400) {
                this.selectedObject = p;
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.selectedObject) return;
            const pos = getPos(e);
            this.selectedObject.x = Math.round(pos.x);
            this.selectedObject.y = Math.round(pos.y);
        });

        window.addEventListener('mouseup', () => { this.selectedObject = null; });

        window.addEventListener('keydown', (e) => {
            const c = SPRITE_DATA.customers[this.activeCharIdx];
            const p = c.poses[this.activePoseIdx];

            if (e.key === '1') this.activePoseIdx = 0;
            if (e.key === '2') this.activePoseIdx = 1;
            if (e.key === '3') this.activePoseIdx = 2;
            
            if (e.key === 'Tab') { 
                e.preventDefault(); 
                this.activeCharIdx = (this.activeCharIdx + 1) % SPRITE_DATA.customers.length; 
            }

            if (e.key === 'ArrowUp') p.s += 0.01;
            if (e.key === 'ArrowDown') p.s -= 0.01;
            if (e.key === 'q') p.clip.sx++; if (e.key === 'a') p.clip.sx--;
            if (e.key === 'w') p.clip.sw--; if (e.key === 's') p.clip.sw++;
            if (e.key === 'e') p.clip.sy++; if (e.key === 'd') p.clip.sy--;
            if (e.key === 'r') p.clip.sh--; if (e.key === 'f') p.clip.sh++;
        });
    }

    draw() {
        ctx.fillStyle = "#000"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(screenOffset.x, screenOffset.y);
        ctx.scale(screenScale, screenScale);

        if (assets.bg) ctx.drawImage(assets.bg, 0, 0, WORLD.w, WORLD.h);
        
        const cData = SPRITE_DATA.customers[this.activeCharIdx];
        const pData = cData.poses[this.activePoseIdx];
        const img = assets[cData.id];
        
        if (img) {
            const fW = img.width / 3;
            const fH = img.height;
            const dW = fW * pData.s;
            const dH = fH * pData.s;
            ctx.drawImage(img, (this.activePoseIdx * fW) + pData.clip.sx, pData.clip.sy, fW + pData.clip.sw, fH + pData.clip.sh, pData.x - dW/2, pData.y - dH, dW, dH);
        }

        this.taps.forEach(t => t.draw());

        ctx.fillStyle = "rgba(0,0,0,0.85)";
        ctx.fillRect(10, 10, 650, 250);
        ctx.fillStyle = "#0f0";
        ctx.font = "16px monospace";
        ctx.fillText(`🛠 POSE LAB: ${cData.name.toUpperCase()} (Pose ${this.activePoseIdx + 1})`, 20, 40);
        ctx.fillText(`KEYS 1, 2, 3: Switch Pose | TAB: Switch Character`, 20, 70);
        ctx.fillText(`POS: x:${pData.x} y:${pData.y} scale:${pData.s.toFixed(2)}`, 20, 100);
        ctx.fillText(`CLIP: L:${pData.clip.sx} R:${pData.clip.sw} T:${pData.clip.sy} B:${pData.clip.sh}`, 20, 130);
        ctx.fillStyle = "#fff";
        ctx.fillText("Q/A/W/S/E/D/R/F: Shave edges | Arrows: Scale | Drag: Move", 20, 175);
        
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
        const fWt = assets.taps.width / 3; const fHt = assets.taps.height / 2;
        const dWt = this.cal.h * (fWt / fHt); const dHt = this.cal.h;
        ctx.save(); ctx.translate(worldX + this.cal.closed.x, CONFIG.TapY + this.cal.closed.y);
        ctx.drawImage(assets.taps, (this.index * fWt) + this.cal.crop.sx, this.cal.crop.sy, fWt + this.cal.crop.sw, fHt + this.cal.crop.sh, -dWt / 2, -dHt, dWt, dHt);
        ctx.restore();
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
