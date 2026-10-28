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
        taproomPhase.update(deltaTime);
    } else if (currentState === GAME_STATES.BREWING) {
        brewingPhase.update(deltaTime);
    }
}

// 4. The Render Loop (Drawing to Canvas)
function draw() {
    renderer.clear();

    if (currentState === GAME_STATES.TAPROOM) {
        renderer.drawTaproom(taproomPhase);
    } else if (currentState === GAME_STATES.BREWING) {
        renderer.drawBrewing(brewingPhase);
    }
}

// 5. The Core Loop Heartbeat
function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    let deltaTime = Math.min(0.1, (timestamp - lastTime) / 1000);
    lastTime = timestamp;

    // --- BANKRUPTCY CHECK ---
    if (playerState.tips < 0 && currentState !== GAME_STATES.GAME_OVER) {
        console.log("BANKRUPT!");
        currentState = GAME_STATES.GAME_OVER;

        if (typeof taproomPhase !== 'undefined') taproomPhase.shutdown();
        if (typeof brewingPhase !== 'undefined') brewingPhase.shutdown();

        hud.showGameOver();
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

// --- TEMPORARY BUTTON TEST (Using the Event Bus) ---
const toggleBtn = document.getElementById('test-toggle-phase');
if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
        const nextState = currentState === GAME_STATES.TAPROOM ? GAME_STATES.BREWING : GAME_STATES.TAPROOM;
        gameEvents.emit('CHANGE_STATE', { newState: nextState });
    });
}

// 6. Boot it up! (Wait for sprites to load first!)
spriteManager.preloadAll(PATRON_ROSTER).then(() => {
    console.log("[Engine] All Patron & MegaPack Sprites Loaded!");

    if (currentState === GAME_STATES.TAPROOM) {
        taproomPhase.init();
    } else if (currentState === GAME_STATES.BREWING) {
        brewingPhase.init();
    }

    requestAnimationFrame(gameLoop);
});