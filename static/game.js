// ==========================================
// 1. CONFIGURATION & ASSETS
// ==========================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const WORLD = { w: 1920, h: 1080 }; 
let screenScale = 1;
let screenOffset = { x: 0, y: 0 };

// TAPS: 0=Stout (Left), 1=IPA (Mid), 2=Lager (Right)
const TAPS = { STOUT: 0, IPA: 1, LAGER: 2 };

// RECIPES
const RECIPES = {
    'stout': { name: "STOUT", steps: [{ tap: TAPS.STOUT, limit: 1.0 }] },
    'ipa':   { name: "IPA",   steps: [{ tap: TAPS.IPA,   limit: 1.0 }] },
    'lager': { name: "LAGER", steps: [{ tap: TAPS.LAGER, limit: 1.0 }] },
    // Mixed Drinks (Base 50%, Topper 100%)
    'black_tan':    { name: "BLACK & TAN", steps: [{ tap: TAPS.LAGER, limit: 0.5 }, { tap: TAPS.STOUT, limit: 1.0 }] },
    'black_bitter': { name: "BLACK & BITTER", steps: [{ tap: TAPS.IPA,   limit: 0.5 }, { tap: TAPS.STOUT, limit: 1.0 }] },
    'lawnmower':    { name: "LAWNMOWER HOP", steps: [{ tap: TAPS.LAGER, limit: 0.5 }, { tap: TAPS.IPA,   limit: 1.0 }] }
};

// CUSTOMER DATA
const CUSTOMER_TYPES = {
    'viking':  { id: 'viking',  patience: 15000, orders: ['stout'] },
    'hipster': { id: 'viking',  patience: 12000, orders: ['ipa'] }, // Placeholder sprite
    'regular': { id: 'viking',  patience: 12000, orders: ['lager'] }, // Placeholder sprite
    'vip':     { id: 'judge',   patience: 20000, orders: ['all_pure', 'all_mixed'] }, 
    'karen':   { id: 'judge',   patience: 10000, orders: ['???'] }, 
    'judge':   { id: 'judge',   patience: 25000, orders: ['flight'] }
};

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
    viking: 'assets/viking.png',
    judge: 'assets/judge.png'
};
const assets = {}; 

// ==========================================
// 2. GAME CLASSES
// ==========================================

class Customer {
    constructor(typeKey) {
        const type = CUSTOMER_TYPES[typeKey];
        this.type = typeKey;
        this.spriteId = type.id;
        this.x = -300; 
        this.targetX = 960; 
        this.y = 900; 
        this.state = 'walking_in'; 
        
        this.patienceMax = type.patience;
        this.patience = this.patienceMax;
        
        this.satisfaction = 100; 
        this.order = this.generateOrder(typeKey);
        
        // Flight/Mixing Progress
        this.currentOrderIndex = 0; 
        this.currentDrinkProgress = 0; 
        this.currentStepIndex = 0; 
    }

    generateOrder(typeKey) {
        if (typeKey === 'karen') return [{ name: "???", recipe: null }];
        
        if (typeKey === 'judge') {
            const keys = Object.keys(RECIPES);
            let flight = [];
            for(let i=0; i<3; i++) flight.push(RECIPES[keys[Math.floor(Math.random()*keys.length)]]);
            return flight;
        }

        const possible = CUSTOMER_TYPES[typeKey].orders;
        if (possible[0] === 'all_pure') return [RECIPES[['stout','ipa','lager'][Math.floor(Math.random()*3)]]];
        if (possible[0] === 'all_mixed') return [RECIPES[['black_tan','black_bitter','lawnmower'][Math.floor(Math.random()*3)]]];
        return [RECIPES[possible[0]]];
    }

    update() {
        // Movement Logic
        if (this.state === 'walking_in') {
            this.x += (this.targetX - this.x) * 0.05;
            if (Math.abs(this.x - this.targetX) < 5) {
                this.state = 'ordering';
                return 'arrived';
            }
        } else if (this.state === 'walking_out') {
            this.x += (-400 - this.x) * 0.05;
            if (this.x < -300) return 'gone';
        }
        
        // Timer Logic
        if (this.state === 'waiting') {
            this.patience -= 16; 
            if (this.patience <= 0) return 'timeout';
        }
        return null;
    }
}

