// js/phases/taproom.js

class TaproomPhase {
    constructor() {
        this.patrons = [];
        this.projectiles = [];
        this.availableAmmo = [];
        this.isActive = false;
        this.floatingTexts = [];
        this.spawnTimer = 0;
        this.spawnInterval = 4.5;
        this.maxPatrons = 13;
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
        // Give a 1.5-second grace period before the very first patron enters so the screen isn't flooded instantly
        this.spawnTimer = 1.5;
        this.projectiles = [];
        this.isAiming = false;
        this.availableAmmo = playerState.ammo;
        this.floatingTexts = [];
        this.timeRemaining = this.shiftDuration;

        const mod = (typeof progressionState !== 'undefined' && progressionState.forecast)
            ? progressionState.forecast.modifier : 'none';

        // Set a balanced spawn cadence (3.5s base, or 2.0s for crowd spikes)
        this.spawnInterval = (mod === 'crowd_spike') ? 2.0 : 3.5;
        this.maxPatrons = 6; // Keep the room comfortably spaced out
    }

    // Update the spawner to use the perfect physical coordinates
    spawnPatron(forcedKey = null, groupId = null) {
        let rosterKey = forcedKey;

        // If no specific character was asked for, pick a UNIQUE one!
        if (!rosterKey) {
            const activeKeys = this.patrons.map(p => p.rosterKey);
            // Filter out bosses AND anyone currently standing in the room
            let availableRoster = Object.keys(PATRON_ROSTER).filter(k => !PATRON_ROSTER[k].isBoss && !activeKeys.includes(k));

            // Fallback just in case the room is completely full of every character
            if (availableRoster.length === 0) availableRoster = Object.keys(PATRON_ROSTER).filter(k => !PATRON_ROSTER[k].isBoss);

            rosterKey = availableRoster[Math.floor(Math.random() * availableRoster.length)];
        }

        rosterKey = String(rosterKey).toLowerCase().trim();
        const config = typeof PATRON_ROSTER !== 'undefined' ? PATRON_ROSTER[rosterKey] : null;
        if (!config) return;

        const w = (this.canvas && this.canvas.width) ? this.canvas.width : window.innerWidth;
        const destX = (w * 0.15) + Math.random() * (w * 0.7);
        const destY = 480 + (Math.random() * 30);

        let path = []; let startX, startY;
        const useSideDoor = Math.random() < 0.2;

        if (useSideDoor) {
            // SIDE DOOR: Spawns exactly in the blackness of the side door on the right wall
            startX = w - 90;
            startY = 240;

            if (destX < w * 0.5) {
                path = [{ x: w - 160, y: 340 }, { x: w * 0.45, y: 420 }, { x: destX, y: destY }];
            } else {
                path = [{ x: w - 160, y: 380 }, { x: destX, y: destY }];
            }
        } else {
            // MAIN DOOR: Spawns at y=130 (inside the doorframe shadow)
            startX = w / 2;
            startY = 130;

            // The left wall is at 180px. The right wall is at (w - 180px).
            // These paths strictly force them to stay inside those bounds!
            if (destX < w * 0.4) {
                path = [{ x: (w / 2) - 40, y: 170 }, { x: 230, y: 250 }, { x: destX, y: 420 }, { x: destX, y: destY }];
            } else if (destX > w * 0.6) {
                path = [{ x: (w / 2) + 40, y: 180 }, { x: w - 230, y: 340 }, { x: destX, y: 420 }, { x: destX, y: destY }];
            } else {
                path = [{ x: (w / 2) + (Math.random() * 40 - 20), y: 220 }, { x: destX, y: destY }];
            }
        }

        const patron = new Patron(startX, startY, rosterKey, { ...config, speed: config.speed ? config.speed * 1.5 : 35 });
        patron.groupId = groupId;
        patron.setPath(path);
        this.patrons.push(patron);
    }

