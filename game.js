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
    paddleDrinks: [
        [ // Judge
            [ {x:-103, y:0, s:.63}, {x:-4, y:-13, s:.63} ], 
            [ {x:-111, y:-6, s:.63}, {x:-19, y:-21, s:.63}, {x:61, y:-6, s:.63} ], 
            [ {x:-109, y:-11, s:.55}, {x:-29, y:-23, s:.55}, {x:40, y:-14, s:.55}, {x:100, y:-23, s:.55} ], 
            [ {x:-111, y:-18, s:.5}, {x:-39, y:-23, s:.5}, {x:28, y:-13, s:.5}, {x:90, y:-23, s:.5}, {x:157, y:-12, s:.5} ]
        ],
        [ // VIP
            [ {x:-104, y:-8, s:.55}, {x:-13, y:-8, s:.55} ], 
            [ {x:-106, y:-14, s:.5}, {x:-33, y:-12, s:.5}, {x:46, y:-11, s:.5} ]
        ]
    ],
    // --- CALIBRATE THESE NUMBERS USING THE HUD ---
    menu: {
        x: 960,
        targetY: 200,
        s: 0.60,
        textX: 0,
        textY: 0
    },
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
    menu: 'https://lawbrewing.github.io/DreadmoorGames/assets/menu.png'
};

const assets = {}; 

class Game {
    constructor() {
        this.started = false;
        this.taps = [];
        this.labMode = 'none';
        this.editTarget = 'bar';
        this.selectedObject = null;
        this.activeNotifications = [];

        this.menuPhysics = {
            active: false,
            y: -600,
            burnProgress: 0,
            text: "",
            smoke: []
        };

        this.initInput();
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    triggerOrder(msg) {
        this.menuPhysics.text = msg.toUpperCase();
        this.menuPhysics.burnProgress = 0;
        this.menuPhysics.active = true;
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

        const handleStart = (e) => {
            if (!this.started) {
                if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
                this.started = true;
                return;
            }
            const pos = getPos(e);
            
            // Toggle Edit Target (Clicking the Green HUD box)
            if (pos.y < 250 && pos.x < 550 && this.labMode !== 'none') {
                this.editTarget = (this.editTarget === 'bar') ? 'text' : 'bar';
                return;
            }

            if (this.labMode === 'menu') {
                this.selectedObject = SPRITE_DATA.menu;
            }
        };

        canvas.addEventListener('mousedown', handleStart);
        canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleStart(e); }, { passive: false });

        window.addEventListener('mousemove', (e) => {
            if (!this.selectedObject) return;
            const pos = getPos(e);
            if (this.labMode === 'menu') {
                if (this.editTarget === 'text') {
                    this.selectedObject.textX = Math.round(pos.x - this.selectedObject.x);
                    this.selectedObject.textY = Math.round(pos.y - this.selectedObject.targetY);
                } else {
                    this.selectedObject.x = Math.round(pos.x);
                    this.selectedObject.targetY = Math.round(pos.y);
                }
            }
        });

        window.addEventListener('mouseup', () => { this.selectedObject = null; });
        window.addEventListener('touchend', () => { this.selectedObject = null; });

        window.addEventListener('keydown', (e) => {
            if (e.key === '5') { this.labMode = 'menu'; this.menuPhysics.active = true; this.editTarget = 'bar'; }
            if (e.key === '9') this.labMode = 'hud';
            if (e.key.toLowerCase() === 'o') this.triggerOrder("2x Stout");
            if (e.key.toLowerCase() === 'u') this.menuPhysics.active = !this.menuPhysics.active;
            
            if (this.selectedObject) {
                if (e.key === 'ArrowUp') this.selectedObject.s += 0.01;
                if (e.key === 'ArrowDown') this.selectedObject.s -= 0.01;
            }
        });
    }

    update() {
        const mP = this.menuPhysics;
        const mD = SPRITE_DATA.menu;
        const speed = 0.12;

        if (mP.active) {
            mP.y += (mD.targetY - mP.y) * speed;
            if (mP.y > mD.targetY - 20) {
                mP.burnProgress = Math.min(1, mP.burnProgress + 0.006);
            }
        } else {
            mP.y += (-600 - mP.y) * speed;
            mP.burnProgress = 0;
        }

        if (mP.active && mP.burnProgress < 1 && mP.burnProgress > 0.05) {
            mP.smoke.push({
                x: mD.textX + (mP.burnProgress - 0.5) * 450,
                y: mD.textY, life: 1.0,
                vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 4
            });
        }
        mP.smoke.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.02; });
        mP.smoke = mP.smoke.filter(p => p.life > 0);
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

        // Draw Menu Board
        if (assets.menu) {
            const mP = this.menuPhysics;
            const mD = SPRITE_DATA.menu;
            const mw = assets.menu.width * mD.s;
            const mh = assets.menu.height * mD.s;

            ctx.save();
            ctx.translate(mD.x, mP.y);
            
            ctx.fillStyle = "rgba(150,150,150,0.5)";
            mP.smoke.forEach(p => {
                ctx.beginPath(); ctx.arc(p.x, p.y, 8 * p.life, 0, Math.PI*2); ctx.fill();
            });

            ctx.drawImage(assets.menu, -mw/2, -mh/2, mw, mh);

            if (mP.text) {
                ctx.font = `bold ${Math.round(70 * mD.s)}px "MedievalSharp"`;
                ctx.textAlign = "center"; ctx.textBaseline = "middle";
                const charCount = Math.floor(mP.text.length * mP.burnProgress);
                const visible = mP.text.substring(0, charCount);
                
                ctx.fillStyle = "rgba(30, 15, 0, 0.9)";
                ctx.fillText(visible, mD.textX, mD.textY);

                if (mP.burnProgress < 1 && mP.burnProgress > 0) {
                    const nextChar = mP.text.charAt(charCount);
                    const offset = ctx.measureText(visible).width / 2;
                    ctx.shadowColor = "#ff4400"; ctx.shadowBlur = 15;
                    ctx.fillStyle = "#ffaa00";
                    ctx.fillText(nextChar, mD.textX + offset + 15, mD.textY);
                }
            }
            ctx.restore();
        }

        // --- NEW: CALIBRATION OVERLAY ---
        if (this.labMode === 'menu') {
            const mD = SPRITE_DATA.menu;
            ctx.fillStyle = "rgba(0,0,0,0.85)";
            ctx.fillRect(10, 10, 550, 220);
            ctx.fillStyle = "#0f0"; ctx.font = "bold 18px monospace"; ctx.textAlign = "left";
            
            ctx.fillText(`🛠 MENU LAB | EDITING: ${this.editTarget.toUpperCase()}`, 30, 40);
            ctx.fillStyle = "#fff";
            ctx.fillText(`[X]: ${mD.x}  [targetY]: ${mD.targetY}`, 30, 80);
            ctx.fillText(`[Scale]: ${mD.s.toFixed(2)}`, 30, 110);
            ctx.fillText(`[textX]: ${mD.textX}  [textY]: ${mD.textY}`, 30, 140);
            
            ctx.fillStyle = "#ff0";
            ctx.font = "14px monospace";
            ctx.fillText(`COPY THIS: x: ${mD.x}, targetY: ${mD.targetY}, s: ${mD.s.toFixed(2)}, textX: ${mD.textX}, textY: ${mD.textY}`, 30, 180);
            ctx.fillText(`CLICK HUD BOX TO TOGGLE BAR/TEXT | ARROWS TO SCALE`, 30, 205);
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