class Game {
    constructor() {
        this.started = false;
        this.score = 1250;
        this.lives = 3;
        
        this.customer = null; 
        this.menuAnim = { y: -600 };
        this.activePour = { active: false, tapIndex: -1 };
        
        this.gameOverAnim = { currentY: -600, speed: 0, tension: 0.05, friction: 0.8 };
        
        this.initInput();
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    // --- LOGIC ---
    spawnCustomer() {
        if (this.customer) return;
        const rnd = Math.random();
        let type = 'viking'; 
        // Simple difficulty ramp could go here
        if (rnd > 0.9) type = 'judge';
        
        this.customer = new Customer(type);
    }

    handlePourInput(isDown, tapIndex) {
        if (!this.customer || this.customer.state !== 'waiting') return;
        
        if (isDown) {
            this.activePour.active = true;
            this.activePour.tapIndex = tapIndex;
        } else {
            this.activePour.active = false;
            this.evaluatePour();
        }
    }

    updatePouring() {
        if (!this.activePour.active) return;
        const c = this.customer;
        
        // Karen Logic
        if (c.type === 'karen') { c.currentDrinkProgress += 0.01; return; }

        const recipe = c.order[c.currentOrderIndex];
        const step = recipe.steps[c.currentStepIndex];

        // Only fill if correct tap
        if (this.activePour.tapIndex === step.tap) {
            c.currentDrinkProgress += 0.008; // Fill speed
            // Spill Check
            if (c.currentDrinkProgress > step.limit + 0.1) c.satisfaction -= 25;
        }
    }

    evaluatePour() {
        const c = this.customer;
        // Karen Roulette
        if (c.type === 'karen') {
            if (c.currentDrinkProgress > 0.8) this.completeOrder(Math.random() < 0.33);
            return;
        }

        const recipe = c.order[c.currentOrderIndex];
        const step = recipe.steps[c.currentStepIndex];
        
        // Tolerance: +/- based on your rules
        const lower = step.limit - 0.15; 
        const upper = step.limit + 0.05; 

        if (c.currentDrinkProgress >= lower && c.currentDrinkProgress <= upper) {
            if (c.currentStepIndex < recipe.steps.length - 1) {
                c.currentStepIndex++; // Next step in mixed drink
            } else {
                this.finishDrink(true);
            }
        }
    }

    finishDrink(success) {
        const c = this.customer;
        if (success) {
            c.currentOrderIndex++;
            c.currentDrinkProgress = 0;
            c.currentStepIndex = 0;
            if (c.currentOrderIndex >= c.order.length) this.completeOrder(true);
        }
    }

    completeOrder(success) {
        if (success && this.customer.satisfaction > 0) {
            this.score += 50 * this.customer.order.length; // Basic scoring
            this.customer.state = 'walking_out';
        } else {
            this.lives--;
            this.customer.state = 'walking_out'; 
        }
        setTimeout(() => { this.customer = null; this.spawnCustomer(); }, 2000);
    }

    // --- DRAWING ---
    drawMenu() {
        const m = SPRITE_DATA.menu;
        const targetY = (this.customer && this.customer.state === 'waiting') ? m.targetY : -600;
        this.menuAnim.y += (targetY - this.menuAnim.y) * 0.1;

        if (assets.menu) {
            ctx.save();
            ctx.translate(m.x, this.menuAnim.y);
            const mw = assets.menu.width * m.s;
            const mh = assets.menu.height * m.s;
            ctx.drawImage(assets.menu, -mw/2, -mh/2, mw, mh);

            // Menu Text
            if (this.customer) {
                ctx.fillStyle = "rgba(40,20,0,0.9)"; ctx.textAlign = "center";
                ctx.font = "bold 24px 'Courier New'";
                ctx.fillText("ORDER HERE:", 0, -60);
                
                const ord = this.customer.order;
                let startY = -20;
                
                if (this.customer.type === 'judge') {
                    ctx.font = "bold 20px 'Courier New'";
                    ctx.fillText("FLIGHT:", 0, startY);
                    startY += 25;
                    ctx.font = "16px 'Courier New'";
                    ord.forEach((item, idx) => {
                        ctx.fillStyle = (idx === this.customer.currentOrderIndex) ? "#aa0000" : "#000";
                        ctx.fillText(item.name, 0, startY + (idx * 20));
                    });
                } else {
                    ctx.font = "bold 30px 'Courier New'";
                    ctx.fillText(ord[0].name, 0, 10);
                }
            }
            ctx.restore();
        }
    }

    drawBeerLife(x, y, scale, isDead) {
        ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
        const glassColor = "#2d2419";
        const beerGrad = ctx.createLinearGradient(0, -50, 0, 50);
        beerGrad.addColorStop(0, "#FFD700"); beerGrad.addColorStop(1, "#FF8C00");

        ctx.lineWidth = 12; ctx.strokeStyle = glassColor; ctx.lineCap = "round";
        ctx.beginPath(); ctx.arc(50, 0, 45, -Math.PI/1.5, Math.PI/1.5); ctx.stroke(); // Handle

        ctx.lineWidth = 8; ctx.fillStyle = isDead ? "rgba(255,255,255,0.1)" : "#f9fafb";
        ctx.beginPath(); ctx.moveTo(-50, -75); ctx.lineTo(50, -75); ctx.lineTo(45, 75); 
        ctx.quadraticCurveTo(45, 90, 30, 90); ctx.lineTo(-30, 90); ctx.quadraticCurveTo(-45, 90, -45, 75);
        ctx.closePath(); ctx.fill(); ctx.stroke();

        if (!isDead) {
            ctx.save(); ctx.beginPath();
            ctx.moveTo(-45, -70); ctx.lineTo(45, -70); ctx.lineTo(40, 75); ctx.lineTo(-40, 75);
            ctx.closePath(); ctx.clip();
            ctx.fillStyle = beerGrad; ctx.fillRect(-50, -70, 100, 150);
            
            // Bubbles
            ctx.fillStyle = "rgba(255,255,255,0.6)";
            const bTime = (Date.now() % 3000) / 3000;
            [-25, 0, 25, -15, 15].forEach((bx, i) => {
                const by = 80 - ((bTime + (i * 0.2)) % 1) * 140;
                ctx.beginPath(); ctx.arc(bx, by, 4, 0, Math.PI * 2); ctx.fill();
            });
            ctx.restore();

            ctx.fillStyle = "white"; // Foam
            ctx.beginPath(); ctx.arc(-35, -80, 35, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(0, -95, 45, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(35, -80, 35, 0, Math.PI * 2); ctx.fill();
            ctx.fillRect(-45, -85, 90, 30);
        } else {
            ctx.lineWidth = 8; ctx.strokeStyle = glassColor;
            ctx.beginPath(); ctx.moveTo(-48, -75); ctx.lineTo(48, -75); ctx.stroke();
        }
        ctx.restore();
    }

    drawClock(x, y, progress) {
        const c = SPRITE_DATA.hud_elements.clock;
        ctx.save(); ctx.translate(x + c.x, y + c.y);
        ctx.beginPath(); ctx.arc(0, 0, c.r, 0, Math.PI * 2); ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fill();
        ctx.beginPath(); ctx.arc(0, 0, c.r, -Math.PI/2, (-Math.PI/2) + (progress * Math.PI * 2));
        ctx.strokeStyle = progress > 0.3 ? "#0f0" : "#f00"; ctx.lineWidth = c.width; ctx.stroke();
        ctx.restore();
    }

    initInput() {
        const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            return { 
                x: ((e.clientX || e.touches[0].clientX) - rect.left - screenOffset.x) / screenScale, 
                y: ((e.clientY || e.touches[0].clientY) - rect.top - screenOffset.y) / screenScale 
            };
        };

        const handleStart = (e) => {
            if (!this.started) { this.started = true; this.spawnCustomer(); return; }
            const pos = getPos(e);
            
            // TAP ZONES: Left, Mid, Right
            if (pos.y > 400 && pos.y < 900) {
                if (pos.x < 1920 * 0.33) this.handlePourInput(true, 0);
                else if (pos.x < 1920 * 0.66) this.handlePourInput(true, 1);
                else this.handlePourInput(true, 2);
            }
        };

        const handleEnd = () => { this.handlePourInput(false, -1); };

        canvas.addEventListener('mousedown', handleStart);
        canvas.addEventListener('mouseup', handleEnd);
        canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleStart(e); }, { passive: false });
        canvas.addEventListener('touchend', (e) => { e.preventDefault(); handleEnd(); });
    }

