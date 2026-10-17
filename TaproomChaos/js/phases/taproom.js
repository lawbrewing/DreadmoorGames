// js/phases/taproom.js

class TaproomPhase {
    constructor() {
        this.patrons = [];
        this.projectiles = [];
        this.availableAmmo = [];
        this.isActive = false;
        this.floatingTexts = [];
        this.spawnTimer = 0;
        this.spawnInterval = 2.5;
        this.shiftDuration = 60;
        this.timeRemaining = this.shiftDuration;
        this.selectedAmmoIndex = 0;

        // Slingshot State
        this.isAiming = false;
        this.aimStart = { x: 0, y: 0 };
        this.aimCurrent = { x: 0, y: 0 };

        // Fake 3D Physics Constants
        this.gravity = 1500;
        this.throwMultiplier = 7.0;
        this.zMultiplier = 2.5;

        this.setupEventListeners();
    }

    setupEventListeners() {
        gameEvents.on('DRAG_START', (pos) => {
            if (!this.isActive) return;
            if (pos.y > 550) {
                this.isAiming = true;
                this.aimStart = { x: pos.x, y: pos.y };
                this.aimCurrent = { x: pos.x, y: pos.y };
            }
        });

        gameEvents.on('DRAG_END', (pos) => {
            if (!this.isAiming) return;
            this.isAiming = false;

            const dx = pos.x - this.aimStart.x;
            const dy = pos.y - this.aimStart.y;

            if (dy < -20) {
                const dragDistance = Math.sqrt(dx * dx + dy * dy);
                const throwMult = 4.0;
                const zMult = 1.5;
                this.fireProjectile(this.aimStart.x, this.aimStart.y, dx * throwMult, dy * throwMult, dragDistance * zMult);
            }
        });

        gameEvents.on('GLASS_SMASHED', (data) => {
            if (!this.isActive) return;

            let splashRadius = 0;
            let pushbackForce = 0;

            if (data.type === 'Swill') {
                splashRadius = 180;
                pushbackForce = 120;
            } else if (data.type === 'Pastry Stout') {
                splashRadius = 80;
                pushbackForce = 40;
            } else {
                splashRadius = 40;
                pushbackForce = 10;
            }

            this.patrons.forEach(patron => {
                const dx = patron.x - data.x;
                const dy = patron.y - data.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance <= splashRadius && patron.state !== 'happy') {
                    patron.y -= pushbackForce;
                    if (patron.x > data.x) {
                        patron.x += pushbackForce / 4;
                    } else {
                        patron.x -= pushbackForce / 4;
                    }
                    if (patron.y < 150) patron.y = 150;
                }
            });
        });
    }

    fireProjectile(x, y, vx, vy, vz) {
        const currentAmmo = playerState.ammo[this.selectedAmmoIndex];

        if (currentAmmo.count !== 'Infinite') {
            currentAmmo.count--;
            if (currentAmmo.count <= 0) {
                this.selectedAmmoIndex = 0;
            }
        }

        this.projectiles.push({
            x: x, y: y, z: 0, vx: vx, vy: vy, vz: vz,
            name: currentAmmo.name,
            type: currentAmmo.type || 'crowd_control',
            radius: 12,
            active: true
        });
    }

    init(ammoList = []) {
        this.isActive = true;
        this.patrons = [];
        this.spawnTimer = 0.5;
        this.projectiles = [];
        this.isAiming = false;
        this.availableAmmo = playerState.ammo;
        this.floatingTexts = [];
        this.timeRemaining = this.shiftDuration;

        const mod = (typeof progressionState !== 'undefined' && progressionState.forecast)
            ? progressionState.forecast.modifier : 'none';

        this.spawnInterval = (mod === 'crowd_spike') ? 1.4 : 2.5;
    }

    // --- NEW: SPAWNER USING PATRON_ROSTER ---
    spawnPatron() {
        // Fetch difficulty to scale speeds
        let diffMult = 1.0;
        if (typeof progressionState !== 'undefined') {
            diffMult = progressionState.getDifficultyMultiplier();
            const mod = progressionState.forecast ? progressionState.forecast.modifier : 'none';
            if (mod === 'speed_spike') diffMult += 0.25;
        }

        const isParty = Math.random() > 0.5;

        if (isParty) {
            // PARTY COMBO LOGIC: 30% chance for a Trio, 70% chance for a Duo
            const groupSize = Math.random() > 0.7 ? 3 : 2;
            const groupId = 'party_' + Math.random().toString(36).substr(2, 5);
            const centerX = Math.floor(Math.random() * 600) + 200; // Keep the group centered

            for (let i = 0; i < groupSize; i++) {
                const rosterKey = POOL_PARTY[Math.floor(Math.random() * POOL_PARTY.length)];
                // Deep copy config to prevent modifying the base blueprint
                const config = JSON.parse(JSON.stringify(PATRON_ROSTER[rosterKey]));
                config.speed *= diffMult;

                // Space them out 80px apart side-by-side
                const startX = centerX + ((i - 1) * 80);
                const startY = -64 - (Math.random() * 30);

                const patron = new Patron(startX, startY, rosterKey, config);
                patron.groupId = groupId;
                this.patrons.push(patron);
            }
        } else {
            // SOLO PATRON LOGIC
            const pool = Math.random() > 0.5 ? POOL_HAZARDS : POOL_SODA;
            const rosterKey = pool[Math.floor(Math.random() * pool.length)];
            const config = JSON.parse(JSON.stringify(PATRON_ROSTER[rosterKey]));
            config.speed *= diffMult;

            const startX = Math.floor(Math.random() * 800) + 150;
            const patron = new Patron(startX, -64, rosterKey, config);
            this.patrons.push(patron);
        }
    }

    triggerKidHorde() {
        console.log("HORDE TRIGGERED!");
        const diffMult = progressionState.getDifficultyMultiplier();
        const config = PATRON_ROSTER['KID'];

        let currentHordeSize = 5;
        if (progressionState.isBossRound()) currentHordeSize *= 2;

        for (let i = 0; i < currentHordeSize; i++) {
            setTimeout(() => {
                const cfg = JSON.parse(JSON.stringify(config));
                cfg.speed *= diffMult;
                this.patrons.push(new Patron(
                    Math.floor(Math.random() * 800) + 150,
                    -64 - (i * 20),
                    'KID', cfg
                ));
            }, i * 400);
        }
    }

    update(dt) {
        if (!this.isActive) return;

        // 1. COUNTDOWN LOGIC
        this.timeRemaining -= dt;
        if (this.timeRemaining <= 0) {
            progressionState.advanceShift();
            gameEvents.emit('CHANGE_STATE', { newState: 'BREWING' });
            return;
        }

        // 2. SPAWNING LOGIC
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnPatron();
            this.spawnTimer = this.spawnInterval + (Math.random() * 1.5);
        }

        // 3. MOVEMENT & ESCAPE LOGIC
        this.patrons = this.patrons.filter(patron => {
            if (!patron.active) return false;

            patron.update(dt);

            // STOP AT THE BAR COUNTER (Y=460) AND WAIT
            if (patron.state === 'walk' && patron.y >= 460) {
                patron.state = 'idle'; // Wait for a drink!
                patron.y = 460;
            }

            // PATIENCE RAN OUT (PENALTY)
            if (patron.state === 'fail' && !patron.penaltyApplied) {
                patron.penaltyApplied = true;
                const penalty = typeof gameEconomy !== 'undefined' ? gameEconomy.escapePenalty : 10;
                gameEvents.emit('SPEND_TIPS', penalty);
                this.floatingTexts.push(new FloatingTitle(patron.x, patron.y - 100, `-$${penalty} (Left Angry!)`, "#ef4444"));

                // Remove them after a brief delay so the fail animation plays
                setTimeout(() => { patron.active = false; }, 600);
            }

            return true;
        });

        // 4. FLOATING TEXT UPDATES
        this.floatingTexts = this.floatingTexts.filter(text => {
            if (text.update) text.update(dt);
            return text.active;
        });

        // 5. PROJECTILE PHYSICS & HIT DETECTION
        this.projectiles.forEach(p => {
            if (!p.active) return;

            p.vz -= this.gravity * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;

            // CHECK FOR DIRECT HITS
            for (let i = 0; i < this.patrons.length; i++) {
                let patron = this.patrons[i];
                if (!patron.active || patron.state === 'happy' || patron.state === 'fail') continue;

                const scale = 0.5 + (patron.y / 720);
                const patronWidth = 60 * scale;
                const patronHeight = 140 * scale;
                const patronDepth = 40;

                const withinX = p.x > (patron.x - patronWidth / 2) && p.x < (patron.x + patronWidth / 2);
                const withinY = p.y > (patron.y - patronDepth / 2) && p.y < (patron.y + patronDepth / 2);
                const withinZ = p.z > 0 && p.z < patronHeight;

                if (withinX && withinY && withinZ) {
                    p.active = false; // Destroy beer

                    let tipAmount = 0;
                    let floatText = "";
                    let floatColor = "#10b981";

                    // EVALUATE THE DRINK SERVED
                    const config = PATRON_ROSTER[patron.rosterKey];
                    const isFavorite = config.favoriteDrink && p.name === config.favoriteDrink;
                    const isCraved = config.craves && config.craves.includes(p.type);

                    if (isFavorite) {
                        tipAmount = patron.tipBase * 3;
                        floatText = `+$${tipAmount} (Favorite!)`;
                        floatColor = "#f59e0b";
                        patron.receivedPreferredDrink = true;
                        patron.state = 'happy';
                    } else if (isCraved) {
                        tipAmount = patron.tipBase;
                        floatText = `+$${tipAmount}`;
                        patron.state = 'happy';
                    } else {
                        tipAmount = 0;
                        floatText = "Gross!";
                        floatColor = "#ef4444";
                        patron.state = 'fail';

                        // Check for Kid Horde trigger if they are given beer
                        if (patron.rosterKey === 'KID' && p.type !== 'soda') {
                            this.triggerKidHorde();
                            floatText = "YAY BEER! (Horde Incoming)";
                        }
                    }

                    if (tipAmount > 0) gameEvents.emit('EARN_TIPS', tipAmount);
                    this.floatingTexts.push(new FloatingTitle(patron.x, patron.y - 100, floatText, floatColor));

                    // --- NEW: EVALUATE GROUP COMPLETION ---
                    if (patron.groupId) {
                        const groupMembers = this.patrons.filter(pt => pt.groupId === patron.groupId);
                        const allServed = groupMembers.every(pt => pt.state === 'happy' || pt.state === 'fail');

                        if (allServed) {
                            const allHappy = groupMembers.every(pt => pt.receivedPreferredDrink);
                            if (allHappy) {
                                // Massive combo payout!
                                gameEvents.emit('EARN_TIPS', 75);
                                this.floatingTexts.push(new FloatingTitle(patron.x, patron.y - 150, "PARTY COMBO! +$75", "#c084fc"));
                            }
                            // Dismiss the whole group together
                            setTimeout(() => { groupMembers.forEach(pt => pt.active = false); }, 600);
                        }
                    } else {
                        // Solo patron dismissal
                        setTimeout(() => { patron.active = false; }, 600);
                    }
                    break;
                }
            }

            // FLOOR IMPACT (Miss)
            if (p.active && p.z <= 0) {
                p.z = 0;
                p.active = false;
                console.log(`💦 ${p.type} smashed on the floor!`);
                gameEvents.emit('GLASS_SMASHED', { x: p.x, y: p.y, type: p.type });
            }
        });

        this.projectiles = this.projectiles.filter(p => p.active);
        this.patrons.sort((a, b) => a.y - b.y);
    }

    shutdown() {
        console.log("[Taproom] Last call. Shutting down phase.");
        this.isActive = false;
        this.patrons = [];
        this.projectiles = [];
        this.isAiming = false;
    }
}

const taproomPhase = new TaproomPhase();