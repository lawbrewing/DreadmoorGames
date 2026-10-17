// js/entities/patron.js

class Patron {
    constructor(x, y, rosterKey, config) {
        // Unique ID for combo pairing
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

        // Animation & Gameplay State
        this.active = true;
        this.state = 'walk'; // states: 'walk', 'idle', 'drink', 'angry', 'happy'

        // Spouse combo properties
        this.hasSpouse = false;
        this.partnerId = null;
        this.spouseSatisfied = false;
    }

    update(dt) {
        if (!this.active) return;

        // 1. Move towards the bar if in 'walk' state
        if (this.state === 'walk') {
            this.y += this.speed * dt; // Fixed the math typo here!

            // NOTE: We will tell them to stop walking and switch to 'idle' 
            // inside taproom.js when they hit the bar counter!
        }

        // 2. Drain patience if they are waiting at the bar
        if (this.state === 'idle') {
            this.currentPatience -= dt;

            if (this.currentPatience <= 0) {
                // Time ran out!
                this.state = 'angry';
                // Trigger penalty logic here later
            }
        }
    }
}