    // Update the Kid Horde to use the REAL doors with a stagger delay
    triggerKidHorde() {
        console.log("HORDE TRIGGERED!");
        let currentHordeSize = progressionState.isBossRound() ? 10 : 5;

        for (let i = 0; i < currentHordeSize; i++) {
            setTimeout(() => {
                this.spawnPatron('kid', 'horde_group'); // Use the actual door logic!
            }, i * 650); // Stagger them by 650ms so they don't spawn inside each other
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
        if (this.spawnTimer <= 0 && this.patrons.length < this.maxPatrons) {
            this.spawnPatron(); // Call it empty so it picks a unique one
            this.spawnTimer = this.spawnInterval + (Math.random() * 2.0);
        }

        // 3. MOVEMENT & ESCAPE LOGIC
        this.patrons = this.patrons.filter(patron => {
            if (!patron.active) return false;

            patron.update(dt, this.patrons);

            // STOP AT THE BAR COUNTER (Y=460) AND WAIT
            if (patron.state === 'walk' && patron.y >= 460) {
                patron.state = 'idle';
                patron.y = 460;
            }

            // PATIENCE RAN OUT (PENALTY)
            if (patron.state === 'fail' && !patron.penaltyApplied) {
                patron.penaltyApplied = true;
                const penalty = typeof gameEconomy !== 'undefined' ? gameEconomy.escapePenalty : 10;
                gameEvents.emit('SPEND_TIPS', penalty);
                this.floatingTexts.push(new FloatingTitle(patron.x, patron.y - 100, `-$${penalty} (Left Angry!)`, "#ef4444"));

                setTimeout(() => { patron.active = false; }, 600);
            }
            return true;
        });

        // 4. FLOATING TEXT & PARTICLE UPDATES
        this.floatingTexts = this.floatingTexts.filter(text => {
            if (text.update) text.update(dt);
            return text.active;
        });

        if (!this.particles) this.particles = [];
        this.particles = this.particles.filter(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += this.gravity * 0.8 * dt; // Gravity pulls coins down
            p.life -= dt;
            return p.life > 0;
        });

        // 5. PROJECTILE PHYSICS & HIT DETECTION
        this.projectiles.forEach(p => {
            if (!p.active) return;

            p.vz -= this.gravity * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;

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
                    p.active = false;

                    let tipAmount = 0;
                    let floatText = "";
                    let floatColor = "#10b981";

                    const config = PATRON_ROSTER[patron.rosterKey];

                    // --- ADD THIS LINE TO DEFINE BASETIP ---
                    const baseTip = (patron && typeof patron.tipBase === 'number' && !isNaN(patron.tipBase))
                        ? patron.tipBase
                        : (config && config.tipBase ? config.tipBase : 12);

                    const isExactMatch = config.favoriteDrink && p.name === config.favoriteDrink;
                    const isStyleMatch = config.favoriteStyle && (p.name.includes(config.favoriteStyle) || p.type === config.favoriteStyle.toLowerCase());
                    const isCraved = config.craves && config.craves.includes(p.type);

                    if (isExactMatch) {
                        tipAmount = baseTip * 3;
                        floatText = `+$${tipAmount} (Favorite!)`;
                        floatColor = "#f59e0b";
                        patron.receivedPreferredDrink = true;
                        patron.state = 'happy';

                        this.spawnCoinBurst(patron.x, patron.y - 80);
                        this.patronExit(patron); // SPRINT AWAY!

                    } else if (isStyleMatch) {
                        tipAmount = baseTip * 2;
                        floatText = `+$${tipAmount} (Great Style!)`;
                        floatColor = "#38bdf8";
                        patron.state = 'happy';

                        this.patronExit(patron); // SPRINT AWAY!
                    } else if (isCraved) {
                        tipAmount = baseTip;
                        floatText = `+$${tipAmount}`;
                        floatColor = "#10b981";
                        patron.state = 'happy';

                        this.patronExit(patron); // SPRINT AWAY!
                    } else {
                        tipAmount = 0;
                        floatText = "Gross!";
                        floatColor = "#ef4444";
                        patron.state = 'fail';
                        patron.penaltyApplied = true;

                        if (patron.rosterKey === 'kid' && p.type !== 'soda') {
                            this.triggerKidHorde();
                            floatText = "YAY BEER! (Horde Incoming)";
                        }

                        this.patronExit(patron); // SPRINT AWAY ANGRY!
                    }

                    if (tipAmount > 0) gameEvents.emit('EARN_TIPS', tipAmount);
                    this.floatingTexts.push(new FloatingTitle(patron.x, patron.y - 100, floatText, floatColor));

                    if (patron.groupId) {
                        const groupMembers = this.patrons.filter(pt => pt.groupId === patron.groupId);
                        const allServed = groupMembers.every(pt => pt.state === 'happy' || pt.state === 'fail');

                        if (allServed) {
                            const allHappy = groupMembers.every(pt => pt.receivedPreferredDrink);
                            if (allHappy) {
                                gameEvents.emit('EARN_TIPS', 75);
                                this.floatingTexts.push(new FloatingTitle(patron.x, patron.y - 150, "PARTY COMBO! +$75", "#c084fc"));
                                this.spawnCoinBurst(patron.x, patron.y - 120);
                            }
                            // Sprint the whole party out together!
                            groupMembers.forEach(pt => this.patronExit(pt));
                        }
                    } else {
                        // Solo patron already triggered patronExit above!
                    }
                    break;
                }
            }

            if (p.active && p.z <= 0) {
                p.z = 0;
                p.active = false;
                gameEvents.emit('GLASS_SMASHED', { x: p.x, y: p.y, type: p.type });
            }
        });

        this.projectiles = this.projectiles.filter(p => p.active);
        this.patrons.sort((a, b) => a.y - b.y);
    }

    // --- NEW: PARTICLE EMITTER ---
    spawnCoinBurst(x, y) {
        if (!this.particles) this.particles = [];
        for (let i = 0; i < 12; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 400, // Explode outward left/right
                vy: (Math.random() - 1.0) * 450, // Explode upward
                life: 1.0 + Math.random() * 0.5,
                type: 'coin'
            });
        }
    }

    // --- SPRINT TO THE EXIT (SAFE FLOOR THRESHOLD) ---
    patronExit(patron) {
        if (!patron || !patron.active || patron.state === 'exit') return;

        patron.state = 'exit';
        const w = (this.canvas && this.canvas.width) ? this.canvas.width : window.innerWidth;

        let exitPath = [];
        const safeX = Math.max(100, Math.min(w - 100, patron.x));

        // Choose exit route based on position
        if (safeX > w * 0.65) {
            // Right side: Dart out the side door
            exitPath = [
                { x: safeX, y: 380 },
                { x: w - 120, y: 340 },
                { x: w - 90, y: 280 } // Safely on the floor threshold of the side door
            ];
        } else {
            // Center/Left side: Sprint straight back up to the main door floor line
            exitPath = [
                { x: safeX, y: 350 },
                { x: w / 2, y: 200 },
                { x: w / 2, y: 150 } // Safely on the floor threshold right in front of the back door
            ];
        }

        patron.setPath(exitPath);
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