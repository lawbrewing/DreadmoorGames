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

let SPRITE_DATA = {
    // --- HUD CALIBRATION ---
    hud_elements: {
        score: { x: 1650, y: 50, s: 1.0 },
        life1: { x: 50, y: 50, s: 0.7, dead: false },
        life2: { x: 130, y: 50, s: 0.7, dead: false },
        life3: { x: 210, y: 50, s: 0.7, dead: false },
        clock: { x: 0, y: -280, r: 50, width: 10 },
        gameOver: { x: 960, y: 540, s: 1.0, visible: false }
    },
    menu: { x: 218, targetY: 295, s: 0.60, textX: 0, textY: 0 },
    customers: [
        { id: 'viking', poses: [{x:400, y:900, s:.48}] }
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
        this.selectedObject = null;
        
        this.score = 1250;
        this.menuPhysics = { active: false, y: -600, burnProgress: 0, text: "", smoke: [] };
        this.activeCustomers = [{ id: 'viking', x: 400, y: 900, timer: 0.8 }];

        this.initInput();
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

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
            if (this.labMode === 'hud_main') this.selectedObject = SPRITE_DATA.hud_elements[this.editTarget];
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.selectedObject) return;
            const pos = getPos(e);
            this.selectedObject.x = Math.round(pos.x);
            this.selectedObject.y = Math.round(pos.y);
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === '4') { this.labMode = 'hud_main'; this.editTarget = 'score'; }
            if (this.labMode === 'hud_main') {
                if (e.key === 'q') this.editTarget = 'score';
                if (e.key === 'w') this.editTarget = 'life1';
                if (e.key === 'e') this.editTarget = 'life2';
                if (e.key === 'r') this.editTarget = 'life3';
                if (e.key === 't') this.editTarget = 'clock';
                if (e.key === 'y') {
                    this.editTarget = 'gameOver';
                    SPRITE_DATA.hud_elements.gameOver.visible = !SPRITE_DATA.hud_elements.gameOver.visible;
                }
                if (e.key === 'd' && this.editTarget.includes('life')) {
                    SPRITE_DATA.hud_elements[this.editTarget].dead = !SPRITE_DATA.hud_elements[this.editTarget].dead;
                }
                if (e.key === 'ArrowUp') SPRITE_DATA.hud_elements[this.editTarget].s += 0.02;
                if (e.key === 'ArrowDown') SPRITE_DATA.hud_elements[this.editTarget].s -= 0.02;
            }
        });
        window.addEventListener('mouseup', () => this.selectedObject = null);
    }

    draw() {
        ctx.fillStyle = "#000"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (!this.started) {
            ctx.fillStyle = "white"; ctx.textAlign = "center"; ctx.font = "40px monospace";
            ctx.fillText("TAP TO START", window.innerWidth/2, window.innerHeight/2);
            return;
        }

        ctx.save(); ctx.translate(screenOffset.x, screenOffset.y); ctx.scale(screenScale, screenScale);
        if (assets.bg) ctx.drawImage(assets.bg, 0, 0, WORLD.w, WORLD.h);

        // --- DRAW LIVES ---
        ['life1', 'life2', 'life3'].forEach(key => {
            const cfg = SPRITE_DATA.hud_elements[key];
            if (cfg.dead && assets.dead_life) {
                ctx.drawImage(assets.dead_life, cfg.x, cfg.y, assets.dead_life.width * cfg.s, assets.dead_life.height * cfg.s);
            } else if (assets.hud_sheet) {
                const sh = assets.hud_sheet.height / 2;
                ctx.drawImage(assets.hud_sheet, 0, 0, assets.hud_sheet.width, sh, cfg.x, cfg.y, assets.hud_sheet.width * cfg.s, sh * cfg.s);
            }
        });

        // --- DRAW GAME OVER ---
        const go = SPRITE_DATA.hud_elements.gameOver;
        if (go.visible && assets.hud_sheet) {
            const sh = assets.hud_sheet.height / 2;
            ctx.drawImage(assets.hud_sheet, 0, sh, assets.hud_sheet.width, sh, go.x - (assets.hud_sheet.width * go.s / 2), go.y, assets.hud_sheet.width * go.s, sh * go.s);
        }

        this.drawScore(this.score, SPRITE_DATA.hud_elements.score.x, SPRITE_DATA.hud_elements.score.y, SPRITE_DATA.hud_elements.score.s);
        this.activeCustomers.forEach(c => this.drawClock(c.x, c.y, c.timer));

        if (this.labMode === 'hud_main') {
            const el = SPRITE_DATA.hud_elements[this.editTarget];
            ctx.fillStyle = "rgba(0,0,0,0.85)"; ctx.fillRect(10, 10, 580, 220);
            ctx.fillStyle = "#0f0"; ctx.font = "18px monospace"; ctx.textAlign="left";
            ctx.fillText(`HUD LAB | EDITING: ${this.editTarget.toUpperCase()}`, 30, 40);
            ctx.fillStyle = "#fff";
            ctx.fillText(`Q:Score W:L1 E:L2 R:L3 T:Clock Y:GameOver`, 30, 80);
            ctx.fillText(`D: Toggle Dead State | Arrows: Scale`, 30, 110);
            ctx.fillText(`COPY: x:${el.x}, y:${el.y}, s:${el.s.toFixed(2)}`, 30, 150);
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
