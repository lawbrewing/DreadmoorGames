// 1. Inject CSS for mobile stability
const style = document.createElement('style');
style.textContent = `
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #000; }
    canvas { display: block; touch-action: none; -webkit-user-select: none; }
`;
document.head.appendChild(style);

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const WORLD = { w: 1920, h: 1080 }; 
let screenScale = 1;
let screenOffset = { x: 0, y: 0 };

let CONFIG = { BarHeight: 850, TapY: 500, Stations: [0.2, 0.5, 0.8] };

let SPRITE_DATA = {
    tower: { h: 433 },
    // --- HUD CALIBRATION ---
    hud_elements: {
        score: { x: 1650, y: 50, s: 1.0 },
        lives: { x: 50, y: 50, s: 0.7, spacing: 85 },
        clock: { x: 0, y: -280, r: 50, width: 10 }
    },
    menu: { x: 218, targetY: 295, s: 0.60, textX: 0, textY: 0 },
    customers: [
        { id: 'viking', poses: [{x:167, y:966, s:.48}] },
        { id: 'judge', poses: [{x:703, y:911, s:.39}] }
    ]
};

const ASSETS_PATHS = {
    bg: 'assets/background.png',
    numbers: 'https://lawbrewing.github.io/DreadmoorGames/assets/numbers.png',
    menu: 'https://lawbrewing.github.io/DreadmoorGames/assets/menu.png',
    hud_sheet: 'https://lawbrewing.github.io/DreadmoorGames/assets/hud.png',
    dead_life: 'https://lawbrewing.github.io/DreadmoorGames/assets/dead.png',
    viking: 'assets/viking.png'
};

const assets = {}; 

class Game {
    constructor() {
        this.started = false;
        this.labMode = 'none';
        this.editTarget = 'score';
        this.score = 500;
        this.lives = 3;
        
        // Active test customer
        this.activeCustomers = [{ id: 'viking', x: 400, y: 900, timer: 1.0 }];

        this.menuPhysics = { active: false, y: -600, burnProgress: 0, text: "" };

        this.initInput();
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    // SLICE LOGIC: Slices the top half of numbers.png into 10 frames
    drawScore(num, x, y, scale) {
        if (!assets.numbers) return;
        const s = num.toString();
        const fW = assets.numbers.width / 10;
        const fH = assets.numbers.height / 2; 
        for (let i = 0; i < s.length; i++) {
            const digit = parseInt(s[i]);
            ctx.drawImage(assets.numbers, digit * fW, 0, fW, fH, x + (i * fW * scale), y, fW * scale, fH * scale);
        }
    }

    drawClock(x, y, progress) {
        const c = SPRITE_DATA.hud_elements.clock;
        ctx.save();
        ctx.translate(x + c.x, y + c.y);
        ctx.beginPath(); ctx.arc(0, 0, c.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fill();
        ctx.beginPath(); ctx.arc(0, 0, c.r, -Math.PI/2, (-Math.PI/2) + (progress * Math.PI * 2));
        ctx.strokeStyle = progress > 0.3 ? "#0f0" : "#f00";
        ctx.lineWidth = c.width; ctx.stroke();
        ctx.restore();
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr; canvas.height = window.innerHeight * dpr;
        canvas.style.width = window.innerWidth + 'px'; canvas.style.height = window.innerHeight + 'px';
        ctx.scale(dpr, dpr);
        const scaleX = window.innerWidth / WORLD.w; const scaleY = window.innerHeight / WORLD.h;
        screenScale = Math.min(scaleX, scaleY);
        screenOffset.x = (window.innerWidth - WORLD.w * screenScale) / 2;
        screenOffset.y = (window.innerHeight - WORLD.h * screenScale) / 2;
        ctx.imageSmoothingEnabled = false;
    }

    initInput() {
        canvas.addEventListener('mousedown', (e) => {
            if (!this.started) { this.started = true; return; }
            const rect = canvas.getBoundingClientRect();
            const pos = { 
                x: (e.clientX - rect.left - screenOffset.x) / screenScale, 
                y: (e.clientY - rect.top - screenOffset.y) / screenScale 
            };
            if (this.labMode === 'hud_main') this.selectedObject = SPRITE_DATA.hud_elements[this.editTarget];
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === '4') { this.labMode = 'hud_main'; this.editTarget = 'score'; }
            if (this.labMode === 'hud_main') {
                if (e.key === 'q') this.editTarget = 'score';
                if (e.key === 'w') this.editTarget = 'lives';
                if (e.key === 'e') this.editTarget = 'clock';
                if (e.key === 'ArrowUp') SPRITE_DATA.hud_elements[this.editTarget].s += 0.02;
                if (e.key === 'ArrowDown') SPRITE_DATA.hud_elements[this.editTarget].s -= 0.02;
            }
        });
        window.addEventListener('mouseup', () => this.selectedObject = null);
    }

    draw() {
        ctx.fillStyle = "#000"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (!this.started) return;

        ctx.save(); ctx.translate(screenOffset.x, screenOffset.y); ctx.scale(screenScale, screenScale);
        if (assets.bg) ctx.drawImage(assets.bg, 0, 0, WORLD.w, WORLD.h);

        // Draw Lives (Top half of hud_sheet vs dead_life)
        const lCfg = SPRITE_DATA.hud_elements.lives;
        for (let i = 0; i < 3; i++) {
            const isDead = i >= this.lives;
            const img = isDead ? assets.dead_life : assets.hud_sheet;
            if (img) {
                const sy = isDead ? 0 : 0; // If live is top half of hud_sheet
                const sh = isDead ? img.height : img.height / 2;
                ctx.drawImage(img, 0, sy, img.width, sh, lCfg.x + (i * lCfg.spacing), lCfg.y, img.width * lCfg.s, sh * lCfg.s);
            }
        }

        this.drawScore(this.score, SPRITE_DATA.hud_elements.score.x, SPRITE_DATA.hud_elements.score.y, SPRITE_DATA.hud_elements.score.s);
        
        // Timer Test
        this.activeCustomers.forEach(c => this.drawClock(c.x, c.y, c.timer));

        if (this.labMode === 'hud_main') {
            ctx.fillStyle = "rgba(0,0,0,0.8)"; ctx.fillRect(10,10,500,150);
            ctx.fillStyle = "#0f0"; ctx.fillText(`HUD LAB: ${this.editTarget}`, 30, 50);
            ctx.fillText(`X:${SPRITE_DATA.hud_elements[this.editTarget].x} Y:${SPRITE_DATA.hud_elements[this.editTarget].y}`, 30, 90);
        }
        ctx.restore();
    }
}

function loadImages() {
    let loaded = 0; const keys = Object.keys(ASSETS_PATHS);
    keys.forEach(k => {
        const img = new Image(); img.src = ASSETS_PATHS[k];
        img.onload = () => { assets[k] = img; if (++loaded === keys.length) {
            window.game = new Game();
            function loop() { window.game.draw(); requestAnimationFrame(loop); }
            loop();
        }};
    });
}
loadImages();
