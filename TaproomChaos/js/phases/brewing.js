// js/phases/brewing.js

class BrewingPhase {
    constructor() {
        this.isActive = false;

        // Grid configuration
        this.cols = 5;
        this.rows = 4;
        this.tileSize = 115; // Increased from default for massive mobile hitboxes
        this.gridOffset = { x: 30, y: 110 }; // Snug against the top-left

        this.gridOffset = { x: 500, y: 140 };
        this.grid = [];
        this.dragState = null;

        // Tracks consecutive ingredient merges for /api/scores/taproom_chaos (highestComboMerges)
        this.currentMergeCombo = 0;

        // 6 Specific Ingredient Bags
        this.sacks = [
            { id: 'sack_water', category: 'Water', cost: 0, x: 680, y: 110, w: 90, h: 90, color: '#3b82f6' },
            { id: 'sack_grain', category: 'Grain', cost: 0, x: 810, y: 110, w: 90, h: 90, color: '#eab308' },
            { id: 'sack_yeast', category: 'Yeast', cost: 0, x: 680, y: 230, w: 90, h: 90, color: '#d9f99d' },
            { id: 'sack_hops', category: 'Hops', cost: 1, x: 810, y: 230, w: 90, h: 90, color: '#22c55e' },
            { id: 'sack_adjunct', category: 'Adjunct', cost: 2, x: 680, y: 350, w: 90, h: 90, color: '#f97316' },
            { id: 'sack_specialty', category: 'Specialty', cost: 4, x: 810, y: 350, w: 90, h: 90, color: '#a855f7' }
        ];

        // 3-Kettle Brewhouse Array
        this.kettles = [
            { id: 0, x: 460, y: 595, w: 250, h: 110, items: [], btnX: 625, btnY: 642, btnW: 75, btnH: 46 },
            { id: 1, x: 730, y: 595, w: 250, h: 110, items: [], btnX: 895, btnY: 642, btnW: 75, btnH: 46 },
            { id: 2, x: 1000, y: 595, w: 250, h: 110, items: [], btnX: 1165, btnY: 642, btnW: 75, btnH: 46 }
        ];

        // Floor Drain
        this.drain = { x: 680, y: 470, w: 220, h: 90 };

        // Floating feedback text popups
        this.floatingTexts = [];

        this.setupEventListeners();
    }

