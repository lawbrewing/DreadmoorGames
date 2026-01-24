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
        score: { x: 1871, y: 76, s: .85 },
        lives: { x: 1642, y: 138, s: 1.0, spacing: 80 },
        gameOver: { x: 969, y: 56, s: .45, visible: false }
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

        // Physics for Game Over drop
        this.gameOverAnim = {
            currentY: -600, 
            speed: 0,
            friction: 0.8,
            tension: 0.05
        };

        this.initInput();
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    // High-detail vertical beer mug drawing
    drawBeerLife(x, y, scale, isDead) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        
        const clr = {
            glass: isDead ? "#444" : "#4a2c0a",
            liquid: isDead ? "rgba(60,60,60,0.3)" : "#f5c400",
            shine: "rgba(255,255,255,0.2)"
        };

        // Handle
        ctx.lineWidth = 5;
        ctx.strokeStyle = clr.glass;
        ctx.beginPath();
        ctx.arc(18, 0, 12, -Math.PI/1.5, Math.PI/1.5);
        ctx.stroke();

        // Main Mug Body
        ctx.fillStyle = clr.liquid;
        ctx.fillRect(-18, -25, 36, 50);
        
        // Outlines and Texture
        ctx.strokeRect(-18, -25, 36, 50);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-6, -25); ctx.lineTo(-6, 25);
        ctx.moveTo(6, -25); ctx.lineTo(6, 25);
        ctx.stroke();

        // Shine
        ctx.fillStyle = clr.shine;
        ctx.fillRect(-14, -20, 4, 40);

        // Foam
        if (!isDead) {
            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.arc(-14, -28, 10, 0, Math.PI * 2);
            ctx.arc(0, -32, 12, 0, Math.PI * 2);
            ctx.arc(14, -28, 10, 0, Math.PI * 2);
            ctx.fill();
        }
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
                    SPRITE_DATA.hud_elements.gameOver.visible = !SPRITE_DATA.hud_elements.gameOver.visible;
                }
                if (e.key === 'ArrowUp') SPRITE_DATA.hud_elements[this.editTarget].s += 0.05;
                if (e.key === 'ArrowDown') SPRITE_DATA.hud_elements[this.editTarget].s -= 0.05;
            }
        });
    }

    update() {
        const h = SPRITE_DATA.hud_elements;
        // Game Over physics update
        if (h.gameOver.visible) {
            const targetY = h.gameOver.y;
            const dist = targetY - this.gameOverAnim.currentY;
            this.gameOverAnim.speed += dist * this.gameOverAnim.tension;
            this.gameOverAnim.speed *= this.gameOverAnim.friction;
            this.gameOverAnim.currentY += this.gameOverAnim.speed;
        } else {
            this.gameOverAnim.currentY = -600;
            this.gameOverAnim.speed = 0;
        }
    }

    draw() {
        this.update();
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

        const h = SPRITE_DATA.hud_elements;

        // 1. Draw Score
        ctx.save();
        ctx.textAlign = "right";
        ctx.font = `bold ${Math.round(70 * h.score.s)}px "MedievalSharp"`;
        ctx.shadowColor = "black"; ctx.shadowBlur = 10; ctx.fillStyle = "#ffcc00";
        ctx.fillText(`GOLD: ${this.score}`, h.score.x, h.score.y);
        ctx.restore();

        // 2. Draw Lives
        for (let i = 0; i < 3; i++) {
            this.drawBeerLife(h.lives.x + (i * h.lives.spacing), h.lives.y, h.lives.s, i >= this.lives);
        }

        // 3. Draw Game Over with Animation
        if (h.gameOver.visible && assets.hud_sheet) {
            const sh = assets.hud_sheet.height / 2;
            const dw = assets.hud_sheet.width * h.gameOver.s;
            const dh = sh * h.gameOver.s;
            ctx.drawImage(assets.hud_sheet, 0, sh, assets.hud_sheet.width, sh, h.gameOver.x - dw/2, this.gameOverAnim.currentY - dh/2, dw, dh);
        }

        // 4. Lab Overlay
        if (this.labMode === 'hud_main') {
            const el = SPRITE_DATA.hud_elements[this.editTarget];
            ctx.fillStyle = "rgba(0,0,0,0.85)"; ctx.fillRect(10, 10, 500, 180);
            ctx.fillStyle = "#0f0"; ctx.font = "20px monospace"; ctx.textAlign = "left";
            ctx.fillText(`HUD LAB | EDIT: ${this.editTarget.toUpperCase()}`, 30, 40);
            ctx.fillStyle = "#fff";
            ctx.fillText(`Q:Score W:Lives E:GameOver Toggle`, 30, 80);
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
