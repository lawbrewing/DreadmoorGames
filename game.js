// ==========================================
// 1. SETUP & UTILS
// ==========================================
// Inject CSS for mobile stability (Monolithic approach)
const style = document.createElement('style');
style.textContent = `
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #000; }
    /* THE FIX: Forced width/height here ensures it fills the screen immediately */
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
// TAPS: 0=Stout (Left), 1=IPA (Mid), 2=Lager (Right)
const TAPS = { STOUT: 0, IPA: 1, LAGER: 2 };

const RECIPES = {
    'stout': { name: "STOUT", steps: [{ tap: TAPS.STOUT, limit: 1.0 }] },
    'ipa':   { name: "IPA",   steps: [{ tap: TAPS.IPA,   limit: 1.0 }] },
    'lager': { name: "LAGER", steps: [{ tap: TAPS.LAGER, limit: 1.0 }] },
    // Mixed Drinks (2 Steps: Base 50%, Topper 100%)
    'black_tan':    { name: "BLACK & TAN", steps: [{ tap: TAPS.LAGER, limit: 0.5 }, { tap: TAPS.STOUT, limit: 1.0 }] },
    'black_bitter': { name: "BLACK & BITTER", steps: [{ tap: TAPS.IPA,   limit: 0.5 }, { tap: TAPS.STOUT, limit: 1.0 }] },
    'lawnmower':    { name: "LAWNMOWER HOP", steps: [{ tap: TAPS.LAGER, limit: 0.5 }, { tap: TAPS.IPA,   limit: 1.0 }] }
};

const CUSTOMER_TYPES = {
    'viking':  { id: 'viking',  patience: 15000, orders: ['stout'] },
    'hipster': { id: 'viking',  patience: 12000, orders: ['ipa'] }, // Placeholder sprite
    'regular': { id: 'viking',  patience: 12000, orders: ['lager'] }, // Placeholder sprite
    'vip':     { id: 'judge',   patience: 20000, orders: ['all_pure', 'all_mixed'] }, // Placeholder
    'karen':   { id: 'judge',   patience: 10000, orders: ['???'] }, // Placeholder
    'judge':   { id: 'judge',   patience: 25000, orders: ['flight'] }
};

let SPRITE_DATA = {
    hud_elements: {
        score: { x: 1871, y: 76, s: .85 },
        lives: { x: 1624, y: 172, s: 0.5, spacing: 100 },
        gameOver: { x: 969, y: 56, s: .45, visible: false },
        clock: { x: 0, y: -280, r: 50, width: 10 }
    },
    menu: { x: 218, targetY: 295, s: 0.60, textX: 0, textY: 0 },
    // Simplified hitboxes for taps (pct of screen width)
    taps: [
        { x: 0.2, w: 0.1 }, // Stout
        { x: 0.5, w: 0.1 }, // IPA
        { x: 0.8, w: 0.1 }  // Lager
    ]
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
// 3. GAME CLASSES
// ==========================================

class Customer {
    constructor(typeKey) {
        const type = CUSTOMER_TYPES[typeKey];
        this.type = typeKey;
        this.spriteId = type.id;
        this.x = -200; // Start offscreen
        this.targetX = 960; // Center bar
        this.y = 900; 
        this.state = 'walking_in'; // walking_in, ordering, waiting, drinking, walking_out
        
        this.patienceMax = type.patience;
        this.patience = this.patienceMax;
        
        this.satisfaction = 100; // Starts full, drops on mistakes
        this.order = this.generateOrder(typeKey);
        
        // For flights/mixing
        this.currentOrderIndex = 0; 
        this.currentDrinkProgress = 0; // 0.0 to 1.0
        this.currentStepIndex = 0; // For mixed drinks
    }

    generateOrder(typeKey) {
        // Logic to build the order array based on rules
        if (typeKey === 'karen') return [{ name: "???", recipe: null }];
        
        if (typeKey === 'judge') {
            // Generate Flight: 3 random items (Pure or Mixed)
            const keys = Object.keys(RECIPES);
            let flight = [];
            // Simplified logic: ensure no duplicates logic would go here
            for(let i=0; i<3; i++) flight.push(RECIPES[keys[Math.floor(Math.random()*keys.length)]]);
            return flight;
        }

        // Regulars
        const possible = CUSTOMER_TYPES[typeKey].orders;
        const choice = possible[0] === 'all_pure' ? ['stout','ipa','lager'][Math.floor(Math.random()*3)] : possible[0];
        return [RECIPES[choice]];
    }

    update() {
        if (this.state === 'walking_in') {
            this.x += (this.targetX - this.x) * 0.05;
            if (Math.abs(this.x - this.targetX) < 5) {
                this.state = 'ordering';
                return 'arrived';
            }
        }
        if (this.state === 'waiting') {
            this.patience -= 16; // ~16ms per frame
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
        this.level = 1;

        // Core Systems
        this.customer = null; // Active customer (Single queue for now)
        this.menuAnim = { y: -600, targetY: SPRITE_DATA.menu.targetY };
        this.activePour = { active: false, tapIndex: -1, volume: 0 };
        this.gameOverAnim = { currentY: -600, speed: 0 };
        
        // HUD Lab
        this.labMode = 'none';
        this.editTarget = 'score';

        this.initInput();
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    // --- GAMEPLAY LOGIC ---

    spawnCustomer() {
        if (this.customer) return;
        // Simple Logic: mostly Vikings, rare Judges
        const rnd = Math.random();
        let type = 'viking'; 
        if (rnd > 0.9) type = 'judge';
        else if (rnd > 0.8) type = 'karen';
        
        this.customer = new Customer(type);
    }

    handlePourInput(isDown, tapIndex) {
        if (!this.customer || this.customer.state !== 'waiting') return;
        
        if (isDown) {
            this.activePour.active = true;
            this.activePour.tapIndex = tapIndex;
        } else {
            this.activePour.active = false;
            // Check Pour Result on Release
            this.evaluatePour();
        }
    }

    updatePouring() {
        if (!this.activePour.active) return;
        
        const c = this.customer;
        const currentItem = c.order[c.currentOrderIndex];
        
        // KAREN LOGIC: Player pours whatever, we track generic volume
        if (c.type === 'karen') {
            c.currentDrinkProgress += 0.01; // Fill speed
            return;
        }

        // STANDARD LOGIC
        const recipe = currentItem;
        const step = recipe.steps[c.currentStepIndex];

        // Wrong Tap?
        if (this.activePour.tapIndex !== step.tap) {
            // Instant Fail/Penalty logic here
            // For now, just don't fill
            return;
        }

        // Fill
        c.currentDrinkProgress += 0.008; // Fill Speed

        // Check Overflow (Spill)
        if (c.currentDrinkProgress > step.limit + 0.1) {
            // Trigger Spill Penalty
            c.satisfaction -= 25;
            // Reset this step? Or ruin drink?
        }
    }

    evaluatePour() {
        const c = this.customer;
        // Karen Logic
        if (c.type === 'karen') {
            if (c.currentDrinkProgress > 0.8) {
                this.completeOrder(Math.random() < 0.33);
            }
            return;
        }

        const recipe = c.order[c.currentOrderIndex];
        const step = recipe.steps[c.currentStepIndex];
        
        // Target Window
        const lower = step.limit - 0.15; // 15% tolerance
        const upper = step.limit + 0.05; // 5% overfill allowed

        if (c.currentDrinkProgress >= lower && c.currentDrinkProgress <= upper) {
            // Success Step
            if (c.currentStepIndex < recipe.steps.length - 1) {
                // Move to next step (Mixed Drink)
                c.currentStepIndex++;
                // Note: Don't reset progress, it keeps filling
            } else {
                // Drink Complete
                this.finishDrink(true);
            }
        } else if (c.currentDrinkProgress < lower) {
            // Underpour - Player let go too early
            // In a real game, they can hold again to top off. 
            // Logic stays 'waiting'
        }
    }

    finishDrink(success) {
        const c = this.customer;
        if (success) {
            // Check Flight Progress
            c.currentOrderIndex++;
            c.currentDrinkProgress = 0;
            c.currentStepIndex = 0;

            if (c.currentOrderIndex >= c.order.length) {
                this.completeOrder(true);
            }
        }
    }

    completeOrder(success) {
        if (success && this.customer.satisfaction > 0) {
            this.score += 50 * this.customer.order.length;
            this.customer.state = 'walking_out';
        } else {
            this.lives--;
            this.customer.state = 'walking_out'; // Or Angry anim
        }
        
        // Reset Logic after delay
        setTimeout(() => { 
            this.customer = null; 
            this.spawnCustomer(); 
        }, 2000);
    }

    // --- DRAWING METHODS ---

    drawMenu() {
        const m = SPRITE_DATA.menu;
        // Physics for Menu Drop
        const targetY = (this.customer && this.customer.state === 'waiting') ? m.targetY : -600;
        this.menuAnim.y += (targetY - this.menuAnim.y) * 0.1;

        if (assets.menu) {
            ctx.save();
            ctx.translate(m.x, this.menuAnim.y);
            const mw = assets.menu.width * m.s;
            const mh = assets.menu.height * m.s;
            ctx.drawImage(assets.menu, -mw/2, -mh/2, mw, mh);

            // TEXT RENDERING
            if (this.customer) {
                ctx.fillStyle = "rgba(40,20,0,0.9)";
                ctx.textAlign = "center";
                ctx.font = "bold 24px 'Courier New'";
                
                // Header
                ctx.fillText("ORDER HERE:", 0, -60);
                
                // Order List
                const ord = this.customer.order;
                let startY = -20;
                
                if (this.customer.type === 'judge') {
                    ctx.font = "bold 20px 'Courier New'";
                    ctx.fillText("FLIGHT:", 0, startY);
                    startY += 25;
                    // Draw Flight Items
                    ctx.font = "16px 'Courier New'";
                    ord.forEach((item, idx) => {
                        ctx.fillStyle = (idx === this.customer.currentOrderIndex) ? "#aa0000" : 
                                      (idx < this.customer.currentOrderIndex) ? "#555" : "#000";
                        if (idx < this.customer.currentOrderIndex) {
                            // Strikeout logic would go here
                        }
                        ctx.fillText(item.name, 0, startY + (idx * 20));
                    });
                } else {
                    // Single Item
                    ctx.font = "bold 30px 'Courier New'";
                    ctx.fillText(ord[0].name, 0, 10);
                }
            }
            ctx.restore();
        }
    }

    // ... [Insert drawBeerLife / drawClock / drawHUD from previous prompt] ...
    // Note: I will use the code from the previous "Final positioning" prompt for these.

    drawBeerLife(x, y, scale, isDead) {
        // (Use the translated SVG code provided previously)
        // ... Code Omitted for brevity, will be included in full file ...
        ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
        // ... implementation ...
        ctx.restore();
    }
    
    // ... [Input Handling for Taps] ...
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
            
            // HUD Lab Logic
            if (this.labMode !== 'none') { /* ... move logic ... */ return; }

            // GAMEPLAY INPUT (TAPS)
            // Tap zones: Left (0), Mid (1), Right (2)
            const w = 1920;
            if (pos.y > 400 && pos.y < 900) {
                if (pos.x < w * 0.33) this.handlePourInput(true, 0); // Stout
                else if (pos.x < w * 0.66) this.handlePourInput(true, 1); // IPA
                else this.handlePourInput(true, 2); // Lager
            }
        };

        const handleEnd = () => {
            this.handlePourInput(false, -1);
        };

        canvas.addEventListener('mousedown', handleStart);
        canvas.addEventListener('mouseup', handleEnd);
        canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleStart(e); });
        canvas.addEventListener('touchend', (e) => { e.preventDefault(); handleEnd(); });
        
        // Keep Lab Keys
        window.addEventListener('keydown', (e) => {
            // ... keys ...
        });
    }

    draw() {
        this.updatePouring();
        
        // Update Customer
        if (this.customer) {
            const status = this.customer.update();
            if (status === 'arrived') this.customer.state = 'waiting';
            if (status === 'timeout') this.completeOrder(false);
        }

        ctx.fillStyle = "#000"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.save(); 
        ctx.translate(screenOffset.x, screenOffset.y); 
        ctx.scale(screenScale, screenScale);
        
        if (assets.bg) ctx.drawImage(assets.bg, 0, 0, WORLD.w, WORLD.h);
        
        // Draw Customer
        if (this.customer && assets[this.customer.spriteId]) {
            const img = assets[this.customer.spriteId];
            const scale = 0.5; // Placeholder scale
            ctx.drawImage(img, this.customer.x - (img.width*scale)/2, this.customer.y - img.height*scale, img.width*scale, img.height*scale);
            
            // Draw Timer
            if (this.customer.state === 'waiting') {
                const pct = this.customer.patience / this.customer.patienceMax;
                // Use existing drawClock Logic
            }
            
            // DEBUG: Draw Fill Level
            ctx.fillStyle = "white";
            ctx.fillRect(this.customer.x + 100, this.customer.y - 300, 20, -200 * this.customer.currentDrinkProgress);
            ctx.strokeStyle = "red";
            ctx.strokeRect(this.customer.x + 100, this.customer.y - 300, 20, -200);
        }

        this.drawMenu();
        // Draw HUD (Score, Lives)
        
        ctx.restore();
    }

    resize() { /* ... */ }
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
