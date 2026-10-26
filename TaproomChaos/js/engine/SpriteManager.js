// js/engine/SpriteManager.js

class SpriteManager {
    constructor() {
        this.images = {};
        this.anchors = {};
        this.isLoaded = false;

        this.animations = {
            'walk': { file: 'walk.png', frames: 9, rows: 4 },
            'spellcast': { file: 'spellcast.png', frames: 7, rows: 4 },
            'thrust': { file: 'thrust.png', frames: 8, rows: 4 },
            'slash': { file: 'slash.png', frames: 6, rows: 4 },
            'shoot': { file: 'shoot.png', frames: 13, rows: 4 },
            'hurt': { file: 'hurt.png', frames: 6, rows: 1 },
            'emote': { file: 'emote.png', frames: 3, rows: 4 }
        };

        this.dirs = { UP: 0, LEFT: 1, DOWN: 2, RIGHT: 3 };
    }

    preloadAll(rosterConfig) {
        return new Promise((resolve) => {
            const keys = Object.keys(rosterConfig);
            let loadedCount = 0;

            const packTiles = typeof megaPackData !== 'undefined' ? megaPackData.tiles : [];
            let totalToLoad = (keys.length * Object.keys(this.animations).length) + packTiles.length;

            const checkDone = () => {
                loadedCount++;
                if (loadedCount >= totalToLoad) {
                    this.isLoaded = true;
                    resolve();
                }
            };

            // 1. Load Patron Sprite Sheets
            keys.forEach(key => {
                const p = rosterConfig[key];
                Object.keys(this.animations).forEach(animKey => {
                    if (animKey === 'emote' && !p.hasFullAnimations) {
                        totalToLoad--;
                        return;
                    }
                    const img = new Image();
                    img.src = `${p.spriteFolder}${this.animations[animKey].file}`;
                    img.onload = checkDone;
                    img.onerror = () => { console.warn(`Missing Patron: ${img.src}`); checkDone(); };
                    this.images[`${key}_${animKey}`] = img;
                });
            });

            // 2. Automated Mega Pack Loader
            packTiles.forEach(tile => {
                const img = new Image();
                const fixedPath = tile.file.replace('Tiles/', '');
                img.src = `assets/sprites/${fixedPath}`;

                img.onload = checkDone;
                img.onerror = () => { console.warn(`Missing: ${img.src}`); checkDone(); };

                this.images[tile.name] = img;

                // FIXED: Calculate the true anchor for cropped individual image files
                const offsetX = tile.sprite.x - tile.cell.x;
                const offsetY = tile.sprite.y - tile.cell.y;
                this.anchors[tile.name] = {
                    x: tile.anchor_in_cell.x - offsetX,
                    y: tile.anchor_in_cell.y - offsetY
                };
            });
        });
    }

    drawSprite(ctx, rosterKey, state, dirText, frameIndex, x, y) {
        if (!this.isLoaded) return;

        let safeState = state;
        const patronConfig = typeof PATRON_ROSTER !== 'undefined' ? PATRON_ROSTER[rosterKey] : null;
        if (state === 'emote' && patronConfig && !patronConfig.hasFullAnimations) { safeState = 'shoot'; }

        const cacheKey = `${rosterKey}_${safeState}`;
        const img = this.images[cacheKey];

        if (!img || !img.complete || img.naturalWidth === 0) {
            ctx.fillStyle = '#ff00ff';
            ctx.fillRect(x, y, 64, 64);
            return;
        }

        const animData = this.animations[safeState];
        const row = this.dirs[dirText] !== undefined ? this.dirs[dirText] : 2;
        const safeRow = Math.min(row, animData.rows - 1);
        const safeCol = Math.floor(frameIndex) % animData.frames;

        ctx.drawImage(
            img,
            safeCol * 64, safeRow * 64, 64, 64,
            x, y, 64, 64
        );
    }
}

const spriteManager = new SpriteManager();