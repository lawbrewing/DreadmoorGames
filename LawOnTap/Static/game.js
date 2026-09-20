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
    'hipster': { id: 'hipster', patience: 12000, orders: ['ipa'] }, 
    'regular': { id: 'regular', patience: 12000, orders: ['lager'] }, 
    'vip':     { id: 'vip',     patience: 20000, orders: ['all_pure', 'all_mixed'] }, 
    'karen':   { id: 'karen',   patience: 10000, orders: ['???'] }, 
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
    menu: { x: 170, targetY: 215, s: 0.40, textX: 0, textY: 0 },

    // Tap Hitboxes (Renamed to avoid conflict)
    taps_hitboxes: [
        { x: 0.2, w: 0.1 },
        { x: 0.5, w: 0.1 },
        { x: 0.8, w: 0.1 }
    ],

    // VISUAL DATA
    full_pints: {
        s: 0.25, // Global scale of the glass on the counter
        fillTweaks: [
            { x: 28, y: 0 }, // Tap 0 (Stout) liquid offset
            { x: 79, y: 0 }, // Tap 1 (IPA) liquid offset
            { x: 122, y: 0 }  // Tap 2 (Lager) liquid offset
        ],
        positions: [
            {
                x: 11, y: 880,
                clip: { sx: 0, sy: 0, sw: 0, sh: 0 } // Under Left Tap
            },
            {
                x: -11, y: 880,
                clip: { sx: 0, sy: 0, sw: 0, sh: 0 } // Under Middle Tap
            },
            {
                x: -50, y: 880,
                clip: { sx: 0, sy: 0, sw: 0, sh: 0 } // Under Right Tap
            }
        ]
    },

    half_pours: {
        fillTweaks: [
            { x: 0, y: 0 }, // Half Pour: Stout (Left Tap)
            { x: 0, y: 0 }, // Half Pour: IPA (Middle Tap)
            { x: 0, y: 0 }  // Half Pour: Lager (Right Tap)
        ]
    },
    mix_pours: {
        fillTweaks: [
            { x: 0, y: 0 }, // Mix Frame 0: Black & Tan (Lager bottom, Stout top)
            { x: 0, y: 0 }, // Mix Frame 1: Black & Bitter (IPA bottom, Stout top)
            { x: 0, y: 0 }  // Mix Frame 2: Lawnmower Hop (Lager bottom, IPA top)
        ]
    },
    // 3 INDEPENDENT TOWERS (Using exact Global X/Y)
    towers_visual: {
        s: 0.5, // Default scale for towers
        positions: [
            { x: 388, y: 1000, s: 0.5, clip: { sx: 0, sy: 0, sw: 0, sh: 0 } }, // Left Tower
            { x: 1025, y: 1000, s: 0.5, clip: { sx: 0, sy: 0, sw: 0, sh: 0 } }, // Middle Tower
            { x: 1662, y: 1000, s: 0.5, clip: { sx: 0, sy: 0, sw: 0, sh: 0 } }  // Right Tower
        ],
    },
    // 3 INDEPENDENT TAPS
    // 3 INDEPENDENT TAPS
    taps_visual: {
        s: .5,
        positions: [
            // Left Tap: 
            // Decrease X to pull left towards tower. Decrease Y to pull up.
            { x: 377, y: 85, openScale: .4, openRotation: Math.PI / 2, openOffset: { x: 180, y: 215 }, openClip: { sy: 40, trimH: 40 }, clip: { sx: 0, sy: 0, trimW: 0, trimH: 0 } },

            // Middle Tap: 180 deg (Good!)
            { x: 968, y: 89, openRotation: Math.PI, openOffset: { x: 0, y: 446 }, openClip: { sy: 40, trimH: 40 }, clip: { sx: 0, sy: 0, trimW: 0, trimH: 0 } },

            // Right Tap: 
            // Make X a smaller negative number (closer to 0) to pull right towards tower. Decrease Y to pull up.
            { x: 1576, y: 87, openScale: 0.4, openRotation: -Math.PI / 2, openOffset: { x: -182, y: 218 }, openClip: { sy: 40, trimH: 40 }, clip: { sx: 0, sy: 0, trimW: 0, trimH: 0 } }
        ],
    },

    // SPILLS (These are just offsets from the Tap Handle above them)
    // X: 0 means perfectly centered under the tap. Y: 300 means 300px below it.
    spills: [
        { x: -20, y: 350, s: .05, clip: { sx: 0, sy: 0, sw: 0, sh: 0 } },
        { x: 0, y: 350, s: .05, clip: { sx: 0, sy: 0, sw: 0, sh: 0 } },
        { x: 20, y: 350, s: .05, clip: { sx: 0, sy: 0, sw: 0, sh: 0 } }
    ],

    paddles: [
        { owner: 'judge', x: -300, y: 408, s: .16, clip: { sx: 0, sy: 0, sw: 0, sh: 0 } },
        { owner: 'vip', x: -270, y: 401, s: .16, clip: { sx: 0, sy: 0, sw: 0, sh: 0 } }
    ],

    customers: [
        {
            id: 'viking', name: "Viking",
            poses: [{
                x: 133, y: 960, s: .45, // Base properties
                clip: { sx: 0, sy: 0, sw: 809, sh: 0 },
                poseOffsets: [
                    { x: 0, y: 0 }, // 1 Key: Idle (Uses base properties)

                    // 2 Key: Happy (Smaller scale, custom slice width, custom starting pixel)
                    { x: 0, y: 0, s: .45, sw: 950, sx: 810 },

                    { x: 60, y: 0, s: .45, sw: 900, sx: 1850 }  // 3 Key: Angry 
                ]
            }]
        },
        { id: 'judge', name: "Judge", poses: [{ x: 692, y: 901, s: .39, clip: { sx: 0, sy: 0, sw: 0, sh: 0 } }] },
        { id: 'hipster', name: "Hipster", poses: [{ x: 696, y: 1066, s: .48, clip: { sx: 0, sy: 0, sw: 0, sh: 0 } }] },
        {
            id: 'regular', name: "regular",
            poses: [{
                x: 1196, y: 1042, s: .48,
                clip: { sx: 0, sy: 0, sw: 0, sh: 0 },
                poseOffsets: [
                    { x: 0, y: 0 },         // 1 Key: Idle (Explicit defaults)
                    { x: 0, y:0 },         // 2 Key: Happy (Explicit defaults)
                    { x: 0, y: 0, sw: 900, sx: 1923 }       // 3 Key: Angry (Clean width + sx offset)
                ]
            }]
        },
        {
            id: 'vip', name: "VIP",
            poses: [{
                x: 1277, y: 939, s: .48,
                clip: { sx: 0, sy: 0, sw: 0, sh: 0 },
                poseOffsets: [
                    { x: 0, y: 0 }, // 1 Key: Idle (Uses base properties)

                    // 2 Key: Happy (No slice overrides, just pushed UP 20 pixels)
                    { x: 0, y: -30 },

                    // 3 Key: Angry (No slice overrides, pushed right 60px and UP 20px)
                    { x: 20, y: -60 }
                ]
            }]
        },
        { id: 'karen', name: "Karen", poses: [{ x: 709, y: 1088, s: .48, clip: { sx: 0, sy: 0, sw: 0, sh: 0 } }] }
    ]
}

