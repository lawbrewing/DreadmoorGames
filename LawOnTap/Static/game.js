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
    'ipa': { name: "IPA", steps: [{ tap: TAPS.IPA, limit: 1.0 }] },
    'lager': { name: "LAGER", steps: [{ tap: TAPS.LAGER, limit: 1.0 }] },
    'black_tan': { name: "BLACK & TAN", steps: [{ tap: TAPS.LAGER, limit: 0.5 }, { tap: TAPS.STOUT, limit: 1.0 }] },
    'black_bitter': { name: "BLACK & BITTER", steps: [{ tap: TAPS.IPA, limit: 0.5 }, { tap: TAPS.STOUT, limit: 1.0 }] },
    'lawnmower': { name: "LAWNMOWER HOP", steps: [{ tap: TAPS.LAGER, limit: 0.5 }, { tap: TAPS.IPA, limit: 1.0 }] }
};

const CUSTOMER_TYPES = {
    'viking': { id: 'viking', patience: 15000, orders: ['stout'] },
    'hipster': { id: 'hipster', patience: 12000, orders: ['ipa'] },
    'regular': { id: 'regular', patience: 12000, orders: ['lager'] },
    'vip': { id: 'vip', patience: 20000, orders: ['all_pure', 'all_mixed'] },
    'karen': { id: 'karen', patience: 10000, orders: ['???'] },
    'judge': { id: 'judge', patience: 25000, orders: ['flight'] }
};

let SPRITE_DATA = {
    // HUD Elements
    hud_elements: {
        score: { x: 1871, y: 76, s: .85 },
        lives: { x: 1624, y: 172, s: 0.5, spacing: 100 },
        gameOver: { x: 969, y: 56, s: .45, visible: false },
        clock: { x: 0, y: -280, r: 50, width: 10 }
    },
    menu: { x: 120, targetY: 215, s: 0.50, textX: 0, textY: 0 },

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
                    { x: 0, y: 0 },         // 2 Key: Happy (Explicit defaults)
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
    halfpour: 'assets/halfpour.png',
    neon_sign: 'assets/lawbrewhollow.png'
};
const assets = {};

const REAL_AWARDS = [
    { name: "Gose", comp: "WI State Fair", year: "2022", type: "bronze" },
    { name: "Gose", comp: "WI State Fair", year: "2023", type: "bronze" },
    { name: "Gose", comp: "Manitowoc Fair", year: "2022", type: "bronze" },
    { name: "Hopped Up", comp: "Manitowoc Fair", year: "2024", type: "gold" },
    { name: "nIPLy", comp: "NHC", year: "2023", type: "silver" },
    { name: "nIPLy", comp: "NHC", year: "2025", type: "gold" },
    { name: "nIPLy", comp: "Manitowoc Fair", year: "2026", type: "silver" },
    { name: "Dreamsicle", comp: "WI State Fair", year: "2026", type: "gold" },
    { name: "Cabana", comp: "NHC", year: "2024", type: "bronze" },
    { name: "Cabana", comp: "Manitowoc Fair", year: "2023", type: "bronze" },
    { name: "Cabana", comp: "Manitowoc Fair", year: "2024", type: "bronze" },
    { name: "Marshmallow", comp: "WI State Fair", year: "2025", type: "gold" },
    { name: "LFO", comp: "NHC", year: "2024", type: "gold" },
    { name: "LFO", comp: "Manitowoc BOS", year: "2023", type: "gold" }, // Best of Show treated as Gold
    { name: "LFO", comp: "Manitowoc Fair", year: "2023", type: "gold" },
    { name: "Pale Ale", comp: "Manitowoc Fair", year: "2022", type: "gold" }
];

// ==========================================
// 3. LOGIC & DRAWING HELPERS
// ==========================================

class NotificationSystem {
    constructor() { this.queue = []; this.active = null; this.timer = 0; }
    trigger(text, color = "#fff", duration = 120) { this.queue.push({ text, color, duration }); }
    update() {
        if (!this.active && this.queue.length > 0) { this.active = this.queue.shift(); this.timer = this.active.duration; }
        if (this.active) { this.timer--; if (this.timer <= 0) this.active = null; }
    }
    draw() {
        if (this.active) {
            ctx.save(); ctx.fillStyle = this.active.color; ctx.strokeStyle = "black"; ctx.lineWidth = 4;
            ctx.font = "bold 60px 'Bebas Neue', monospace"; ctx.textAlign = "center";
            ctx.strokeText(this.active.text, WORLD.w / 2, 300); ctx.fillText(this.active.text, WORLD.w / 2, 300);
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

class LootLockerAPI {
    constructor() {
        this.baseURL = "https://api.lootlocker.io/game";
        this.gameKey = "dev_acdf056df19c4541b2c45db4424aa16f";
        this.leaderboardID = "36366";
        this.sessionToken = "";

        // Ensure we don't trip over bad data saved in the browser from previous runs
        this.playerIdentifier = localStorage.getItem("ll_player_identifier") || "";
        this.memberId = localStorage.getItem("ll_member_id") || "";

        this.topScores = null;
    }

    async init() {
        try {
            // Session endpoint DOES require /v2/
            const res = await fetch(`${this.baseURL}/v2/session/guest`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ game_key: this.gameKey, game_version: "1.0.0", player_identifier: this.playerIdentifier })
            });
            const data = await res.json();

            if (data.success) {
                this.sessionToken = data.session_token;

                // Save both the string identifier (for login) and the numeric ID (for scores)
                this.playerIdentifier = data.player_identifier;
                this.memberId = data.player_id.toString();

                localStorage.setItem("ll_player_identifier", this.playerIdentifier);
                localStorage.setItem("ll_member_id", this.memberId);

                this.topScores = await this.fetchScores(10);
            } else {
                console.error("LootLocker Session Failed:", data);
            }
        } catch (e) { console.error("LootLocker Init Error:", e); }
    }

