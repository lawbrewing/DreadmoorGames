// js/phases/taproom.js

class TaproomPhase {
    constructor() {
        this.patrons = [];
        this.projectiles = [];
        this.availableAmmo = [];
        this.isActive = false;
        this.isTransitioning = false;
        this.floatingTexts = [];
        this.darts = [];
        this.spawnTimer = 0;
        this.spawnInterval = 4.5;
        this.maxPatrons = 13;
        this.shiftDuration = 60;
        this.timeRemaining = this.shiftDuration;
        this.selectedAmmoIndex = 0;

        this.isAiming = false;
        this.aimStart = { x: 0, y: 0 };
        this.aimCurrent = { x: 0, y: 0 };

        this.gravity = 1500;
        this.setupEventListeners();
    }

    setupEventListeners() {
        gameEvents.on('DRAG_START', (pos) => {
            if (!this.isActive) return;
            if (pos.y > 350) {
                this.isAiming = true;
                this.aimStart = { x: pos.x, y: pos.y };
            }
        });

        gameEvents.on('DRAG_MOVE', (pos) => {
            if (!this.isAiming) return;
            this.aimCurrent = { x: pos.x, y: pos.y };
        });

        gameEvents.on('DRAG_END', (pos) => {
            if (!this.isAiming) return;
            this.isAiming = false;

            const swipeDx = pos.x - this.aimStart.x;
            const swipeDy = pos.y - this.aimStart.y;

            if (Math.abs(swipeDx) < 10 && Math.abs(swipeDy) < 10 && pos.y > 600) {
                if (this.availableAmmo && this.availableAmmo.length > 0) {
                    const sackWidth = 1280 / this.availableAmmo.length;
                    this.selectedAmmoIndex = Math.max(0, Math.min(this.availableAmmo.length - 1, Math.floor(pos.x / sackWidth)));
                }
                return;
            }

            if (swipeDy < -20) {
                const swipeDistance = Math.hypot(swipeDx, swipeDy);
                const bartenderX = 1280 / 2;
                const bartenderY = 650;
                const throwMult = 4.5;
                const zMult = 1.8;
                this.fireProjectile(bartenderX, bartenderY, swipeDx * throwMult, swipeDy * throwMult, swipeDistance * zMult);
            }
        });

        gameEvents.on('DART_THROWN', (pos) => {
            if (!this.isActive) return;
            this.darts.push({
                x: pos.x, y: pos.y,
                targetX: 1040, targetY: 100,
                progress: 0
            });
        });

        gameEvents.on('GLASS_SMASHED', (data) => {
            if (!this.isActive) return;

            let splashRadius = data.type === 'Swill' ? 180 : (data.type === 'Pastry Stout' ? 80 : 40);
            let pushbackForce = data.type === 'Swill' ? 120 : (data.type === 'Pastry Stout' ? 40 : 10);

            this.patrons.forEach(patron => {
                const dx = patron.x - data.x;
                const dy = patron.y - data.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance <= splashRadius && patron.currentState === 'ENTER') {
                    patron.y -= pushbackForce;
                    patron.x += (patron.x > data.x) ? pushbackForce / 4 : -pushbackForce / 4;
                    if (patron.y < 150) patron.y = 150;
                }
            });
        });
    }

    fireProjectile(x, y, vx, vy, vz) {
        const currentAmmo = playerState.ammo[this.selectedAmmoIndex];
        if (currentAmmo.count !== 'Infinite') {
            currentAmmo.count--;
            if (currentAmmo.count <= 0) this.selectedAmmoIndex = 0;
        }

        this.projectiles.push({
            x: x, y: y, z: 0, vx: vx, vy: vy, vz: vz,
            name: currentAmmo.name, type: currentAmmo.type || 'crowd_control', radius: 12, active: true
        });
    }

    init(ammoList = []) {
        this.isActive = true;
        this.isTransitioning = false;
        this.patrons = [];
        this.spawnTimer = 1.5;
        this.projectiles = [];
        this.darts = [];
        this.isAiming = false;
        this.availableAmmo = playerState.ammo;
        this.floatingTexts = [];
        this.timeRemaining = this.shiftDuration;

        const mod = (typeof progressionState !== 'undefined' && progressionState.forecast) ? progressionState.forecast.modifier : 'none';
        this.spawnInterval = (mod === 'crowd_spike') ? 2.0 : 3.5;
        this.maxPatrons = 6;
    }

    spawnPatron(forcedKey = null, groupId = null) {
        let rosterKey = forcedKey;
        if (!rosterKey) {
            const activeKeys = this.patrons.map(p => p.rosterKey);
            let availableRoster = Object.keys(PATRON_ROSTER).filter(k => !PATRON_ROSTER[k].isBoss && !activeKeys.includes(k));
            if (availableRoster.length === 0) availableRoster = Object.keys(PATRON_ROSTER).filter(k => !PATRON_ROSTER[k].isBoss);
            rosterKey = availableRoster[Math.floor(Math.random() * availableRoster.length)];
        }

        rosterKey = String(rosterKey).toLowerCase().trim();
        const config = typeof PATRON_ROSTER !== 'undefined' ? PATRON_ROSTER[rosterKey] : null;
        if (!config) return;

        const w = 1280;
        const destX = (w * 0.15) + Math.random() * (w * 0.7);
        const destY = 480 + (Math.random() * 30);

        // --- Inside spawnPatron() ---
        let path = [];
        let startX, startY;
        const useSideDoor = Math.random() < 0.2;

        if (useSideDoor) {
            // Enter from the side door and walk straight down
            startX = w - 90;
            startY = 240;
            path = [
                { x: w - 160, y: 320 },
                { x: destX, y: destY }
            ];
        } else {
            // Enter from the front door and walk directly to their bar stool
            startX = w / 2;
            startY = 130;
            path = [
                { x: (w / 2) + (Math.random() * 80 - 40), y: 220 }, // Step inside
                { x: destX, y: destY } // B-line straight for the beer
            ];
        }

        const patron = new Patron(startX, startY, rosterKey, { ...config, speed: config.speed ? config.speed * 1.5 : 35 });
        patron.groupId = groupId;
        patron.setPath(path);
        this.patrons.push(patron);
    }

    triggerKidHorde() {
        let currentHordeSize = progressionState.isBossRound() ? 10 : 5;
        for (let i = 0; i < currentHordeSize; i++) {
            setTimeout(() => { this.spawnPatron('kid', 'horde_group'); }, i * 650);
        }
    }

    update(dt) {
        if (!this.isActive) return;

        this.timeRemaining -= dt;
        if (this.timeRemaining <= 0) {
            if (!this.isTransitioning) {
                this.isTransitioning = true;
                progressionState.advanceShift();
                this.shutdown(); // MISSING METHOD RESTORED
                gameEvents.emit('CHANGE_STATE', { newState: 'BREWING' });
            }
            return;
        }

        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0 && this.patrons.length < this.maxPatrons) {
            this.spawnPatron();
            this.spawnTimer = this.spawnInterval + (Math.random() * 2.0);
        }

        this.patrons = this.patrons.filter(patron => {
            if (!patron.active) return false;
            patron.update(dt, this.patrons);

            if (patron.currentState === 'ANGRY' && !patron.penaltyApplied) {
                patron.penaltyApplied = true;

                // FIXED: Guarantee the penalty is sent as a pure integer, never an object
                let penalty = 10;
                if (typeof gameEconomy !== 'undefined' && typeof gameEconomy.escapePenalty === 'number') {
                    penalty = gameEconomy.escapePenalty;
                }

                gameEvents.emit('SPEND_TIPS', penalty);
                this.floatingTexts.push(new FloatingTitle(patron.x, patron.y - 100, `-$${penalty} (Left Angry!)`, "#ef4444"));
            }
            return true;
        });

        this.floatingTexts = this.floatingTexts.filter(text => {
            if (text.update) text.update(dt);
            return text.active;
        });

        if (this.darts) {
            this.darts = this.darts.filter(d => {
                d.progress += dt * 4.0; // Zip to the board
                return d.progress < 1.0;
            });
        }

        if (!this.particles) this.particles = [];
        this.particles = this.particles.filter(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += this.gravity * 0.8 * dt;
            p.life -= dt;
            return p.life > 0;
        });

        this.projectiles.forEach(p => {
            if (!p.active) return;

            p.vz -= this.gravity * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;

            for (let i = 0; i < this.patrons.length; i++) {
                let patron = this.patrons[i];
                if (!patron.active || patron.currentState !== 'ENTER' && patron.currentState !== 'IDLE') continue;

                const scale = 0.5 + (patron.y / 720);
                const withinX = p.x > (patron.x - (30 * scale)) && p.x < (patron.x + (30 * scale));
                const withinY = p.y > (patron.y - 20) && p.y < (patron.y + 20);
                const withinZ = p.z > 0 && p.z < (140 * scale);

                if (withinX && withinY && withinZ) {
                    p.active = false;

                    const config = PATRON_ROSTER[patron.rosterKey] || {};
                    const baseTip = (patron.tipBase) ? patron.tipBase : (config.tipBase ? config.tipBase : 12);

                    const isExactMatch = config.favoriteDrink && p.name === config.favoriteDrink;
                    const isStyleMatch = config.favoriteStyle && (p.name.includes(config.favoriteStyle) || p.type === config.favoriteStyle.toLowerCase());
                    const isCraved = config.craves && config.craves.includes(p.type);

                    const assignActivity = (pt) => {
                        const roll = Math.random();
                        if (roll > 0.65) {
                            pt.activity = 'DANCE';
                            pt.waypoints = [{ x: 960 + (Math.random() * 160 - 80), y: 380 + (Math.random() * 60 - 30) }];
                        } else if (roll > 0.3) {
                            pt.activity = 'DARTS';
                            pt.waypoints = [{ x: 1040 + (Math.random() * 40 - 20), y: 220 + (Math.random() * 20) }];
                        } else {
                            pt.activity = 'EXIT';
                        }
                    };

                    if (isExactMatch) {
                        gameEvents.emit('EARN_TIPS', baseTip * 3);
                        this.floatingTexts.push(new FloatingTitle(patron.x, patron.y - 100, `+$${baseTip * 3} (Favorite!)`, "#f59e0b"));
                        patron.receivedPreferredDrink = true;
                        patron.setState('CHEER');
                        assignActivity(patron);
                        this.spawnCoinBurst(patron.x, patron.y - 80);
                    } else if (isStyleMatch) {
                        gameEvents.emit('EARN_TIPS', baseTip * 2);
                        this.floatingTexts.push(new FloatingTitle(patron.x, patron.y - 100, `+$${baseTip * 2} (Great Style!)`, "#38bdf8"));
                        patron.setState('CHEER');
                        assignActivity(patron);
                    } else if (isCraved) {
                        gameEvents.emit('EARN_TIPS', baseTip);
                        this.floatingTexts.push(new FloatingTitle(patron.x, patron.y - 100, `+$${baseTip}`, "#10b981"));
                        patron.setState('CHEER');
                        assignActivity(patron);
                    } else {
                        this.floatingTexts.push(new FloatingTitle(patron.x, patron.y - 100, "Gross!", "#ef4444"));
                        patron.setState('ANGRY');
                        if (patron.rosterKey === 'kid' && p.type !== 'soda') {
                            this.triggerKidHorde();
                            this.floatingTexts.push(new FloatingTitle(patron.x, patron.y - 130, "YAY BEER! (Horde Incoming)", "#ef4444"));
                        }
                    }

                    if (patron.groupId) {
                        const groupMembers = this.patrons.filter(pt => pt.groupId === patron.groupId);
                        const allServed = groupMembers.every(pt => pt.currentState === 'CHEER' || pt.currentState === 'ANGRY' || pt.currentState === 'EXIT');
                        if (allServed && groupMembers.every(pt => pt.receivedPreferredDrink)) {
                            gameEvents.emit('EARN_TIPS', 75);
                            this.floatingTexts.push(new FloatingTitle(patron.x, patron.y - 150, "PARTY COMBO! +$75", "#c084fc"));
                            this.spawnCoinBurst(patron.x, patron.y - 120);

                            groupMembers.forEach((pt, idx) => {
                                pt.activity = 'DARTS';
                                pt.waypoints = [{ x: 1040 + ((idx - 1) * 40), y: 220 + (Math.random() * 10) }];
                            });
                        }
                    }
                    break;
                }
            }

            if (p.active && p.z <= 0) {
                p.z = 0; p.active = false;
                gameEvents.emit('GLASS_SMASHED', { x: p.x, y: p.y, type: p.type });
            }
        });

        this.projectiles = this.projectiles.filter(p => p.active);
        this.patrons.sort((a, b) => a.y - b.y);
    }

    spawnCoinBurst(x, y) {
        if (!this.particles) this.particles = [];
        for (let i = 0; i < 12; i++) {
            this.particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * 400, vy: (Math.random() - 1.0) * 450, life: 1.0 + Math.random() * 0.5, type: 'coin' });
        }
    }

    // MISSING METHOD RESTORED
    shutdown() {
        console.log("[Taproom] Last call. Shutting down phase.");
        this.isActive = false;
        this.patrons = [];
        this.projectiles = [];
        this.darts = [];
        this.isAiming = false;
    }
}

const taproomPhase = new TaproomPhase();