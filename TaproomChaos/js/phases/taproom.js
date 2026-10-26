// js/phases/taproom.js

class TaproomPhase {
    constructor() {
        this.patrons = [];
        this.projectiles = [];
        this.availableAmmo = [];
        this.obstacles = [];
        this.nav = null;
        this.isActive = false;
        this.isTransitioning = false;
        this.floatingTexts = [];
        this.darts = [];
        this.particles = [];
        this.spawnTimer = 0;
        this.spawnInterval = 4.5;
        this.maxPatrons = 10;
        this.shiftDuration = 60;
        this.timeRemaining = this.shiftDuration;
        this.selectedAmmoIndex = 0;
        this.shiftCount = 0;

        this.isAiming = false;
        this.aimStart = { x: 0, y: 0 };
        this.aimCurrent = { x: 0, y: 0 };

        this.gravity = 1500;
        this.setupEventListeners();
    }

    setupEventListeners() {
        gameEvents.on('DRAG_START', (pos) => {
            if (!this.isActive) return;
            if (pos.y > 250) {
                this.isAiming = true;
                this.aimStart = { x: pos.x, y: pos.y };
                this.aimCurrent = { x: pos.x, y: pos.y };
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
                // Launch from the Beer Bar tap tower or Coffee Counter based on aim direction/ammo
                const currentAmmo = (playerState && playerState.ammo) ? playerState.ammo[this.selectedAmmoIndex] : null;
                const isCafeDrink = currentAmmo && ['soda', 'mocktail', 'stout', 'sour', 'cocktail'].includes((currentAmmo.type || '').toLowerCase());
                const targetXEst = this.aimStart.x + swipeDx * 1.5;
                const launchFromCafe = isCafeDrink || targetXEst > 680;

                const bartenderX = launchFromCafe ? (1280 - 315) : 317;
                const bartenderY = 585;
                const throwMult = 4.5;
                const zMult = 1.8;
                this.fireProjectile(bartenderX, bartenderY, swipeDx * throwMult, swipeDy * throwMult, swipeDistance * zMult);
            }
        });

        gameEvents.on('DART_THROWN', (pos) => {
            if (!this.isActive) return;
            // Aim directly at the mounted dartboard on the right wall (x: w - 100, y: 350)
            const boardX = (this.nav && this.nav.dartboardTarget) ? this.nav.dartboardTarget.x : 1180;
            const boardY = (this.nav && this.nav.dartboardTarget) ? this.nav.dartboardTarget.y : 295;
            this.darts.push({
                x: pos.x,
                y: pos.y,
                targetX: boardX + (Math.random() * 14 - 7),
                targetY: boardY + (Math.random() * 14 - 7),
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

                if (distance <= splashRadius && (patron.currentState === 'ENTER' || patron.currentState === 'IDLE')) {
                    patron.y -= pushbackForce;
                    patron.x += (patron.x > data.x) ? pushbackForce / 4 : -pushbackForce / 4;
                    if (patron.y < 165) patron.y = 165;
                    if (typeof patron.resolveObstacleCollisions === 'function') {
                        patron.resolveObstacleCollisions(this.obstacles || []);
                    }
                }
            });
        });
    }

    fireProjectile(x, y, vx, vy, vz) {
        const currentAmmo = playerState.ammo[this.selectedAmmoIndex];
        if (!currentAmmo) return;

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
        this.spawnTimer = 1.2;
        this.projectiles = [];
        this.darts = [];
        this.particles = [];
        this.isAiming = false;
        this.availableAmmo = playerState.ammo;
        this.floatingTexts = [];
        this.timeRemaining = this.shiftDuration;
        this.shiftCount++;

        // Sync progression data onto taproomPhase so renderer always sees live progression
        const prog = (typeof progressionState !== 'undefined') ? progressionState : {};
        this.shift = prog.shift || prog.currentShift || prog.day || this.shiftCount;
        this.year = prog.year || prog.currentYear || (1 + Math.floor((this.shift - 1) / 4));

        const seasons = ['spring', 'summer', 'fall', 'winter'];
        this.season = prog.season || prog.currentSeason || seasons[(this.shift - 1) % 4];
        this.isBossRound = (typeof prog.isBossRound === 'function') ? prog.isBossRound() : Boolean(prog.isBossRound);

        const mod = prog.forecast ? prog.forecast.modifier : 'none';
        this.spawnInterval = (mod === 'crowd_spike') ? 2.0 : 3.5;
        this.maxPatrons = 7 + Math.min(5, Math.floor(this.shift / 2));
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

        // 1. ALL PATRONS ENTER THROUGH THE REAR DOOR
        const startX = (w / 2) + (Math.random() * 20 - 10);
        const startY = 132;

        // 2. ROUTE TO BEER BAR (LEFT) OR COFFEE COUNTER (RIGHT) AROUND THE CENTER POOL TABLE
        const cravesStr = ((config.favoriteStyle || '') + ' ' + (config.craves || []).join(' ')).toLowerCase();
        const prefersCafe = cravesStr.includes('stout') || cravesStr.includes('soda') || cravesStr.includes('mocktail') || cravesStr.includes('sour') || cravesStr.includes('coffee') || rosterKey === 'kid';
        const goToCoffeeCounter = prefersCafe ? (Math.random() < 0.8) : (Math.random() < 0.35);

        const beerSpots = [
            { x: 405, y: 545 },
            { x: 435, y: 585 },
            { x: 355, y: 695 },
            { x: 285, y: 695 },
            { x: 185, y: 545 }
        ];
        const coffeeSpots = [
            { x: w - 405, y: 545 },
            { x: w - 435, y: 585 },
            { x: w - 355, y: 695 },
            { x: w - 285, y: 695 },
            { x: w - 185, y: 545 }
        ];

        const spotPool = goToCoffeeCounter ? coffeeSpots : beerSpots;
        // Pick a spot with the fewest nearby patrons
        let chosenSpot = spotPool[Math.floor(Math.random() * spotPool.length)];
        let bestScore = Infinity;
        for (const candidate of spotPool) {
            let crowding = 0;
            for (const other of this.patrons) {
                const d = Math.hypot((other.targetX || other.x) - candidate.x, (other.targetY || other.y) - candidate.y);
                if (d < 55) crowding++;
            }
            if (crowding < bestScore) {
                bestScore = crowding;
                chosenSpot = candidate;
            }
        }

        const destX = chosenSpot.x + (Math.random() * 22 - 11);
        const destY = chosenSpot.y + (Math.random() * 18 - 9);

        // Waypoints: Foyer -> Corridor around Pool Table -> Counter Service Spot
        const foyerWaypoint = {
            x: (w / 2) + (goToCoffeeCounter ? 35 : -35) + (Math.random() * 16 - 8),
            y: 220
        };
        const corridorWaypoint = goToCoffeeCounter
            ? { x: (w / 2) + 185 + (Math.random() * 24 - 12), y: 365 + (Math.random() * 20 - 10) }
            : { x: (w / 2) - 185 + (Math.random() * 24 - 12), y: 365 + (Math.random() * 20 - 10) };

        const path = [
            foyerWaypoint,
            corridorWaypoint,
            { x: destX, y: destY }
        ];

        const patron = new Patron(startX, startY, rosterKey, { ...config, speed: config.speed ? config.speed * 1.5 : 42 });
        patron.groupId = groupId;
        patron.stationSide = goToCoffeeCounter ? 'COFFEE' : 'BEER';
        patron.setPath(path);
        this.patrons.push(patron);
    }