    async submitScore(score, playerName) {
        if (!this.sessionToken) return;

        try {
            // Player name endpoint DOES NOT use versioning
            const nameRes = await fetch(`${this.baseURL}/player/name`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", "x-session-token": this.sessionToken },
                body: JSON.stringify({ name: playerName })
            });
            const nameData = await nameRes.json();
            console.log("LootLocker Name Update:", nameData);

            // Leaderboard submit endpoint DOES NOT use versioning
            const scoreRes = await fetch(`${this.baseURL}/leaderboards/${this.leaderboardID}/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-session-token": this.sessionToken },
                body: JSON.stringify({ score: score, member_id: this.memberId })
            });
            const scoreData = await scoreRes.json();
            console.log("LootLocker Score Submit:", scoreData);

        } catch (e) { console.error("LootLocker Submit Error:", e); }
    }

    async fetchScores(count = 10) {
        if (!this.sessionToken) return [];
        try {
            // Leaderboard list endpoint DOES NOT use versioning
            const res = await fetch(`${this.baseURL}/leaderboards/${this.leaderboardID}/list?count=${count}`, {
                method: "GET",
                headers: { "Content-Type": "application/json", "x-session-token": this.sessionToken }
            });
            const data = await res.json();
            console.log("LootLocker Fetch Scores:", data);
            return data.success ? data.items : [];
        } catch (e) {
            console.error("LootLocker Fetch Error:", e);
            return [];
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

        // 👇 ENDLESS SCALING: Faster walking and less patience every shift
        this.walkSpeed = 8 + (currentLevel * 0.5);
        this.patienceMax = Math.max(6000, type.patience - (currentLevel * 1000));

        this.state = 'walking_in';
        this.patience = this.patienceMax;
        this.satisfaction = 100;
        this.order = this.generateOrder(typeKey, currentLevel);

        this.currentOrderIndex = 0;
        this.currentDrinkProgress = 0;
        this.currentStepIndex = 0;
        this.poseIndex = 0;
        this.finishTimes = [];
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

        // 👇 LEVEL 3+ MIXED DRINK LOGIC
        if (level >= 3) {
            if (typeKey === 'vip') {
                // VIPs have an 80% chance to order a mixed drink
                if (Math.random() < 0.80) {
                    return [RECIPES[['black_tan', 'black_bitter', 'lawnmower'][Math.floor(Math.random() * 3)]]];
                }
            } else {
                // Standard patrons have a 30% chance based on their core style
                if (Math.random() < 0.30) {
                    if (typeKey === 'viking') return [RECIPES[['black_tan', 'black_bitter'][Math.floor(Math.random() * 2)]]];
                    if (typeKey === 'hipster') return [RECIPES[['lawnmower', 'black_bitter'][Math.floor(Math.random() * 2)]]];
                    if (typeKey === 'regular') return [RECIPES[['black_tan', 'lawnmower'][Math.floor(Math.random() * 2)]]];
                }
            }
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

    update(isPouring = false, isTarget = false) {
        const walkSpeed = 8;

        if (this.state === 'walking_in') {
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
            this.pauseTimer -= 1;
            if (this.pauseTimer <= 0) this.state = 'walking_out';
            return null;
        } else if (this.state === 'walking_out') {
            if (this.x < this.exitX) {
                this.x += walkSpeed;
                if (this.x >= this.exitX) return 'gone';
            } else {
                this.x -= walkSpeed;
                if (this.x <= this.exitX) return 'gone';
            }
        }

        if (this.state === 'waiting') {
            // Drain 16ms/tick normally, 28ms/tick if player is pouring for someone else
            const drain = (isPouring && !isTarget) ? 28 : 16;
            this.patience -= drain;
            if (this.patience <= 0) {
                this.poseIndex = 2; // Angry pose
                return 'timeout';
            }
        }
        return null;
    }
}

class Game {
    constructor() {
        this.started = false; this.score = 0; this.lives = 3;
        this.customers = []; this.menuAnim = { y: -600 };
        this.activeCustomer = null;
        this.spawnTimer = 0;
        this.level = 1;
        this.customersServedThisLevel = 0;
        this.levelQuota = 5;
        this.combo = 0;
        this.lastCustomerType = null;
        this.isGameOver = false;
        this.showLeaderboard = false;
        this.activePour = { active: false, tapIndex: -1, slideProgress: 0 };
        this.wallMedals = []; // Tracks dynamically spawned hardware
        this.notifications = new NotificationSystem();
        this.debugPos = { x: 0, y: 0 };
        this.audio = new AudioEngine();
        this.leaderboard = new LootLockerAPI();
        this.leaderboard.init();
        this.initInput();
        this.resize();
        window.addEventListener('resize', () => this.resize());

    }

    drawNeonSign() {
        if (!assets.neon_sign) return;

        ctx.save();

        // --- POSITION & SCALE ON THE WALL ---
        // Change these X, Y, and scale values to mount the sign wherever your background wall has space
        let signX = 1260;
        let signY = 250;
        let signScale = 0.35;

        let drawW = assets.neon_sign.width * signScale;
        let drawH = assets.neon_sign.height * signScale;

        // --- INTENTIONAL COLOR LOGIC (Diegetic UI) ---
        let activeColor = "rgba(255, 204, 0, 1)"; // Default: Amber Gold

        if (this.isGameOver) {
            activeColor = "rgba(100, 0, 0, 1)"; // Dead/Broken Red
        } else if (this.customers.some(c => c.type === 'judge')) { // 👇 FIX: Updated array check
            activeColor = "rgba(255, 51, 51, 1)"; // Boss Phase: Aggressive Red
        } else if (this.lives <= 1) {
            activeColor = "rgba(255, 102, 0, 1)"; // Danger: Warning Orange
        } else if (this.combo >= 3) {
            activeColor = "rgba(0, 255, 102, 1)"; // Heating Up: Electric Hop Green
        }

        // Electric hum / flicker effect (98% solid glow, 2% stutter)
        let flicker = Math.random() > 0.02 ? 1.0 : 0.4;

        // If game over, make it sputter and struggle to stay lit
        if (this.isGameOver) {
            flicker = Math.random() > 0.1 ? 0.2 : 0.6;
        }

        let pulse = 0.7 + (Math.sin(Date.now() / 200) * 0.15); // Organic breathing pulse
        let finalAlpha = flicker * pulse;

        // 1. DRAW THE BACK-GLOW (Casting light onto the brick wall)
        ctx.globalCompositeOperation = "screen";
        let glowGrad = ctx.createRadialGradient(signX, signY, 10, signX, signY, drawW * 0.8);

        glowGrad.addColorStop(0, activeColor);
        // Swap out the "1" opacity for "0.3" for the mid-glow fade
        glowGrad.addColorStop(0.5, activeColor.replace(', 1)', ', 0.3)'));
        glowGrad.addColorStop(1, "rgba(0,0,0,0)");

        ctx.fillStyle = glowGrad;
        ctx.globalAlpha = finalAlpha * 0.6;
        ctx.beginPath();
        ctx.arc(signX, signY, drawW * 0.8, 0, Math.PI * 2);
        ctx.fill();

        // 2. DRAW THE PHYSICAL TRANSPARENT SIGN OUTLINE
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1.0;

        // Outer neon tube bloom pass
        ctx.shadowColor = activeColor;
        ctx.shadowBlur = 25 * pulse;

        ctx.drawImage(
            assets.neon_sign,
            signX - drawW / 2,
            signY - drawH / 2,
            drawW,
            drawH
        );

        ctx.restore();
    }

    drawWallMedals() {
        if (!this.wallMedals || this.wallMedals.length === 0) return;

        this.wallMedals.forEach(medal => {
            ctx.save();
            ctx.translate(medal.x, medal.y);
            ctx.rotate(medal.rot);

            ctx.scale(1.2, 1.2); // Slightly smaller scale so the wide plaques don't overlap too much

            // Drop shadow
            ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
            ctx.shadowBlur = 10;
            ctx.shadowOffsetY = 5;

            // 1. Wide Wooden Base (Landscape)
            ctx.fillStyle = "#3d2314";
            ctx.fillRect(-60, -35, 120, 70);

            ctx.shadowColor = "transparent";

            // Wood border/bevel
            ctx.strokeStyle = "#2b180d";
            ctx.lineWidth = 4;
            ctx.strokeRect(-60, -35, 120, 70);

            // 2. Determine Plate Colors from the Award Object
            let fillCol, edgeCol, textColor;
            if (medal.award.type === 'gold') { fillCol = "#FFD700"; edgeCol = "#B8860B"; textColor = "#5c4300"; }
            else if (medal.award.type === 'silver') { fillCol = "#E0E0E0"; edgeCol = "#808080"; textColor = "#333333"; }
            else { fillCol = "#CD7F32"; edgeCol = "#8B4513"; textColor = "#3b1c04"; }

            // 3. Wide Metallic Plate
            ctx.fillStyle = fillCol;
            ctx.fillRect(-50, -25, 100, 50);

            ctx.strokeStyle = edgeCol;
            ctx.lineWidth = 2;
            ctx.strokeRect(-50, -25, 100, 50);

            // Decorative Corner Screws
            ctx.fillStyle = edgeCol;
            ctx.beginPath(); ctx.arc(-45, -20, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(45, -20, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(-45, 20, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(45, 20, 2, 0, Math.PI * 2); ctx.fill();

            // 4. Two-Line Engraved Text
            ctx.fillStyle = textColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Top Line: Beer Name (Max width 90px to prevent spilling off the 100px metal plate)
            ctx.font = 'bold 18px "Bebas Neue", monospace';
            ctx.fillText(medal.award.name.toUpperCase(), 0, -8, 90);

            // Bottom Line: Competition & Year
            ctx.font = '14px "Bebas Neue", monospace';
            ctx.fillText(`${medal.award.comp} '${medal.award.year.slice(-2)}`, 0, 10, 90);

            // 5. Glossy Shine
            ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
            ctx.beginPath();
            ctx.moveTo(-50, -25);
            ctx.lineTo(50, -25);
            ctx.lineTo(-50, 25);
            ctx.fill();

            ctx.restore();
        });
    }

    spawnCustomer() {
        if (this.isGameOver) return;

        // Boss Phase Check
        if (this.customersServedThisLevel >= this.levelQuota) {
            if (this.customers.length === 0 && !this.bossTriggered) {
                this.bossTriggered = true;
                this.notifications.trigger(`JUDGE ${this.level} INCOMING!`, "#f00", 180);
                this.audio.play('judge', 0);

                // 👇 FIX: Reduced delay from 3000ms to 1000ms so it doesn't feel stalled
                setTimeout(() => {
                    this.customers.push(new Customer('judge', this.level));
                    this.activePour.tapIndex = -1;
                    this.activePour.slideProgress = 0;
                    this.bossTriggered = false;
                }, 1000);
            }
            return;
        }

        // Progression: Level 1 (Max 1), Level 2 (Max 2), Level 3+ (Max 3)
        let maxCapacity = 1;
        if (this.level === 2) maxCapacity = 2;
        if (this.level >= 3) maxCapacity = 3;

        if (this.customers.length >= maxCapacity) return;

        // Check occupied landing spots
        const hasViking = this.customers.some(c => c.type === 'viking');
        const hasCenter = this.customers.some(c => c.type === 'hipster' || c.type === 'karen');
        const hasRight = this.customers.some(c => c.type === 'regular' || c.type === 'vip');

        let pool = [];
        if (!hasViking) pool.push('viking');
        if (!hasCenter) pool.push('hipster', 'karen');
        if (!hasRight) pool.push('regular', 'vip');

        if (this.lastCustomerType && pool.length > 1) {
            pool = pool.filter(t => t !== this.lastCustomerType);
        }

        if (pool.length > 0) {
            const selectedType = pool[Math.floor(Math.random() * pool.length)];
            this.lastCustomerType = selectedType;
            this.customers.push(new Customer(selectedType, this.level));

            // Timer between spawns gets faster each level. 
            // Lvl 1: ~3.5s gap, Lvl 2: ~2.5s gap, Lvl 3: ~1.5s gap
            this.spawnTimer = Math.max(90, 240 - (this.level * 30));
        }
    }

    checkGameOver() {
        if (this.lives <= 0 && !this.isGameOver) {
            this.isGameOver = true;
            this.customers = []; // Instantly clear all characters
            this.activeCustomer = null;
            this.activePour.active = false;

            // Abrupt audio takeover
            this.audio.stopBGM();
            this.audio.play('gameover', 0);

            this.notifications.queue = [];
            this.notifications.active = null;

            setTimeout(async () => {
                let name = prompt("GAME OVER! Enter your initials (3 letters):", "AAA");
                if (name) {
                    name = name.substring(0, 3).toUpperCase();
                    this.leaderboard.topScores = null; // 👇 FIX: Trigger loading text
                    await this.leaderboard.submitScore(this.score, name);
                    this.leaderboard.topScores = await this.leaderboard.fetchScores(10);
                }
            }, 500);
        }
    }

    resetGame() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.customersServedThisLevel = 0;
        this.levelQuota = 5;
        this.combo = 0;
        this.lastCustomerType = null;
        this.isGameOver = false;
        this.bossTriggered = false;
        this.spawnTimer = 0;

        this.customers = []; // Clear array
        this.activeCustomer = null;

        this.activePour = { active: false, tapIndex: -1, slideProgress: 0 };
        this.notifications.queue = [];
        this.notifications.active = null;
        this.wallMedals = [];
        this.audio.startBGM();
        this.spawnCustomer();
    }

    handlePourInput(isDown, tapIndex) {
        if (this.isGameOver) return;

        if (isDown) {
            this.activePour.active = true;
            if (this.activePour.tapIndex !== tapIndex) {
                this.activePour.slideProgress = 0;
            }
            this.activePour.tapIndex = tapIndex;

            // 👇 STRICT FIFO TARGETING: Always lock onto Order 1 (the oldest waiting customer)
            let waiters = this.customers.filter(c => c.state === 'waiting');

            if (waiters.length > 0) {
                // Because elements are pushed sequentially, index 0 is always the oldest
                this.activeCustomer = waiters[0];
            }

        } else {
            this.activePour.active = false;
            if (this.activeCustomer) {
                this.evaluatePour();
            }
            this.activeCustomer = null; // Clear context on release
        }
    }

    updatePouring() {
        if (!this.activePour.active || !this.activeCustomer) return;
        const c = this.activeCustomer; // <-- CHANGED THIS LINE

        // 👇 KAREN OVERFLOW LOGIC
        if (c.type === 'karen') {
            c.currentDrinkProgress += 0.008; // Normal fill rate
            if (c.currentDrinkProgress > 1.1) {
                this.activePour.active = false;
                this.completeOrder(false, "mechanical"); // Custom fail flag!
            }
            return;
        }

        const recipe = c.order[c.currentOrderIndex];
        const step = recipe.steps[c.currentStepIndex];

        // INSTANT FAILURE: Wrong Tap
        if (this.activePour.tapIndex !== step.tap) {
            this.activePour.active = false;
            this.completeOrder(false);
            return;
        }

        if (this.activePour.tapIndex === step.tap) {
            c.currentDrinkProgress += 0.008;

            // INSTANT FAILURE: Overflowing the glass
            if (c.currentDrinkProgress > step.limit + 0.1) {
                this.activePour.active = false;
                this.completeOrder(false);
                return;
            }
        }
    }

    evaluatePour() {
        const c = this.activeCustomer; // <-- CHANGED THIS LINE
        if (!c) return;

        // 👇 KAREN SHORT POUR & GAMBLE LOGIC
        if (c.type === 'karen') {
            if (c.currentDrinkProgress < 0.85) {
                // Short pour penalty
                this.completeOrder(false, "mechanical");
            } else {
                // Good pour! Now spin the 33% Roulette Wheel
                this.completeOrder(Math.random() < 0.33);
            }
            return;
        }

        const recipe = c.order[c.currentOrderIndex];
        const step = recipe.steps[c.currentStepIndex];

        // The acceptable boundaries for a passing drink
        const lower = step.limit - 0.15;
        const upper = step.limit + 0.05;

        // Did they release within the acceptable window?
        if (c.currentDrinkProgress >= lower && c.currentDrinkProgress <= upper) {

            // 👇 THE STRICT PERFECT TRIGGER
            if (c.currentDrinkProgress >= step.limit - 0.08 && c.currentDrinkProgress <= step.limit + 0.05) {

                this.notifications.trigger("PERFECT POUR!", "#0f0");
                this.audio.play('perfect', 0);
                this.score += 50;

                // --- EASTER EGG PLAQUE SPAWN LOGIC ---
                let award = REAL_AWARDS[Math.floor(Math.random() * REAL_AWARDS.length)];

                let mX, mY;
                let validPlacement = false;
                let attempts = 0; // Failsafe to prevent a browser crash if the wall gets completely full!

                while (!validPlacement && attempts < 200) {
                    mX = 1100 + (Math.random() * 750);
                    mY = 100 + (Math.random() * 550);
                    attempts++;

                    // 1. Check environment exclusions
                    let inSignBox = (mX > 1150 && mX < 1450) && (mY > 100 && mY < 450);
                    let inHudBox = (mX > 1500) && (mY < 250);

                    if (!inSignBox && !inHudBox) {
                        // 2. Check collision against existing plaques
                        // Plaque physical size is 144x84. We use 160x100 to give them a nice padded border.
                        let isOverlapping = this.wallMedals.some(medal => {
                            let xDist = Math.abs(medal.x - mX);
                            let yDist = Math.abs(medal.y - mY);
                            return (xDist < 160 && yDist < 100);
                        });

                        if (!isOverlapping) {
                            validPlacement = true;
                        }
                    }
                }

                // Only spawn the plaque if we successfully found an empty spot
                if (validPlacement) {
                    let mRot = (Math.random() - 0.5) * 0.15;
                    this.wallMedals.push({ x: mX, y: mY, award: award, rot: mRot });
                }

            } else {
                // Secondary trigger: Still successfully poured, but missed perfect window
                this.audio.play('perfect', 0);
                this.score += 10;
            }

            // Move to the next layer of a mixed drink, or finish the glass
            if (c.currentStepIndex < recipe.steps.length - 1) {
                c.currentStepIndex++;
            } else {
                if (c.type !== 'judge' || c.currentOrderIndex === c.order.length - 1) {
                    c.poseIndex = 1;
                }
                this.finishDrink(true);
            }

        } else {
            // THE ONE-SHOT PENALTY: They let go too early!
            if (c.currentDrinkProgress < lower) {
                this.completeOrder(false);
            }
        }
    }

    finishDrink(success) {
        const c = this.activeCustomer; // <-- CHANGED THIS LINE
        if (success) {
            if (!c.finishTimes) c.finishTimes = [];
            c.finishTimes[c.currentOrderIndex] = Date.now();

            c.currentOrderIndex++;
            c.currentDrinkProgress = 0;
            c.currentStepIndex = 0;
            if (c.currentOrderIndex >= c.order.length) this.completeOrder(true);
        }
    }

    completeOrder(success, failType = null) {
        const c = this.activeCustomer; // <-- CHANGED THIS LINE
        if (!c) return;

        const isJudge = c.type === 'judge';
        const isKaren = c.type === 'karen';

        if (success && c.satisfaction > 0) {
            // --- SUCCESS ---
            if (isJudge) {
                this.notifications.trigger("JUDGE SATISFIED! LEVEL UP!", "#0f0", 120);
                this.score += 1000 * this.level;
                if (this.lives < 3) this.lives++;

                this.level++;
                this.customersServedThisLevel = 0;
                this.levelQuota = 4 + this.level;

            } else if (isKaren) {
                this.combo++;
                this.score += 200 + (this.combo * 10);
                this.notifications.trigger("KAREN BONUS! +200", "#0f0", 90);
                this.audio.play('perfect', 0);
                this.customersServedThisLevel++;
            } else {
                this.combo++;
                this.score += (50 * c.order.length) + (this.combo * 10);
                this.notifications.trigger(`PERFECT! +${this.combo} COMBO`, "#0f0", 60);
                this.customersServedThisLevel++;
            }
        } else {
            // --- FAILURE ---
            this.combo = 0; // Violently break the combo multiplier

            if (isKaren && failType !== "mechanical") {
                // 👇 KAREN RAGE PENALTY
                this.audio.play('trash', 1200);
                this.notifications.trigger("KAREN RAGE! -100", "#f00", 90);
                this.score = Math.max(0, this.score - 100);
            } else {
                // 👇 STANDARD PENALTY (Lose a life)
                this.lives--;
                this.audio.play('trash', 1200);

                if (isJudge) {
                    this.notifications.trigger("DEMOTED! -1500 TIPS", "#f00", 180);
                    this.score = Math.max(0, this.score - 1500);
                    this.customersServedThisLevel = 0;
                } else if (isKaren) {
                    this.notifications.trigger("TRASH! BAD POUR", "#f00", 60);
                } else {
                    this.notifications.trigger("TRASH! COMBO BROKEN", "#f00", 60);
                }
                this.checkGameOver();
            }
        }

        // --- APPLY FINAL POSE AND STATE ---
        c.poseIndex = success && c.satisfaction > 0 ? 1 : 2;

        if (isJudge) {
            c.state = 'finished_pause';
            c.pauseTimer = 180;
        } else {
            c.state = 'walking_out';
        }

        // CLEAR TARGET ONCE FINISHED
        this.activeCustomer = null;
    }
    drawFlightPaddle(c) {
        if (!c || !assets.paddles) return;
        if (c.state !== 'waiting' && c.state !== 'finished_pause') return;

        const orderLen = c.order.length;
        if (orderLen < 2) return;

        const clampedLen = Math.min(Math.max(orderLen, 2), 5);
        const board = SPRITE_DATA.paddles.boards[clampedLen];
        const clip = board.clip;

        ctx.save();
        ctx.translate(c.x + board.x, board.y);

        let drawW = clip.sw * board.s;
        let drawH = clip.sh * board.s;

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
            const completedCount = c.currentOrderIndex;
            let fpBaseW = Math.floor(assets.fullpints.width / 4);
            let fpBaseH = assets.fullpints.height;

            let miniScale = board.miniScale || 0.12;
            let slotY = board.slotY || -10;

            for (let i = 0; i < completedCount; i++) {
                const recipeObj = c.order[i];
                const isMixed = recipeObj.steps && recipeObj.steps.length > 1;

                let drawX = board.slotsX[i] - (fpBaseW * miniScale) / 2;
                let drawY = slotY - (fpBaseH * miniScale);
                let drawW = fpBaseW * miniScale;
                let drawH = fpBaseH * miniScale;

                if (!isMixed) {
                    // 👇 FIX: Default to a Stout icon if the customer order has no steps (Karen)
                    let frameIdx = recipeObj.steps ? recipeObj.steps[0].tap + 1 : 1;
                    ctx.drawImage(assets.fullpints,
                        frameIdx * fpBaseW, 0, fpBaseW, fpBaseH,
                        drawX, drawY, drawW, drawH
                    );
                } else if (assets.mixpour) {
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

                    // Settling Fade Animation
                    let finishTime = c.finishTimes ? (c.finishTimes[i] || 0) : 0;
                    let timeSinceFinish = Date.now() - finishTime;
                    let settleDuration = 1500;

                    if (finishTime > 0 && timeSinceFinish < settleDuration) {
                        let settleProgress = timeSinceFinish / settleDuration;
                        let opacity = (1.0 - settleProgress) * 0.9;

                        ctx.save();
                        ctx.globalAlpha = opacity;

                        let liqX = drawX + (drawW * 0.15);
                        let liqY = drawY + (drawH * 0.15);
                        let liqW = drawW * 0.70;
                        let liqH = drawH * 0.75;

                        const settleGrad = ctx.createLinearGradient(0, liqY, 0, liqY + liqH);
                        if (recipeKey === 'black_tan') {
                            settleGrad.addColorStop(0, "#1a0f0a");
                            settleGrad.addColorStop(0.3 + (settleProgress * 0.2), "#5a3a1a");
                            settleGrad.addColorStop(1, "#fbd341");
                        } else if (recipeKey === 'black_bitter') {
                            settleGrad.addColorStop(0, "#1a0f0a");
                            settleGrad.addColorStop(0.4 + (settleProgress * 0.2), "#8a4a1a");
                            settleGrad.addColorStop(1, "#d97b29");
                        } else if (recipeKey === 'lawnmower') {
                            settleGrad.addColorStop(0, "#d97b29");
                            settleGrad.addColorStop(0.4 + (settleProgress * 0.2), "#e8a033");
                            settleGrad.addColorStop(1, "#fbd341");
                        }

                        ctx.fillStyle = settleGrad;
                        ctx.beginPath();
                        if (ctx.roundRect) ctx.roundRect(liqX, liqY, liqW, liqH, 4);
                        else ctx.rect(liqX, liqY, liqW, liqH);
                        ctx.fill();

                        ctx.globalAlpha = opacity * 0.5;
                        ctx.fillStyle = "#fff";
                        let bTime = (Date.now() % 1000) / 1000;
                        for (let b = 0; b < 6; b++) {
                            let bx = liqX + (liqW * ((b * 21) % 100) / 100);
                            let by = liqY + (((bTime + (b * 0.17)) % 1) * liqH);
                            ctx.beginPath();
                            ctx.arc(bx, by, drawW * 0.03, 0, Math.PI * 2);
                            ctx.fill();
                        }
                        ctx.restore();
                    }
                }
            }
        }
        ctx.restore();
    }
    drawMenu() {
        const m = SPRITE_DATA.menu;

        // Grab all customers currently waiting at the bar
        const waiters = this.customers.filter(c => c.state === 'waiting');
        const targetY = (waiters.length > 0) ? m.targetY : -600;

        // Use the Game's global menuAnim (already in your constructor)
        this.menuAnim.y += (targetY - this.menuAnim.y) * 0.1;

        if (assets.menu && this.menuAnim.y > -550) {
            ctx.save();
            ctx.translate(m.x, this.menuAnim.y);
            const mw = assets.menu.width * m.s;
            const mh = assets.menu.height * m.s;
            ctx.drawImage(assets.menu, -mw / 2, -mh / 2, mw, mh);

            // 👇 FIX: Constricted safe zone from 85% to 60%. 
            // The canvas will natively shrink the text to ensure it never hits the dark borders.
            const maxTextWidth = mw * 0.60;
            ctx.textAlign = "center";

            // BOSS PHASE: Judge gets the board to himself
            if (waiters.length === 1 && waiters[0].type === 'judge') {
                const c = waiters[0];
                ctx.fillStyle = "rgba(40,20,0,0.9)";
                ctx.font = "bold 32px 'Bebas Neue', monospace";
                ctx.fillText("JUDGE'S FLIGHT:", 0, -60, maxTextWidth);

                let startY = -20;
                ctx.font = "26px 'Bebas Neue', monospace";
                c.order.forEach((item, idx) => {
                    // Highlight the current glass in red
                    ctx.fillStyle = (idx === c.currentOrderIndex) ? "#aa0000" : "#000";
                    ctx.fillText(item.name, 0, startY + (idx * 28), maxTextWidth);
                });

            } else if (waiters.length > 0) {
                // MULTI-CUSTOMER DISPLAY
                ctx.fillStyle = "rgba(40,20,0,0.9)";
                ctx.font = "bold 34px 'Bebas Neue', monospace";
                ctx.fillText("PENDING ORDERS:", 0, -65, maxTextWidth);

                let startY = -15;
                waiters.forEach((c, idx) => {
                    // Highlight the order in red if it's the one actively being poured
                    ctx.fillStyle = (this.activeCustomer === c) ? "#aa0000" : "#000";

                    // Slightly smaller font so horizontal shrinking isn't jarring on long names
                    ctx.font = "bold 28px 'Bebas Neue', monospace";

                    const drinkName = c.order[0].name;
                    ctx.fillText(`ORDER ${idx + 1}: ${drinkName}`, 0, startY + (idx * 40), maxTextWidth);
                });
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
                    let isGlassHere = (this.activePour.tapIndex === idx && this.activeCustomer && this.activeCustomer.state === 'waiting');

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
                        let drinkProgress = (this.activeCustomer) ? Math.min(this.activeCustomer.currentDrinkProgress, 1.0) : 0;

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

                        if (this.activeCustomer) {
                            let activeLiquidAsset = assets.fullpints;
                            let liquidFrames = 4;
                            let targetFrameIdx = idx + 1;

                            let activeTweaks = fpData.fillTweaks;
                            let tweakIdx = idx;

                            const recipeObj = this.activeCustomer.order[this.activeCustomer.currentOrderIndex];

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
        ctx.beginPath(); ctx.arc(0, 0, c.r, -Math.PI / 2, (-Math.PI / 2) + (progress * Math.PI * 2));
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

        const handleStart = async (e) => {
            if (!this.started) {
                this.started = true;
                this.audio.startBGM();
                this.spawnCustomer();
                return;
            }
            const pos = getPos(e); // Get the mouse/touch coordinates right away

            if (this.isGameOver) {
                if (this.showLeaderboard) {
                    // Back button hitbox
                    if (pos.x >= 760 && pos.x <= 1160 && pos.y >= 900 && pos.y <= 990) {
                        this.showLeaderboard = false;
                    }
                } else {
                    if (pos.x >= 760 && pos.x <= 1160) {
                        if (pos.y >= 600 && pos.y <= 690) {
                            this.resetGame();
                        } else if (pos.y >= 720 && pos.y <= 810) {
                            this.showLeaderboard = true;
                            this.leaderboard.topScores = null; // 👇 FIX: Trigger loading text
                            this.leaderboard.topScores = await this.leaderboard.fetchScores(10);
                        } else if (pos.y >= 840 && pos.y <= 930) {
                            window.location.href = 'landing.html';
                        }
                    }
                }
                return;
            }

            if (!this.started) {
                this.started = true;
                this.audio.startBGM();
                this.spawnCustomer();
                return;
            }

            // 👇 MASSIVE, FORGIVING HITBOXES
            // Starting from the absolute top of the screen (Y: 0) down to the bottom of the towers (Y: 800)
            if (pos.y >= 0 && pos.y < 800) {
                // Slicing the screen into three massive vertical columns
                if (pos.x < 1920 * 0.33) {
                    this.handlePourInput(true, 0); // Left Tap
                } else if (pos.x < 1920 * 0.66) {
                    this.handlePourInput(true, 1); // Middle Tap
                } else {
                    this.handlePourInput(true, 2); // Right Tap
                }
            }
        };

        const handleEnd = () => { this.handlePourInput(false, -1); };

        canvas.addEventListener('mousedown', handleStart);
        canvas.addEventListener('mouseup', handleEnd);
        canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleStart(e); }, { passive: false });
        canvas.addEventListener('touchend', (e) => { e.preventDefault(); handleEnd(); });

        canvas.addEventListener('mousemove', (e) => {
            if (this.debugPos) this.debugPos = getPos(e);
        });
        canvas.addEventListener('touchmove', (e) => {
            if (this.debugPos) this.debugPos = getPos(e);
        }, { passive: true });
    }

    draw() {
        this.audio.update();
        this.updatePouring();
        this.notifications.update();

        // 1. Spawning timer countdown (Don't spawn if judge is out)
        if (!this.customers.some(c => c.type === 'judge')) {
            // 👇 FIX: If the shift quota is met and the room is empty, bypass the timer!
            if (this.customersServedThisLevel >= this.levelQuota && this.customers.length === 0) {
                this.spawnTimer = 0;
            }

            if (this.spawnTimer > 0) this.spawnTimer--;
            if (this.spawnTimer <= 0) this.spawnCustomer();
        }

        // 2. Multi-customer update loop (reverse loop for safe splicing)
        for (let i = this.customers.length - 1; i >= 0; i--) {
            const c = this.customers[i];
            const isTarget = (this.activeCustomer === c);
            const status = c.update(this.activePour.active, isTarget);

            if (status === 'timeout') {
                this.lives--;
                this.audio.play('trash', 0);
                this.notifications.trigger("WALKED OUT!", "#f00");
                c.poseIndex = 2;
                c.state = 'walking_out';
                if (this.activeCustomer === c) {
                    this.activePour.active = false;
                    this.activeCustomer = null;
                }
                this.checkGameOver();
            } else if (status === 'gone') {
                this.customers.splice(i, 1);
            }
        }

        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(screenOffset.x, screenOffset.y);
        ctx.scale(screenScale, screenScale);

        if (assets.bg) ctx.drawImage(assets.bg, -320, 0, 2560, 1080);
        this.drawNeonSign();
        this.drawWallMedals();
        this.drawMenu();
        // 3. Draw customers and their personal flight paddles
        for (let c of this.customers) {
            if (assets[c.spriteId]) {
                const img = assets[c.spriteId];
                const s = c.scale;

                let tweakX = 0; let tweakY = 0;
                let customSW = null; let customSX = null; let customScale = s;

                if (c.poseOffsets && c.poseOffsets[c.poseIndex]) {
                    let pOffset = c.poseOffsets[c.poseIndex];
                    tweakX = pOffset.x || 0; tweakY = pOffset.y || 0;
                    if (pOffset.sw !== undefined) customSW = pOffset.sw;
                    if (pOffset.sx !== undefined) customSX = pOffset.sx;
                    if (pOffset.s !== undefined) customScale = pOffset.s;
                }

                let baseFrameW = (c.clip.sw > 0) ? c.clip.sw : Math.floor(img.width / 3);
                let frameW = (customSW !== null) ? customSW : baseFrameW;
                let frameH = (c.clip.sh > 0) ? c.clip.sh : img.height;

                let srcX; let destOffsetX = 0;

                if (customSX !== null) {
                    srcX = customSX;
                } else {
                    let clipSX = c.clip.sx;
                    if (clipSX < 0) { destOffsetX = clipSX; clipSX = 0; }
                    srcX = clipSX + (c.poseIndex * baseFrameW);
                }

                let srcY = c.clip.sy;

                ctx.save();
                let yBob = 0; let rotation = 0; let isFlipped = false;
                let isLeftFacing = (c.spriteId === 'vip');
                let movingRight = false;

                if (c.state === 'walking_in') {
                    movingRight = (c.startX < c.targetX);
                    yBob = Math.abs(Math.sin(Date.now() / 150)) * -8;
                    rotation = Math.sin(Date.now() / 150) * 0.05;
                    isFlipped = movingRight ? isLeftFacing : !isLeftFacing;
                } else if (c.state === 'waiting') {
                    isFlipped = isLeftFacing;
                } else if (c.state === 'walking_out') {
                    movingRight = (c.exitX > c.x);
                    yBob = Math.abs(Math.sin(Date.now() / 150)) * -8;
                    rotation = Math.sin(Date.now() / 150) * 0.05;
                    isFlipped = movingRight ? isLeftFacing : !isLeftFacing;
                }

                ctx.translate(c.x, c.y + yBob);
                ctx.rotate(rotation);
                if (isFlipped) ctx.scale(-1, 1);

                ctx.drawImage(img,
                    srcX, srcY, frameW, frameH,
                    -(frameW * customScale) / 2 + destOffsetX + tweakX,
                    -frameH * customScale + tweakY,
                    frameW * customScale, frameH * customScale
                );
                ctx.restore();
            }
            // Render paddle in front of them
            this.drawFlightPaddle(c);
        }

        // 4. Draw Towers and ONE Central Menu
        this.drawTower();
        
        // 5. Draw HUD
        const h = SPRITE_DATA.hud_elements;
        ctx.save();
        ctx.textAlign = "right";
        ctx.font = `bold ${Math.round(70 * h.score.s)}px "Bebas Neue"`;
        ctx.shadowColor = "black";
        ctx.shadowBlur = 10;
        ctx.fillStyle = "#ffcc00";
        ctx.fillText(`TIPS: ${this.score}`, h.score.x, h.score.y);
        ctx.restore();

        // HUD Glass pulses based on the MOST impatient customer
        let lowestPatiencePct = 1.0;
        const waitingList = this.customers.filter(c => c.state === 'waiting');
        if (waitingList.length > 0) {
            lowestPatiencePct = Math.min(...waitingList.map(c => c.patience / c.patienceMax));
        }

        for (let i = 0; i < 3; i++) {
            let isDead = i >= this.lives;
            let patiencePct = 1.0;
            if (!isDead && waitingList.length > 0 && i === this.lives - 1) {
                patiencePct = lowestPatiencePct;
            }
            this.drawBeerLife(h.lives.x + (i * h.lives.spacing), h.lives.y, h.lives.s, isDead, patiencePct);
        }

        // 6. Game Over / Leaderboard Overlay
        if (this.isGameOver) {
            ctx.save();
            ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
            ctx.fillRect(0, 0, WORLD.w, WORLD.h);

            if (this.showLeaderboard) {
                ctx.textAlign = "center";
                ctx.font = "bold 80px 'Bebas Neue', monospace";
                ctx.fillStyle = "#ffcc00";
                ctx.fillText("--- TITANS OF THE TAPS ---", WORLD.w / 2, 200);

                ctx.font = "40px 'Bebas Neue', monospace";
                ctx.fillStyle = "#fff";

                // 👇 FIX: Differentiate between Loading and Empty
                if (this.leaderboard.topScores === null) {
                    ctx.textAlign = "center";
                    ctx.fillText("Loading scores...", WORLD.w / 2, 400);
                } else if (this.leaderboard.topScores.length > 0) {
                    this.leaderboard.topScores.forEach((entry, i) => {
                        const name = entry.player ? entry.player.name : "???";
                        ctx.textAlign = "left";
                        ctx.fillText(`${entry.rank}. ${name}`, WORLD.w / 2 - 200, 320 + (i * 55));
                        ctx.textAlign = "right";
                        ctx.fillText(entry.score, WORLD.w / 2 + 200, 320 + (i * 55));
                    });
                } else {
                    ctx.textAlign = "center";
                    ctx.fillText("No high scores yet!", WORLD.w / 2, 400);
                }

                ctx.fillStyle = "#222"; ctx.strokeStyle = "#ffcc00"; ctx.lineWidth = 6;
                ctx.fillRect(WORLD.w / 2 - 200, 900, 400, 90);
                ctx.strokeRect(WORLD.w / 2 - 200, 900, 400, 90);
                ctx.fillStyle = "#fff";
                ctx.font = "bold 40px 'Bebas Neue', monospace";
                ctx.textAlign = "center";
                ctx.fillText("BACK", WORLD.w / 2, 960);

            } else {
                ctx.textAlign = "center";
                ctx.font = "bold 120px 'Bebas Neue', monospace";
                ctx.fillStyle = "#f00";
                ctx.fillText("GAME OVER", WORLD.w / 2, 400);

                ctx.font = "bold 60px 'Bebas Neue', monospace";
                ctx.fillStyle = "#ffcc00";
                ctx.fillText(`FINAL TIPS: ${this.score}`, WORLD.w / 2, 520);

                ctx.fillStyle = "#222"; ctx.strokeStyle = "#ffcc00"; ctx.lineWidth = 6;
                ctx.font = "bold 40px 'Bebas Neue', monospace";

                ctx.fillRect(WORLD.w / 2 - 200, 600, 400, 90);
                ctx.strokeRect(WORLD.w / 2 - 200, 600, 400, 90);
                ctx.fillStyle = "#fff";
                ctx.fillText("PLAY AGAIN", WORLD.w / 2, 660);

                ctx.fillStyle = "#222";
                ctx.fillRect(WORLD.w / 2 - 200, 720, 400, 90);
                ctx.strokeRect(WORLD.w / 2 - 200, 720, 400, 90);
                ctx.fillStyle = "#fff";
                ctx.fillText("HIGH SCORES", WORLD.w / 2, 780);

                ctx.fillStyle = "#222";
                ctx.fillRect(WORLD.w / 2 - 200, 840, 400, 90);
                ctx.strokeRect(WORLD.w / 2 - 200, 840, 400, 90);
                ctx.fillStyle = "#fff";
                ctx.fillText("HOME", WORLD.w / 2, 900);
            }
            ctx.restore();
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
