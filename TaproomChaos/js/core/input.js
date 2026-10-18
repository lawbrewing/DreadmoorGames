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