    triggerKidHorde() {
        let currentHordeSize = (typeof progressionState !== 'undefined' && typeof progressionState.isBossRound === 'function' && progressionState.isBossRound()) ? 10 : 5;
        for (let i = 0; i < currentHordeSize; i++) {
            setTimeout(() => { if (this.isActive) this.spawnPatron('kid', 'horde_group'); }, i * 650);
        }
    }

    update(dt) {
        if (!this.isActive) return;

        this.timeRemaining -= dt;
        if (this.timeRemaining <= 0) {
            if (!this.isTransitioning) {
                this.isTransitioning = true;
                if (typeof progressionState !== 'undefined' && typeof progressionState.advanceShift === 'function') {
                    progressionState.advanceShift();
                }
                this.shutdown();
                gameEvents.emit('CHANGE_STATE', { newState: 'BREWING' });
            }
            return;
        }

        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0 && this.patrons.length < this.maxPatrons) {
            this.spawnPatron();
            this.spawnTimer = this.spawnInterval + (Math.random() * 2.0);
        }

        const obstacles = this.obstacles || [];

        this.patrons = this.patrons.filter(patron => {
            if (!patron.active) return false;
            patron.update(dt, this.patrons, obstacles);

            if (patron.currentState === 'ANGRY' && !patron.penaltyApplied) {
                patron.penaltyApplied = true;

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
                d.progress += dt * 4.0;
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
                if (!patron.active || (patron.currentState !== 'ENTER' && patron.currentState !== 'IDLE')) continue;

                const scale = 0.5 + (patron.y / 720);
                const withinX = p.x > (patron.x - (34 * scale)) && p.x < (patron.x + (34 * scale));
                const withinY = p.y > (patron.y - 26) && p.y < (patron.y + 26);
                const withinZ = p.z > 0 && p.z < (145 * scale);

                if (withinX && withinY && withinZ) {
                    p.active = false;

                    const config = PATRON_ROSTER[patron.rosterKey] || {};
                    const baseTip = (patron.tipBase) ? patron.tipBase : (config.tipBase ? config.tipBase : 12);

                    const isExactMatch = config.favoriteDrink && p.name === config.favoriteDrink;
                    const isStyleMatch = config.favoriteStyle && (p.name.includes(config.favoriteStyle) || p.type === config.favoriteStyle.toLowerCase());
                    const isCraved = config.craves && config.craves.includes(p.type);

                    // Route happy patrons to the Left Dance Stage, the Right Dartboard, or Rear Exit
                    const assignActivity = (pt) => {
                        const roll = Math.random();
                        if (roll > 0.60) {
                            pt.activity = 'DANCE';
                            // Walk onto the live music stage platform on the left!
                            pt.waypoints = [
                                { x: 440, y: 360 },
                                { x: 245 + (Math.random() * 55 - 27), y: 295 + (Math.random() * 24 - 12) }
                            ];
                        } else if (roll > 0.28) {
                            pt.activity = 'DARTS';
                            // Walk to the throwing line in front of the right-wall dartboard
                            pt.waypoints = [
                                { x: 835, y: 365 },
                                { x: 1055 + (Math.random() * 24 - 12), y: 345 + (Math.random() * 24 - 12) }
                            ];
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
                                pt.waypoints = [
                                    { x: 835, y: 365 },
                                    { x: 1045 + ((idx % 3) * 26), y: 335 + (idx * 12) }
                                ];
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
            this.particles.push({
                x: x, y: y,
                vx: (Math.random() - 0.5) * 400,
                vy: (Math.random() - 1.0) * 450,
                life: 1.0 + Math.random() * 0.5,
                type: 'coin'
            });
        }
    }

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