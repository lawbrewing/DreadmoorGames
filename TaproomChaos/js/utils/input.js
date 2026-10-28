// js/core/input.js

class InputManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.isDragging = false;

        this.bindEvents();
    }

    // Normalizes mouse and touch coordinates to match our internal 1280x720 canvas size
    getPointerPos(evt) {
        const rect = this.canvas.getBoundingClientRect();

        const touch = (evt.touches && evt.touches.length > 0)
            ? evt.touches[0]
            : ((evt.changedTouches && evt.changedTouches.length > 0) ? evt.changedTouches[0] : null);

        const clientX = touch ? touch.clientX : evt.clientX;
        const clientY = touch ? touch.clientY : evt.clientY;

        const scaleX = this.canvas.width / (rect.width || 1280);
        const scaleY = this.canvas.height / (rect.height || 720);

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    bindEvents() {
        // --- START DRAG / CLICK ---
        const handleStart = (e) => {
            this.isDragging = true;
            const pos = this.getPointerPos(e);
            gameEvents.emit('DRAG_START', pos);
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
            gameEvents.emit('DRAG_MOVE', pos);
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
            gameEvents.emit('DRAG_END', pos);
        };

        window.addEventListener('mouseup', handleEnd);
        window.addEventListener('touchend', handleEnd);
        window.addEventListener('touchcancel', handleEnd);
    }
}