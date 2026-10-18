// js/entities/patron.js

const PATRON_STATE = {
    ENTER: 'ENTER',
    IDLE: 'IDLE',
    CHEER: 'CHEER',
    ANGRY: 'ANGRY',
    EXIT: 'EXIT',
    GO_TO_ACTIVITY: 'GO_TO_ACTIVITY',
    DANCING: 'DANCING',
    DARTS: 'DARTS'
};

class Patron {
    constructor(x, y, rosterKey, config) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.x = x + (Math.random() * 6 - 3);
        this.y = y + (Math.random() * 6 - 3);
        this.w = 64; this.h = 64;

        const safeConfig = config || {};
        this.rosterKey = rosterKey;
        this.type = safeConfig.filePrefix || rosterKey;
        this.speed = safeConfig.speed || 35;
        this.maxPatience = safeConfig.patience || 40;
        this.currentPatience = this.maxPatience;
        this.craves = safeConfig.craves || ['premium'];
        this.tipBase = safeConfig.tipBase || 12;

        this.alpha = 0;
        this.waypoints = [];
        this.targetX = this.x;
        this.targetY = this.y;
        this.groupId = null;
        this.receivedPreferredDrink = false;
        this.active = true;
        this.penaltyApplied = false;

        // AFTER-PARTY MECHANICS
        this.activity = 'EXIT';
        this.activityTimer = 0;

        // ANIMATION ENGINE
        this.animFrame = 0;
        this.animSpeed = 8;
        this.facing = 'DOWN';
        this.spriteRow = 'walk';
        this.stateTimer = 0;

