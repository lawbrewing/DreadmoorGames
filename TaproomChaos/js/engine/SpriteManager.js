// js/engine/SpriteManager.js

class SpriteManager {
    constructor() {
        this.images = {};
        this.anchors = {};
        this.isLoaded = false;
        this.failedAssets = [];

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

        // Only preload the MegaPack tiles actually used by the Taproom to save mobile GPU memory & bandwidth
        this.requiredMegaPackTiles = new Set([
            'floor_wood_restaurant',
            'floor_tile_cafe_pattern',
            'floor_dark_bar',
            'wall_wainscot_restaurant',
            'wall_cream_cafe',
            'wall_brick_bar',
            'door_entrance_glass_wood_frame',
            'stage_small_lights',
            'jukebox',
            'bookshelf_wall_cafe',
            'pizza_oven_brick',
            'lamp_floor_rattan',
            'booth_sofa_double',
            'booth_leather',
            'pool_table',
            'bar_counter_straight',
            'bar_counter_corner',
            'beer_tap_tower',
            'beer_mugs_group',
            'stool_bar_metal_row',
            'espresso_machine_commercial',
            'macaron_tower',
            'grinder_coffee',
            'stool_wood_high',
            'plant_hanging_rope_pot',
            'dartboard_mounted',
            'table_family_long',
            'cake_display_case_curved',
            'table_high_round',
            'coat_hook_stand'
        ]);
    }

