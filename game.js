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
        this.labMode = 'customer';
        this.activeNotifications = [];
        this.activeCharIdx = 0;

        // --- MENU BOARD STATE ---
        this.menu = {
            active: false,
            y: -600,
            targetY: 200,
            s: 0.6,
            text: "",
            burnProgress: 0,
            smoke: []
        };

        window.addEventListener('resize', () => this.resize());
        this.initInput();
        this.resize();
    }

    triggerOrder(msg) {
        this.menu.text = msg.toUpperCase();
        this.menu.burnProgress = 0;
        this.menu.active = true;
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
        const handleStart = () => {
            if (!this.started) {
                if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
                this.started = true;
            }
        };
        canvas.addEventListener('mousedown', handleStart);
        canvas.addEventListener('touchstart', handleStart);

        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'o') this.triggerOrder("2x Stout");
            if (e.key.toLowerCase() === 'u') this.menu.active = !this.menu.active;
            if (e.key === '9') this.labMode = (this.labMode === 'hud' ? 'none' : 'hud');
        });
    }

    update() {
        // Menu Board Physics
        const speed = 0.12;
        if (this.menu.active) {
            this.menu.y += (this.menu.targetY - this.menu.y) * speed;
            if (this.menu.y > this.menu.targetY - 20) {
                this.menu.burnProgress = Math.min(1, this.menu.burnProgress + 0.006);
            }
        } else {
            this.menu.y += (-600 - this.menu.y) * speed;
            this.menu.burnProgress = 0;
        }

        // Smoke Logic
        if (this.menu.active && this.menu.burnProgress < 1 && this.menu.burnProgress > 0.05) {
            this.menu.smoke.push({
                x: (this.menu.burnProgress - 0.5) * 450,
                y: 0, life: 1.0,
                vx: (Math.random() - 0.5) * 2,
                vy: -Math.random() * 4
            });
        }
        this.menu.smoke.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.02; });
        this.menu.smoke = this.menu.smoke.filter(p => p.life > 0);
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
            const m = this.menu;
            const mw = assets.menu.width * m.s;
            const mh = assets.menu.height * m.s;
            ctx.save();
            ctx.translate(WORLD.w/2, m.y);
            
            // Draw Particles
            ctx.fillStyle = "rgba(150,150,150,0.5)";
            m.smoke.forEach(p => {
                ctx.beginPath(); ctx.arc(p.x, p.y, 8 * p.life, 0, Math.PI*2); ctx.fill();
            });

            ctx.drawImage(assets.menu, -mw/2, -mh/2, mw, mh);

            // Burn Text
            if (m.text) {
                ctx.font = `bold ${Math.round(70 * m.s)}px "MedievalSharp"`;
                ctx.textAlign = "center"; ctx.textBaseline = "middle";
                
                const charCount = Math.floor(m.text.length * m.burnProgress);
                const visible = m.text.substring(0, charCount);
                
                // Burnt Charcoal Text
                ctx.fillStyle = "rgba(30, 15, 0, 0.9)";
                ctx.fillText(visible, 0, 0);

                // Ember Glow
                if (m.burnProgress < 1 && m.burnProgress > 0) {
                    const nextChar = m.text.charAt(charCount);
                    const offset = ctx.measureText(visible).width / 2;
                    ctx.shadowColor = "#ff4400";
                    ctx.shadowBlur = 15 + Math.sin(Date.now()/50)*10;
                    ctx.fillStyle = "#ffaa00";
                    ctx.fillText(nextChar, offset + 15, 0);
                }
            }
            ctx.restore();
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
