// js/main.js

// 1. Setup the Canvas Context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Initialize Systems
const renderer = new GameRenderer(canvas, ctx);
const hud = new GameHUD();
const inputManager = new InputManager(canvas);

// 2. Define the Game States
const GAME_STATES = {
    LOADING: 'LOADING',
    MENU: 'MENU',
    TAPROOM: 'TAPROOM',
    BREWING: 'BREWING',
    GAME_OVER: 'GAME_OVER'
};

// Start in the Brewing phase
let currentState = GAME_STATES.BREWING;
let lastTime = 0;
hud.switchPhase(currentState);

// 3. The Update Loop (Math & Logic)
function update(deltaTime) {
    if (currentState === GAME_STATES.TAPROOM) {
        if (typeof taproomPhase !== 'undefined') taproomPhase.update(deltaTime);
    } else if (currentState === GAME_STATES.BREWING) {
        if (typeof brewingPhase !== 'undefined') brewingPhase.update(deltaTime);
    }
}

// 4. The Render Loop (Drawing to Canvas)
function draw() {
    renderer.clear();

    if (currentState === GAME_STATES.TAPROOM) {
        if (typeof taproomPhase !== 'undefined') renderer.drawTaproom(taproomPhase);
    } else if (currentState === GAME_STATES.BREWING) {
        if (typeof brewingPhase !== 'undefined') renderer.drawBrewing(brewingPhase);
    }
}

// 5. The Core Loop Heartbeat
function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    let deltaTime = Math.min(0.1, (timestamp - lastTime) / 1000); // Fixed missing minus sign
    lastTime = timestamp;

    // --- BANKRUPTCY CHECK ---
    let totalAmmo = 0;
    if (typeof playerState !== 'undefined' && playerState.ammo) {
        playerState.ammo.forEach(a => {
            totalAmmo += (a.count === 'Infinite' ? 999 : a.count);
        });
    }

    // Trigger if tips drop below zero OR (less than $1.00 to brew AND out of ammo)
    const isBroke = typeof playerState !== 'undefined' && (playerState.tips < 0 || (playerState.tips < 1.00 && totalAmmo <= 0));

    if (isBroke && currentState !== GAME_STATES.GAME_OVER) {
        console.log("BANKRUPT!");
        currentState = GAME_STATES.GAME_OVER;

        if (typeof taproomPhase !== 'undefined') taproomPhase.shutdown();
        if (typeof brewingPhase !== 'undefined') brewingPhase.shutdown();

        gameEvents.emit('BANKRUPT');
        if (typeof hud !== 'undefined') hud.showGameOver();
        return;
    }

    update(deltaTime);
    if (typeof hud !== 'undefined') hud.update();
    draw();

    requestAnimationFrame(gameLoop);
}

// --- STATE TRANSITION LISTENERS ---
gameEvents.on('CHANGE_STATE', (data) => {
    if (GAME_STATES[data.newState]) {
        if (currentState === GAME_STATES.TAPROOM) {
            taproomPhase.shutdown();
        } else if (currentState === GAME_STATES.BREWING) {
            brewingPhase.shutdown();
        }

        currentState = data.newState;
        console.log(`[Main] State changed to: ${currentState}`);

        if (typeof hud !== 'undefined') {
            hud.switchPhase(currentState);
        }

        if (currentState === GAME_STATES.TAPROOM) {
            taproomPhase.init();
        } else if (currentState === GAME_STATES.BREWING) {
            brewingPhase.init();
        }
    }
});

// ==========================================
// 6. NETWORK LOGIC & TAILSCALE INTEGRATION
// ==========================================
const API_BASE = "https://lawbrewing.tail03b2f1.ts.net/api";

// ... loadPlayerSaveFromPi remains identical ...

window.savePlayerStateToPi = async function() {
    const playerId = localStorage.getItem('dreadmoor_player_id') || 'GUEST';

    // 1. Format the JSON Save Payload
    const savePayload = {
        player_id: playerId,
        timestamp: new Date().toISOString(),
        economy: {
            tips: typeof playerState !== 'undefined' ? playerState.tips : 0,
            unlockedKettles: typeof playerState !== 'undefined' ? playerState.unlockedKettles : 1,
            unlockedRecipes: typeof playerState !== 'undefined' ? playerState.unlockedRecipes : []
        },
        progression: {
            shift: typeof progressionState !== 'undefined' ? progressionState.shift : 1,
            year: typeof progressionState !== 'undefined' ? progressionState.year : 1,
            season: typeof progressionState !== 'undefined' ? progressionState.season : 'spring'
        }
    };

    // Buffer locally first
    localStorage.setItem(`save_backup_${playerId}`, JSON.stringify(savePayload));

    try {
        // 2. Write the JSON Save file (For resuming career)
        await fetch(`${API_BASE}/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(savePayload)
        });
        console.log("[Network] Game state saved to JSON on Pi.");

        // 3. Write cumulative career stats to SQLite (For Global Leaderboard)
        const telStats = window.taproomTelemetry ? window.taproomTelemetry.stats : {};

        await fetch(`${API_BASE}/scores/taproom_chaos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                player_name: playerId,
                score: typeof playerState !== 'undefined' ? playerState.tips : 0,
                level_reached: typeof progressionState !== 'undefined' ? progressionState.shift : 1,
                stats: telStats
            })
        });
        console.log("[Network] Cumulative SQLite Ledger updated on Pi.");

    } catch (err) {
        console.warn("[Network] Could not reach Pi. Save buffered locally.", err);
    }
};

