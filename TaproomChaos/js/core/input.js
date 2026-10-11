// js/core/input.js
class InputManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.isDragging = false;
        this.setupListeners();
    }

    setupListeners() {
        // Mouse Events
        this.canvas.addEventListener('mousedown', (e) => this.handleStart(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMove(e));
        window.addEventListener('mouseup', (e) => this.handleEnd(e));

        // Touch Events
        this.canvas.addEventListener('touchstart', (e) => { e.preventDefault(); this.handleStart(e.touches[0]); }, { passive: false });
        this.canvas.addEventListener('touchmove', (e) => { e.preventDefault(); this.handleMove(e.touches[0]); }, { passive: false });
        window.addEventListener('touchend', (e) => this.handleEnd(e.changedTouches[0]));
    }

    getMousePos(evt) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        return {
            x: (evt.clientX - rect.left) * scaleX,
            y: (evt.clientY - rect.top) * scaleY
        };
    }

    handleStart(evt) {
        this.isDragging = true;
        const pos = this.getMousePos(evt);
        gameEvents.emit('DRAG_START', pos);
    }

    handleMove(evt) {
        if (!this.isDragging) return;
        const pos = this.getMousePos(evt);
        gameEvents.emit('DRAG_MOVE', pos);
    }

    handleEnd(evt) {
        if (!this.isDragging) return;
        this.isDragging = false;
        const pos = this.getMousePos(evt);
        gameEvents.emit('DRAG_END', pos);
    }
}