        this.setState(PATRON_STATE.ENTER);
    }

    setState(newState) {
        if (this.currentState === PATRON_STATE.EXIT) return;
        this.currentState = newState;
        this.animFrame = 0;

        switch (this.currentState) {
            case PATRON_STATE.ENTER:
                this.spriteRow = 'walk';
                break;
            case PATRON_STATE.IDLE:
                this.spriteRow = 'walk';
                this.facing = 'DOWN';
                break;
            case PATRON_STATE.CHEER:
                this.spriteRow = 'spellcast';
                this.facing = 'DOWN';
                this.stateTimer = 1.2;
                break;
            case PATRON_STATE.ANGRY:
                this.spriteRow = 'thrust';
                this.facing = 'DOWN';
                this.stateTimer = 1.2;
                break;
            case PATRON_STATE.GO_TO_ACTIVITY:
                this.spriteRow = 'walk';
                break;
            case PATRON_STATE.DANCING:
                this.spriteRow = 'spellcast';
                this.stateTimer = 8.0 + Math.random() * 5.0; // Dance for 8-13s
                this.activityTimer = 0;
                break;
            case PATRON_STATE.DARTS:
                this.spriteRow = 'shoot';
                this.facing = 'LEFT'; // Face the left wall dartboard
                this.stateTimer = 5.0 + Math.random() * 3.0;
                this.activityTimer = 1.0; // Pause before throwing
                break;
            case PATRON_STATE.EXIT:
                this.spriteRow = 'walk';
                this.facing = 'UP';
                break;
        }
    }

    setPath(points) {
        this.waypoints = points;
        if (this.waypoints.length > 0) {
            this.targetX = this.waypoints[0].x;
            this.targetY = this.waypoints[0].y;
            this.setState(PATRON_STATE.ENTER);
        }
    }

    update(dt, allPatrons = []) {
        if (!this.active) return;
        if (this.alpha < 1) this.alpha = Math.min(1, this.alpha + (dt * 2));

        const speedMult = (this.currentState === PATRON_STATE.CHEER || this.currentState === PATRON_STATE.ANGRY) ? 1.5 : 1.0;
        this.animFrame += (this.animSpeed * speedMult) * dt;

        switch (this.currentState) {
            case PATRON_STATE.CHEER:
            case PATRON_STATE.ANGRY:
                this.facing = 'DOWN';
                this.stateTimer -= dt;
                if (this.stateTimer <= 0) {
                    if (this.currentState === PATRON_STATE.CHEER && (this.activity === 'DANCE' || this.activity === 'DARTS')) {
                        this.setState(PATRON_STATE.GO_TO_ACTIVITY);
                    } else {
                        this.setState(PATRON_STATE.EXIT);
                    }
                }
                break;

            case PATRON_STATE.GO_TO_ACTIVITY:
                this.handleWalking(dt, allPatrons);
                if (this.waypoints.length === 0) {
                    this.setState(this.activity === 'DANCE' ? PATRON_STATE.DANCING : PATRON_STATE.DARTS);
                }
                break;

            case PATRON_STATE.DANCING:
                this.stateTimer -= dt;
                this.activityTimer -= dt;

                // Swap dance moves every ~0.8 seconds!
                if (this.activityTimer <= 0) {
                    const moves = ['spellcast', 'slash', 'thrust'];
                    const dirs = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
                    this.spriteRow = moves[Math.floor(Math.random() * moves.length)];
                    this.facing = dirs[Math.floor(Math.random() * dirs.length)];
                    this.activityTimer = 0.6 + Math.random() * 0.6;
                    this.animFrame = 0;
                }

                if (this.stateTimer <= 0) {
                    // 30% chance to thirst for another drink and head back to the bar!
                    if (Math.random() > 0.7) {
                        this.activity = 'EXIT';
                        this.targetX = (1280 * 0.15) + Math.random() * (1280 * 0.7);
                        this.targetY = 460;
                        this.waypoints = [{ x: this.targetX, y: this.targetY }];
                        this.currentPatience = this.maxPatience;
                        this.setState(PATRON_STATE.ENTER);
                    } else {
                        this.setState(PATRON_STATE.EXIT);
                    }
                }
                break;

            case PATRON_STATE.DARTS:
                this.stateTimer -= dt;
                this.activityTimer -= dt;

                if (this.activityTimer <= 0 && this.spriteRow === 'shoot') {
                    // Throw the dart!
                    if (typeof gameEvents !== 'undefined') {
                        gameEvents.emit('DART_THROWN', { x: this.x, y: this.y - 30 });
                    }
                    // React to their shot
                    this.spriteRow = Math.random() > 0.5 ? 'spellcast' : 'slash';
                    this.facing = 'DOWN';
                    this.activityTimer = 1.5; // Emote for 1.5s
                } else if (this.activityTimer <= 0) {
                    // Reset to throw again
                    this.spriteRow = 'shoot';
                    this.facing = 'LEFT';
                    this.activityTimer = 1.0 + Math.random() * 0.5;
                }

                if (this.stateTimer <= 0) {
                    this.setState(PATRON_STATE.EXIT);
                }
                break;

            case PATRON_STATE.EXIT:
                this.facing = 'UP';
                this.y -= (this.speed * 2.2) * dt;
                if (this.y < 140) this.active = false;
                break;

            case PATRON_STATE.ENTER:
                this.handleWalking(dt, allPatrons);
                if (this.waypoints.length === 0 && this.y >= 460) {
                    this.y = 460;
                    this.setState(PATRON_STATE.IDLE);
                }
                break;

            case PATRON_STATE.IDLE:
                this.currentPatience -= dt;
                if (this.currentPatience <= 0) {
                    this.setState(PATRON_STATE.ANGRY);
                }
                break;
        }
    }

    handleWalking(dt, allPatrons) {
        let dx = this.targetX - this.x;
        let dy = this.targetY - this.y;
        let speedMod = 1.0;

        for (let other of allPatrons) {
            if (other.id === this.id || !other.active || other.currentState === PATRON_STATE.EXIT) continue;
            const distToOther = Math.hypot(this.x - other.x, this.y - other.y);
            if (distToOther < 55 && this.y <= other.y + 10) {
                speedMod = 0.15;
                let pushDir = this.x > other.x ? 1 : -1;
                if (this.x === other.x) pushDir = Math.random() > 0.5 ? 1 : -1;
                this.x += (pushDir * 25) * dt;
            }
        }

        const distance = Math.hypot(dx, dy);
        if (distance > 2) {
            this.x += (dx / distance) * (this.speed * speedMod) * dt;
            this.y += (dy / distance) * (this.speed * speedMod) * dt;

            const angle = Math.atan2(dy, dx);
            let octant = Math.round(8 * angle / (2 * Math.PI) + 8) % 8;
            const directionMap = ['RIGHT', 'DOWN_RIGHT', 'DOWN', 'DOWN_LEFT', 'LEFT', 'UP_LEFT', 'UP', 'UP_RIGHT'];
            this.facing = directionMap[octant];
        } else if (this.waypoints.length > 1) {
            this.waypoints.shift();
            this.targetX = this.waypoints[0].x;
            this.targetY = this.waypoints[0].y;
        } else {
            this.waypoints = [];
        }
    }
}