window.savePlayerStateToPi = async function() {
    const playerId = localStorage.getItem('dreadmoor_player_id') || 'GUEST';

    const savePayload = {
        player_id: playerId,
        timestamp: new Date().toISOString(),
        economy: {
            tips: typeof playerState !== 'undefined' ? playerState.tips : 0,
            unlockedKettles: typeof playerState !== 'undefined' ? playerState.unlockedKettles : 1,
            unlockedRecipes: typeof playerState !== 'undefined' ? playerState.unlockedRecipes : []
        },
        progression: {
            shift: typeof progressionState !== 'undefined' ? progressionState.shift : 1,
            year: typeof progressionState !== 'undefined' ? progressionState.year : 1,
            season: typeof progressionState !== 'undefined' ? progressionState.season : 'spring'
        }
    };

    localStorage.setItem(`save_backup_${playerId}`, JSON.stringify(savePayload));

    try {
        await fetch(`${API_BASE}/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(savePayload)
        });
        console.log("[Network] Save synced to Pi successfully.");
    } catch (err) {
        console.warn("[Network] Could not reach Pi. Save buffered locally.", err);
    }
};

// ==========================================
// 7. THE BOUNCER (START SCREEN LOGIC)
// ==========================================
const startScreen = document.getElementById('startScreen');
const loginBox = document.getElementById('loginBox');
const welcomeBackBox = document.getElementById('welcomeBackBox');
const playerNameInput = document.getElementById('playerNameInput');
const welcomeName = document.getElementById('welcomeName');
const btnSubmitName = document.getElementById('btnSubmitName');
const btnResumeGame = document.getElementById('btnResumeGame');
const btnSwitchUser = document.getElementById('btnSwitchUser');

let currentPlayer = localStorage.getItem('dreadmoor_player_id');

if (currentPlayer) {
    if (loginBox) loginBox.style.display = 'none';
    if (welcomeBackBox) welcomeBackBox.style.display = 'block';
    if (welcomeName) welcomeName.innerText = currentPlayer;
} else {
    if (loginBox) loginBox.style.display = 'block';
    if (welcomeBackBox) welcomeBackBox.style.display = 'none';
}

async function startGameSession(playerName) {
    const cleanName = playerName.toUpperCase().trim();
    localStorage.setItem('dreadmoor_player_id', cleanName);
    currentPlayer = cleanName;

    // Lock UI and fetch data
    if (btnSubmitName) btnSubmitName.innerText = "LOADING...";
    if (btnResumeGame) btnResumeGame.innerText = "LOADING...";

    await window.loadPlayerSaveFromPi(currentPlayer);

    if (startScreen) startScreen.style.display = 'none';

    // Clean Audio Context Unlock
    if (window.audioManager && window.audioManager.isUnlocked === false) {
        window.audioManager.startJukebox();
    }

    // Init phase based on current state
    if (currentState === GAME_STATES.TAPROOM) {
        taproomPhase.init();
    } else if (currentState === GAME_STATES.BREWING) {
        brewingPhase.init();
    }

    // Kickoff the loop
    requestAnimationFrame(gameLoop);
}

if (btnSubmitName) {
    btnSubmitName.addEventListener('pointerdown', () => {
        const name = playerNameInput.value.trim();
        if (name.length > 0) startGameSession(name);
    });
}

if (playerNameInput) {
    playerNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const name = playerNameInput.value.trim();
            if (name.length > 0) startGameSession(name);
        }
    });
}

if (btnResumeGame) {
    btnResumeGame.addEventListener('pointerdown', () => {
        startGameSession(currentPlayer);
    });
}

if (btnSwitchUser) {
    btnSwitchUser.addEventListener('pointerdown', () => {
        localStorage.removeItem('dreadmoor_player_id');
        currentPlayer = null;
        if (welcomeBackBox) welcomeBackBox.style.display = 'none';
        if (loginBox) loginBox.style.display = 'block';
    });
}

// ==========================================
// 8. BOOT SEQUENCE
// ==========================================
// Disable buttons until assets are ready
if (btnSubmitName) btnSubmitName.disabled = true;
if (btnResumeGame) btnResumeGame.disabled = true;

spriteManager.preloadAll(PATRON_ROSTER).then(() => {
    console.log("[Engine] All Patron & MegaPack Sprites Loaded!");
    // Re-enable buttons on the start screen now that graphics are ready
    if (btnSubmitName) {
        btnSubmitName.disabled = false;
        btnSubmitName.innerText = "CLOCK IN";
    }
    if (btnResumeGame) {
        btnResumeGame.disabled = false;
        btnResumeGame.innerText = "RESUME SHIFT";
    }
});