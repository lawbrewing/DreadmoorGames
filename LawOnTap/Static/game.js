// ==========================================
// 1. SETUP & UTILS
// ==========================================
const style = document.createElement('style');
style.textContent = `
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #000; }
    canvas { display: block; width: 100%; height: 100%; touch-action: none; -webkit-user-select: none; margin: 0 auto; }
`;
document.head.appendChild(style);

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const WORLD = { w: 1920, h: 1080 }; 
let screenScale = 1;
let screenOffset = { x: 0, y: 0 };

// ==========================================
// 2. CONFIGURATION & DATA
// ==========================================

const TAPS = { STOUT: 0, IPA: 1, LAGER: 2 };

const RECIPES = {
    'stout': { name: "STOUT", steps: [{ tap: TAPS.STOUT, limit: 1.0 }] },
    'ipa':   { name: "IPA",   steps: [{ tap: TAPS.IPA,   limit: 1.0 }] },
    'lager': { name: "LAGER", steps: [{ tap: TAPS.LAGER, limit: 1.0 }] },
    'black_tan':    { name: "BLACK & TAN", steps: [{ tap: TAPS.LAGER, limit: 0.5 }, { tap: TAPS.STOUT, limit: 1.0 }] },
    'black_bitter': { name: "BLACK & BITTER", steps: [{ tap: TAPS.IPA,   limit: 0.5 }, { tap: TAPS.STOUT, limit: 1.0 }] },
    'lawnmower':    { name: "LAWNMOWER HOP", steps: [{ tap: TAPS.LAGER, limit: 0.5 }, { tap: TAPS.IPA,   limit: 1.0 }] }
};

const CUSTOMER_TYPES = {
    'viking':  { id: 'viking',  patience: 15000, orders: ['stout'] },
    'hipster': { id: 'viking',  patience: 12000, orders: ['ipa'] }, 
    'regular': { id: 'viking',  patience: 12000, orders: ['lager'] }, 
    'vip':     { id: 'judge',   patience: 20000, orders: ['all_pure', 'all_mixed'] }, 
    'karen':   { id: 'judge',   patience: 10000, orders: ['???'] }, 
    'judge':   { id: 'judge',   patience: 25000, orders: ['flight'] }
};

let SPRITE_DATA = {
    // HUD Elements
    hud_elements: {
        score: { x: 1871, y: 76, s: .85 },
        lives: { x: 1624, y: 172, s: 0.5, spacing: 100 },
        gameOver: { x: 969, y: 56, s: .45, visible: false },
        clock: { x: 0, y: -280, r: 50, width: 10 }
    },
    menu: { x: 218, targetY: 295, s: 0.60, textX: 0, textY: 0 },
    
    // Tap Hitboxes (Renamed to avoid conflict)
    taps_hitboxes: [
        { x: 0.2, w: 0.1 }, 
        { x: 0.5, w: 0.1 }, 
        { x: 0.8, w: 0.1 }  
    ],
    
    // VISUAL DATA
    // 3 INDEPENDENT TOWERS (Using exact Global X/Y)
    towers: [
        { x: 388,  y: 860, s: 0.5, clip: { sx: 0, sy: 0, sw: 0, sh: 0 } }, // Left Tower
        { x: 1025,  y: 860, s: 0.5, clip: { sx: 0, sy: 0, sw: 0, sh: 0 } }, // Middle Tower
        { x: 1630, y: 860, s: 0.5, clip: { sx: 0, sy: 0, sw: 0, sh: 0 } }  // Right Tower
    ],
    
    // 3 INDEPENDENT TAPS (Using exact Global X/Y - No Math!)
    taps_visual: { 
        s: 1.0, 
        positions: [
            { x: 388,  y: 860, clip: {sx:0, sy:0, sw:0, sh:0} }, // Left Tap
            { x: 1025,  y: 860, clip: {sx:0, sy:0, sw:0, sh:0} }, // Middle Tap
            { x: 1630, y: 860, clip: {sx:0, sy:0, sw:0, sh:0} }  // Right Tap
        ],
    },
    
    // SPILLS (These are just offsets from the Tap Handle above them)
    // X: 0 means perfectly centered under the tap. Y: 300 means 300px below it.
    spills: [
        { x: -20, y: 350, s: .05, clip: { sx: 0, sy: 0, sw: 0, sh: 0 } }, 
        { x: 0,   y: 350, s: .05, clip: { sx: 0, sy: 0, sw: 0, sh: 0 } }, 
        { x: 20,  y: 350, s: .05, clip: { sx: 0, sy: 0, sw: 0, sh: 0 } }
    ],

    paddles: [
        { owner: 'judge', x: -300, y: 408, s: .16, clip: { sx: 0, sy: 0, sw: 0, sh: 0 } }, 
        { owner: 'vip',   x: -270, y: 401, s: .16, clip: { sx: 0, sy: 0, sw: 0, sh: 0 } }
    ],

    customers: [
        // Note: sx is -98. We will handle this as a DESTINATION offset in the draw loop, not a source clip.
        { id: 'viking', name: "Viking", poses: [ {x:167, y:966, s:.48, clip:{sx:-98, sy:0, sw:0, sh:0}} ] },
        { id: 'judge',  name: "Judge",  poses: [ {x:703, y:911, s:.39, clip:{sx:0, sy:0, sw:0, sh:0}} ] }
    ]
};

