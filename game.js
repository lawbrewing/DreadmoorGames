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
        lives: { x: 1624, y: 172, s: 0.5, spacing: 100 },
        gameOver: { x: 969, y: 56, s: .45, visible: false },
        clock: { x: 0, y: -280, r: 50, width: 10 }
    },
    menu: { x: 218, targetY: 295, s: 0.60, textX: 0, textY: 0 }
};

const ASSETS_PATHS = {
    bg: 'assets/background.png',
    menu: 'https://lawbrewing.github.io/DreadmoorGames/assets/menu.png',
    hud_sheet: 'https://lawbrewing.github.io/DreadmoorGames/assets/hud.png',
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
        this.lives = 3;
        
        this.activeCustomers = [{ id: 'viking', x: 400, y: 900, timer: 0.75 }];

        this.gameOverAnim = { currentY: -600, speed: 0, tension: 0.05, friction: 0.8 };

        this.initInput();
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    // TRANSLATED SVG MUG LOGIC
    drawBeerLife(x, y, scale, isDead) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        const glassColor = "#2d2419";
        const beerGrad = ctx.createLinearGradient(0, -50, 0, 50);
        beerGrad.addColorStop(0, "#FFD700");
        beerGrad.addColorStop(1, "#FF8C00");

        // 1. Handle Shadow & Handle
        ctx.lineWidth = 12;
        ctx.strokeStyle = glassColor;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(50, 0, 45, -Math.PI/1.5, Math.PI/1.5);
        ctx.stroke();

        // 2. Mug Body
        ctx.lineWidth = 8;
        ctx.fillStyle = isDead ? "rgba(255,255,255,0.1)" : "#f9fafb";
        ctx.beginPath();
        ctx.moveTo(-50, -75); ctx.lineTo(50, -75);
        ctx.lineTo(45, 75); 
        ctx.quadraticCurveTo(45, 90, 30, 90);
        ctx.lineTo(-30, 90);
        ctx.quadraticCurveTo(-45, 90, -45, 75);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        if (!isDead) {
            // 3. Liquid Clipping
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(-45, -70); ctx.lineTo(45, -70); ctx.lineTo(40, 75); ctx.lineTo(-40, 75);
            ctx.closePath();
            ctx.clip();
            
            ctx.fillStyle = beerGrad;
            ctx.fillRect(-50, -70, 100, 150);

            // 4. Bubbles
            ctx.fillStyle = "rgba(255,255,255,0.6)";
            const bTime = (Date.now() % 3000) / 3000;
            [-25, 0, 25, -15, 15].forEach((bx, i) => {
                const by = 80 - ((bTime + (i * 0.2)) % 1) * 140;
                ctx.beginPath(); ctx.arc(bx, by, 4, 0, Math.PI * 2); ctx.fill();
            });
            ctx.restore();

            // 5. Foam Head
            ctx.fillStyle = "white";
            ctx.beginPath(); ctx.arc(-35, -80, 35, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(0, -95, 45, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(35, -80, 35, 0, Math.PI * 2); ctx.fill();
            ctx.fillRect(-45, -85, 90, 30);
        } else {
            // Rim Line
            ctx.lineWidth = 8;
            ctx.strokeStyle = glassColor;
            ctx.beginPath(); ctx.moveTo(-48, -75); ctx.lineTo(48, -75); ctx.stroke();
        }

        // 6. Ridges
        ctx.strokeStyle = "rgba(45,36,25,0.1)";
        ctx.lineWidth = 4;
        [-25, 0, 25].forEach(rx => {
            ctx.beginPath(); ctx.moveTo(rx, -70); ctx.lineTo(rx, 80); ctx.stroke();
        });
        ctx.restore();
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
                if (e.key === 'w') this.editTarget = 'lives';
                if (e.key === 'e') this.editTarget = 'gameOver';
                if (e.key === 't') this.editTarget = 'clock';
                if (e.key === 'v') SPRITE_DATA.hud_elements.gameOver.visible = !SPRITE_DATA.hud_elements.gameOver.visible;
                if (e.key === 'ArrowUp') SPRITE_DATA.hud_elements[this.editTarget].s += 0.05;
                if (e.key === 'ArrowDown') SPRITE_DATA.hud_elements[this.editTarget].s -= 0.05;
            }
        });
        window.addEventListener('mouseup', () => this.selectedObject = null);
    }

    update() {
        const h = SPRITE_DATA.hud_elements;
        if (h.gameOver.visible) {
            const dist = h.gameOver.y - this.gameOverAnim.currentY;
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
        ctx.fillStyle = "#000"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (!this.started) {
            ctx.fillStyle = "white"; ctx.textAlign = "center"; ctx.font = "40px monospace";
            ctx.fillText("TAP TO START", window.innerWidth/2, window.innerHeight/2);
            return;
        }

        ctx.save(); ctx.translate(screenOffset.x, screenOffset.y); ctx.scale(screenScale, screenScale);
        if (assets.bg) ctx.drawImage(assets.bg, 0, 0, WORLD.w, WORLD.h);

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

        // 3. Animated Game Over
        if (h.gameOver.visible && assets.hud_sheet) {
            const sh = assets.hud_sheet.height / 2;
            const dw = assets.hud_sheet.width * h.gameOver.s;
            const dh = sh * h.gameOver.s;
            ctx.drawImage(assets.hud_sheet, 0, sh, assets.hud_sheet.width, sh, h.gameOver.x - dw/2, this.gameOverAnim.currentY - dh/2, dw, dh);
        }

        // 4. Clocks
        this.activeCustomers.forEach(c => this.drawClock(c.x, c.y, c.timer));

        if (this.labMode === 'hud_main') {
            const el = SPRITE_DATA.hud_elements[this.editTarget];
            ctx.fillStyle = "rgba(0,0,0,0.85)"; ctx.fillRect(10, 10, 500, 200);
            ctx.fillStyle = "#0f0"; ctx.font = "20px monospace"; ctx.textAlign = "left";
            ctx.fillText(`HUD LAB | EDIT: ${this.editTarget.toUpperCase()}`, 30, 40);
            ctx.fillStyle = "#fff";
            ctx.fillText(`Q:Score W:Lives E:GaveOver T:Clock`, 30, 80);
            ctx.fillText(`V: Toggle GameOver Drop Animation`, 30, 110);
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
