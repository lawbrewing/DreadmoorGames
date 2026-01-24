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
    spills: [
        { x: 8, y: 451, s: .05, clip: { sx: 0, sy: 0, sw: 0, sh: 0 } }, 
        { x: -29, y: 454, s: .05, clip: { sx: 0, sy: 0, sw: 0, sh: 0 } }, 
        { x: -64, y: 450, s: .05, clip: { sx: 0, sy: 0, sw: 0, sh: 0 } }
    ],
    paddles: [
        { owner: 'judge', x: -300, y: 408, s: .16, clip: { sx: 0, sy: 0, sw: 0, sh: 0 }, sizeIdx: 0 }, 
        { owner: 'vip',   x: -270, y: 401, s: .16, clip: { sx: 0, sy: 0, sw: 0, sh: 0 }, sizeIdx: 0 }
    ],
    // --- HUD CALIBRATION DATA ---
    hud_elements: {
        score: { x: 1750, y: 50, s: 0.8 },
        lives: { x: 50, y: 50, s: 0.6, spacing: 70 },
        clock: { x: 0, y: -250, r: 45, width: 8 }, // Offset relative to customer
        gameOver: { x: 960, y: 540, s: 1.0 }
    },
    menu: { x: 218, targetY: 295, s: 0.60, textX: 0, textY: 0 },
    hud: {
        activeFrame: 0,
        notifications: [
            { x: 892, y: 280, s: 0.37, textX: 0, textY: 0, clip: { sx: -99, sy: 19, sw: 51, sh: 0 } },
            { x: 959, y: 210, s: 0.48, textX: 0, textY: 0, clip: { sx: -64, sy: 0, sw: -4, sh: 3 } },
            { x: 914, y: 183, s: 0.5, textX: 0, textY: 0, clip: { sx: 0, sy: 0, sw: 62, sh: 0 } },
            { x: 939, y: 220, s: 0.53, textX: 0, textY: 0, clip: { sx: 0, sy: 0, sw: 11, sh: 0 } }
        ]
    },
    customers: [
        { id: 'viking',  name: "Viking",  poses: [ {x:167, y:966, s:.48, clip:{sx:-98, sy:0, sw:0, sh:0}} ] },
        { id: 'judge',   name: "Judge",   poses: [ {x:703, y:911, s:.39, clip:{sx:0, sy:0, sw:0, sh:0}} ] }
    ]
};

const ASSETS_PATHS = {
    bg: 'assets/background.png', tower: 'assets/tower.png', taps: 'assets/taps.png',
    empty: 'assets/fullpints.png', half: 'assets/halfpour.png', mix: 'assets/mixpour.png', full: 'assets/fullpints.png',
    viking: 'assets/viking.png', judge: 'assets/judge.png',
    spill: 'assets/spill.png', paddles: 'assets/paddles.png',
    notification: 'https://lawbrewing.github.io/DreadmoorGames/assets/notification.png', 
    numbers: 'https://lawbrewing.github.io/DreadmoorGames/assets/numbers.png',
    menu: 'https://lawbrewing.github.io/DreadmoorGames/assets/menu.png',
    hud_sheet: 'https://lawbrewing.github.io/DreadmoorGames/assets/hud.png',
    dead_life: 'https://lawbrewing.github.io/DreadmoorGames/assets/dead.png'
};

const assets = {}; 