const ASSETS_PATHS = {
    bg: 'assets/background.png', 
    tower: 'assets/tower.png', 
    taps: 'assets/taps.png',
    menu: 'assets/menu.png',
    hud_sheet: 'assets/hud.png',
    viking: 'assets/viking.png', 
    judge: 'assets/judge.png',
    hipster: 'assets/hipster.png', // Added
    regular: 'assets/regular.png', // Added
    vip: 'assets/vip.png',         // Added
    karen: 'assets/karen.png',     // Added
    spill: 'assets/spill.png', 
    paddles: 'assets/paddles.png',
    fullpints: 'assets/fullpints.png',
    mixpour: 'assets/mixpour.png',   // Added
    halfpour: 'assets/halfpour.png'
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
        this.clip = poseData.clip || { sx: 0, sy: 0, sw: 0, sh: 0 };
        this.poseOffsets = poseData.poseOffsets || null;

        // --- RANDOM SPAWN LOGIC ---
        // 50% chance to spawn on the left or the right side of the screen
        const spawnRight = Math.random() > 0.5;
        this.startX = spawnRight ? WORLD.w + 300 : -300;
        this.x = this.startX;

        // When they leave, walk towards the closest edge of the screen
        this.exitX = (this.targetX > WORLD.w / 2) ? WORLD.w + 300 : -300;

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
            for (let i = 0; i < 3; i++) flight.push(RECIPES[keys[Math.floor(Math.random() * keys.length)]]);
            return flight;
        }
        const possible = CUSTOMER_TYPES[typeKey].orders;
        if (possible[0] === 'all_pure') return [RECIPES[['stout', 'ipa', 'lager'][Math.floor(Math.random() * 3)]]];
        if (possible[0] === 'all_mixed') return [RECIPES[['black_tan', 'black_bitter', 'lawnmower'][Math.floor(Math.random() * 3)]]];
        return [RECIPES[possible[0]]];
    }

    update() {
        const walkSpeed = 8; // Lower number = slower walk. Higher number = faster walk.

        if (this.state === 'walking_in') {
            // Move steadily towards targetX regardless of which side they spawned on
            if (this.x < this.targetX) {
                this.x += walkSpeed;
                if (this.x >= this.targetX) {
                    this.x = this.targetX;
                    this.state = 'waiting';
                    return 'arrived';
                }
            } else {
                this.x -= walkSpeed;
                if (this.x <= this.targetX) {
                    this.x = this.targetX;
                    this.state = 'waiting';
                    return 'arrived';
                }
            }
        } else if (this.state === 'walking_out') {
            // Move steadily towards their exit side
            if (this.x < this.exitX) {
                this.x += walkSpeed;
                if (this.x >= this.exitX) return 'gone';
            } else {
                this.x -= walkSpeed;
                if (this.x <= this.exitX) return 'gone';
            }
        }

        if (this.state === 'waiting') {
            this.patience -= 16;
            if (this.patience <= 0) {
                this.poseIndex = 2; // Switch to Angry pose on timeout!
                return 'timeout';
            }
        }
        return null;
    }
}

