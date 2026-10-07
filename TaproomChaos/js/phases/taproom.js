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

            // 1. Did they click the HUD to change ammo?
            // The HUD lives in the top left corner
            if (pos.x < 300 && pos.y < 300) {
                playerState.ammo.forEach((ammo, index) => {
                    if (ammo.hitbox && pos.y >= ammo.hitbox.y && pos.y <= ammo.hitbox.y + ammo.hitbox.h) {
                        // Only let them select it if they actually have some
                        if (ammo.count === 'Infinite' || ammo.count > 0) {
                            this.selectedAmmoIndex = index;
                            console.log(`Switched tap to: ${ammo.name}`);
                        }
                    }
                });
                return; // Stop here so they don't accidentally throw a beer
            }

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

        gameEvents.on('DRAG_END', (pos) => {
            if (!this.isAiming) return;
            this.isAiming = false;

            // Dragging DOWN and LEFT shoots UP and RIGHT
            const dx = this.aimStart.x - pos.x;
            const dy = this.aimStart.y - pos.y; // Negative dy means we shoot "into" the screen

            const dragDistance = Math.sqrt(dx * dx + dy * dy);
            if (dragDistance > 20) {
                // vx is horizontal, vy is depth into the room, vz is the upward arc height
                const vz = dragDistance * this.zMultiplier;
                this.fireProjectile(this.aimStart.x, this.aimStart.y, dx * this.throwMultiplier, dy * this.throwMultiplier, vz);
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
    }

    spawnPatron() {
        const rand = Math.random();
        let template;

        if (rand > 0.8) {
            template = { type: 'VIP', speed: 25, color: '#f59e0b' };
        } else if (rand > 0.5) {
            template = { type: 'Kid', speed: 45, color: '#3b82f6' }; // Kids run fast!
        } else {
            template = { type: 'Old Timer', speed: 18, color: '#71717a' };
        }

        const randomX = Math.floor(Math.random() * 1080) + 100;
        this.patrons.push({
            x: randomX, y: 150, type: template.type,
            speed: template.speed, color: template.color, active: true
        });
    }

    triggerKidHorde() {
        console.log("HORDE TRIGGERED!");
        for (let i = 0; i < 4; i++) {
            setTimeout(() => {
                this.patrons.push({
                    x: Math.floor(Math.random() * 1080) + 100,
                    y: 100 - (i * 20), // Stagger them
                    type: 'Kid', speed: 45, color: '#3b82f6', active: true
                });
            }, i * 400); // 400ms delay between each
        }
    }

    update(deltaTime) {
        if (!this.isActive) return;
        const dt = deltaTime / 1000;

        // --- SPAWNING LOGIC ---
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnPatron();
            // Reset timer (Add a little randomness so it doesn't feel robotic)
            this.spawnTimer = this.spawnInterval + (Math.random() * 1.5);
        }

        // --- MOVEMENT & ESCAPE LOGIC ---
        this.patrons = this.patrons.filter(patron => {
            if (!patron.active) return false; // They were served, remove them!

            patron.y += patron.speed * dt;

            if (patron.y >= 540) {
                gameEvents.emit('SPEND_TIPS', 5);
                this.floatingTexts.push({
                    x: patron.x, y: patron.y - 160, text: "-$5", color: "#ef4444", alpha: 1.0, life: 1.5
                });
                return false;
            }
            return true;
        });

        // Move patrons toward the camera (increasing Y)
        this.patrons.forEach(patron => {
            patron.y += patron.speed * dt;
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
                    if (patron.type === 'VIP') {
                        if (p.type === 'premium') {
                            tipAmount = 15; floatText = "+$15 (Loved it!)";
                        } else {
                            tipAmount = 0; floatText = "Gross! (No Tip)"; floatColor = "#ef4444";
                        }
                    }
                    else if (patron.type === 'Old Timer') {
                        tipAmount = 2; floatText = "+$2";
                    }
                    else if (patron.type === 'Kid') {
                        if (p.type === 'soda') {
                            tipAmount = 10; floatText = "+$10 (Mom Tip!)";
                        } else {
                            tipAmount = 0; floatText = "YAY BEER! (Horde Incoming)"; floatColor = "#ef4444";
                            this.triggerKidHorde(); // Uh oh.
                        }
                    }

                    if (tipAmount > 0) gameEvents.emit('EARN_TIPS', tipAmount);

                    this.floatingTexts.push({
                        x: patron.x, y: patron.y - 160,
                        text: floatText, color: floatColor, alpha: 1.0, life: 2.0
                    });

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

        // Animate Floating Text
        this.floatingTexts.forEach(ft => {
            ft.life -= dt;
            ft.y -= 40 * dt; // Float upward at 40 pixels per second
            ft.alpha = Math.max(0, ft.life / 1.5); // Fade out as life drops
        });

        // Clean up dead text
        this.floatingTexts = this.floatingTexts.filter(ft => ft.life > 0);
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