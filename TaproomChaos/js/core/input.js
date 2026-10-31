// js/core/input.js
class InputManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.isDragging = false;

        // Lock the internal resolution regardless of screen size
        this.canvas.width = 1280;
        this.canvas.height = 720;

        this.setupListeners();
    }

    setupListeners() {
        // Mouse Events
        this.canvas.addEventListener('mousedown', (e) => this.handleStart(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMove(e));
        window.addEventListener('mouseup', (e) => this.handleEnd(e));

        // Touch Events (Mobile)
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Stop mobile scrolling
            this.handleStart(e);
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.handleMove(e);
        }, { passive: false });

        // touchend uses changedTouches because the finger has left the screen
        window.addEventListener('touchend', (e) => this.handleEnd(e));
    }

    getScaledPointer(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        // Support both Touch and Mouse seamlessly
        let clientX, clientY;

        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    handleStart(evt) {
        this.isDragging = true;
        const pos = this.getScaledPointer(evt);

        // ==========================================
        // HUD INTERCEPTS (Capture clicks before game)
        // ==========================================
        if (typeof currentState !== 'undefined') {

            // 1. TAPROOM PHASE: AMMO CYCLING (Bottom Left: x: 20-100, y: 640-720)
            if (currentState === 'TAPROOM' || (typeof GAME_STATES !== 'undefined' && currentState === GAME_STATES.TAPROOM)) {
                if (pos.x >= 20 && pos.x <= 100 && pos.y >= this.canvas.height - 80 && pos.y <= this.canvas.height) {
                    if (typeof taproomPhase !== 'undefined' && typeof playerState !== 'undefined') {
                        let currentIdx = taproomPhase.selectedAmmoIndex || 0;
                        let nextIdx = (currentIdx + 1) % playerState.ammo.length;

                        // Cycle until we find one with ammo
                        while (nextIdx !== currentIdx && playerState.ammo[nextIdx].count !== 'Infinite' && playerState.ammo[nextIdx].count <= 0) {
                            nextIdx = (nextIdx + 1) % playerState.ammo.length;
                        }

                        taproomPhase.selectedAmmoIndex = nextIdx;
                        console.log(`[HUD] Quick-swapped ammo to: ${playerState.ammo[nextIdx].name}`);

                        this.isDragging = false;
                        return; // Stop click from reaching the taproom logic
                    }
                }
            }

            // 2. BREWING PHASE: HINT BUTTON (x: 20-140, y: 100-140)
            if (currentState === 'BREWING' || (typeof GAME_STATES !== 'undefined' && currentState === GAME_STATES.BREWING)) {
                if (pos.x >= 20 && pos.x <= 140 && pos.y >= 100 && pos.y <= 140) {
                    if (typeof playerState !== 'undefined' && typeof brewingPhase !== 'undefined' && brewingPhase.activeContract) {
                        const contract = brewingPhase.activeContract;
                        const unknown = contract.targetRecipe.ingredients.filter(ing => !contract.revealedIngredients.includes(ing));

                        if (unknown.length > 0 && playerState.tips >= 1.00) {
                            playerState.tips -= 1.00;
                            const randomIng = unknown[Math.floor(Math.random() * unknown.length)];
                            contract.revealedIngredients.push(randomIng);
                            console.log(`[HUD] Hint purchased! Revealed: ${randomIng}`);
                        }
                    }
                    this.isDragging = false;
                    return; // Stop click from reaching the brewing logic
                }
            }
        }

        // If the tap didn't hit a HUD element, pass it to the active game phase
        gameEvents.emit('DRAG_START', pos);
    }

    handleMove(evt) {
        if (!this.isDragging) return;
        const pos = this.getScaledPointer(evt);
        gameEvents.emit('DRAG_MOVE', pos);
    }

    handleEnd(evt) {
        if (!this.isDragging) return;
        this.isDragging = false;
        const pos = this.getScaledPointer(evt);
        gameEvents.emit('DRAG_END', pos);
    }
}