class Game {
    constructor() {
        this.started = false; this.score = 1250; this.lives = 3;
        this.customer = null; this.menuAnim = { y: -600 };

        // 👇 ADD slideProgress: 0 HERE
        this.activePour = { active: false, tapIndex: -1, spillTimer: 0, slideProgress: 0 };

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
            // 10% chance for the Boss (Judge)
            this.notifications.trigger("JUDGE INCOMING!", "#f00", 180);
            setTimeout(() => { this.customer = new Customer('judge'); }, 3000);
        } else {
            // 90% chance to pick a random standard customer
            const standardPool = ['viking', 'hipster', 'regular', 'vip', 'karen'];
            const randomType = standardPool[Math.floor(Math.random() * standardPool.length)];
            
            this.customer = new Customer(randomType);
            this.activePour.tapIndex = -1;
            this.activePour.slideProgress = 0;
        }
    }

    handlePourInput(isDown, tapIndex) {
        if (!this.customer || this.customer.state !== 'waiting') return;
        if (isDown) {
            this.activePour.active = true;

            // Only trigger the 3D slide-in if they clicked a DIFFERENT tap
            if (this.activePour.tapIndex !== tapIndex) {
                this.activePour.slideProgress = 0;
            }
            this.activePour.tapIndex = tapIndex;
        } else {
            this.activePour.active = false;
            this.activePour.spillTimer = 0;
            // 👇 REMOVED the slideProgress reset from here so it stays on the counter!
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
            this.score += 50 * this.customer.order.length;
            this.customer.poseIndex = 1; // Force Happy Face
            this.customer.state = 'walking_out';
        } else {
            this.lives--;
            this.notifications.trigger("TRASH!", "#f00");
            this.customer.poseIndex = 2; // Force Angry Face
            this.customer.state = 'walking_out';
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
        // 1. DRAW 3 INDEPENDENT TOWERS FROM THE SPRITE SHEET
        if (assets.tower && SPRITE_DATA.towers_visual) {
            const towersData = SPRITE_DATA.towers_visual;
            const towerScale = towersData.s || 0.5;

            let frameW = assets.tower.width / 3;
            let frameH = assets.tower.height;

            towersData.positions.forEach((t, idx) => {
                ctx.save();
                ctx.translate(t.x, t.y);

                let srcX = idx * frameW;
                let drawW = frameW * towerScale;
                let drawH = frameH * towerScale;

                ctx.drawImage(assets.tower,
                    srcX, 0, frameW, frameH,
                    -drawW / 2, -drawH, drawW, drawH
                );

                ctx.restore();
            });
        }

        // 2. DRAW 3 INDEPENDENT TAPS (2 Rows x 3 Columns)
        if (assets.taps && SPRITE_DATA.taps_visual) {
            const tapsData = SPRITE_DATA.taps_visual;
            const tapScale = tapsData.s || 1.0;

            // Base automatic grid math
            let baseFrameW = assets.taps.width / 3;
            let baseFrameH = assets.taps.height / 2;

            tapsData.positions.forEach((pos, idx) => {
                ctx.save(); // Global save for this tap station
                ctx.translate(pos.x, pos.y);

                let isPouring = (this.activePour.active && this.activePour.tapIndex === idx);

                // --- DRAW THE TAP HANDLE ---
                ctx.save();

                if (isPouring) {
                    if (pos.openOffset) {
                        ctx.translate(pos.openOffset.x, pos.openOffset.y);
                    }
                    if (pos.openRotation !== undefined) {
                        ctx.rotate(pos.openRotation);
                    }
                }

                // SWAP CLIPS BASED ON STATE! 
                // If pouring, use openClip. If not, use standard clip.
                let activeClip = (isPouring && pos.openClip) ? pos.openClip : (pos.clip || {});

                let clipSX = activeClip.sx || 0;
                let clipSY = activeClip.sy || 0;
                let trimW = activeClip.trimW || 0;
                let trimH = activeClip.trimH || 0;

                let srcX = (idx * baseFrameW) + clipSX;
                let srcY = (isPouring ? baseFrameH : 0) + clipSY;

                // Apply the trims
                let finalFrameW = baseFrameW - trimW;
                let finalFrameH = baseFrameH - trimH;

                // ADDED: Check if we are pouring AND if a custom openScale exists
                let activeScale = (isPouring && pos.openScale) ? pos.openScale : tapScale;

                // Use the activeScale instead of the default tapScale
                let drawW = finalFrameW * activeScale;
                let drawH = finalFrameH * activeScale;

                ctx.drawImage(assets.taps,
                    srcX, srcY, finalFrameW, finalFrameH,
                    -drawW / 2, 0, drawW, drawH
                );

                ctx.restore();
                // -----------------------------

                // --- 3D COUNTER PINT DROP-IN & FILLING ---
                if (assets.fullpints && SPRITE_DATA.full_pints) {
                    const fpData = SPRITE_DATA.full_pints;
                    const pintPos = fpData.positions[idx];
                    const pintScale = fpData.s || 0.45;

                    let baseFPW = Math.floor(assets.fullpints.width / 4);
                    let baseFPH = assets.fullpints.height;

                    // 👇 CHANGED: The glass now belongs to whatever tap was LAST clicked
                    let isGlassHere = (this.activePour.tapIndex === idx && this.customer && this.customer.state === 'waiting');

                    if (isGlassHere) { // 👇 CHANGED condition
                        // Slightly slower progress increment to let the eye catch the 3D motion
                        if (this.activePour.slideProgress < 1.0) {
                            this.activePour.slideProgress = Math.min(1.0, this.activePour.slideProgress + 0.12);
                        }

                        // Ease-out curve: Starts fast, slows down right as it hits the counter
                        let p = this.activePour.slideProgress;
                        let easeOut = 1 - (1 - p) * (1 - p);

                        ctx.save();
                        let targetX = pintPos.x;
                        let targetY = pintPos.y;

                        // 3D EFFECT PARAMETERS
                        // Start huge (3x scale), originating from the bottom-center of the screen
                        let startScale = pintScale * 3.5;
                        let startX = 1920 / 2; // Center of the screen
                        let startY = targetY + 600; // Deep off the bottom edge

                        // Interpolate current values based on the easing curve
                        let currentScale = startScale + (pintScale - startScale) * easeOut;
                        let currentX = startX + (targetX - startX) * easeOut;
                        let currentY = startY + (targetY - startY) * easeOut;

                        let drawFPW = baseFPW * currentScale;
                        let drawFPH = baseFPH * currentScale;
                        let drawX = currentX - drawFPW / 2;
                        let drawY = currentY - drawFPH;

                        // 1. DRAW FRAME 0 (The 3D Sliding Empty Glass Base)
                        ctx.drawImage(assets.fullpints,
                            0, 0, baseFPW, baseFPH,
                            drawX, drawY, drawFPW, drawFPH
                        );

                        // 2. DYNAMICALLY FILL THE LIQUID WITH NUDGE OFFSETS & MIXES
                        if (this.customer) {
                            let drinkProgress = Math.min(this.customer.currentDrinkProgress, 1.0);

                            // Default to full pint logic
                            let activeLiquidAsset = assets.fullpints;
                            let liquidFrames = 4;
                            let targetFrameIdx = idx + 1; // 1=Stout, 2=IPA, 3=Lager

                            // Default to the fullpints tweak array
                            let activeTweaks = fpData.fillTweaks;
                            let tweakIdx = idx;

                            // Check if the current order is a multi-step mixed drink
                            const recipeObj = this.customer.order[this.customer.currentOrderIndex];

                            if (recipeObj && recipeObj.steps && recipeObj.steps.length > 1) {
                                // Find the dictionary key for this recipe to easily map it
                                const recipeKey = Object.keys(RECIPES).find(key => RECIPES[key].name === recipeObj.name);

                                if (this.customer.currentStepIndex === 0) {
                                    // STEP 1: Pouring the first half. Use halfpour sheet.
                                    if (assets.halfpour) {
                                        activeLiquidAsset = assets.halfpour;
                                        liquidFrames = 3;
                                        targetFrameIdx = idx; // 0=Stout, 1=IPA, 2=Lager

                                        // Swap to half_pours tweaks
                                        if (SPRITE_DATA.half_pours) {
                                            activeTweaks = SPRITE_DATA.half_pours.fillTweaks;
                                            tweakIdx = targetFrameIdx;
                                        }
                                    }
                                } else {
                                    // STEP 2: Pouring the second half. Use mixpour sheet.
                                    if (assets.mixpour) {
                                        activeLiquidAsset = assets.mixpour;
                                        liquidFrames = 3;
                                        if (recipeKey === 'black_tan') targetFrameIdx = 0;
                                        else if (recipeKey === 'black_bitter') targetFrameIdx = 1;
                                        else if (recipeKey === 'lawnmower') targetFrameIdx = 2;

                                        // Swap to mix_pours tweaks
                                        if (SPRITE_DATA.mix_pours) {
                                            activeTweaks = SPRITE_DATA.mix_pours.fillTweaks;
                                            tweakIdx = targetFrameIdx;
                                        }
                                    }
                                }
                            }

                            // Calculate dynamic slice width based on the active sprite sheet
                            let liqBaseW = Math.floor(activeLiquidAsset.width / liquidFrames);
                            let liqBaseH = activeLiquidAsset.height;

                            // Grab the custom tweaks and scale them to match the current 3D size
                            let tweakXScreen = 0;
                            let tweakYScreen = 0;
                            if (activeTweaks && activeTweaks[tweakIdx]) {
                                tweakXScreen = activeTweaks[tweakIdx].x * currentScale;
                                tweakYScreen = activeTweaks[tweakIdx].y * currentScale;
                            }

                            ctx.save();
                            ctx.beginPath();
                            // Shift BOTH the clipping mask and the liquid bounding box together
                            ctx.rect(
                                drawX + tweakXScreen,
                                drawY + tweakYScreen + (drawFPH * (1 - drinkProgress)),
                                drawFPW,
                                drawFPH * drinkProgress
                            );
                            ctx.clip();

                            // Draw the filled glass shifted perfectly to match the mask
                            ctx.drawImage(activeLiquidAsset,
                                targetFrameIdx * liqBaseW, 0, liqBaseW, liqBaseH,
                                drawX + tweakXScreen, drawY + tweakYScreen, drawFPW, drawFPH
                            );
                            ctx.restore();
                        }
                        ctx.restore();
                    }
                }
                // ----------------------------------------------

                // --- DRAW THE SPILL ---
                if (isPouring && this.activePour.spillTimer > 0) {
                    if (assets.spill) {
                        const sp = SPRITE_DATA.spills[idx];
                        let spW = (sp.clip && sp.clip.sw > 0) ? sp.clip.sw : assets.spill.width;
                        let spH = (sp.clip && sp.clip.sh > 0) ? sp.clip.sh : assets.spill.height;
                        let spX = (sp.clip && sp.clip.sw > 0) ? sp.clip.sx : 0;

                        let spillDrawW = spW * sp.s * tapScale;
                        let spillDrawH = spH * sp.s * tapScale;

                        ctx.drawImage(assets.spill,
                            spX, 0, spW, spH,
                            sp.x, sp.y,
                            spillDrawW, spillDrawH
                        );
                    }
                }
                // -----------------------------

                ctx.restore(); // End global save for this tap station
            });
        }
    }
    drawBeerLife(x, y, scale, isDead, progress = 1.0) {
        ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
        const glassColor = "#2d2419";

        // Change color to red when running low (< 30%)
        const beerGrad = ctx.createLinearGradient(0, -50, 0, 50);
        if (progress > 0.3) {
            beerGrad.addColorStop(0, "#FFD700"); beerGrad.addColorStop(1, "#FF8C00");
        } else {
            beerGrad.addColorStop(0, "#ff3333"); beerGrad.addColorStop(1, "#990000");
        }

        ctx.lineWidth = 12; ctx.strokeStyle = glassColor; ctx.lineCap = "round";
        ctx.beginPath(); ctx.arc(50, 0, 45, -Math.PI / 1.5, Math.PI / 1.5); ctx.stroke();

        ctx.lineWidth = 8; ctx.fillStyle = isDead ? "rgba(255,255,255,0.1)" : "#f9fafb";
        ctx.beginPath(); ctx.moveTo(-50, -75); ctx.lineTo(50, -75); ctx.lineTo(45, 75);
        ctx.quadraticCurveTo(45, 90, 30, 90); ctx.lineTo(-30, 90); ctx.quadraticCurveTo(-45, 90, -45, 75);
        ctx.closePath(); ctx.fill(); ctx.stroke();

        if (!isDead) {
            ctx.save(); ctx.beginPath();
            ctx.moveTo(-45, -70); ctx.lineTo(45, -70); ctx.lineTo(40, 75); ctx.lineTo(-40, 75);
            ctx.closePath(); ctx.clip();

            // --- DRAIN BASED ON PROGRESS ---
            let fillHeight = 150 * progress;
            let fillY = 75 - fillHeight;
            ctx.fillStyle = beerGrad;
            ctx.fillRect(-50, fillY, 100, fillHeight);

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
                this.customer.poseIndex = 2; // Ensure they stay angry while walking out
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
            let tweakX = 0;
            let tweakY = 0;
            let customSW = null;
            let customSX = null;
            let customScale = s;

            if (this.customer.poseOffsets && this.customer.poseOffsets[this.customer.poseIndex]) {
                let pOffset = this.customer.poseOffsets[this.customer.poseIndex];
                tweakX = pOffset.x || 0;
                tweakY = pOffset.y || 0;
                if (pOffset.sw !== undefined) customSW = pOffset.sw;
                if (pOffset.sx !== undefined) customSX = pOffset.sx;
                if (pOffset.s !== undefined) customScale = pOffset.s;
            }

            let baseFrameW = (this.customer.clip.sw > 0) ? this.customer.clip.sw : Math.floor(img.width / 3);
            let frameW = (customSW !== null) ? customSW : baseFrameW;
            let frameH = (this.customer.clip.sh > 0) ? this.customer.clip.sh : img.height;

            let srcX;
            let destOffsetX = 0;

            if (customSX !== null) {
                srcX = customSX;
            } else {
                let clipSX = this.customer.clip.sx;
                if (clipSX < 0) {
                    destOffsetX = clipSX;
                    clipSX = 0;
                }
                srcX = clipSX + (this.customer.poseIndex * baseFrameW);
            }
            let srcY = this.customer.clip.sy;

            // --- THE INDIE WADDLE & FLIP ---
            ctx.save();

            let yBob = 0;
            let rotation = 0;
            let isFlipped = false;
            let isLeftFacing = (this.customer.spriteId === 'vip');
            let movingRight = false;

            if (this.customer.state === 'walking_in') {
                movingRight = (this.customer.startX < this.customer.targetX);
                yBob = Math.abs(Math.sin(Date.now() / 150)) * -8;
                rotation = Math.sin(Date.now() / 150) * 0.05;
                isFlipped = movingRight ? isLeftFacing : !isLeftFacing;
            } else if (this.customer.state === 'waiting') {
                // EVERYONE faces right while waiting at the destination counter!
                isFlipped = isLeftFacing; // Flips left-facing sprites right. Leaves right-facing sprites alone.
                yBob = 0;
                rotation = 0;
            } else if (this.customer.state === 'walking_out') {
                movingRight = (this.customer.exitX > this.customer.x);
                yBob = Math.abs(Math.sin(Date.now() / 150)) * -8;
                rotation = Math.sin(Date.now() / 150) * 0.05;
                isFlipped = movingRight ? isLeftFacing : !isLeftFacing;
            }

            // Move the canvas directly to the character's feet
            ctx.translate(this.customer.x, this.customer.y + yBob);
            ctx.rotate(rotation);
            if (isFlipped) ctx.scale(-1, 1);

            // Draw the image relative to their feet!
            ctx.drawImage(img,
                srcX, srcY, frameW, frameH,
                -(frameW * customScale) / 2 + destOffsetX + tweakX, // Shift left by half width
                -frameH * customScale + tweakY,                     // Shift up by full height
                frameW * customScale, frameH * customScale
            );

            ctx.restore();
            // ---------------------------------

            
        }

        this.drawTower();
        this.drawMenu();

        const h = SPRITE_DATA.hud_elements;
        ctx.save(); ctx.textAlign = "right"; ctx.font = `bold ${Math.round(70 * h.score.s)}px "MedievalSharp"`;
        ctx.shadowColor = "black"; ctx.shadowBlur = 10; ctx.fillStyle = "#ffcc00";
        ctx.fillText(`GOLD: ${this.score}`, h.score.x, h.score.y);
        ctx.restore();

        for (let i = 0; i < 3; i++) {
            let isDead = i >= this.lives;
            let patiencePct = 1.0;

            // If this life slot is our current health point AND a customer is waiting, make it the timer!
            if (!isDead && this.customer && this.customer.state === 'waiting' && i === this.lives - 1) {
                patiencePct = this.customer.patience / this.customer.patienceMax;
            }

            this.drawBeerLife(h.lives.x + (i * h.lives.spacing), h.lives.y, h.lives.s, isDead, patiencePct);
        }
        
        this.notifications.draw();

        
        
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

// ==========================================
// TEMPORARY TESTING TOOLS
// ==========================================
window.addEventListener('keydown', (e) => {
    if (!window.game || !window.game.customer) return;

    // POSE OVERRIDES
    if (e.key === '1') window.game.customer.poseIndex = 0; // Idle
    if (e.key === '2') window.game.customer.poseIndex = 1; // Happy
    if (e.key === '3') window.game.customer.poseIndex = 2; // Angry

    // RECIPE OVERRIDES FOR VISUAL TWEAKING
    if (e.key === '4') {
        window.game.customer.order = [RECIPES['black_tan']];
        window.game.customer.currentOrderIndex = 0;
        window.game.customer.currentStepIndex = 0;
        window.game.customer.currentDrinkProgress = 0;
        console.log("TESTING: Black & Tan (Lager bottom, Stout top)");
    }
    if (e.key === '5') {
        window.game.customer.order = [RECIPES['lawnmower']];
        window.game.customer.currentOrderIndex = 0;
        window.game.customer.currentStepIndex = 0;
        window.game.customer.currentDrinkProgress = 0;
        console.log("TESTING: Lawnmower Hop (Lager bottom, IPA top)");
    }
    if (e.key === '6') {
        window.game.customer.order = [RECIPES['black_bitter']];
        window.game.customer.currentOrderIndex = 0;
        window.game.customer.currentStepIndex = 0;
        window.game.customer.currentDrinkProgress = 0;
        console.log("TESTING: Black & Bitter (IPA bottom, Stout top)");
    }
});