class Game {
    constructor() {
        this.started = false;
        this.taps = [];
        this.labMode = 'none';
        this.editTarget = 'score'; 
        this.selectedObject = null;
        
        // Gameplay State
        this.score = 1250; // Test score
        this.lives = 3;
        this.maxLives = 3;
        this.isGameOver = false;

        this.menuPhysics = { active: false, y: -600, burnProgress: 0, text: "", smoke: [] };
        
        // Test Customer with Timer
        this.activeCustomers = [
            { id: 'viking', progress: 0.7, x: 167, y: 966 } // 70% time left
        ];

        this.initInput();
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    // --- HELPER: DRAW NUMBERS FROM SHEET ---
    drawScore(num, x, y, scale) {
        if (!assets.numbers) return;
        const s = num.toString();
        const fW = assets.numbers.width / 10;
        const fH = assets.numbers.height / 2; // Top half is numbers
        for (let i = 0; i < s.length; i++) {
            const digit = parseInt(s[i]);
            ctx.drawImage(assets.numbers, digit * fW, 0, fW, fH, x + (i * fW * scale), y, fW * scale, fH * scale);
        }
    }

    // --- HELPER: DRAW CIRCULAR CLOCK ---
    drawClock(x, y, progress) {
        const c = SPRITE_DATA.hud_elements.clock;
        ctx.save();
        ctx.translate(x + c.x, y + c.y);
        
        // Background Circle
        ctx.beginPath();
        ctx.arc(0, 0, c.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fill();
        ctx.strokeStyle = "#333";
        ctx.lineWidth = c.width;
        ctx.stroke();

        // Progress Arc
        ctx.beginPath();
        ctx.arc(0, 0, c.r, -Math.PI/2, (-Math.PI/2) + (progress * Math.PI * 2));
        // Dynamic Color
        ctx.strokeStyle = progress > 0.5 ? "#0f0" : (progress > 0.2 ? "#ff0" : "#f00");
        ctx.stroke();
        ctx.restore();
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        ctx.scale(dpr, dpr);
        const scaleX = window.innerWidth / WORLD.w;
        const scaleY = window.innerHeight / WORLD.h;
        screenScale = Math.min(scaleX, scaleY);
        screenOffset.x = (window.innerWidth - WORLD.w * screenScale) / 2;
        screenOffset.y = (window.innerHeight - WORLD.h * screenScale) / 2;
        ctx.imageSmoothingEnabled = false;
    }

    initInput() {
        const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            const clientX = e.clientX || (e.touches && e.touches[0].clientX);
            const clientY = e.clientY || (e.touches && e.touches[0].clientY);
            return { 
                x: (clientX - rect.left - screenOffset.x) / screenScale, 
                y: (clientY - rect.top - screenOffset.y) / screenScale 
            };
        };

        canvas.addEventListener('mousedown', (e) => {
            if (!this.started) { this.started = true; return; }
            const pos = getPos(e);
            
            if (this.labMode === 'hud_main') {
                this.selectedObject = SPRITE_DATA.hud_elements[this.editTarget];
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
            if (e.key === '4') { this.labMode = 'hud_main'; this.editTarget = 'score'; }
            if (this.labMode === 'hud_main') {
                if (e.key === 'q') this.editTarget = 'score';
                if (e.key === 'w') this.editTarget = 'lives';
                if (e.key === 'e') this.editTarget = 'clock';
                if (e.key === 'r') this.editTarget = 'gameOver';
                if (e.key === 'ArrowUp') SPRITE_DATA.hud_elements[this.editTarget].s += 0.05;
                if (e.key === 'ArrowDown') SPRITE_DATA.hud_elements[this.editTarget].s -= 0.05;
            }
        });
    }

    draw() {
        // Physics update would go here
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (!this.started) {
            ctx.fillStyle = "white"; ctx.textAlign = "center"; ctx.font = "40px monospace";
            ctx.fillText("TAP TO START", window.innerWidth/2, window.innerHeight/2);
            return;
        }

        ctx.save();
        ctx.translate(screenOffset.x, screenOffset.y);
        ctx.scale(screenScale, screenScale);

        if (assets.bg) ctx.drawImage(assets.bg, 0, 0, WORLD.w, WORLD.h);

        // --- DRAW CUSTOMERS & CLOCKS ---
        this.activeCustomers.forEach(cust => {
            const data = SPRITE_DATA.customers.find(c => c.id === cust.id).poses[0];
            const img = assets[cust.id];
            if (img) {
                const fW = img.width / 3;
                ctx.drawImage(img, data.clip.sx, 0, fW, img.height, cust.x - (fW*data.s/2), cust.y - (img.height*data.s), fW*data.s, img.height*data.s);
                this.drawClock(cust.x, cust.y - (img.height*data.s), cust.progress);
            }
        });

        // --- DRAW LIVES ---
        const liveCfg = SPRITE_DATA.hud_elements.lives;
        for (let i = 0; i < this.maxLives; i++) {
            const isDead = i >= this.lives;
            const img = isDead ? assets.dead_life : assets.hud_sheet;
            // If using hud_sheet for live, clip top half
            if (!isDead && assets.hud_sheet) {
                const fH = assets.hud_sheet.height / 2;
                ctx.drawImage(assets.hud_sheet, 0, 0, assets.hud_sheet.width, fH, liveCfg.x + (i * liveCfg.spacing), liveCfg.y, assets.hud_sheet.width * liveCfg.s, fH * liveCfg.s);
            } else if (isDead && assets.dead_life) {
                ctx.drawImage(assets.dead_life, liveCfg.x + (i * liveCfg.spacing), liveCfg.y, assets.dead_life.width * liveCfg.s, assets.dead_life.height * liveCfg.s);
            }
        }

        // --- DRAW SCORE ---
        const sc = SPRITE_DATA.hud_elements.score;
        this.drawScore(this.score, sc.x, sc.y, sc.s);

        // --- HUD LAB OVERLAY ---
        if (this.labMode === 'hud_main') {
            const el = SPRITE_DATA.hud_elements[this.editTarget];
            ctx.fillStyle = "rgba(0,255,0,0.2)";
            ctx.fillRect(el.x - 20, el.y - 20, 100, 100);
            
            ctx.fillStyle = "rgba(0,0,0,0.85)";
            ctx.fillRect(10, 10, 600, 200);
            ctx.fillStyle = "#0f0"; ctx.font = "20px monospace";
            ctx.fillText(`HUD LAB | EDITING: ${this.editTarget.toUpperCase()}`, 30, 50);
            ctx.fillStyle = "#fff";
            ctx.fillText(`Q:Score W:Lives E:Clock R:GameOver | Arrows: Scale`, 30, 90);
            ctx.fillText(`COPY: x:${el.x}, y:${el.y}, s:${el.s.toFixed(2)}`, 30, 140);
        }

        ctx.restore();
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
                window.game = new Game();
                function loop() { window.game.draw(); requestAnimationFrame(loop); }
                loop();
            }
        };
    });
}
loadImages();
