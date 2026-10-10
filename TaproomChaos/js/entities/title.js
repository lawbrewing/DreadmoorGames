// js/entities/title.js

class FloatingTitle {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color || "#ffffff"; // Default to white

        this.alpha = 1.0;
        this.life = 1.5; // How many seconds the text survives
        this.active = true;
    }

    // The text floats up and fades out automatically
    update(dt) {
        if (!this.active) return;

        this.y -= 40 * dt; // Float upwards at 40px per second
        this.life -= dt;

        // Fade out based on remaining life
        this.alpha = Math.max(0, this.life / 1.5);

        if (this.life <= 0) {
            this.active = false; // Flag for deletion
        }
    }
}