    setupEventListeners() {
        gameEvents.on('DRAG_START', (pos) => {
            if (!this.isActive) return;

            // 1. Check interactions across all 3 Kettles!
            for (let i = 0; i < this.kettles.length; i++) {
                const k = this.kettles[i];
                const isUnlocked = i < playerState.unlockedKettles;

                if (!isUnlocked) {
                    if (this.isHit(pos, k.x, k.y, k.w, k.h)) {
                        this.unlockKettle(i);
                        return;
                    }
                } else {
                    if (this.isHit(pos, k.btnX, k.btnY, k.btnW, k.btnH)) {
                        this.brewKettle(i);
                        return;
                    }
                    if (this.isHit(pos, k.x, k.y, k.w - 90, k.h)) {
                        if (k.items.length > 0) {
                            const emptyCell = this.findEmptyCell();
                            if (emptyCell) {
                                const removedItem = k.items.pop();
                                this.grid[emptyCell.row][emptyCell.col] = removedItem;
                            }
                        }
                        return;
                    }
                }
            }

            // 2. Did they click a sack?
            for (let sack of this.sacks) {
                if (pos.x >= sack.x && pos.x <= sack.x + sack.w &&
                    pos.y >= sack.y && pos.y <= sack.y + sack.h) {
                    this.spawnItem(sack.category); // No cost passed! Pulling is free.
                    return;
                }
            }

            // 3. Did they click an item on the grid to pick it up?
            const { col, row, valid } = this.getGridCoords(pos.x, pos.y);
            if (valid && this.grid[row] && this.grid[row][col]) {
                this.dragState = {
                    item: this.grid[row][col],
                    startCol: col,
                    startRow: row,
                    mouseX: pos.x,
                    mouseY: pos.y
                };
                this.grid[row][col] = null;
            }
        });

        gameEvents.on('DRAG_MOVE', (pos) => {
            if (!this.isActive || !this.dragState) return;
            this.dragState.mouseX = pos.x;
            this.dragState.mouseY = pos.y;
        });

        gameEvents.on('DRAG_END', (pos) => {
            if (!this.isActive || !this.dragState || !this.dragState.item) return;

            const dragItem = this.dragState.item;
            const startR = this.dragState.startRow;
            const startC = this.dragState.startCol;
            this.dragState = null;

            // 1. DUMP IN DRAIN
            if (this.drain && pos.x >= this.drain.x && pos.x <= this.drain.x + this.drain.w &&
                pos.y >= this.drain.y && pos.y <= this.drain.y + this.drain.h) {
                this.grid[startR][startC] = null;
                this.floatingTexts.push(new FloatingTitle(pos.x, pos.y, "Dumped!", "#ef4444"));
                return;
            }

            // 2. ADD TO KETTLES
            const unlockedCount = (typeof playerState !== 'undefined') ? playerState.unlockedKettles : 1;
            for (let i = 0; i < unlockedCount; i++) {
                const k = this.kettles[i];
                if (pos.x >= k.x && pos.x <= k.x + k.w && pos.y >= k.y && pos.y <= k.y + k.h) {
                    if (k.items.length < 5) {
                        k.items.push(dragItem);
                        this.grid[startR][startC] = null;
                    } else {
                        this.grid[startR][startC] = dragItem; // Snap back
                        this.floatingTexts.push(new FloatingTitle(pos.x, pos.y, "Kettle Full!", "#ef4444"));
                    }
                    return;
                }
            }

            // 3. GRID MERGING & SWAPPING
            const targetCol = Math.floor((pos.x - this.gridOffset.x) / this.tileSize);
            const targetRow = Math.floor((pos.y - this.gridOffset.y) / this.tileSize);

            if (targetRow >= 0 && targetRow < this.rows && targetCol >= 0 && targetCol < this.cols) {
                // Prevent self-deletion if dropped in the exact same spot
                if (targetRow === startR && targetCol === startC) {
                    this.grid[startR][startC] = dragItem;
                    return;
                }

                const targetItem = this.grid[targetRow][targetCol];

                // MERGE: Same exact ingredient level and category
                if (targetItem && targetItem.name === dragItem.name && targetItem.category === dragItem.category) {
                    const nextName = gameRecipes.getMergeResult(dragItem.name);
                    if (nextName) {
                        this.grid[targetRow][targetCol] = {
                            id: Math.random().toString(),
                            name: nextName,
                            category: dragItem.category
                        };
                        this.grid[startR][startC] = null; // Clear old spot

                        this.currentMergeCombo = (this.currentMergeCombo || 0) + 1;
                        gameEvents.emit('MERGE_COMBO', this.currentMergeCombo);
                        return;
                    }
                }

                // SWAP: Different items
                if (targetItem) {
                    this.grid[startR][startC] = targetItem;
                    this.grid[targetRow][targetCol] = dragItem;
                    return;
                }

                // MOVE: Empty spot
                this.grid[targetRow][targetCol] = dragItem;
                this.grid[startR][startC] = null;
                return;
            }

            // 4. MISS: Snap back to original spot if dropped off the grid
            this.grid[startR][startC] = dragItem;
        });
    }

    // --- FREE PUZZLE SPAWN LOGIC ---
    spawnItem(category) {
        const emptyCell = this.findEmptyCell();
        if (emptyCell) {
            // getRandomDrop now handles the "Broke Brewer" skew automatically
            const itemName = gameRecipes.getRandomDrop(category);

            this.grid[emptyCell.row][emptyCell.col] = {
                id: Math.random().toString(),
                name: itemName,
                category: category
            };
        } else {
            this.floatingTexts.push(new FloatingTitle(this.gridOffset.x + 150, this.gridOffset.y - 20, "Grid is Full!", "#ef4444"));
        }
    }