    draw() {
        this.updatePouring();
        if (this.customer) {
            const status = this.customer.update();
            if (status === 'arrived') this.customer.state = 'waiting';
            if (status === 'timeout') this.completeOrder(false);
            if (status === 'gone') this.customer = null;
        }

        ctx.fillStyle = "#000"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.save(); ctx.translate(screenOffset.x, screenOffset.y); ctx.scale(screenScale, screenScale);
        if (assets.bg) ctx.drawImage(assets.bg, 0, 0, WORLD.w, WORLD.h);
        
        // CUSTOMER & CLOCK
        if (this.customer && assets[this.customer.spriteId]) {
            const img = assets[this.customer.spriteId];
            const s = 0.5; // Scale
            ctx.drawImage(img, this.customer.x - (img.width*s)/2, this.customer.y - img.height*s, img.width*s, img.height*s);
            
            if (this.customer.state === 'waiting') {
                const pct = this.customer.patience / this.customer.patienceMax;
                this.drawClock(this.customer.x, this.customer.y, pct);
                
                // DEBUG: Pour Bar
                ctx.fillStyle = "white"; ctx.fillRect(this.customer.x + 120, this.customer.y - 200, 20, -200 * this.customer.currentDrinkProgress);
                ctx.strokeStyle = "red"; ctx.strokeRect(this.customer.x + 120, this.customer.y - 200, 20, -200);
            }
        }

        this.drawMenu();

        // HUD
        const h = SPRITE_DATA.hud_elements;
        ctx.save(); ctx.textAlign = "right"; ctx.font = `bold ${Math.round(70 * h.score.s)}px "MedievalSharp"`;
        ctx.shadowColor = "black"; ctx.shadowBlur = 10; ctx.fillStyle = "#ffcc00";
        ctx.fillText(`GOLD: ${this.score}`, h.score.x, h.score.y);
        ctx.restore();

        for (let i = 0; i < 3; i++) {
            this.drawBeerLife(h.lives.x + (i * h.lives.spacing), h.lives.y, h.lives.s, i >= this.lives);
        }

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
