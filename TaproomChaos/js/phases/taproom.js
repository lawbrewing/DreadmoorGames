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
        this.shiftDuration = 60; // A shift lasts 60 seconds
        this.timeRemaining = this.shiftDuration;

        // Ammo Selection
        this.selectedAmmoIndex = 0; // Defaults to 0 (Swill)

        // Slingshot State
        this.isAiming = false;
        this.aimStart = { x: 0, y: 0 };
        this.aimCurrent = { x: 0, y: 0 };

        // Fake 3D Physics Constants
        this.gravity = 1500; // Pulls 'z' (height) back down to 0
        this.throwMultiplier = 7.0; // INCREASED from 2.5
        this.zMultiplier = 2.5;     // INCREASED from 1.2

        this.setupEventListeners();
    }

    setupEventListeners() {
        gameEvents.on('DRAG_START', (pos) => {
            if (!this.isActive) return;

            // 2. Are they pulling back to shoot?
            // The Bar is at the bottom of the screen (y > 550)
            if (pos.y > 550) {
                this.isAiming = true;
                this.aimStart = { x: pos.x, y: pos.y };
                this.aimCurrent = { x: pos.x, y: pos.y };
            }
        });

        gameEvents.on('DRAG_END', (pos) => {
            if (!this.isAiming) return;
            this.isAiming = false;

            // --- NEW DART THROW LOGIC ---
            // Drag FORWARD (up the screen) to shoot FORWARD
            const dx = pos.x - this.aimStart.x;
            const dy = pos.y - this.aimStart.y; // Dragging UP makes dy negative (into the room)

            // We only shoot if they flicked forward (dy < -20)
            if (dy < -20) {
                const dragDistance = Math.sqrt(dx * dx + dy * dy);

                // Tuned multipliers for a forward flick
                const throwMult = 4.0;
                const zMult = 1.5;

                this.fireProjectile(this.aimStart.x, this.aimStart.y, dx * throwMult, dy * throwMult, dragDistance * zMult);
            } else {
                console.log("Canceled throw (didn't drag forward enough)");
            }
        });

        gameEvents.on('GLASS_SMASHED', (data) => {
            if (!this.isActive) return;

            // 1. Define splash stats based on the type of beer
            let splashRadius = 0;
            let pushbackForce = 0;

            if (data.type === 'Swill') {
                splashRadius = 180; // Massive AoE for crowd control
                pushbackForce = 120; // Massive pushback force
            } else if (data.type === 'Pastry Stout') {
                splashRadius = 80;  // Heavy, thick liquid doesn't splash as far
                pushbackForce = 40;
            } else {
                splashRadius = 40;  // IPAs and light beers have minimal physical impact
                pushbackForce = 10;
            }

            // 2. Check every patron against the blast radius
            this.patrons.forEach(patron => {
                // Pythagorean theorem to find the distance between the smash and the patron
                const dx = patron.x - data.x;
                const dy = patron.y - data.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance <= splashRadius) {
                    console.log(`💦 Splash caught ${patron.type}! Pushed back ${pushbackForce}px.`);

                    // Remember: The back of the room is y=150, the bar is y=550.
                    // To push them backward, we DECREASE their y value.
                    patron.y -= pushbackForce;

                    // Add a tiny bit of horizontal scatter so they don't stay in a perfect line
                    if (patron.x > data.x) {
                        patron.x += pushbackForce / 4; // Pushed right
                    } else {
                        patron.x -= pushbackForce / 4; // Pushed left
                    }

                    // Keep them from getting pushed out the back wall of the taproom
                    if (patron.y < 150) {
                        patron.y = 150;
                    }
                }
            });

            // (Optional) We could also emit a 'DRAW_SPLASH_DECAL' event here 
            // so the renderer knows to paint a puddle on the floor!
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
            type: currentAmmo.type || 'crowd_control', // e.g., 'premium', 'soda', or 'crowd_control'
            radius: 12,
            active: true
        });
    }

    init(ammoList = []) {
        this.isActive = true;
        this.patrons = []; // Start empty!
        this.spawnTimer = 0.5; // First patron walks in almost instantly
        this.projectiles = [];
        this.isAiming = false;
        this.availableAmmo = playerState.ammo;
        this.floatingTexts = [];
        this.timeRemaining = this.shiftDuration;
    }

    spawnPatron() {
        const rand = Math.random();
        const randomX = Math.floor(Math.random() * 1000) + 120;

        const stats = gamePopulation.stats;
        const rates = gamePopulation.spawnRates;
        const diffMult = progressionState.getDifficultyMultiplier();

        // 1. TETHERED PAIR
        if (rand < rates.tetheredPair) {
            const vip = new Patron(randomX, 150, 'VIP', stats['VIP'].speed * diffMult, stats['VIP'].color);
            vip.hasSpouse = true;

            const spouse = new Patron(randomX + 50, 120, 'Spouse', stats['Spouse'].speed * diffMult, stats['Spouse'].color);

            // Link their IDs together!
            spouse.partnerId = vip.id;
            vip.partnerId = spouse.id;

            this.patrons.push(vip, spouse);
        }
        // 2. SOLO VIP
        else if (rand < rates.tetheredPair + rates.vip) {
            this.patrons.push(new Patron(randomX, 150, 'VIP', stats['VIP'].speed * diffMult, stats['VIP'].color));
        }
        // 3. KID
        else if (rand < rates.tetheredPair + rates.vip + rates.kid) {
            this.patrons.push(new Patron(randomX, 150, 'Kid', stats['Kid'].speed * diffMult, stats['Kid'].color));
        }
        // 4. OLD TIMER
        else {
            this.patrons.push(new Patron(randomX, 150, 'Old Timer', stats['Old Timer'].speed * diffMult, stats['Old Timer'].color));
        }
    }

    triggerKidHorde() {
        console.log("HORDE TRIGGERED!");
        const kidStats = gamePopulation.stats['Kid'];
        const diffMult = progressionState.getDifficultyMultiplier();

        let currentHordeSize = gamePopulation.hordeSize;
        if (progressionState.isBossRound()) {
            currentHordeSize *= 2;
        }

        for (let i = 0; i < currentHordeSize; i++) {
            setTimeout(() => {
                this.patrons.push(new Patron(
                    Math.floor(Math.random() * 1080) + 100,
                    100 - (i * 20),
                    'Kid',
                    kidStats.speed * diffMult,
                    kidStats.color
                ));
            }, i * gamePopulation.hordeDelayMs);
        }
    }

    update(dt) {
        if (!this.isActive) return;

        // 1. COUNTDOWN LOGIC
        this.timeRemaining -= dt;
        if (this.timeRemaining <= 0) {
            console.log("[Taproom] Shift over! Returning to Brewery.");

            // --- ADD THIS LINE! ---
            progressionState.advanceShift();

            gameEvents.emit('CHANGE_STATE', { newState: 'BREWING' });
            return;
        }

        // --- SPAWNING LOGIC ---
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnPatron();
            // Reset timer (Add a little randomness so it doesn't feel robotic)
            this.spawnTimer = this.spawnInterval + (Math.random() * 1.5);
        }

        // --- MOVEMENT & ESCAPE LOGIC ---
        this.patrons = this.patrons.filter(patron => {
            if (!patron.active) return false;

            // Let the entity handle its own downward math
            patron.update(dt);

            if (patron.y >= 540) {
                gameEvents.emit('SPEND_TIPS', gameEconomy.escapePenalty);

                // Spawn a red penalty title
                this.floatingTexts.push(new FloatingTitle(patron.x, patron.y - 160, `-$${gameEconomy.escapePenalty}`, "#ef4444"));
                return false;
            }
            return true;
        });

        // --- FLOATING TEXT UPDATES ---
        this.floatingTexts = this.floatingTexts.filter(text => {
            // Let the entity handle its own floating and fading math
            text.update(dt);
            return text.active; // Delete it automatically when its life hits 0
        });

        
        // Move projectiles in 3D space
        this.projectiles.forEach(p => {
            if (!p.active) return;

            // Apply Gravity
            p.vz -= this.gravity * dt;

            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;

            // 1. CHECK FOR DIRECT HITS (Mid-air collision)
            for (let i = 0; i < this.patrons.length; i++) {
                let patron = this.patrons[i];

                // Recalculate their size based on depth, just like we do when drawing
                // (Assuming canvas height is 720)
                const scale = 0.5 + (patron.y / 720);
                const patronWidth = 60 * scale;
                const patronHeight = 140 * scale;
                const patronDepth = 40; // Give them a 40-pixel "thickness" front-to-back

                // The Hitbox Math
                const withinX = p.x > (patron.x - patronWidth / 2) && p.x < (patron.x + patronWidth / 2);
                const withinY = p.y > (patron.y - patronDepth / 2) && p.y < (patron.y + patronDepth / 2);
                const withinZ = p.z > 0 && p.z < patronHeight;

                if (withinX && withinY && withinZ) {
                    p.active = false;
                    patron.active = false; // Mark served so they get removed!

                    let tipAmount = 0;
                    let floatText = "";
                    let floatColor = "#10b981"; // Default Green

                    // Evaluate the Serve!
                    const tips = gameEconomy.tips;

                    // 1. THE SPOUSE LOGIC
                    if (patron.type === 'Spouse') {
                        if (p.type === 'cocktail') {
                            tipAmount = tips.spouseCocktail; floatText = `+$${tipAmount} (Happy Wife!)`; floatColor = "#ec4899";
                            const partner = this.patrons.find(pt => pt.id === patron.partnerId);
                            if (partner) partner.spouseSatisfied = true;
                        } else {
                            tipAmount = tips.badServe; floatText = "Ew! We're leaving!"; floatColor = "#ef4444";
                            const partner = this.patrons.find(pt => pt.id === patron.partnerId);
                            if (partner) partner.active = false;
                        }
                    }
                    // 2. THE VIP LOGIC
                    else if (patron.type === 'VIP') {
                        if (patron.hasSpouse && !patron.spouseSatisfied) {
                            tipAmount = tips.badServe; floatText = "Serve my spouse first!"; floatColor = "#ef4444";
                            const spouse = this.patrons.find(pt => pt.partnerId === patron.id);
                            if (spouse) spouse.active = false;
                        }
                        else if (p.type === 'premium') {
                            if (patron.spouseSatisfied) {
                                tipAmount = tips.vipCombo; floatText = `+$${tipAmount} (Happy Wife, Happy Life!)`; floatColor = "#f59e0b";
                            } else {
                                tipAmount = tips.vipPremium; floatText = `+$${tipAmount} (Loved it!)`;
                            }
                        } else {
                            tipAmount = tips.badServe; floatText = "Gross! (No Tip)"; floatColor = "#ef4444";
                        }
                    }
                    // 3. THE CROWD LOGIC
                    else if (patron.type === 'Old Timer') {
                        tipAmount = tips.oldTimer; floatText = `+$${tipAmount}`;
                    }
                    else if (patron.type === 'Kid') {
                        if (p.type === 'soda') {
                            tipAmount = tips.kidSoda; floatText = `+$${tipAmount} (Mom Tip!)`;
                        } else {
                            tipAmount = tips.badServe; floatText = "YAY BEER! (Horde Incoming)"; floatColor = "#ef4444";
                            this.triggerKidHorde();
                        }
                    }

                    if (tipAmount > 0) gameEvents.emit('EARN_TIPS', tipAmount);

                    this.floatingTexts.push(new FloatingTitle(patron.x, patron.y - 160, floatText, floatColor));

                    break;
                }
            }

            // 2. CHECK FOR FLOOR IMPACT (Miss or Splash Damage)
            if (p.active && p.z <= 0) {
                p.z = 0;
                p.active = false;

                console.log(`💦 ${p.type} smashed on the floor!`);
                gameEvents.emit('GLASS_SMASHED', { x: p.x, y: p.y, type: p.type });
            }
        });

        // Clean up dead projectiles
        this.projectiles = this.projectiles.filter(p => p.active);

        // Sort patrons so those closer to the bar (higher Y) are drawn on top of those further back
        this.patrons.sort((a, b) => a.y - b.y);
                
    }
       
    /**
         * Clean up when the round ends
         */
    shutdown() {
        console.log("[Taproom] Last call. Shutting down phase.");
        this.isActive = false;
        this.patrons = [];
        this.projectiles = [];
        this.isAiming = false;
    }
}

const taproomPhase = new TaproomPhase();