    findEmptyCell() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c] === null) {
                    return { row: r, col: c };
                }
            }
        }
        return null;
    }

    unlockKettle(index) {
        const k = this.kettles[index];
        if (index !== playerState.unlockedKettles) {
            this.floatingTexts.push(new FloatingTitle(k.x + (k.w / 2), k.y, "Unlock previous kettle first!", "#ef4444"));
            return;
        }
        const cost = playerState.kettleCosts[index];
        if (!playerState.canAfford(cost)) {
            this.floatingTexts.push(new FloatingTitle(k.x + (k.w / 2), k.y, `Need $${cost}!`, "#ef4444"));
            return;
        }
        gameEvents.emit('SPEND_TIPS', cost);
        playerState.unlockedKettles++;
        this.floatingTexts.push(new FloatingTitle(k.x + (k.w / 2), k.y, `Kettle #${playerState.unlockedKettles} Online!`, "#4ade80"));
    }

    // --- COGS ENGINE & KETTLE BREWING ---
    brewKettle(kettleIndex) {
        const k = this.kettles[kettleIndex];
        if (!k || k.items.length === 0) return;

        // 1. STRICT REALISM: Must have all 4 core elements
        const hasWater = k.items.some(i => i.category === 'Water');
        const hasGrain = k.items.some(i => i.category === 'Grain');
        const hasYeast = k.items.some(i => i.category === 'Yeast');
        const hasHops = k.items.some(i => i.category === 'Hops');

        if (!hasWater || !hasGrain || !hasYeast || !hasHops) {
            this.floatingTexts.push(new FloatingTitle(k.x + (k.w / 2), k.y - 20, "Needs Water, Grain, Yeast & Hops!", "#ef4444"));
            return;
        }

        // 2. Calculate true Cost of Goods Sold (COGS)
        let totalBrewCost = 0;
        k.items.forEach(item => {
            totalBrewCost += gameRecipes.getIngredientCost(item.name);
        });

        // 3. Prevent brewing if they can't afford the production cost
        if (!playerState.canAfford(totalBrewCost)) {
            this.floatingTexts.push(new FloatingTitle(k.x + (k.w / 2), k.y, `Need $${totalBrewCost.toFixed(2)} to Brew!`, "#ef4444"));
            return;
        }

        // 4. Charge the player and clear the current merge combo
        gameEvents.emit('SPEND_TIPS', totalBrewCost);
        this.currentMergeCombo = 0;

        const ingredients = k.items.map(item => item.name);
        let brewResult = gameRecipes.evaluateBrew(ingredients);

        // 5. If it has the core 4 but isn't a valid recipe, it becomes Swill
        if (!brewResult) {
            brewResult = { name: 'Swill', type: 'Swill', count: 3 };
            this.floatingTexts.push(new FloatingTitle(k.x + (k.w / 2), k.y, `Brewed Swill (Cost: $${totalBrewCost.toFixed(2)})`, '#94a3b8'));
        } else {
            const isNew = !playerState.unlockedRecipes.includes(brewResult.name);
            if (isNew) gameEvents.emit('RECIPE_DISCOVERED', brewResult.name);
            const prefix = isNew ? '📖 NEW: ' : '+5 ';
            this.floatingTexts.push(new FloatingTitle(k.x + (k.w / 2), k.y, `${prefix}${brewResult.name}!`, '#facc15'));
        }

        gameEvents.emit('ADD_AMMO', brewResult);
        gameEvents.emit('BREW_FINISH'); // <-- Triggers brew.mp3
        k.items = [];
    }

    isHit(pos, x, y, w, h) {
        return pos.x >= x && pos.x <= x + w && pos.y >= y && pos.y <= y + h;
    }

    getGridCoords(x, y) {
        const col = Math.floor((x - this.gridOffset.x) / this.tileSize);
        const row = Math.floor((y - this.gridOffset.y) / this.tileSize);
        const valid = col >= 0 && col < this.cols && row >= 0 && row < this.rows;
        return { col, row, valid };
    }

    init() {
        this.isActive = true;
        this.dragState = null;
        this.currentMergeCombo = 0;

        this.grid = [];
        for (let r = 0; r < this.rows; r++) {
            let newRow = [];
            for (let c = 0; c < this.cols; c++) {
                newRow.push(null);
            }
            this.grid.push(newRow);
        }
    }

    update(dt) {
        if (!this.isActive) return;

        this.floatingTexts.forEach(ft => ft.update(dt));
        this.floatingTexts = this.floatingTexts.filter(ft => ft.active);
    }

    shutdown() {
        console.log("[Brewing] Shutting down phase.");
        this.isActive = false;
        this.dragState = null;
    }
}

const brewingPhase = new BrewingPhase();