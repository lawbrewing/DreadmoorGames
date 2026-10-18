// js/engine/SpriteManager.js

class SpriteManager {
    constructor() {
        this.images = {}; // Stores the loaded Image objects
        this.isLoaded = false;

        // FIXED: Keys now perfectly match the LPC standard filenames!
        this.animations = {
            'walk': { file: 'walk.png', frames: 9, rows: 4 },
            'spellcast': { file: 'spellcast.png', frames: 7, rows: 4 },
            'thrust': { file: 'thrust.png', frames: 8, rows: 4 },
            'slash': { file: 'slash.png', frames: 6, rows: 4 },
            'shoot': { file: 'shoot.png', frames: 13, rows: 4 },
            'hurt': { file: 'hurt.png', frames: 6, rows: 1 },

            // Extra animations (Only used if patron config hasFullAnimations === true)
            'emote': { file: 'emote.png', frames: 3, rows: 4 }
        };

        // Standard LPC Direction Row Mapping
        this.dirs = {
            UP: 0,
            LEFT: 1,
            DOWN: 2,
            RIGHT: 3
        };
    }

    // Call this before the game starts to load all 19 characters' assets into memory
    preloadAll(rosterConfig) {
        return new Promise((resolve) => {
            const keys = Object.keys(rosterConfig);
            let loadedCount = 0;
            let totalToLoad = 0;

            // Calculate total images to load
            keys.forEach(key => {
                const p = rosterConfig[key];
                Object.keys(this.animations).forEach(animKey => {
                    // Skip extra animations if the character doesn't support them
                    if (animKey === 'emote' && !p.hasFullAnimations) return;
                    totalToLoad++;
                });
            });

            // Load them
            keys.forEach(key => {
                const p = rosterConfig[key];
                Object.keys(this.animations).forEach(animKey => {
                    if (animKey === 'emote' && !p.hasFullAnimations) return;

                    const animData = this.animations[animKey];
                    const img = new Image();

                    // Build the path: assets/sprites/viking/walk.png
                    img.src = `${p.spriteFolder}${animData.file}`;

                    img.onload = () => {
                        loadedCount++;
                        if (loadedCount === totalToLoad) {
                            this.isLoaded = true;
                            resolve();
                        }
                    };

                    img.onerror = () => {
                        console.warn(`Missing Sprite: ${img.src}`);
                        loadedCount++; // Keep loading even if one fails
                        if (loadedCount === totalToLoad) {
                            this.isLoaded = true;
                            resolve();
                        }
                    };

                    // Store in memory vault using the exact LPC key (e.g., 'viking_spellcast')
                    this.images[`${key}_${animKey}`] = img;
                });
            });
        });
    }

    // Called every frame by the Patron class to draw itself
    drawSprite(ctx, rosterKey, state, dirText, frameIndex, x, y) {
        if (!this.isLoaded) return;

        // 1. Validate State (Fallback gracefully if attempting an unsupported animation)
        let safeState = state;
        const patronConfig = typeof PATRON_ROSTER !== 'undefined' ? PATRON_ROSTER[rosterKey] : null;
        if (state === 'emote' && patronConfig && !patronConfig.hasFullAnimations) {
            safeState = 'shoot'; // Fallback to shoot.png for tossing tips
        }

        const cacheKey = `${rosterKey}_${safeState}`;
        const img = this.images[cacheKey];

        // 2. Draw standard colored rectangle if sprite is missing
        if (!img || !img.complete || img.naturalWidth === 0) {
            ctx.fillStyle = '#ff00ff'; // Magenta missing-texture box
            ctx.fillRect(x, y, 64, 64);
            return;
        }

        // 3. Grid Math (LPC standards: 64x64 pixels per frame)
        const animData = this.animations[safeState];

        // If the direction string is missing or weird, fallback safely to DOWN
        const row = this.dirs[dirText] !== undefined ? this.dirs[dirText] : 2;

        // FIXED RESTORED MATH: Ensure row doesn't exceed image bounds
        const safeRow = Math.min(row, animData.rows - 1);

        // Loop the frame index to fit within the animation length
        const safeCol = Math.floor(frameIndex) % animData.frames;

        // 4. Crop and Draw!
        ctx.drawImage(
            img,
            safeCol * 64,   // FIXED RESTORED MATH: Source X (Crop starting point)
            safeRow * 64,   // FIXED RESTORED MATH: Source Y
            64, 64,         // Source Width & Height (Crop size)
            x, y,           // Destination X & Y (Canvas coordinates)
            64, 64          // Destination Width & Height
        );
    }
}

// Instantiate the global manager
const spriteManager = new SpriteManager();