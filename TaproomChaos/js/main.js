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
    BREWING: 'BREWING', // Added missing comma
    GAME_OVER: 'GAME_OVER'
};

// Start in the Taproom phase
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
    // Fixed the mangled deltaTime calculation
    if (!lastTime) lastTime = timestamp;
    let deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    // --- BANKRUPTCY CHECK ---
    if (playerState.tips < 0 && currentState !== GAME_STATES.GAME_OVER) {
        console.log("BANKRUPT!");
        currentState = GAME_STATES.GAME_OVER;

        // Shut down both phases so gameplay freezes
        if (typeof taproomPhase !== 'undefined') taproomPhase.shutdown();
        if (typeof brewingPhase !== 'undefined') brewingPhase.shutdown();

        // Throw up the Game Over UI
        hud.showGameOver();
        return; // Stop the game loop completely!
    }

    // Run Engine Updates
    update(deltaTime);

    // Update HTML DOM
    if (typeof hud !== 'undefined') hud.update();

    // Draw Canvas
    draw();

    // Ask the browser to run this function again on the next frame
    requestAnimationFrame(gameLoop);
}

// --- STATE TRANSITION LISTENERS ---
gameEvents.on('CHANGE_STATE', (data) => {
    if (GAME_STATES[data.newState]) {
        // 1. Shut down the current phase
        if (currentState === GAME_STATES.TAPROOM) {
            taproomPhase.shutdown();
        } else if (currentState === GAME_STATES.BREWING) {
            brewingPhase.shutdown();
        }

        // 2. Flip the internal switch
        currentState = data.newState;
        console.log(`[Main] State changed to: ${currentState}`);

        // 3. Flip the HTML HUD switch!
        if (typeof hud !== 'undefined') {
            hud.switchPhase(currentState);
        }

        // 4. Boot up the new phase
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

// 6. Boot it up!
if (currentState === GAME_STATES.TAPROOM) {
    taproomPhase.init();
} else if (currentState === GAME_STATES.BREWING) {
    brewingPhase.init();
}
requestAnimationFrame(gameLoop);