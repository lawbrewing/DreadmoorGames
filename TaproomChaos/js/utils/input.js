class InputManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.isDragging = false;
        this.bindEvents();
    }

    // Normalizes mouse and touch coordinates to match the CSS physical boundaries
    getPointerPos(evt) {
        const rect = this.canvas.getBoundingClientRect();

        const touch = (evt.touches && evt.touches.length > 0)
            ? evt.touches[0]
            : ((evt.changedTouches && evt.changedTouches.length > 0) ? evt.changedTouches[0] : null);

        const clientX = touch ? touch.clientX : evt.clientX;
        const clientY = touch ? touch.clientY : evt.clientY;

        // Because main.js now scales the context by the devicePixelRatio, 
        // the logical drawing coordinates map 1:1 with the CSS client rect.
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    bindEvents() {
        // --- START DRAG / CLICK ---
        const handleStart = (e) => {
            const pos = this.getPointerPos(e);

            // Map the height to the logical CSS height, not the raw DPI height
            const dpr = window.devicePixelRatio || 1;
            const logicalHeight = this.canvas.height / dpr;

            // ==========================================
            // TAPROOM AMMO QUICK-CYCLE INTERCEPT
            // ==========================================
            if (typeof currentState !== 'undefined' && currentState === 'TAPROOM') {
                // Check if click hits the ammo box (Bottom Left: x: 20-100, y: height - 80 to height)
                if (pos.x >= 20 && pos.x <= 100 && pos.y >= logicalHeight - 80 && pos.y <= logicalHeight) {
                    if (typeof taproomPhase !== 'undefined' && typeof playerState !== 'undefined' && playerState.ammo) {
                        let currentIdx = taproomPhase.selectedAmmoIndex || 0;
                        let nextIdx = (currentIdx + 1) % playerState.ammo.length;

                        // Cycle until we find non-empty ammo
                        while (nextIdx !== currentIdx && playerState.ammo[nextIdx].count !== 'Infinite' && playerState.ammo[nextIdx].count <= 0) {
                            nextIdx = (nextIdx + 1) % playerState.ammo.length;
                        }

                        taproomPhase.selectedAmmoIndex = nextIdx;
                        console.log(`[Input] Quick-swapped ammo to: ${playerState.ammo[nextIdx].name}`);

                        // Play the swap sound effect
                        if (window.audioManager) {
                            window.audioManager.playSFX('swap');
                        }

                        return; // Stop click from passing through to taproom gameplay
                    }
                }
            }

            this.isDragging = true;
            if (typeof gameEvents !== 'undefined') {
                gameEvents.emit('DRAG_START', pos);
            }
        };

        this.canvas.addEventListener('mousedown', handleStart);
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevents screen scrolling/bouncing on mobile
            handleStart(e);
        }, { passive: false });

        // --- MOVE DRAG ---
        const handleMove = (e) => {
            if (!this.isDragging) return;
            const pos = this.getPointerPos(e);
            if (typeof gameEvents !== 'undefined') {
                gameEvents.emit('DRAG_MOVE', pos);
            }
        };

        this.canvas.addEventListener('mousemove', handleMove);
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            handleMove(e);
        }, { passive: false });

        // --- END DRAG / CLICK ---
        const handleEnd = (e) => {
            if (!this.isDragging) return;
            this.isDragging = false;

            const pos = this.getPointerPos(e);
            if (typeof gameEvents !== 'undefined') {
                gameEvents.emit('DRAG_END', pos);
            }
        };

        window.addEventListener('mouseup', handleEnd);
        window.addEventListener('touchend', handleEnd);
        window.addEventListener('touchcancel', handleEnd);
    }
}