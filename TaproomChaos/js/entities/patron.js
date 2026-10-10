// js/entities/patron.js

class Patron {
    constructor(x, y, type, speed, color) {
        // Generate a unique ID for every patron (vital for the Spouse combo)
        this.id = Math.random().toString(36).substr(2, 9);

        this.x = x;
        this.y = y;
        this.w = 50; // Standard collision width
        this.h = 50; // Standard collision height

        this.type = type;
        this.speed = speed;
        this.color = color;

        this.active = true;

        // Spouse combo properties (default to false/null)
        this.hasSpouse = false;
        this.partnerId = null;
        this.spouseSatisfied = false;
    }

    // The Patron handles its own movement!
    update(dt) {
        if (!this.active) return;
        this.y += this.speed * dt;
    }
}