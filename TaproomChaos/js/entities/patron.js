class Patron {
    constructor(x, y, rosterKey, config) {
        this.id = Math.random().toString(36).substr(2, 9);

        // MICRO-JITTER: Prevents perfect stacking if spawned at the exact same frame
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

        this.state = 'walk';
        this.facing = 'DOWN';
        this.animFrame = 0;
        this.animSpeed = 8;

        // NEW: Fade-in opacity so they step out of the door shadows!
        this.alpha = 0;

        this.waypoints = [];
        this.targetX = this.x;
        this.targetY = this.y;

        this.groupId = null;
        this.receivedPreferredDrink = false;
        this.active = true;
        this.penaltyApplied = false;
    }

    setPath(points) {
        this.waypoints = points;
        if (this.waypoints.length > 0) {
            this.targetX = this.waypoints[0].x;
            this.targetY = this.waypoints[0].y;
            this.state = 'walk';
        }
    }

    update(dt, allPatrons = []) {
        if (!this.active) return;

        if (this.alpha < 1) this.alpha = Math.min(1, this.alpha + dt * 2);
        this.animFrame += this.animSpeed * dt;

        if (this.state === 'walk' || this.state === 'exit') {
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const distance = Math.hypot(dx, dy);

            let speedMod = 1.0;
            if (this.state === 'exit') {
                speedMod = 1.8; // Sprinting speed
            } else {
                for (let other of allPatrons) {
                    if (other.id === this.id || !other.active) continue;
                    const distToOther = Math.hypot(this.x - other.x, this.y - other.y);
                    if (distToOther < 55 && this.y <= other.y + 10) {
                        speedMod = 0.15;
                        let pushDir = this.x > other.x ? 1 : -1;
                        if (this.x === other.x) pushDir = Math.random() > 0.5 ? 1 : -1;
                        this.x += pushDir * 25 * dt;
                    }
                }
            }

            if (distance > 2) {
                // If exiting and within 15 pixels of the final waypoint, snap and delete!
                if (this.state === 'exit' && this.waypoints.length === 1 && distance < 15) {
                    this.active = false;
                    return;
                }

                this.x += (dx / distance) * (this.speed * speedMod) * dt;
                this.y += (dy / distance) * (this.speed * speedMod) * dt;

                const angle = Math.atan2(dy, dx);
                let octant = Math.round(8 * angle / (2 * Math.PI) + 8) % 8;
                const directionMap = ['RIGHT', 'DOWN_RIGHT', 'DOWN', 'DOWN_LEFT', 'LEFT', 'UP_LEFT', 'UP', 'UP_RIGHT'];
                this.facing = directionMap[octant];
            } else {
                if (this.waypoints.length > 1) {
                    this.waypoints.shift();
                    this.targetX = this.waypoints[0].x;
                    this.targetY = this.waypoints[0].y;
                } else {
                    if (this.state === 'exit') {
                        this.active = false;
                    } else {
                        this.state = 'idle';
                        this.facing = 'DOWN';
                    }
                }
            }
        }

        if (this.state === 'idle') {
            this.currentPatience -= dt;
            if (this.currentPatience <= 0) {
                this.state = 'fail';
            }
        }
    }
}