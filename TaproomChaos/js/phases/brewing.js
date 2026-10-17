// js/phases/brewing.js

class BrewingPhase {
    constructor() {
        this.isActive = false;

        // Grid configuration
        this.cols = 6;
        this.rows = 5;
        this.tileSize = 90;

        // MOVED RIGHT: Shifted from 350 to 500 to make room for the sacks
        this.gridOffset = { x: 500, y: 140 };
        this.grid = [];
        this.dragState = null;

        // 6 Specific Ingredient Bags (Balanced early costs)
        this.sacks = [
            { id: 'sack_water', category: 'Water', cost: 1, x: 280, y: 140, w: 80, h: 80, color: '#3b82f6' },
            { id: 'sack_grain', category: 'Grain', cost: 1, x: 380, y: 140, w: 80, h: 80, color: '#eab308' },
            { id: 'sack_adjunct', category: 'Adjunct', cost: 2, x: 280, y: 240, w: 80, h: 80, color: '#f97316' },
            { id: 'sack_yeast', category: 'Yeast', cost: 2, x: 380, y: 240, w: 80, h: 80, color: '#d9f99d' },
            { id: 'sack_hops', category: 'Hops', cost: 3, x: 280, y: 340, w: 80, h: 80, color: '#22c55e' },
            { id: 'sack_specialty', category: 'Specialty', cost: 6, x: 380, y: 340, w: 80, h: 80, color: '#a855f7' }
        ];

        // 3-Kettle Brewhouse Array (Side-by-side along the bottom)
        this.kettles = [
            { id: 0, x: 460, y: 595, w: 250, h: 110, items: [], btnX: 625, btnY: 642, btnW: 75, btnH: 46 },
            { id: 1, x: 730, y: 595, w: 250, h: 110, items: [], btnX: 895, btnY: 642, btnW: 75, btnH: 46 },
            { id: 2, x: 1000, y: 595, w: 250, h: 110, items: [], btnX: 1165, btnY: 642, btnW: 75, btnH: 46 }
        ];

        // Floor Drain (Trash slot to prevent board deadlocks)
        this.drain = { x: 280, y: 595, w: 150, h: 105 };

        // Floating feedback text popups (+5 nIPLy, Merged!, etc.)
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
                    // Clicked a LOCKED kettle -> Try to buy/unlock it!
                    if (this.isHit(pos, k.x, k.y, k.w, k.h)) {
                        this.unlockKettle(i);
                        return;
                    }
                } else {
                    // Clicked the BREW button on an unlocked kettle
                    if (this.isHit(pos, k.btnX, k.btnY, k.btnW, k.btnH)) {
                        this.brewKettle(i);
                        return;
                    }
                    // Clicked inside the kettle vat to undo/pop the last ingredient back out
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
                    this.spawnItem(sack.category, sack.cost);
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
            if (!this.isActive || !this.dragState) return;

            const { col, row, valid } = this.getGridCoords(pos.x, pos.y);
            const sourceItem = this.dragState.item;
            const startCol = this.dragState.startCol;
            const startRow = this.dragState.startRow;

            // 0. NEW: Did they drop it into the Floor Drain to discard it?
            if (this.isHit(pos, this.drain.x, this.drain.y, this.drain.w, this.drain.h)) {
                this.floatingTexts.push(new FloatingTitle(
                    this.drain.x + (this.drain.w / 2),
                    this.drain.y,
                    `Dumped ${sourceItem.name}`,
                    '#94a3b8'
                ));
                this.dragState = null;
                return;
            }

            // 1. Did they drop it into one of the Unlocked Kettles?
            for (let i = 0; i < this.kettles.length; i++) {
                const k = this.kettles[i];
                if (i < playerState.unlockedKettles && this.isHit(pos, k.x, k.y - 15, k.w, k.h + 15)) {
                    k.items.push(sourceItem);
                    console.log(`Splashed ${sourceItem.name} into Kettle #${i + 1}!`);
                    this.dragState = null;
                    return;
                }
            }

            // 2. Otherwise, handle Grid Drops
            this.dragState = null;

            if (!valid) {
                this.grid[startRow][startCol] = sourceItem; // Out of bounds, snap back
                return;
            }

            const targetItem = this.grid[row][col];

            if (!targetItem) {
                // Drop in empty space
                this.grid[row][col] = sourceItem;
            } else if (targetItem.name === sourceItem.name) {
                // Try to Merge using the config engine!
                const upgradedName = gameRecipes.getMergeResult(targetItem.name);

                if (upgradedName) {
                    console.log(`Merged ${targetItem.name} into ${upgradedName}!`);
                    this.grid[row][col] = {
                        id: Math.random().toString(),
                        name: upgradedName,
                        category: sourceItem.category
                    };
                    // Floating Merge Feedback!
                    const cellCenterX = this.gridOffset.x + (col * this.tileSize) + (this.tileSize / 2);
                    const cellCenterY = this.gridOffset.y + (row * this.tileSize) + 20;
                    this.floatingTexts.push(new FloatingTitle(cellCenterX, cellCenterY, `✨ ${upgradedName}!`, '#facc15'));
                } else {
                    // It's max level or un-mergeable, swap them
                    this.grid[row][col] = sourceItem;
                    this.grid[startRow][startCol] = targetItem;
                }
            } else {
                // Different items, just swap their places
                this.grid[row][col] = sourceItem;
                this.grid[startRow][startCol] = targetItem;
            }
        });
    }

    // --- PUZZLE SPAWN LOGIC ---
    spawnItem(category, cost) {
        if (!playerState.canAfford(cost)) {
            console.log(`Need $${cost} to pull from ${category}!`);
            return;
        }

        const emptyCell = this.findEmptyCell();
        if (emptyCell) {
            gameEvents.emit('SPEND_TIPS', cost);
            const itemName = gameRecipes.getRandomDrop(category);

            this.grid[emptyCell.row][emptyCell.col] = {
                id: Math.random().toString(),
                name: itemName,
                category: category
            };
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
        return null; // Grid is full!
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

    brewKettle(kettleIndex) {
        const k = this.kettles[kettleIndex];
        if (!k || k.items.length === 0) return;

        // Baseline Check: Single ingredients cannot be brewed!
        if (k.items.length < 2) {
            this.floatingTexts.push(new FloatingTitle(k.x + (k.w / 2), k.y, "Need at least 2 ingredients!", "#ef4444"));
            return;
        }

        let totalBrewCost = 0;
        k.items.forEach(item => {
            totalBrewCost += gameRecipes.getIngredientCost(item.name);
        });

        if (!playerState.canAfford(totalBrewCost)) {
            this.floatingTexts.push(new FloatingTitle(k.x + (k.w / 2), k.y, `Need $${totalBrewCost} to Brew!`, "#ef4444"));
            return;
        }

        gameEvents.emit('SPEND_TIPS', totalBrewCost);

        const ingredients = k.items.map(item => item.name);
        const brewResult = gameRecipes.evaluateBrew(ingredients);

        if (brewResult) {
            gameEvents.emit('ADD_AMMO', brewResult);
            let popupColor = '#4ade80';
            if (brewResult.type === 'crowd_control') popupColor = '#a1a1aa';
            if (brewResult.type === 'soda') popupColor = '#38bdf8';

            if (brewResult.type !== 'crowd_control' && brewResult.type !== 'soda') {
                const isNew = !playerState.unlockedRecipes.includes(brewResult.name);
                gameEvents.emit('RECIPE_DISCOVERED', brewResult.name);
                const prefix = isNew ? '📖 NEW: ' : '+5 ';
                this.floatingTexts.push(new FloatingTitle(k.x + (k.w / 2), k.y, `${prefix}${brewResult.name}!`, '#facc15'));
            } else {
                this.floatingTexts.push(new FloatingTitle(k.x + (k.w / 2), k.y, `+${brewResult.count} ${brewResult.name}`, popupColor));
            }
        } else {
            // Ruined batch! Money is lost, no free Swill is given.
            this.floatingTexts.push(new FloatingTitle(k.x + (k.w / 2), k.y, `-$${totalBrewCost} (Ruined Batch — Wasted!)`, '#ef4444'));
        }

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

        // Initialize a completely EMPTY board to force the player to use Sacks
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