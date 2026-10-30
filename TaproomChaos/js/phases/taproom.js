// js/phases/taproom.js

// --- GLOBAL TELEMETRY & SCORE SYNC FOR /api/scores/taproom_chaos ---
class TaproomTelemetry {
    constructor() {
        this.reset();
        this.bindEvents();
    }

    reset() {
        this.stats = {
            shiftsCleared: 0,
            highestComboMerges: 0,
            perfectServes: 0,
            glassesSmashed: 0,
            kiddieHordesTriggered: 0
        };
        this.currentMergeChain = 0;
        this.lastMergeTimestamp = 0;
        this.hasSubmittedRun = false;
    }

    bindEvents() {
        if (typeof gameEvents === 'undefined') return;

        // Track consecutive merge combos (can be emitted from brewing.js or auto-detected)
        gameEvents.on('MERGE_COMBO', (chainCount) => {
            const val = typeof chainCount === 'number' ? chainCount : 1;
            if (val > this.stats.highestComboMerges) {
                this.stats.highestComboMerges = val;
            }
        });

        // Fallback: if brewing phase emits INGREDIENT_MERGED, chain merges within a 4s window
        gameEvents.on('INGREDIENT_MERGED', () => {
            const now = Date.now();
            if (now - this.lastMergeTimestamp <= 4000) {
                this.currentMergeChain++;
            } else {
                this.currentMergeChain = 1;
            }
            this.lastMergeTimestamp = now;
            if (this.currentMergeChain > this.stats.highestComboMerges) {
                this.stats.highestComboMerges = this.currentMergeChain;
            }
        });
    }

    recordMergeCombo(chainCount = 1) {
        if (chainCount > this.stats.highestComboMerges) {
            this.stats.highestComboMerges = chainCount;
        }
    }

    async submitScore(overrideName = null) {
        if (this.hasSubmittedRun) return;
        this.hasSubmittedRun = true;

        const playerName = overrideName
            || (typeof playerState !== 'undefined' && (playerState.playerName || playerState.name))
            || localStorage.getItem('law_player_name')
            || '';

        const currentRunScore = (typeof playerState !== 'undefined')
            ? Math.max(0, Math.floor(playerState.totalEarned || playerState.score || playerState.tips || 0))
            : 0;

        const prog = (typeof progressionState !== 'undefined') ? progressionState : {};
        const currentShift = prog.shift || prog.currentShift || (typeof taproomPhase !== 'undefined' ? taproomPhase.shift : 1) || 1;

        // Cumulative career tips/score accumulated (falls back to currentRunScore if not tracked separately)
        const totalTipsEarned = (typeof playerState !== 'undefined' && playerState.lifetimeScore !== undefined)
            ? playerState.lifetimeScore
            : currentRunScore;

        const payload = {
            player_name: playerName,
            score: currentRunScore,        // Score for this specific run
            level_reached: currentShift,   // Shift reached
            stats: {
                shiftsCleared: this.stats.shiftsCleared,
                highestComboMerges: this.stats.highestComboMerges,
                perfectServes: this.stats.perfectServes,
                glassesSmashed: this.stats.glassesSmashed,
                kiddieHordesTriggered: this.stats.kiddieHordesTriggered,
                lifetimeScore: totalTipsEarned // Cumulative career tips/score accumulated
            }
        };

        try {
            const response = await fetch('https://lawbrewing.tail03b2f1.ts.net/api/scores/taproom_chaos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            console.log('[Telemetry] Successfully posted score to Tailscale server:', payload, response.status);
            return await response.json();
        } catch (err) {
            console.warn('[Telemetry] Failed to reach Tailscale server endpoint:', err);
            return null;
        }
    }
}

window.taproomTelemetry = window.taproomTelemetry || new TaproomTelemetry();

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

        // INSIDE setupEventListeners() -> DRAG_END
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

                // FIXED 1:1 AIMING! The beer now spawns exactly where you started your swipe on the X-axis
                const spawnX = this.aimStart.x;
                const spawnY = 585;

