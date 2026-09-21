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
            { x: 62, y: -60 }, // Tap 0 (Left Tap) Location
            { x: 62, y: -60 }, // Tap 1 (Middle Tap) Location
            { x: 62, y: -60 }  // Tap 2 (Right Tap) Location
        ]
    },
    mix_pours: {
        fillTweaks: [
            { x: 70, y: -60 },    // Tap 0 (Left Tap) Location
            { x: 122, y: -60 },    // Tap 1 (Middle Tap) Location
            { x: 0, y: 0 }  // Tap 2 (Right Tap) Location
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

    paddles: {
        // Physical slice data (sx, sy, sw, sh) and mini-glass X-offsets for each flight size
        boards: {
            2: { x: -35, y: 900, s: .18, clip: { sx: 0, sy: 0, sw: 2000, sh: 330 }, slotsX: [-25, 65], slotY: 35, miniScale: 0.12 },
            3: { x: 50, y: 900, s: .18, clip: { sx: 0, sy: 330, sw: 3000, sh: 500 }, slotsX: [-120, -25, 70], slotY: 20, miniScale: 0.12 },
            4: { x: -10, y: 900, s: .18, clip: { sx: 0, sy: 500, sw: 2000, sh: 250 }, slotsX: [-50, 15, 80, 130], slotY: 15, miniScale: 0.1 },
            5: { x: -30, y: 900, s: .18, clip: { sx: 0, sy: 750, sw: 2300, sh: 400 }, slotsX: [-75, -10, 55, 105, 170], slotY: 20, miniScale: 0.1 }
        }
    },

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

class AudioEngine {
    constructor() {
        this.bgm = new Audio('assets/law_on_tap.mp3');
        this.bgm.loop = true;
        this.bgm.volume = 0.5; // Lowered base volume so SFX pop more
        this.targetVolume = 0.5;

        this.sfx = {
            perfect: new Audio('assets/perfectpour.mp3'),
            trash: new Audio('assets/trashpour.mp3'),
            judge: new Audio('assets/judgeenter.mp3'),
            gameover: new Audio('assets/gameover.mp3') // New game over track
        };
        this.duckTimeout = null;
    }

    startBGM() {
        this.bgm.play().catch(e => console.warn("BGM blocked until interaction:", e));
    }

    stopBGM() {
        this.bgm.pause();
        this.bgm.currentTime = 0; // Reset track to beginning
    }

    play(key, duckDuration = 1000, duckVolume = 0.1) {
        if (this.sfx[key]) {
            // 👇 FIX: Reset the original authorized track instead of cloning it!
            this.sfx[key].currentTime = 0;
            this.sfx[key].volume = 1.0;
            this.sfx[key].play().catch(e => console.warn("SFX blocked:", e));

            // If duckDuration is 0 (like the Judge), bypass ducking entirely
            if (duckDuration > 0) {
                this.bgm.volume = duckVolume;
                this.targetVolume = duckVolume;

                clearTimeout(this.duckTimeout);
                this.duckTimeout = setTimeout(() => {
                    this.targetVolume = 0.5; // Fade back to new base volume
                }, duckDuration);
            }
        }
    }

    update() {
        if (this.bgm.volume < this.targetVolume) {
            this.bgm.volume = Math.min(this.bgm.volume + 0.005, this.targetVolume);
        } else if (this.bgm.volume > this.targetVolume) {
            this.bgm.volume = Math.max(this.bgm.volume - 0.05, this.targetVolume);
        }
    }
}
class Customer {
    constructor(typeKey, currentLevel = 1) { // Accept the level
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
        this.order = this.generateOrder(typeKey, currentLevel);

        this.currentOrderIndex = 0;
        this.currentDrinkProgress = 0;
        this.currentStepIndex = 0;
        this.poseIndex = 0;
    }

    generateOrder(typeKey, level) {
        if (typeKey === 'karen') return [{ name: "???", recipe: null }];

        if (typeKey === 'judge') {
            // Scale flight size with level (Level 1 = 2 glasses, Level 4 = 5 glasses)
            let flightSize = Math.min(level + 1, 5);

            // Core standard pool
            let availableKeys = ['stout', 'ipa', 'lager'];

            // Allow mixed drinks in the Judge's pool only on Level 4 or higher
            if (level >= 4) {
                availableKeys.push('black_tan', 'black_bitter', 'lawnmower');
            }

            // 👇 SHUFFLE AND PICK UNIQUE DRINKS
            let flight = [];
            let tempPool = [...availableKeys];

            for (let i = 0; i < flightSize; i++) {
                if (tempPool.length === 0) break; // Failsafe
                let rndIdx = Math.floor(Math.random() * tempPool.length);
                // Remove the chosen beer from the temporary pool and add to flight
                flight.push(RECIPES[tempPool.splice(rndIdx, 1)[0]]);
            }
            return flight;
        }

        const possible = CUSTOMER_TYPES[typeKey].orders;

        // Regular single pour randomization
        if (possible[0] === 'all_pure') {
            return [RECIPES[['stout', 'ipa', 'lager'][Math.floor(Math.random() * 3)]]];
        }

        // VIP escalation logic
        if (possible[0] === 'all_mixed') {
            // If they spawn on Level 1 or 2, force them to order a pure drink instead
            if (level < 3) {
                return [RECIPES[['stout', 'ipa', 'lager'][Math.floor(Math.random() * 3)]]];
            }
            // Level 3+, they unleash the mixed drinks
            return [RECIPES[['black_tan', 'black_bitter', 'lawnmower'][Math.floor(Math.random() * 3)]]];
        }

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
        } else if (this.state === 'finished_pause') {
            // Hold the pose at the counter for the beat
            this.pauseTimer -= 1;
            if (this.pauseTimer <= 0) {
                this.state = 'walking_out';
            }
            return null;
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
        this.level = 1;
        this.customersServedThisLevel = 0;
        this.levelQuota = 3;
        this.combo = 0;
        this.lastCustomerType = null;
        this.isGameOver = false;
        this.activePour = { active: false, tapIndex: -1, slideProgress: 0 };

        this.notifications = new NotificationSystem();
        this.debugPos = { x: 0, y: 0 };
        this.audio = new AudioEngine();
        this.initInput();
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    spawnCustomer() {
        if (this.customer) return;

        // Check if we hit the quota to trigger the Boss Phase
        if (this.customersServedThisLevel >= this.levelQuota) {
            this.notifications.trigger(`SHIFT ${this.level} BOSS!`, "#f00", 180);
            this.audio.play('judge', 0);
            // Pass this.level to the Judge so his flight size scales
            setTimeout(() => {
                this.customer = new Customer('judge', this.level);
                this.activePour.tapIndex = -1;
                this.activePour.slideProgress = 0;
            }, 3000);

        } else {
            // Standard customer pool
            let standardPool = ['viking', 'hipster', 'regular', 'vip', 'karen'];

            // Filter out the last customer to prevent duplicates
            if (this.lastCustomerType) {
                standardPool = standardPool.filter(type => type !== this.lastCustomerType);
            }

            const randomType = standardPool[Math.floor(Math.random() * standardPool.length)];
            this.lastCustomerType = randomType; // Save for next time

            this.customer = new Customer(randomType, this.level);
            this.activePour.tapIndex = -1;
            this.activePour.slideProgress = 0;
        }
    }

    checkGameOver() {
        if (this.lives <= 0 && !this.isGameOver) {
            this.isGameOver = true;
            this.customer = null; // Instantly remove character
            this.activePour.active = false;

            // Abrupt audio takeover
            this.audio.stopBGM();
            this.audio.play('gameover', 0);

            // Hijack the notification system permanently
            this.notifications.queue = [];
            this.notifications.active = null;
            this.notifications.trigger("GAME OVER", "#f00", 999999); // Stays forever
        }
    }

    handlePourInput(isDown, tapIndex) {
        if (this.isGameOver) return;
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

        // INSTANT FAILURE: Wrong Tap
        if (this.activePour.tapIndex !== step.tap) {
            this.activePour.active = false;
            this.completeOrder(false); // Instantly trigger the failure state
            return;
        }

        if (this.activePour.tapIndex === step.tap) {
            c.currentDrinkProgress += 0.008;

            // INSTANT FAILURE: Overflowing the glass
            if (c.currentDrinkProgress > step.limit + 0.1) {
                this.activePour.active = false;
                this.completeOrder(false); // Instantly triggers failure, audio, and life loss
                return;
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
            if (c.currentDrinkProgress >= step.limit - 0.08 && c.currentDrinkProgress <= step.limit + 0.02) {
                this.notifications.trigger("PERFECT POUR!", "#0f0");
                this.audio.play('perfect', 800);
                this.score += 50;

                // FIX: Only change to the Happy pose if this is the final step of the drink
                if (c.currentStepIndex === recipe.steps.length - 1) {
                    c.poseIndex = 1;
                }
            }

            if (c.currentStepIndex < recipe.steps.length - 1) {
                c.currentStepIndex++;
            } else {
                this.finishDrink(true);
            }
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
        const isJudge = this.customer.type === 'judge';

        if (success && this.customer.satisfaction > 0) {
            // --- SUCCESS ---
            if (isJudge) {
                // THE BOSS BOUNTY
                this.notifications.trigger("JUDGE SATISFIED! LEVEL UP!", "#0f0", 120);
                this.score += 1000 * this.level; // Massive point drop
                if (this.lives < 3) this.lives++; // Heal a life!

                this.level++; // Advance to the next shift
                this.customersServedThisLevel = 0; // Reset quota for the new shift
            } else {
                // Standard customer success
                this.combo++;
                this.score += (50 * this.customer.order.length) + (this.combo * 10);
                this.notifications.trigger(`PERFECT! +${this.combo} COMBO`, "#0f0", 60);
                this.customersServedThisLevel++; // Count towards triggering the next Judge
            }
        } else {
            // --- FAILURE ---
            this.lives--;
            this.combo = 0; // Violently break the combo multiplier
            this.audio.play('trash', 800);
            if (isJudge) {
                // THE ALL-OR-NOTHING PENALTY
                this.notifications.trigger("FLIGHT REJECTED!", "#f00", 120);
                // Note: We do NOT increment level here. They must try again.
            } else {
                this.notifications.trigger("TRASH! COMBO BROKEN", "#f00", 60);
            }
            this.checkGameOver();
        }

        // --- APPLY FINAL POSE AND STATE ---
        this.customer.poseIndex = success && this.customer.satisfaction > 0 ? 1 : 2;

        if (isJudge) {
            // Trigger the 3-second dramatic pause (180 frames at 60fps)
            this.customer.state = 'finished_pause';
            this.customer.pauseTimer = 180;
        } else {
            this.customer.state = 'walking_out';
        }
    }
    drawFlightPaddle() {
        if (!this.customer || !assets.paddles) return;
        if (this.customer.state !== 'waiting' && this.customer.state !== 'finished_pause') return;
        const orderLen = this.customer.order.length;
        if (orderLen < 2) return;

        const clampedLen = Math.min(Math.max(orderLen, 2), 5);
        const board = SPRITE_DATA.paddles.boards[clampedLen];
        const clip = board.clip;

        ctx.save();

        // Pull x and y directly from the specific board size
        ctx.translate(this.customer.x + board.x, board.y);

        // Pull the scale directly from the specific board size
        let drawW = clip.sw * board.s;
        let drawH = clip.sh * board.s;

        // 1. Draw the dynamically selected wooden paddle (WITH ANTI-CRASH MATH)
        let sX = Math.max(0, clip.sx);
        let sY = Math.max(0, clip.sy);
        let sW = Math.min(clip.sw, assets.paddles.width - sX);
        let sH = Math.min(clip.sh, assets.paddles.height - sY);

        if (sW > 0 && sH > 0) {
            ctx.drawImage(assets.paddles,
                sX, sY, sW, sH,
                -drawW / 2, -drawH / 2, drawW, drawH
            );
        }

        // 2. Draw the completed mini-glasses
        if (assets.fullpints) {
            const completedCount = this.customer.currentOrderIndex;
            let fpBaseW = Math.floor(assets.fullpints.width / 4);
            let fpBaseH = assets.fullpints.height;

            let miniScale = board.miniScale || 0.12;
            let slotY = board.slotY || -10;

            for (let i = 0; i < completedCount; i++) {
                const recipeObj = this.customer.order[i];
                const isMixed = recipeObj.steps && recipeObj.steps.length > 1;

                // Calculate the final bounding box for this specific slot
                let drawX = board.slotsX[i] - (fpBaseW * miniScale) / 2;
                let drawY = slotY - (fpBaseH * miniScale);
                let drawW = fpBaseW * miniScale;
                let drawH = fpBaseH * miniScale;

                if (!isMixed) {
                    // Standard single pour: Grab from fullpints
                    let frameIdx = recipeObj.steps[0].tap + 1;
                    ctx.drawImage(assets.fullpints,
                        frameIdx * fpBaseW, 0, fpBaseW, fpBaseH,
                        drawX, drawY, drawW, drawH
                    );
                } else if (assets.mixpour) {
                    // Mixed pour: Grab the fully assembled graphic directly from mixpour
                    const recipeKey = Object.keys(RECIPES).find(key => RECIPES[key].name === recipeObj.name);
                    let mpBaseW = Math.floor(assets.mixpour.width / 3);
                    let mpBaseH = assets.mixpour.height;

                    let mixIdx = 0;
                    if (recipeKey === 'black_tan') mixIdx = 0;
                    else if (recipeKey === 'black_bitter') mixIdx = 1;
                    else if (recipeKey === 'lawnmower') mixIdx = 2;

                    ctx.drawImage(assets.mixpour,
                        mixIdx * mpBaseW, 0, mpBaseW, mpBaseH,
                        drawX, drawY, drawW, drawH
                    );
                }
            }
        }
        ctx.restore();
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

                // ... [End of Tap Handle Drawing] ...
                ctx.restore();

                // --- PROCEDURAL LIQUID POUR STREAM ---
                if (isPouring) {
                    ctx.save();

                    // 1. Fluid Colors for Stout (0), IPA (1), Lager (2)
                    const fluidColors = [
                        { fill: "#1a0f0a", edge: "#000000", highlight: "rgba(255,255,255,0.08)" }, // Black
                        { fill: "#d97b29", edge: "#8c3b0a", highlight: "rgba(255,255,255,0.2)" },  // Amber
                        { fill: "#fbd341", edge: "#d48e15", highlight: "rgba(255,255,255,0.4)" }   // Yellow
                    ];
                    const colors = fluidColors[idx];

                    // 2. Tweak these to align the start of the stream to your metal nozzles
                    // 'drop' controls how far down the screen the liquid falls before clipping into the glass
                    const nozzleOffsets = [
                        { x: 28, y: 530, drop: 300 }, // Tap 0 (Left)
                        { x: 0, y: 530, drop: 300 }, // Tap 1 (Middle)
                        { x: -35, y: 528, drop: 300 }  // Tap 2 (Right)
                    ];

                    const nX = nozzleOffsets[idx].x;
                    const nY = nozzleOffsets[idx].y;
                    const dropDist = nozzleOffsets[idx].drop;

                    // 3. Sine Wave Math (Makes the liquid wobble slightly as it pours)
                    const time = Date.now() / 120;
                    const w1 = Math.sin(time) * 3;
                    const w2 = Math.cos(time * 1.5) * 4;

                    ctx.beginPath();
                    // Top of stream at the nozzle (slightly wider)
                    ctx.moveTo(nX - 12, nY);

                    // Left curving edge flowing down
                    ctx.bezierCurveTo(
                        nX - 9 + w1, nY + dropDist * 0.33,
                        nX - 6 + w2, nY + dropDist * 0.66,
                        nX - 6, nY + dropDist
                    );

                    // Flat bottom where it hits the glass/foam
                    ctx.lineTo(nX + 6, nY + dropDist);

                    // Right curving edge flowing back up to the nozzle
                    ctx.bezierCurveTo(
                        nX + 6 + w2, nY + dropDist * 0.66,
                        nX + 9 + w1, nY + dropDist * 0.33,
                        nX + 12, nY
                    );
                    ctx.closePath();

                    // Draw the core liquid
                    ctx.fillStyle = colors.fill;
                    ctx.fill();
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = colors.edge;
                    ctx.stroke();

                    // 4. Draw falling highlights to sell the motion illusion
                    let speed1 = (Date.now() % 400) / 400; // Fast highlight
                    let speed2 = ((Date.now() + 150) % 500) / 500; // Slower, staggered highlight

                    ctx.lineWidth = 3;
                    ctx.strokeStyle = colors.highlight;
                    ctx.lineCap = "round";

                    // Highlight 1
                    let h1Y = nY + (dropDist * speed1);
                    if (h1Y < nY + dropDist - 30) {
                        ctx.beginPath();
                        ctx.moveTo(nX - 2, h1Y);
                        ctx.lineTo(nX - 2, h1Y + 30);
                        ctx.stroke();
                    }

                    // Highlight 2
                    let h2Y = nY + (dropDist * speed2);
                    if (h2Y < nY + dropDist - 20) {
                        ctx.beginPath();
                        ctx.moveTo(nX + 3, h2Y);
                        ctx.lineTo(nX + 3, h2Y + 20);
                        ctx.stroke();
                    }

                    ctx.restore();
                }
                // -----------------------------

                // --- 3D COUNTER PINT DROP-IN & FILLING ---

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

                        // Calculate progress early so we can use it to mask the empty glass
                        let drinkProgress = (this.customer) ? Math.min(this.customer.currentDrinkProgress, 1.0) : 0;

                        // 1. DRAW FRAME 0 (The 3D Sliding Empty Glass Base)
                        ctx.save();
                        ctx.beginPath();

                        // We create a clipping mask that shrinks upwards as the drink fills.
                        // Starts 50px higher/wider than the glass to ensure we don't cut off scaling edges.
                        // We add a +5 pixel overlap downwards to prevent a 1px transparent seam where the liquid meets the empty glass.
                        ctx.rect(
                            drawX - 50,
                            drawY - 50,
                            drawFPW + 100,
                            50 + (drawFPH * (1 - drinkProgress)) + 5
                        );
                        ctx.clip();

                        ctx.drawImage(assets.fullpints,
                            0, 0, baseFPW, baseFPH,
                            drawX, drawY, drawFPW, drawFPH
                        );
                        ctx.restore();

                        // 2. DYNAMICALLY FILL THE LIQUID WITH NUDGE OFFSETS & MIXES
                        if (this.customer) {
                            
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

                                // FIX: Check WHERE the glass physically is, rather than what step the math is on!
                                if (this.activePour.tapIndex === recipeObj.steps[0].tap) {
                            // STEP 1: Glass is at the first tap. Use halfpour sheet.
                                    if (assets.halfpour) {
                                        activeLiquidAsset = assets.halfpour;
                                        liquidFrames = 3;
                                        targetFrameIdx = idx; // 0=Stout, 1=IPA, 2=Lager

                                        // Swap to half_pours tweaks
                                        if (SPRITE_DATA.half_pours) {
                                            activeTweaks = SPRITE_DATA.half_pours.fillTweaks;
                                            tweakIdx = idx;
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
                                            tweakIdx = idx;
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
            if (!this.started) {
                this.started = true;
                this.audio.startBGM(); // 👇 Start the music on the very first tap!
                this.spawnCustomer();
                return;
            }
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
        this.audio.update();
        this.updatePouring();
        this.notifications.update();
        
        // --- ADD THIS BLOCK ---
        if (this.customer) {
            const status = this.customer.update();
            
            if (status === 'timeout') {
                this.lives--;
                this.audio.play('trash', 1200);
                this.notifications.trigger("WALKED OUT!", "#f00");
                this.customer.poseIndex = 2; // Ensure they stay angry while walking out
                this.customer.state = 'walking_out';
                this.checkGameOver();
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
        this.drawFlightPaddle();
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
    if (!window.game) return;

    // 👇 MOVE THE INSTANT SPAWN OVERRIDE HERE (Above the customer check)
    // --- VISUAL PADDLE CALIBRATION TOOLS ---
    if (e.key === '7' || e.key === '8' || e.key === '9' || e.key === '0') {
        let size = e.key === '7' ? 2 : e.key === '8' ? 3 : e.key === '9' ? 4 : 5;

        window.game.customer = new Customer('judge');
        window.game.customer.x = window.game.customer.targetX;
        window.game.customer.state = 'waiting';
        window.game.customer.patience = 999999; // Freeze the patience timer

        let dummyOrder = [];
        for (let i = 0; i < size; i++) {
            dummyOrder.push(RECIPES[['stout', 'ipa', 'lager'][i % 3]]);
        }
        window.game.customer.order = dummyOrder;

        // Force the order to appear fully completed so all glasses draw instantly
        window.game.customer.currentOrderIndex = size;

        console.log(`CALIBRATING: Flight of ${size}`);
        return;
    }

    // --- CUSTOMER-SPECIFIC TOOLS (Requires a customer to be on screen) ---
    if (!window.game.customer) return;

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