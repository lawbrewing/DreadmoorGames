// js/core/input.js

class InputManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.isDragging = false;
        this.bindEvents();
    }

    getPointerPos(evt) {
        const rect = this.canvas.getBoundingClientRect();

        const touch = (evt.touches && evt.touches.length > 0)
            ? evt.touches[0]
            : ((evt.changedTouches && evt.changedTouches.length > 0) ? evt.changedTouches[0] : null);

        const clientX = touch ? touch.clientX : evt.clientX;
        const clientY = touch ? touch.clientY : evt.clientY;

        const safeWidth = Math.max(1, rect.width);
        const safeHeight = Math.max(1, rect.height);

        const scaleX = this.canvas.width / safeWidth;
        const scaleY = this.canvas.height / safeHeight;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    bindEvents() {
        // --- START DRAG / CLICK ---
        const handleStart = (e) => {
            const pos = this.getPointerPos(e);

            // ==========================================
            // NATIVE CANVAS MENU BUTTON (TOP-LEFT: x 0..280, y 0..70)
            // ==========================================
            if (pos.x >= 0 && pos.x <= 280 && pos.y >= 0 && pos.y <= 70) {
                const isTaproom = (typeof currentState !== 'undefined' && currentState === 'TAPROOM');
                const activeDrawer = document.getElementById(isTaproom ? 'taproomHUD' : 'brewingHUD');
                if (activeDrawer) {
                    activeDrawer.classList.add('open');
                }
                return;
            }

            // ==========================================
            // TAPROOM AMMO QUICK-CYCLE INTERCEPT
            // ==========================================
            if (typeof currentState !== 'undefined' && currentState === 'TAPROOM') {
                if (pos.x >= 20 && pos.x <= 100 && pos.y >= 640 && pos.y <= 720) {
                    if (typeof taproomPhase !== 'undefined' && typeof playerState !== 'undefined' && playerState.ammo) {
                        let currentIdx = taproomPhase.selectedAmmoIndex || 0;
                        let nextIdx = (currentIdx + 1) % playerState.ammo.length;

                        while (nextIdx !== currentIdx && playerState.ammo[nextIdx].count !== 'Infinite' && playerState.ammo[nextIdx].count <= 0) {
                            nextIdx = (nextIdx + 1) % playerState.ammo.length;
                        }

                        taproomPhase.selectedAmmoIndex = nextIdx;
                        if (window.audioManager) {
                            window.audioManager.playSFX('swap');
                        }
                        return;
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
            e.preventDefault();
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