                const throwMult = 4.5;
                const zMult = 1.8;
                this.fireProjectile(spawnX, spawnY, swipeDx * throwMult, swipeDy * throwMult, swipeDistance * zMult);
            }
        });

        gameEvents.on('DART_THROWN', (pos) => {
            if (!this.isActive) return;
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

            // Track broken glasses for /api/scores/taproom_chaos
            if (window.taproomTelemetry) {
                window.taproomTelemetry.stats.glassesSmashed++;
            }

            let splashRadius = data.type === 'Swill' ? 180 : (data.type === 'Pastry Stout' ? 80 : 40);
            let pushbackForce = data.type === 'Swill' ? 120 : (data.type === 'Pastry Stout' ? 40 : 10);

            this.patrons.forEach(patron => {
                const dx = patron.x - data.x;
                const dy = patron.y - data.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance <= splashRadius && (patron.currentState === 'ENTER' || patron.currentState === 'IDLE')) {
                    patron.y -= pushbackForce * 0.6;
                    patron.x += (patron.x > data.x) ? pushbackForce / 3 : -pushbackForce / 3;
                    patron.y = Math.max(210, Math.min(700, patron.y));
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

        gameEvents.emit('BEER_TOSSED');
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

        const prog = (typeof progressionState !== 'undefined') ? progressionState : {};
        this.shift = prog.shift || prog.currentShift || prog.day || this.shiftCount;

        // Auto-reset telemetry at the start of Shift 1
        if (this.shift === 1 && window.taproomTelemetry) {
            window.taproomTelemetry.reset();
        }

        // Auto-hook hud.showGameOver once so score submits automatically on bankruptcy
        if (typeof hud !== 'undefined' && hud.showGameOver && !hud._telemetryWrapped) {
            const origShowGameOver = hud.showGameOver.bind(hud);
            hud.showGameOver = (...args) => {
                if (window.taproomTelemetry) window.taproomTelemetry.submitScore();
                return origShowGameOver(...args);
            };
            hud._telemetryWrapped = true;
        }

        const shiftsPerSeason = 4;
        const seasons = ['spring', 'summer', 'fall', 'winter'];
        const seasonIndex = Math.floor((this.shift - 1) / shiftsPerSeason) % 4;

        this.season = prog.season || prog.currentSeason || seasons[seasonIndex];
        this.shiftInSeason = ((this.shift - 1) % shiftsPerSeason) + 1;
        this.year = prog.year || prog.currentYear || (1 + Math.floor((this.shift - 1) / (shiftsPerSeason * 4)));

        this.isBossRound = (typeof prog.isBossRound === 'function') ? prog.isBossRound() : Boolean(prog.isBossRound);

        const mod = prog.forecast ? prog.forecast.modifier : 'none';
        this.spawnInterval = (mod === 'crowd_spike') ? 2.0 : 3.5;
        this.maxPatrons = 7 + Math.min(5, Math.floor(this.shift / 2));
    }

    // Checks if a candidate (x, y) landing spot is safely outside all furniture hitboxes
    isSpotClear(x, y, buffer = 34) {
        const obstacles = this.obstacles || [];
        for (const obs of obstacles) {
            const rx = (obs.rx || obs.r || 55) + buffer;
            const ry = (obs.ry || (obs.r ? obs.r * 0.65 : 38)) + (buffer * 0.75);
            const dx = x - obs.x;
            const dy = y - obs.y;
            if (Math.hypot(dx / rx, dy / ry) < 1.05) {
                return false;
            }
        }
        return true;
    }

    // Picks a randomized, obstacle-safe destination anywhere across the taproom scene
    pickRandomSceneDestination() {
        const w = 1280;

        // 18 scenic hangout spots distributed throughout the entire room
        const scenicPool = [
            // Mid-Left Lounge & Booth Front
            { x: 165, y: 525 }, { x: 245, y: 535 }, { x: 335, y: 505 },
            // Upper-Left Jukebox & Stage Groove Area
            { x: 375, y: 345 }, { x: 445, y: 330 },
            // Center Pool Table Perimeter (North, West, East, South)
            { x: 565, y: 318 }, { x: 715, y: 318 },
            { x: 460, y: 415 }, { x: 820, y: 415 },
            { x: 565, y: 495 }, { x: 715, y: 495 },
            // Center Open Taproom Floor
            { x: 515, y: 575 }, { x: 640, y: 560 }, { x: 765, y: 575 },
            // Mid-Right Bistro & Darts Lounge
            { x: 865, y: 345 }, { x: 885, y: 495 }, { x: 1095, y: 490 },
            // Front-Left Beer Bar & Front-Right Coffee Bar (Outside the stools & corners)
            { x: 245, y: 702 }, { x: 355, y: 702 }, { x: 475, y: 635 },
            { x: w - 475, y: 635 }, { x: w - 355, y: 702 }, { x: w - 245, y: 702 }
        ];

        // Generate 6 additional completely random floor coordinates per spawn
        for (let i = 0; i < 6; i++) {
            scenicPool.push({
                x: 155 + Math.random() * (w - 310),
                y: 295 + Math.random() * 395
            });
        }

        // Shuffle candidates so every patron picks a fresh area of the room
        const shuffled = scenicPool
            .map(pt => ({
                x: pt.x + (Math.random() * 28 - 14),
                y: pt.y + (Math.random() * 22 - 11),
                sortKey: Math.random()
            }))
            .sort((a, b) => a.sortKey - b.sortKey);

        let bestSpot = { x: 640 + (Math.random() * 140 - 70), y: 540 };
        let bestCrowding = Infinity;

        for (const candidate of shuffled) {
            if (!this.isSpotClear(candidate.x, candidate.y, 34)) continue;

            let crowding = 0;
            for (const other of this.patrons) {
                const ox = other.targetX || other.x;
                const oy = other.targetY || other.y;
                const d = Math.hypot(ox - candidate.x, oy - candidate.y);
                if (d < 70) crowding += (70 - d);
            }

            if (crowding < bestCrowding) {
                bestCrowding = crowding;
                bestSpot = { x: candidate.x, y: candidate.y };
                if (crowding === 0) break;
            }
        }

        return bestSpot;
    }

    // Builds an obstacle-safe path from the rear entrance door to any (destX, destY) in the scene
    buildEntryPath(destX, destY) {
        const w = 1280;
        const isRightSide = destX >= (w / 2);
        const path = [];

        // Step 1: Step south into the foyer clear of the rear wall & seasonal centerpiece
        path.push({
            x: (w / 2) + (isRightSide ? 48 : -48) + (Math.random() * 14 - 7),
            y: 205
        });

        // Step 2: If heading deeper into the room, route through the wide left or right main aisle
        if (destY > 345) {
            const aisleX = isRightSide ? 825 : 455;
            path.push({
                x: aisleX + (Math.random() * 18 - 9),
                y: 335
            });

            // Step 3: If heading to the lower half of the room, walk down the open aisle first
            // so the patron never cuts diagonally across the pool table or bar counter corners
            if (destY > 515) {
                path.push({
                    x: aisleX + (Math.random() * 18 - 9),
                    y: Math.min(545, destY - 20)
                });
            }
        }

        // Final Step: Arrive at the randomized scene destination
        path.push({ x: destX, y: destY });
        return path;
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
        const startX = (w / 2) + (Math.random() * 18 - 9);
        const startY = 132;

        const dest = this.pickRandomSceneDestination();
        const path = this.buildEntryPath(dest.x, dest.y);

        const patron = new Patron(startX, startY, rosterKey, { ...config, speed: config.speed ? config.speed * 1.5 : 42 });
        patron.groupId = groupId;
        patron.setPath(path);
        this.patrons.push(patron);
    }

    triggerKidHorde() {
        // Track kiddieHordesTriggered for /api/scores/taproom_chaos
        if (window.taproomTelemetry) {
            window.taproomTelemetry.stats.kiddieHordesTriggered++;
        }

        let currentHordeSize = (typeof progressionState !== 'undefined' && typeof progressionState.isBossRound === 'function' && progressionState.isBossRound()) ? 10 : 5;
        for (let i = 0; i < currentHordeSize; i++) {
            setTimeout(() => { if (this.isActive) this.spawnPatron('kid', 'horde_group'); }, i * 650);
        }
    }

    update(dt) {
        if (!this.isActive) return;

        // FIXED: OUT OF AMMO = INSTANT SHIFT SURVIVAL (No negative penalties!)
        let totalAmmo = 0;
        if (typeof playerState !== 'undefined' && playerState.ammo) {
            playerState.ammo.forEach(a => totalAmmo += (a.count === 'Infinite' ? 999 : a.count));
        }
        if (totalAmmo <= 0 && this.projectiles.length === 0 && this.timeRemaining > 0) {
            this.floatingTexts.push(new FloatingTitle(640, 360, "OUT OF AMMO! SHIFT OVER!", "#facc15"));
            this.timeRemaining = 0; // Force immediate shift end
        }

        this.timeRemaining -= dt;
        if (this.timeRemaining <= 0) {
            if (!this.isTransitioning) {
                this.isTransitioning = true;

                // --- NEW SHIFT GOAL CHECK ---
                const prog = (typeof progressionState !== 'undefined') ? progressionState : {};
                const currentShift = prog.shift || prog.currentShift || this.shift;
                const shiftGoal = currentShift * 40;

                if (typeof playerState !== 'undefined' && playerState.tips < shiftGoal) {
                    // Failed to meet the quota!
                    this.floatingTexts.push(new FloatingTitle(640, 360, "MISSED SHIFT QUOTA!", "#ef4444"));
                    setTimeout(() => {
                        this.shutdown();
                        gameEvents.emit('BANKRUPT');
                    }, 1500);
                    return;
                }

                // Success! Advance normally.
                if (window.taproomTelemetry) window.taproomTelemetry.stats.shiftsCleared++;
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
                gameEvents.emit('PATRON_ANGRY'); // <-- Triggers angry.mp3
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

                    const assignActivity = (pt) => {
                        const roll = Math.random();
                        const isLeftSide = pt.x < 640;
                        const safeAisleX = isLeftSide ? 455 : 825;

                        if (roll > 0.60) {
                            pt.activity = 'DANCE';
                            const route = [];
                            if (pt.y > 500) route.push({ x: safeAisleX, y: 515 });
                            if (!isLeftSide) route.push({ x: 640, y: 315 });
                            route.push({ x: 435, y: 325 });
                            route.push({ x: 245 + (Math.random() * 48 - 24), y: 292 + (Math.random() * 18 - 9) });
                            pt.waypoints = route;
                        } else if (roll > 0.28) {
                            pt.activity = 'DARTS';
                            const route = [];
                            if (pt.y > 500) route.push({ x: safeAisleX, y: 515 });
                            if (isLeftSide) route.push({ x: 640, y: 315 });
                            route.push({ x: 845, y: 340 });
                            route.push({ x: 1055 + (Math.random() * 22 - 11), y: 345 + (Math.random() * 20 - 10) });
                            pt.waypoints = route;
                        } else {
                            pt.activity = 'EXIT';
                        }
                    };

                    // 1. SWILL SAFETY NET INTERCEPT
                    if (p.name === 'Swill' || p.type === 'Swill') {
                        gameEvents.emit('EARN_TIPS', 1.00);
                        this.floatingTexts.push(new FloatingTitle(patron.x, patron.y - 100, "+$1.00 (Swill)", "#94a3b8"));
                        patron.setState('CHEER');
                        assignActivity(patron);
                    }
                    // 2. EXACT RECIPE MATCH (3x Payout)
                    else if (isExactMatch) {
                        if (window.taproomTelemetry) {
                            window.taproomTelemetry.stats.perfectServes++;
                        }
                        gameEvents.emit('EARN_TIPS', baseTip * 3);
                        this.floatingTexts.push(new FloatingTitle(patron.x, patron.y - 100, `+$${(baseTip * 3).toFixed(2)} (Favorite!)`, "#f59e0b"));
                        patron.receivedPreferredDrink = true;
                        patron.setState('CHEER');
                        assignActivity(patron);
                        this.spawnCoinBurst(patron.x, patron.y - 80);
                    }
                    // 3. STYLE MATCH (2x Payout)
                    else if (isStyleMatch) {
                        gameEvents.emit('EARN_TIPS', baseTip * 2);
                        this.floatingTexts.push(new FloatingTitle(patron.x, patron.y - 100, `+$${(baseTip * 2).toFixed(2)} (Great Style!)`, "#38bdf8"));
                        patron.setState('CHEER');
                        assignActivity(patron);
                    }
                    // 4. CRAVING MATCH (1x Payout)
                    else if (isCraved) {
                        gameEvents.emit('EARN_TIPS', baseTip);
                        this.floatingTexts.push(new FloatingTitle(patron.x, patron.y - 100, `+$${baseTip.toFixed(2)}`, "#10b981"));
                        patron.setState('CHEER');
                        assignActivity(patron);
                    }
                    // 5. TRASH BATCH / WRONG DRINK (Angry Penalty)
                    else {
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
                                    { x: 845, y: 340 },
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