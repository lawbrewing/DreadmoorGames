// js/entities/patron.js

class Patron {
    constructor(x, y, rosterKey, config) {
        // Unique ID for individual tracking
        this.id = Math.random().toString(36).substr(2, 9);

        this.x = x;
        this.y = y;

        // Updated to match your 64x64 LPC Sprite sizes
        this.w = 64;
        this.h = 64;

        // Load stats directly from the Config Blueprint
        this.rosterKey = rosterKey;    // e.g., 'KID', 'VIP', 'KAREN'
        this.type = config.filePrefix; // e.g., 'kid', 'vip', 'karen'
        this.speed = config.speed;
        this.maxPatience = config.patience;
        this.currentPatience = config.patience;
        this.craves = config.craves || ['premium'];
        this.tipBase = config.tipBase || 12;

        // --- NEW: Animation Engine Properties ---
        this.state = 'walk'; // states: 'walk', 'idle', 'drink', 'angry', 'happy', 'fail'
        this.animFrame = 0;
        this.animSpeed = 8; // Adjust to make the walking legs move faster/slower

        // --- NEW: Upgraded Party/Combo Properties (Groups of 2-3) ---
        this.groupId = null; // Will be assigned by the Taproom spawner
        this.receivedPreferredDrink = false; // Tracks if they got their favorite!
    }

    update(dt) {
        if (!this.active) return;

        // Advance the animation frame! (Crucial for SpriteManager to cycle images)
        this.animFrame += this.animSpeed * dt;

        // 1. Move towards the bar if in 'walk' state
        if (this.state === 'walk') {
            this.y += this.speed * dt; // Syntax fixed!

            // NOTE: We will tell them to stop walking and switch to 'idle' 
            // inside taproom.js when they hit the bar counter!
        }

        // 2. Drain patience if they are waiting at the bar
        if (this.state === 'idle') {
            this.currentPatience -= dt;

            if (this.currentPatience <= 0) {
                // Time ran out!
                this.state = 'fail'; // Maps to 'hurt.png' to show they are upset
            }
        }
    }
}