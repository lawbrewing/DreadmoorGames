// js/main.js

// 1. Setup the Canvas Context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- NEW: Initialize the Renderer ---
const renderer = new GameRenderer(canvas, ctx);

// Initialize the Input Manager
const inputManager = new InputManager(canvas);

// 2. Define the Game States
const GAME_STATES = {
    LOADING: 'LOADING',
    MENU: 'MENU',
    TAPROOM: 'TAPROOM', // The physics action phase
    BREWING: 'BREWING'  // The merge puzzle phase
};

// For now, we'll force the game to start in the TAPROOM phase to test it
let currentState = GAME_STATES.TAPROOM;
let lastTime = 0;

// 3. The Update Loop (Math & Logic)
// --- Update the update() function ---
function update(deltaTime) {
    if (currentState === GAME_STATES.TAPROOM) {
        taproomPhase.update(deltaTime);
    } else if (currentState === GAME_STATES.BREWING) {
        brewingPhase.update(deltaTime);
    }
}

// 4. The Render Loop (Drawing to Canvas)
// --- Update the draw() function ---
function draw() {
    renderer.clear();

    if (currentState === GAME_STATES.TAPROOM) {
        // Pass the entire taproom phase object to the renderer as state
        renderer.drawTaproom(taproomPhase);
    } else if (currentState === GAME_STATES.BREWING) {
        // Pass the entire brewing phase object to the renderer as state
        renderer.drawBrewing(brewingPhase);
    }
}

// 5. The Core Loop Heartbeat
function gameLoop(timestamp) {
    // Calculate how many milliseconds passed since the last frame (deltaTime)
    // This ensures game speed stays consistent regardless of monitor refresh rate
    let deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    update(deltaTime);
    draw();

    // Ask the browser to run this function again on the next frame
    requestAnimationFrame(gameLoop);
}

// --- STATE TRANSITION LISTENERS ---
gameEvents.on('CHANGE_STATE', (data) => {
    if (GAME_STATES[data.newState]) {

        // 1. Shut down the current phase so it stops drawing/calculating
        if (currentState === GAME_STATES.TAPROOM) {
            taproomPhase.shutdown();
        } else if (currentState === GAME_STATES.BREWING) {
            brewingPhase.shutdown();
        }

        // 2. Flip the switch
        currentState = data.newState;
        console.log(`[Main] State changed to: ${currentState}`);

        // 3. Boot up the new phase
        if (currentState === GAME_STATES.TAPROOM) {
            // Later we will pass the ammo list here
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

taproomPhase.init();
// 6. Boot it up!
requestAnimationFrame(gameLoop);