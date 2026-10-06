// js/phases/taproom.js

class TaproomPhase {
    constructor() {
        this.patrons = [];
        this.projectiles = [];
        this.availableAmmo = [];
        this.isActive = false;

        // Ammo Selection
        this.selectedAmmoIndex = 0; // Defaults to 0 (Swill)

        // Slingshot State
        this.isAiming = false;
        this.aimStart = { x: 0, y: 0 };
        this.aimCurrent = { x: 0, y: 0 };

        // Fake 3D Physics Constants
        this.gravity = 1500; // Pulls 'z' (height) back down to 0
        this.throwMultiplier = 2.5; // How much drag distance affects speed
        this.zMultiplier = 1.2; // How much drag affects the upward arc

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

        gameEvents.on('DRAG_MOVE', (pos) => {
            if (!this.isAiming) return;
            this.aimCurrent = { x: pos.x, y: pos.y };
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

        // Deduct ammo (if it's not the infinite Swill)
        if (currentAmmo.count !== 'Infinite') {
            currentAmmo.count--;
            // If we just threw the last one, auto-switch back to Swill
            if (currentAmmo.count <= 0) {
                console.log(`Keg kicked! Switched back to Swill.`);
                this.selectedAmmoIndex = 0;
            }
        }

        this.projectiles.push({
            x: x,
            y: y,
            z: 0,
            vx: vx,
            vy: vy,
            vz: vz,
            type: currentAmmo.name, // The glass now knows what's inside it!
            radius: 12,
            active: true
        });
    }

    init(ammoList = []) {
        this.isActive = true;
        // Patrons spawn far away (y = 200) and walk toward the bar (y = 550)
        this.patrons = [
            { x: 400, y: 150, type: 'Old Timer', speed: 20, color: '#71717a' },
            { x: 800, y: 200, type: 'VIP', speed: 25, color: '#f59e0b' }
        ];
        this.projectiles = [];
        this.isAiming = false;
        this.availableAmmo = playerState.ammo;
    }

    update(deltaTime) {
        if (!this.isActive) return;
        const dt = deltaTime / 1000;

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
                    console.log(`🎯 DIRECT HIT on ${patron.type} with ${p.type}!`);
                    p.active = false;

                    // --- NEW TIP LOGIC ---
                    // VIPs tip huge for good beer. Old Timers tip tiny amounts.
                    const tipAmount = patron.type === 'VIP' ? 15 : 2;
                    gameEvents.emit('EARN_TIPS', tipAmount);

                    // Knock them back to show the hit registered
                    patron.y -= 100;
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

    draw(ctx, canvas) {
        if (!this.isActive) return;

        // 1. Floor
        ctx.fillStyle = '#18181b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. The Bar (Foreground)
        ctx.fillStyle = '#27272a';
        ctx.fillRect(0, 550, canvas.width, 170);
        // Bar lip
        ctx.fillStyle = '#3f3f46';
        ctx.fillRect(0, 540, canvas.width, 10);

        // 3. Draw Patrons
        this.patrons.forEach(patron => {
            // Scale them slightly based on depth so they look bigger as they approach
            const scale = 0.5 + (patron.y / canvas.height);
            const width = 60 * scale;
            const height = 140 * scale;

            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.beginPath();
            ctx.ellipse(patron.x, patron.y, width / 2, 10 * scale, 0, 0, Math.PI * 2);
            ctx.fill();

            // Body
            ctx.fillStyle = patron.color;
            ctx.fillRect(patron.x - width / 2, patron.y - height, width, height);

            // Label
            ctx.fillStyle = '#ffffff';
            ctx.font = `${Math.floor(14 * scale)}px Inter`;
            ctx.textAlign = 'center';
            ctx.fillText(patron.type, patron.x, patron.y - height - 10);
        });

        // 4. Draw Projectiles
        this.projectiles.forEach(p => {
            // Draw floor shadow so the player can judge where the glass is in the room
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, p.radius, p.radius / 2, 0, 0, Math.PI * 2);
            ctx.fill();

            // Draw the actual glass simulating height (y - z)
            const renderY = p.y - p.z;

            ctx.fillStyle = '#eab308'; // Beer
            ctx.beginPath();
            ctx.arc(p.x, renderY, p.radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = 'rgba(255,255,255,0.7)'; // Highlight
            ctx.beginPath();
            ctx.arc(p.x - 3, renderY - 3, p.radius / 3, 0, Math.PI * 2);
            ctx.fill();
        });

        // 5. Draw Aiming Line
        if (this.isAiming) {
            ctx.strokeStyle = 'rgba(220, 38, 38, 0.6)'; // Dreadmoor Red
            ctx.lineWidth = 4;
            ctx.setLineDash([10, 10]);

            ctx.beginPath();
            ctx.moveTo(this.aimStart.x, this.aimStart.y);
            // Invert the drag distance to show where it's being aimed
            const dx = this.aimStart.x - this.aimCurrent.x;
            const dy = this.aimStart.y - this.aimCurrent.y;
            ctx.lineTo(this.aimStart.x + dx, this.aimStart.y + dy);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        // 6. Draw the HUD (Ammo)
        ctx.fillStyle = 'rgba(9, 9, 11, 0.8)'; // Dark Dreadmoor panel
        ctx.fillRect(10, 10, 280, 50 + (playerState.ammo.length * 35));

        ctx.fillStyle = '#dc2626'; // Red
        ctx.font = 'bold 24px Oswald';
        ctx.textAlign = 'left';
        ctx.fillText('ON TAP:', 25, 45);

        ctx.font = '16px Inter';
        let yOffset = 80;

        playerState.ammo.forEach((ammo, index) => {
            // Highlight the currently selected weapon
            if (index === this.selectedAmmoIndex) {
                ctx.fillStyle = '#f59e0b'; // Gold
                ctx.fillText(`► ${ammo.name} (x${ammo.count})`, 25, yOffset);
            } else {
                ctx.fillStyle = '#a1a1aa'; // Gray
                ctx.fillText(`  ${ammo.name} (x${ammo.count})`, 25, yOffset);
            }

            // Save the exact coordinates of this text so DRAG_START knows where to click
            ammo.hitbox = { x: 25, y: yOffset - 16, w: 250, h: 24 };

            yOffset += 35;
        });
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