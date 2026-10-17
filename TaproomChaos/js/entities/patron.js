// js/entities/patron.js

class Patron {
    constructor(x, y, rosterKey, config) {
        // Unique ID for individual tracking
        this.id = Math.random().toString(36).substr(2, 9);

        this.x = x;
        this.y = y;

        // 64x64 LPC Sprite sizes
        this.w = 64;
        this.h = 64;

        // Load stats directly from the Config Blueprint
        this.rosterKey = rosterKey;
        this.type = config.filePrefix;
        this.speed = config.speed;
        this.maxPatience = config.patience;
        this.currentPatience = config.patience;
        this.craves = config.craves || ['premium'];
        this.tipBase = config.tipBase || 12;

        // Animation Engine Properties
        this.state = 'walk';
        this.animFrame = 0;
        this.animSpeed = 8;

        // Party/Combo Properties
        this.groupId = null;
        this.receivedPreferredDrink = false;
        this.active = true;
    }

    update(dt) {
        if (!this.active) return;

        // FIXED: Added missing multiplication operators (*)
        this.animFrame += this.animSpeed * dt;

        // 1. Move down towards the bar if walking
        if (this.state === 'walk') {
            this.y += this.speed * dt;
        }

        // 2. Drain patience if waiting at the bar
        if (this.state === 'idle') {
            this.currentPatience -= dt;

            if (this.currentPatience <= 0) {
                this.state = 'fail';
            }
        }
    }
}