const ASSETS_PATHS = {
    bg: 'assets/background.png', 
    tower: 'assets/tower.png', 
    taps: 'assets/taps.png',
    menu: 'assets/menu.png',
    hud_sheet: 'assets/hud.png',
    viking: 'assets/viking.png', 
    judge: 'assets/judge.png',
    spill: 'assets/spill.png', 
    paddles: 'assets/paddles.png'
};
const assets = {}; 

// ==========================================
// 3. LOGIC & DRAWING HELPERS
// ==========================================

class NotificationSystem {
    constructor() { this.queue = []; this.active = null; this.timer = 0; }
    trigger(text, color="#fff", duration=120) { this.queue.push({ text, color, duration }); }
    update() {
        if (!this.active && this.queue.length > 0) { this.active = this.queue.shift(); this.timer = this.active.duration; }
        if (this.active) { this.timer--; if (this.timer <= 0) this.active = null; }
    }
    draw() {
        if (this.active) {
            ctx.save(); ctx.fillStyle = this.active.color; ctx.strokeStyle = "black"; ctx.lineWidth = 4;
            ctx.font = "bold 60px 'MedievalSharp', monospace"; ctx.textAlign = "center";
            ctx.strokeText(this.active.text, WORLD.w/2, 300); ctx.fillText(this.active.text, WORLD.w/2, 300);
            ctx.restore();
        }
    }
}

class Customer {
    constructor(typeKey) {
        const type = CUSTOMER_TYPES[typeKey];
        this.type = typeKey;
        this.spriteId = type.id;
        
        const poseData = SPRITE_DATA.customers.find(c => c.id === this.spriteId).poses[0];
        this.targetX = poseData.x;
        this.y = poseData.y;
        this.scale = poseData.s;
        this.clip = poseData.clip || {sx:0, sy:0, sw:0, sh:0};
        
        this.x = -300; 
        this.state = 'walking_in'; 
        this.patienceMax = type.patience;
        this.patience = this.patienceMax;
        this.satisfaction = 100; 
        this.order = this.generateOrder(typeKey);
        
        this.currentOrderIndex = 0; 
        this.currentDrinkProgress = 0; 
        this.currentStepIndex = 0; 
        this.poseIndex = 0; 
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
        if (this.state === 'walking_in') {
            this.x += (this.targetX - this.x) * 0.05;
            if (Math.abs(this.x - this.targetX) < 5) { this.state = 'waiting'; return 'arrived'; }
        } else if (this.state === 'walking_out') {
            this.x += (-400 - this.x) * 0.05;
            if (this.x < -300) return 'gone';
        }
        if (this.state === 'waiting') {
            this.patience -= 16;
            if (this.patience <= 0) return 'timeout';
        }
        return null;
    }
}

