// js/core/input.js

class InputManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.isDragging = false;
        this.bindEvents();
    }

    getPointerPos(evt) {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        const touch = (evt.touches && evt.touches.length > 0)
            ? evt.touches[0]
            : ((evt.changedTouches && evt.changedTouches.length > 0) ? evt.changedTouches[0] : null);

        const clientX = touch ? touch.clientX : evt.clientX;
        const clientY = touch ? touch.clientY : evt.clientY;

        // Failsafe logical dimensions so scale can NEVER become NaN
        const logicalW = window.GAME_WIDTH || (this.canvas.width / dpr) || 1280;
        const logicalH = window.GAME_HEIGHT || (this.canvas.height / dpr) || 720;

        const safeWidth = Math.max(1, rect.width);
        const safeHeight = Math.max(1, rect.height);

        const offsetX = clientX - rect.left;
        const offsetY = clientY - rect.top;

        return {
            x: offsetX * (logicalW / safeWidth),
            y: offsetY * (logicalH / safeHeight)
        };
    }

    bindEvents() {
        // --- START DRAG / CLICK ---
        const handleStart = (e) => {
            // If an HTML HUD drawer is open, tapping the canvas outside of it closes it cleanly
            const brewDrawer = document.getElementById('brewingHUD');
            const tapDrawer = document.getElementById('taproomHUD');
            if ((brewDrawer && brewDrawer.classList.contains('open')) ||
                (tapDrawer && tapDrawer.classList.contains('open'))) {
                if (brewDrawer) brewDrawer.classList.remove('open');
                if (tapDrawer) tapDrawer.classList.remove('open');
                return;
            }

            const pos = this.getPointerPos(e);

            // ==========================================
            // NATIVE CANVAS MENU BUTTON (TOP-LEFT)
            // ==========================================
            const menuW = (typeof brewingPhase !== 'undefined' && brewingPhase.menuBtn) ? brewingPhase.menuBtn.w : 140;
            const menuH = (typeof brewingPhase !== 'undefined' && brewingPhase.menuBtn) ? brewingPhase.menuBtn.h : 48;
            if (pos.x >= 14 && pos.x <= 14 + menuW && pos.y >= 12 && pos.y <= 12 + menuH) {
                const toggleBtn = document.getElementById('btnToggleHUD');
                if (toggleBtn) {
                    toggleBtn.click();
                } else if (typeof currentState !== 'undefined' && currentState === 'TAPROOM' && tapDrawer) {
                    tapDrawer.classList.toggle('open');
                } else if (brewDrawer) {
                    brewDrawer.classList.toggle('open');
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