    // Builds fallback URL candidates in case Linux server folder casing or "Tiles/" nesting differs from Windows
    buildCandidateUrls(rawFile) {
        const clean = String(rawFile).replace(/\\/g, '/').replace(/^\/+/, '');
        const withoutTiles = clean.replace(/^tiles\//i, '');
        const fileNameOnly = withoutTiles.split('/').pop();

        const candidates = [
            `assets/sprites/${withoutTiles}`,                  // 1. Standard: assets/sprites/CafeFixtures/file.png
            `assets/sprites/${clean}`,                         // 2. Unstripped: assets/sprites/Tiles/CafeFixtures/file.png
            `assets/sprites/${withoutTiles.toLowerCase()}`,    // 3. Lowercase folders: assets/sprites/cafefixtures/file.png
            `assets/sprites/${clean.toLowerCase()}`,           // 4. Lowercase with tiles: assets/sprites/tiles/cafefixtures/file.png
            `assets/sprites/${fileNameOnly}`                   // 5. Flat directory: assets/sprites/file.png
        ];

        return [...new Set(candidates)];
    }

    preloadAll(rosterConfig) {
        return new Promise((resolve) => {
            const safeRoster = rosterConfig || {};
            const keys = Object.keys(safeRoster);
            const allPackTiles = (typeof megaPackData !== 'undefined' && Array.isArray(megaPackData.tiles))
                ? megaPackData.tiles
                : [];

            if (allPackTiles.length === 0) {
                this.showMobileDiagnostic('megaPackData not found! Check <script src="js/data/megaPack.js"> casing.');
            }

            // Filter to active taproom tiles (or all if set is empty)
            const packTiles = allPackTiles.filter(t => t && this.requiredMegaPackTiles.has(t.name));

            const loadQueue = [];

            // 1. Queue Patron Sprite Sheets
            keys.forEach(key => {
                const p = safeRoster[key];
                if (!p) return;
                const cleanFolder = String(p.spriteFolder || '').replace(/\\/g, '/');

                Object.keys(this.animations).forEach(animKey => {
                    if (animKey === 'emote' && !p.hasFullAnimations) return;
                    const primaryUrl = `${cleanFolder}${this.animations[animKey].file}`;
                    loadQueue.push({
                        cacheKey: `${key}_${animKey}`,
                        urls: [primaryUrl, primaryUrl.toLowerCase()]
                    });
                });
            });

            // 2. Queue Required Mega Pack Props with Automatic Path Fallbacks
            packTiles.forEach(tile => {
                if (!tile || !tile.file || !tile.name) return;

                loadQueue.push({
                    cacheKey: tile.name,
                    urls: this.buildCandidateUrls(tile.file)
                });

                const spriteX = (tile.sprite && typeof tile.sprite.x === 'number') ? tile.sprite.x : 0;
                const spriteY = (tile.sprite && typeof tile.sprite.y === 'number') ? tile.sprite.y : 0;
                const cellX = (tile.cell && typeof tile.cell.x === 'number') ? tile.cell.x : 0;
                const cellY = (tile.cell && typeof tile.cell.y === 'number') ? tile.cell.y : 0;
                const anchorX = (tile.anchor_in_cell && typeof tile.anchor_in_cell.x === 'number') ? tile.anchor_in_cell.x : 0;
                const anchorY = (tile.anchor_in_cell && typeof tile.anchor_in_cell.y === 'number') ? tile.anchor_in_cell.y : 0;

                this.anchors[tile.name] = {
                    x: anchorX - (spriteX - cellX),
                    y: anchorY - (spriteY - cellY)
                };
            });

            const totalToLoad = loadQueue.length;
            if (totalToLoad === 0) {
                this.isLoaded = true;
                resolve();
                return;
            }

            let loadedCount = 0;
            const checkDone = () => {
                loadedCount++;
                if (loadedCount >= totalToLoad && !this.isLoaded) {
                    this.isLoaded = true;
                    if (this.failedAssets.length > 0) {
                        console.warn('[SpriteManager] Failed assets:', this.failedAssets);
                        this.showMobileDiagnostic(`Missing ${this.failedAssets.length} sprites (e.g. ${this.failedAssets[0]})`);
                    }
                    resolve();
                }
            };

            // 3. Load each asset with automatic fallback retry on 404
            loadQueue.forEach(job => {
                const img = new Image();
                this.images[job.cacheKey] = img;
                let attemptIndex = 0;

                img.onload = checkDone;
                img.onerror = () => {
                    attemptIndex++;
                    if (attemptIndex < job.urls.length) {
                        img.src = job.urls[attemptIndex];
                    } else {
                        this.failedAssets.push(job.urls[0]);
                        checkDone();
                    }
                };

                img.src = job.urls[0];
            });
        });
    }

    showMobileDiagnostic(msg) {
        console.error('[SpriteManager Diagnostic]', msg);
        const banner = document.createElement('div');
        banner.style.cssText = `
            position: fixed; bottom: 8px; left: 50%; transform: translateX(-50%);
            background: rgba(127, 29, 29, 0.95); color: #fef08a; border: 1px solid #ef4444;
            padding: 6px 12px; border-radius: 6px; font-family: monospace; font-size: 11px;
            z-index: 9999; pointer-events: none;
        `;
        banner.innerText = `⚠️ ${msg}`;
        document.body.appendChild(banner);
        setTimeout(() => banner.remove(), 8000);
    }

    drawSprite(ctx, rosterKey, state, dirText, frameIndex, x, y) {
        if (!this.isLoaded) return;

        let safeState = state;
        const patronConfig = typeof PATRON_ROSTER !== 'undefined' ? PATRON_ROSTER[rosterKey] : null;
        if (state === 'emote' && patronConfig && !patronConfig.hasFullAnimations) {
            safeState = 'shoot';
        }

        const cacheKey = `${rosterKey}_${safeState}`;
        const img = this.images[cacheKey];

        if (!img || !img.complete || img.naturalWidth === 0) {
            ctx.fillStyle = '#ff00ff';
            ctx.fillRect(x, y, 64, 64);
            return;
        }

        const animData = this.animations[safeState] || this.animations['walk'];
        const row = this.dirs[dirText] !== undefined ? this.dirs[dirText] : 2;
        const safeRow = Math.min(row, animData.rows - 1);
        const safeCol = Math.floor(frameIndex) % animData.frames;

        ctx.drawImage(
            img,
            safeCol * 64,
            safeRow * 64,
            64,
            64,
            x,
            y,
            64,
            64
        );
    }
}

const spriteManager = new SpriteManager();