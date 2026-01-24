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
    hud_elements: {
        score: { x: 1650, y: 100, s: 1.0 },
        lives: { x: 100, y: 100, s: 1.0, spacing: 80 },
        gameOver: { x: 960, y: 540, s: 1.0, visible: false }
    },
    menu: { x: 218, targetY: 295, s: 0.60, textX: 0, textY: 0 }
};

const ASSETS_PATHS = {
    bg: 'assets/background.png',
    menu: 'https://lawbrewing.github.io/DreadmoorGames/assets/menu.png',
    hud_sheet: 'https://lawbrewing.github.io/DreadmoorGames/assets/hud.png'
};

const assets = {}; 

class Game {
    constructor() {
        this.started = false;
        this.labMode = 'none';
        this.editTarget = 'score';
        this.selectedObject = null;
        
        this.score = 1250;
        this.lives = 3;

        this.initInput();
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    // Hand-drawn beer mug
    drawBeerLife(x, y, scale, isDead) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        ctx.lineWidth = 4;
        ctx.strokeStyle = isDead ? "#444" : "#4a2c0a";
        ctx.fillStyle = isDead ? "rgba(40,40,40,0.4)" : "#f5c400";
        
        ctx.beginPath();
        ctx.moveTo(-20, 25); ctx.lineTo(20, 25); ctx.lineTo(16, -25); ctx.lineTo(-16, -25);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        if (!isDead) {
            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.arc(-12, -28, 10, 0, Math.PI * 2);
            ctx.arc(0, -32, 12, 0, Math.PI * 2);
            ctx.arc(12, -28, 10, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.beginPath(); ctx.arc(20, 0, 10, -Math.PI/2, Math.PI/2); ctx.stroke();
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
                if (e.key === 'e') {
                    this.editTarget = 'gameOver';
                    SPRITE_DATA.hud_elements.gameOver.visible = true;
                }
                if (e.key === 'ArrowUp') SPRITE_DATA.hud_elements[this.editTarget].s += 0.05;
                if (e.key === 'ArrowDown') SPRITE_DATA.hud_elements[this.editTarget].s -= 0.05;
            }
        });
    }

    draw() {
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

        // --- DRAW HUD ---
        const h = SPRITE_DATA.hud_elements;

        // 1. Score
        ctx.save();
        ctx.textAlign = "right"; ctx.font = `bold ${Math.round(70 * h.score.s)}px "MedievalSharp"`;
        ctx.shadowColor = "black"; ctx.shadowBlur = 10; ctx.fillStyle = "#ffcc00";
        ctx.fillText(`GOLD: ${this.score}`, h.score.x, h.score.y);
        ctx.restore();

        // 2. Lives
        for (let i = 0; i < 3; i++) {
            this.drawBeerLife(h.lives.x + (i * h.lives.spacing), h.lives.y, h.lives.s, i >= this.lives);
        }

        // 3. Game Over
        if (h.gameOver.visible && assets.hud_sheet) {
            const sh = assets.hud_sheet.height / 2;
            const dw = assets.hud_sheet.width * h.gameOver.s;
            const dh = sh * h.gameOver.s;
            ctx.drawImage(assets.hud_sheet, 0, sh, assets.hud_sheet.width, sh, h.gameOver.x - dw/2, h.gameOver.y - dh/2, dw, dh);
        }

        // --- LAB OVERLAY ---
        if (this.labMode === 'hud_main') {
            const el = SPRITE_DATA.hud_elements[this.editTarget];
            ctx.fillStyle = "rgba(0,0,0,0.85)"; ctx.fillRect(10, 10, 500, 180);
            ctx.fillStyle = "#0f0"; ctx.font = "20px monospace"; ctx.textAlign = "left";
            ctx.fillText(`HUD LAB | EDIT: ${this.editTarget.toUpperCase()}`, 30, 40);
            ctx.fillStyle = "#fff";
            ctx.fillText(`Q:Score W:Lives E:GameOver`, 30, 80);
            ctx.fillText(`COPY: x:${el.x}, y:${el.y}, s:${el.s.toFixed(2)}`, 30, 130);
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