class Game {
    constructor() {
        this.started = false; this.score = 1250; this.lives = 3;
        this.customer = null; this.menuAnim = { y: -600 };
        this.activePour = { active: false, tapIndex: -1, spillTimer: 0 };
        this.notifications = new NotificationSystem();
        this.debugPos = { x: 0, y: 0 };
        
        this.initInput();
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    spawnCustomer() {
        if (this.customer) return;
        const rnd = Math.random();
        if (rnd > 0.9) {
            this.notifications.trigger("JUDGE INCOMING!", "#f00", 180);
            setTimeout(() => { this.customer = new Customer('judge'); }, 3000);
        } else {
            this.customer = new Customer('viking');
        }
    }

    handlePourInput(isDown, tapIndex) {
        if (!this.customer || this.customer.state !== 'waiting') return;
        if (isDown) {
            this.activePour.active = true; this.activePour.tapIndex = tapIndex;
        } else {
            this.activePour.active = false; this.activePour.spillTimer = 0;
            this.evaluatePour();
        }
    }

    updatePouring() {
        if (!this.activePour.active) return;
        const c = this.customer;
        if (c.type === 'karen') { c.currentDrinkProgress += 0.01; return; }

        const recipe = c.order[c.currentOrderIndex];
        const step = recipe.steps[c.currentStepIndex];

        if (this.activePour.tapIndex === step.tap) {
            c.currentDrinkProgress += 0.008; 
            if (c.currentDrinkProgress > step.limit + 0.1) {
                this.activePour.spillTimer = 20; 
                c.satisfaction -= 1; c.poseIndex = 2; // Angry
                if (c.satisfaction % 20 === 0) this.notifications.trigger("TRASH!", "#f00", 30);
            }
        }
    }

    evaluatePour() {
        const c = this.customer;
        if (c.type === 'karen') {
            if (c.currentDrinkProgress > 0.8) { this.completeOrder(Math.random() < 0.33); }
            return;
        }
        const recipe = c.order[c.currentOrderIndex];
        const step = recipe.steps[c.currentStepIndex];
        const lower = step.limit - 0.15; const upper = step.limit + 0.05; 

        if (c.currentDrinkProgress >= lower && c.currentDrinkProgress <= upper) {
            if (c.currentDrinkProgress >= step.limit - 0.02 && c.currentDrinkProgress <= step.limit + 0.02) {
                this.notifications.trigger("PERFECT POUR!", "#0f0");
                this.score += 50; c.poseIndex = 1; // Happy
            }
            if (c.currentStepIndex < recipe.steps.length - 1) { c.currentStepIndex++; } 
            else { this.finishDrink(true); }
        }
    }

    finishDrink(success) {
        const c = this.customer;
        if (success) {
            c.currentOrderIndex++; c.currentDrinkProgress = 0; c.currentStepIndex = 0;
            if (c.currentOrderIndex >= c.order.length) this.completeOrder(true);
        }
    }

    completeOrder(success) {
        if (success && this.customer.satisfaction > 0) {
            this.score += 50 * this.customer.order.length; this.customer.state = 'walking_out';
        } else {
            this.lives--; this.notifications.trigger("TRASH!", "#f00"); this.customer.state = 'walking_out'; 
        }
        
    }

    // --- DRAWING ---
    drawMenu() {
        const m = SPRITE_DATA.menu;
        const targetY = (this.customer && this.customer.state === 'waiting') ? m.targetY : -600;
        this.menuAnim.y += (targetY - this.menuAnim.y) * 0.1;
        if (assets.menu) {
            ctx.save(); ctx.translate(m.x, this.menuAnim.y);
            const mw = assets.menu.width * m.s; const mh = assets.menu.height * m.s;
            ctx.drawImage(assets.menu, -mw/2, -mh/2, mw, mh);
            if (this.customer) {
                ctx.fillStyle = "rgba(40,20,0,0.9)"; ctx.textAlign = "center";
                ctx.font = "bold 24px 'MedievalSharp', monospace";
                ctx.fillText("ORDER HERE:", 0, -60);
                const ord = this.customer.order; let startY = -20;
                if (this.customer.type === 'judge') {
                    ctx.font = "bold 20px 'MedievalSharp', monospace"; ctx.fillText("FLIGHT:", 0, startY); startY += 25;
                    ctx.font = "16px 'MedievalSharp', monospace";
                    ord.forEach((item, idx) => {
                        ctx.fillStyle = (idx === this.customer.currentOrderIndex) ? "#aa0000" : "#000";
                        ctx.fillText(item.name, 0, startY + (idx * 20));
                    });
                } else {
                    ctx.font = "bold 30px 'MedievalSharp', monospace"; ctx.fillText(ord[0].name, 0, 10);
                }
            }
            ctx.restore();
        }
    }

    drawTower() {
        // DRAW 3 INDEPENDENT TOWERS FROM THE SPRITE SHEET
        if (assets.tower && SPRITE_DATA.towers_visual) {
            const towersData = SPRITE_DATA.towers_visual;
            const towerScale = towersData.s || 0.5;
            
            // Assume tower.png is split into 3 vertical columns (one for each tower style)
            let frameW = assets.tower.width / 3;
            let frameH = assets.tower.height;

            towersData.positions.forEach((t, idx) => {
                ctx.save();
                
                // EXACT GLOBAL X AND Y - NO MATH REQUIRED!
                ctx.translate(t.x, t.y);

                let srcX = idx * frameW; // Automatically picks Column 0, 1, or 2 based on the array position
                let drawW = frameW * towerScale;
                let drawH = frameH * towerScale;

                ctx.drawImage(assets.tower, 
                    srcX, 0, frameW, frameH, 
                    -drawW/2, -drawH, drawW, drawH
                );
                
                ctx.restore();
            });
        }

        // DRAW 3 INDEPENDENT TAPS
        if (assets.taps && SPRITE_DATA.taps_visual) {
            const tapsData = SPRITE_DATA.taps_visual;
            const tapScale = tapsData.s || 1.0;
            
            tapsData.positions.forEach((pos, idx) => {
                ctx.save();
                
                // EXACT GLOBAL X AND Y - NO MATH REQUIRED!
                ctx.translate(pos.x, pos.y);
                
                if (this.activePour.active && this.activePour.tapIndex === idx) {
                    ctx.rotate(Math.PI / 4); 
                }
                
                let frameW = assets.taps.width / 3;
                let frameH = assets.taps.height;
                let srcX = (pos.clip && pos.clip.sw > 0) ? pos.clip.sx : 0; if (srcX < 0) srcX = 0;
                
                let drawW = frameW * tapScale;
                let drawH = frameH * tapScale;
                
                ctx.drawImage(assets.taps, 
                    srcX, 0, frameW, frameH, 
                    -drawW/2, 0, drawW, drawH 
                );

                // DRAW SPILL
                if (this.activePour.active && this.activePour.tapIndex === idx && this.activePour.spillTimer > 0) {
                    if (assets.spill) {
                        const sp = SPRITE_DATA.spills[idx];
                        let spW = (sp.clip && sp.clip.sw > 0) ? sp.clip.sw : assets.spill.width;
                        let spH = (sp.clip && sp.clip.sh > 0) ? sp.clip.sh : assets.spill.height;
                        let spX = (sp.clip && sp.clip.sw > 0) ? sp.clip.sx : 0; if (spX < 0) spX = 0;

                        let spillDrawW = spW * sp.s * tapScale;
                        let spillDrawH = spH * sp.s * tapScale;

                        // Spill uses simple pixel offsets from the Tap Handle
                        ctx.drawImage(assets.spill, 
                            spX, 0, spW, spH,
                            sp.x, sp.y, 
                            spillDrawW, spillDrawH
                        );
                    }
                }
                
                ctx.restore();
            });
        }
    }

    drawBeerLife(x, y, scale, isDead) {
        ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
        const glassColor = "#2d2419";
        const beerGrad = ctx.createLinearGradient(0, -50, 0, 50);
        beerGrad.addColorStop(0, "#FFD700"); beerGrad.addColorStop(1, "#FF8C00");

        ctx.lineWidth = 12; ctx.strokeStyle = glassColor; ctx.lineCap = "round";
        ctx.beginPath(); ctx.arc(50, 0, 45, -Math.PI/1.5, Math.PI/1.5); ctx.stroke(); 

        ctx.lineWidth = 8; ctx.fillStyle = isDead ? "rgba(255,255,255,0.1)" : "#f9fafb";
        ctx.beginPath(); ctx.moveTo(-50, -75); ctx.lineTo(50, -75); ctx.lineTo(45, 75); 
        ctx.quadraticCurveTo(45, 90, 30, 90); ctx.lineTo(-30, 90); ctx.quadraticCurveTo(-45, 90, -45, 75);
        ctx.closePath(); ctx.fill(); ctx.stroke();

        if (!isDead) {
            ctx.save(); ctx.beginPath();
            ctx.moveTo(-45, -70); ctx.lineTo(45, -70); ctx.lineTo(40, 75); ctx.lineTo(-40, 75);
            ctx.closePath(); ctx.clip();
            ctx.fillStyle = beerGrad; ctx.fillRect(-50, -70, 100, 150);
            
            ctx.fillStyle = "rgba(255,255,255,0.6)";
            const bTime = (Date.now() % 3000) / 3000;
            [-25, 0, 25, -15, 15].forEach((bx, i) => {
                const by = 80 - ((bTime + (i * 0.2)) % 1) * 140;
                ctx.beginPath(); ctx.arc(bx, by, 4, 0, Math.PI * 2); ctx.fill();
            });
            ctx.restore();

            ctx.fillStyle = "white"; 
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
            
            // TAP ZONES
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
        // --- ADD STEP B RIGHT HERE ---
        canvas.addEventListener('mousemove', (e) => {
            if (this.debugPos) this.debugPos = getPos(e);
        });
        canvas.addEventListener('touchmove', (e) => {
            if (this.debugPos) this.debugPos = getPos(e);
        }, { passive: true });
        // -----------------------------
    }

    draw() {
        this.updatePouring();
        this.notifications.update();
        
        // --- ADD THIS BLOCK ---
        if (this.customer) {
            const status = this.customer.update();
            
            if (status === 'timeout') {
                this.lives--;
                this.notifications.trigger("WALKED OUT!", "#f00");
                this.customer.state = 'walking_out';
            } else if (status === 'gone') {
                // Customer has fully walked off screen
                this.customer = null;
                this.spawnCustomer();
            }
        }
        // ----------------------
        
        ctx.fillStyle = "#000"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.save(); ctx.translate(screenOffset.x, screenOffset.y); ctx.scale(screenScale, screenScale);
        if (assets.bg) ctx.drawImage(assets.bg, 0, 0, WORLD.w, WORLD.h);
        
        // --- DRAW CUSTOMER (FIXED) ---
        if (this.customer && assets[this.customer.spriteId]) {
            const img = assets[this.customer.spriteId];
            const s = this.customer.scale;
            
            // SLICING LOGIC
            let frameW = (this.customer.clip.sw > 0) ? this.customer.clip.sw : (img.width / 3);
            let frameH = (this.customer.clip.sh > 0) ? this.customer.clip.sh : img.height;
            
            // SAFETY CHECK: Ensure sx is not negative for SOURCE clip
            let clipSX = this.customer.clip.sx;
            let destOffsetX = 0;

            // If sx is negative (from your calibration), use it as a destination offset instead of source clip
            if (clipSX < 0) {
                destOffsetX = clipSX;
                clipSX = 0; 
            }

            let srcX = clipSX + (this.customer.poseIndex * frameW);
            let srcY = this.customer.clip.sy;

            ctx.drawImage(img, 
                srcX, srcY, frameW, frameH, // Source
                this.customer.x - (frameW*s)/2 + destOffsetX, this.customer.y - frameH*s, // Destination (With Offset)
                frameW*s, frameH*s
            );
            
            if (this.customer.state === 'waiting') {
                const pct = this.customer.patience / this.customer.patienceMax;
                this.drawClock(this.customer.x, this.customer.y, pct);
                
                ctx.fillStyle = "white"; 
                ctx.fillRect(this.customer.x + 120, this.customer.y - 200, 20, -200 * this.customer.currentDrinkProgress);
                ctx.strokeStyle = "red"; 
                ctx.strokeRect(this.customer.x + 120, this.customer.y - 200, 20, -200);
            }
        }

        this.drawTower();
        this.drawMenu();

        const h = SPRITE_DATA.hud_elements;
        ctx.save(); ctx.textAlign = "right"; ctx.font = `bold ${Math.round(70 * h.score.s)}px "MedievalSharp"`;
        ctx.shadowColor = "black"; ctx.shadowBlur = 10; ctx.fillStyle = "#ffcc00";
        ctx.fillText(`GOLD: ${this.score}`, h.score.x, h.score.y);
        ctx.restore();

        for (let i = 0; i < 3; i++) {
            this.drawBeerLife(h.lives.x + (i * h.lives.spacing), h.lives.y, h.lives.s, i >= this.lives);
        }
        
        this.notifications.draw();

        // --- ADD STEP C RIGHT HERE ---
        ctx.save();
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(10, 10, 300, 60);
        ctx.fillStyle = "#0f0"; // Neon green
        ctx.font = "30px monospace";
        ctx.textAlign = "left";
        ctx.fillText(`X: ${Math.round(this.debugPos.x)}`, 20, 40);
        ctx.fillText(`Y: ${Math.round(this.debugPos.y)}`, 160, 40);

        ctx.strokeStyle = "#0f0";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.debugPos.x - 20, this.debugPos.y);
        ctx.lineTo(this.debugPos.x + 20, this.debugPos.y);
        ctx.moveTo(this.debugPos.x, this.debugPos.y - 20);
        ctx.lineTo(this.debugPos.x, this.debugPos.y + 20);
        ctx.stroke();
        ctx.restore();
        // -----------------------------
        
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
    let loaded = 0; 
    let failed = 0;
    const keys = Object.keys(ASSETS_PATHS);
    
    // Check if we have successfully processed all images (either loaded or failed)
    const checkComplete = () => {
        if (loaded + failed === keys.length) {
            console.log(`Loading complete. ${loaded} loaded, ${failed} failed.`);
            window.game = new Game();
            function loop() { window.game.draw(); requestAnimationFrame(loop); }
            loop();
        }
    };

    keys.forEach(k => {
        const img = new Image(); 
        
        img.onload = () => { 
            assets[k] = img; 
            loaded++;
            checkComplete();
        };
        
        // --- ADDED ERROR HANDLER ---
        img.onerror = () => {
            console.error(`❌ ERROR: Could not find image for '${k}' at path: ${ASSETS_PATHS[k]}`);
            failed++;
            checkComplete(); // Keep loading the rest of the game anyway!
        };
        
        img.src = ASSETS_PATHS[k];
    });
}
// Start the engine!
loadImages();
