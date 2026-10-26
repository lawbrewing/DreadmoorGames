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
        this.w = 64;
        this.h = 64;

        const safeConfig = config || {};
        this.rosterKey = rosterKey;
        this.type = safeConfig.filePrefix || rosterKey;
        this.speed = safeConfig.speed || 42;
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
        this.isLeaving = false;

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

    buildExitPath() {
        const doorX = 640;
        const foyerY = 215;
        const doorY = 128;
        const exitRoute = [];

        // If the patron is below the pool table, route through the left or right corridor first
        if (this.y > 325) {
            const useRightCorridor = this.x >= 640;
            exitRoute.push({
                x: useRightCorridor ? 825 + (Math.random() * 20 - 10) : 455 + (Math.random() * 20 - 10),
                y: 350
            });
        }

        // Step to the foyer in front of the rear entrance door, then walk out the door
        exitRoute.push({ x: doorX + (Math.random() * 24 - 12), y: foyerY });
        exitRoute.push({ x: doorX, y: doorY });
        return exitRoute;
    }

    setState(newState) {
        if (this.currentState === PATRON_STATE.EXIT && newState !== PATRON_STATE.EXIT) return;
        this.currentState = newState;
        this.animFrame = 0;

        switch (this.currentState) {
            case PATRON_STATE.ENTER:
                this.spriteRow = 'walk';
                this.isLeaving = false;
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
                this.isLeaving = true;
                if (this.waypoints.length > 0) {
                    this.targetX = this.waypoints[0].x;
                    this.targetY = this.waypoints[0].y;
                }
                break;
            case PATRON_STATE.DANCING:
                this.spriteRow = 'spellcast';
                this.stateTimer = 8.0 + Math.random() * 5.0;
                this.activityTimer = 0;
                break;
            case PATRON_STATE.DARTS:
                this.spriteRow = 'shoot';
                this.facing = 'RIGHT'; // Face the right-wall mounted dartboard
                this.stateTimer = 5.0 + Math.random() * 3.0;
                this.activityTimer = 1.0;
                break;
            case PATRON_STATE.EXIT:
                this.spriteRow = 'walk';
                this.isLeaving = true;
                this.waypoints = this.buildExitPath();
                this.targetX = this.waypoints[0].x;
                this.targetY = this.waypoints[0].y;
                break;
        }
    }

    setPath(points) {
        this.waypoints = points || [];
        if (this.waypoints.length > 0) {
            this.targetX = this.waypoints[0].x;
            this.targetY = this.waypoints[0].y;
            this.setState(PATRON_STATE.ENTER);
        }
    }

    update(dt, allPatrons = [], obstacles = []) {
        if (!this.active) return;
        if (this.alpha < 1 && this.currentState !== PATRON_STATE.EXIT) {
            this.alpha = Math.min(1, this.alpha + (dt * 2));
        }

        const speedMult = (this.currentState === PATRON_STATE.CHEER || this.currentState === PATRON_STATE.ANGRY)
            ? 1.5
            : (this.currentState === PATRON_STATE.EXIT ? 1.65 : 1.0);
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
                this.handleWalking(dt, allPatrons, obstacles, 1.35);
                if (this.waypoints.length === 0) {
                    this.setState(this.activity === 'DANCE' ? PATRON_STATE.DANCING : PATRON_STATE.DARTS);
                }
                break;

            case PATRON_STATE.DANCING:
                this.stateTimer -= dt;
                this.activityTimer -= dt;

                if (this.activityTimer <= 0) {
                    const moves = ['spellcast', 'slash', 'thrust'];
                    const dirs = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
                    this.spriteRow = moves[Math.floor(Math.random() * moves.length)];
                    this.facing = dirs[Math.floor(Math.random() * dirs.length)];
                    this.activityTimer = 0.6 + Math.random() * 0.6;
                    this.animFrame = 0;
                }

                if (this.stateTimer <= 0) {
                    // 30% chance to head back to the Beer Bar for another round!
                    if (Math.random() > 0.7) {
                        this.activity = 'EXIT';
                        this.isLeaving = false;
                        this.receivedPreferredDrink = false;
                        const nextX = 360 + (Math.random() * 80 - 40);
                        const nextY = 555 + (Math.random() * 40 - 20);
                        this.setPath([
                            { x: 445, y: 365 },
                            { x: nextX, y: nextY }
                        ]);
                        this.currentPatience = this.maxPatience;
                    } else {
                        this.setState(PATRON_STATE.EXIT);
                    }
                }
                break;

            case PATRON_STATE.DARTS:
                this.stateTimer -= dt;
                this.activityTimer -= dt;

                if (this.activityTimer <= 0 && this.spriteRow === 'shoot') {
                    if (typeof gameEvents !== 'undefined') {
                        gameEvents.emit('DART_THROWN', { x: this.x + 15, y: this.y - 38 });
                    }
                    this.spriteRow = Math.random() > 0.5 ? 'spellcast' : 'slash';
                    this.facing = 'DOWN';
                    this.activityTimer = 1.5;
                } else if (this.activityTimer <= 0) {
                    this.spriteRow = 'shoot';
                    this.facing = 'RIGHT';
                    this.activityTimer = 1.0 + Math.random() * 0.5;
                }

                if (this.stateTimer <= 0) {
                    this.setState(PATRON_STATE.EXIT);
                }
                break;

            case PATRON_STATE.EXIT:
                this.handleWalking(dt, allPatrons, obstacles, 1.85);
                // Fade out smoothly as they step through the rear doorway
                if (this.y < 168 && Math.abs(this.x - 640) < 75) {
                    this.alpha = Math.max(0, this.alpha - dt * 3.5);
                }
                if (this.waypoints.length === 0 || (this.y <= 138 && Math.abs(this.x - 640) < 60)) {
                    this.active = false;
                }
                break;

            case PATRON_STATE.ENTER:
                this.handleWalking(dt, allPatrons, obstacles, 1.0);
                if (this.waypoints.length === 0) {
                    this.setState(PATRON_STATE.IDLE);
                }
                break;

            case PATRON_STATE.IDLE:
                this.animFrame = 0;
                this.currentPatience -= dt;
                if (this.currentPatience <= 0) {
                    this.setState(PATRON_STATE.ANGRY);
                }
                break;
        }
    }

    resolveObstacleCollisions(obstacles = []) {
        for (const obs of obstacles) {
            if (obs.allowStage && (this.activity === 'DANCE' || this.currentState === PATRON_STATE.DANCING)) continue;
            const rx = (obs.rx || obs.r || 50) + 14;
            const ry = (obs.ry || (obs.r ? obs.r * 0.65 : 35)) + 10;
            const dx = this.x - obs.x;
            const dy = this.y - obs.y;
            const normDist = Math.hypot(dx / rx, dy / ry);

            if (normDist < 1.0 && normDist > 0.0001) {
                const scaleOut = 1.02 / normDist;
                this.x = obs.x + dx * scaleOut;
                this.y = obs.y + dy * scaleOut;
            }
        }
    }

    handleWalking(dt, allPatrons = [], obstacles = [], stateSpeedMult = 1.0) {
        let dx = this.targetX - this.x;
        let dy = this.targetY - this.y;
        let distance = Math.hypot(dx, dy);

        // ARRIVAL THRESHOLD
        if (distance < 8) {
            this.x = this.targetX;
            this.y = this.targetY;
            if (this.waypoints.length > 0) {
                this.waypoints.shift();
                if (this.waypoints.length > 0) {
                    this.targetX = this.waypoints[0].x;
                    this.targetY = this.waypoints[0].y;
                }
            }
            return;
        }

        let dirX = dx / distance;
        let dirY = dy / distance;
        let speedMod = stateSpeedMult;
        let steerX = 0;
        let steerY = 0;

        // 1. ELLIPTICAL OBSTACLE AVOIDANCE (Steers smoothly around counters, pool table & furniture)
        for (const obs of obstacles) {
            // Allow dancers onto the stage platform
            if (obs.allowStage && (this.activity === 'DANCE' || this.currentState === PATRON_STATE.DANCING)) continue;

            const rx = (obs.rx || obs.r || 55) + 24;
            const ry = (obs.ry || (obs.r ? obs.r * 0.65 : 36)) + 18;
            const ox = this.x - obs.x;
            const oy = this.y - obs.y;
            const normDist = Math.hypot(ox / rx, oy / ry);

            if (normDist < 1.35 && normDist > 0.001) {
                const urgency = Math.pow((1.35 - normDist) / 1.35, 1.5);
                const nX = (ox / (rx * rx));
                const nY = (oy / (ry * ry));
                const nLen = Math.hypot(nX, nY) || 1;
                const unitNX = nX / nLen;
                const unitNY = nY / nLen;

                // Tangential slide so patrons glide around the obstacle instead of getting stuck
                const tangentX = -unitNY;
                const tangentY = unitNX;
                const tangentSign = (tangentX * dirX + tangentY * dirY) >= 0 ? 1 : -1;

                steerX += (unitNX * 1.3 + tangentX * tangentSign * 0.95) * urgency * 2.2;
                steerY += (unitNY * 1.3 + tangentY * tangentSign * 0.95) * urgency * 2.2;
            }
        }

        // 2. SOFT PATRON-TO-PATRON CROWD SEPARATION
        for (let other of allPatrons) {
            if (other.id === this.id || !other.active || other.currentState === PATRON_STATE.EXIT) continue;

            const distToOther = Math.hypot(this.x - other.x, this.y - other.y);
            if (distToOther < 42 && distToOther > 0.001) {
                speedMod *= 0.82;
                const pushWeight = (42 - distToOther) / 42;
                steerX += ((this.x - other.x) / distToOther) * pushWeight * 0.9;
                steerY += ((this.y - other.y) / distToOther) * pushWeight * 0.5;
            }
        }

        // Combine desired velocity + obstacle/crowd steering
        let finalVX = dirX + steerX;
        let finalVY = dirY + steerY;
        const vMag = Math.hypot(finalVX, finalVY) || 1;
        finalVX = (finalVX / vMag) * (this.speed * speedMod);
        finalVY = (finalVY / vMag) * (this.speed * speedMod);

        this.x += finalVX * dt;
        this.y += finalVY * dt;

        // Hard clamp so a patron can never clip inside a solid prop
        this.resolveObstacleCollisions(obstacles);

        // Keep within walkable room bounds (allowing doorway corridor at top center)
        const nearDoorX = Math.abs(this.x - 640) < 75;
        const minY = nearDoorX ? 125 : 195;
        this.x = Math.max(70, Math.min(1210, this.x));
        this.y = Math.max(minY, Math.min(705, this.y));

        // 4-Way Cardinal Facing for LPC Sprite Rows ('UP', 'DOWN', 'LEFT', 'RIGHT')
        if (Math.abs(finalVX) > Math.abs(finalVY) * 1.15) {
            this.facing = finalVX > 0 ? 'RIGHT' : 'LEFT';
        } else {
            this.facing = finalVY > 0 ? 'DOWN' : 'UP';
        }
    }
}