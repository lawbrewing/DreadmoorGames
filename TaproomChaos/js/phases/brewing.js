// js/phases/brewing.js

class BrewingPhase {
    constructor() {
        // HUGE MOBILE TILES (125px) AND WIDER 6-COLUMN GRID
        this.cols = 6;
        this.rows = 4;
        this.tileSize = 125;

        // SACKS ON THE LEFT, GRID IN THE MIDDLE
        this.gridOffset = { x: 290, y: 55 };

        this.grid = [];
        this.isActive = false;
        this.dragState = null;
        this.floatingTexts = [];
        this.currentMergeCombo = 0;
        this.activeOrders = []; // NEW: Store active shift goals

        // Sacks returned to the left side!
        this.sacks = [
            { id: 'sack_water', category: 'Water', cost: 0.25, x: 30, y: 55, w: 105, h: 110, color: '#3b82f6' },
            { id: 'sack_grain', category: 'Grain', cost: 0.25, x: 155, y: 55, w: 105, h: 110, color: '#eab308' },
            { id: 'sack_yeast', category: 'Yeast', cost: 0.25, x: 30, y: 185, w: 105, h: 110, color: '#d9f99d' },
            { id: 'sack_hops', category: 'Hops', cost: 0.25, x: 155, y: 185, w: 105, h: 110, color: '#22c55e' },
            { id: 'sack_adjunct', category: 'Adjunct', cost: 0.25, x: 30, y: 315, w: 105, h: 110, color: '#f97316' },
            { id: 'sack_specialty', category: 'Specialty', cost: 1.50, x: 155, y: 315, w: 105, h: 110, color: '#a855f7' }
        ];

        this.drain = { x: 30, y: 445, w: 230, h: 100 };

        this.kettles = [
            { x: 30, y: 568, w: 320, h: 110, btnX: 250, btnY: 598, btnW: 86, btnH: 52, items: [] },
            { x: 380, y: 568, w: 320, h: 110, btnX: 600, btnY: 598, btnW: 86, btnH: 52, items: [] },
            { x: 730, y: 568, w: 320, h: 110, btnX: 950, btnY: 598, btnW: 86, btnH: 52, items: [] }
        ];

        this.resetGrid();
        this.setupEventListeners();
    }

    resetGrid() {
        this.grid = [];
        for (let r = 0; r < this.rows; r++) {
            const row = [];
            for (let c = 0; c < this.cols; c++) {
                row.push(null);
            }
            this.grid.push(row);
        }
    }

    init() {
        this.isActive = true;
        this.dragState = null;
        if (!this.grid || this.grid.length === 0) {
            this.resetGrid();
        }
        // Generate 2 new Contract Orders at the start of every shift!
        if (typeof gameRecipes !== 'undefined') {
            this.activeOrders = gameRecipes.getDailyOrders(2);
        }
    }

    shutdown() {
        this.isActive = false;
        this.dragState = null;
    }

    findEmptyCell() {
        const emptyCells = [];
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (!this.grid[r][c]) {
                    emptyCells.push({ row: r, col: c });
                }
            }
        }
        if (emptyCells.length === 0) return null;
        return emptyCells[Math.floor(Math.random() * emptyCells.length)];
    }

    spawnItem(category) {
        const emptyCell = this.findEmptyCell();
        if (emptyCell) {
            const itemName = gameRecipes.getRandomDrop(category);
            this.grid[emptyCell.row][emptyCell.col] = {
                id: Math.random().toString(),
                name: itemName,
                category: category
            };
        } else {
            this.floatingTexts.push(
                new FloatingTitle(this.gridOffset.x + 270, this.gridOffset.y - 15, "Grid is Full!", "#ef4444")
            );
        }
    }

    setupEventListeners() {
        if (typeof gameEvents === 'undefined') return;

        gameEvents.on('DRAG_START', (pos) => {
            if (!this.isActive) return;

            // 1. Check Dispenser Sacks (Free to pull; COGS charged on Brew)
            for (const sack of this.sacks) {
                if (pos.x >= sack.x && pos.x <= sack.x + sack.w &&
                    pos.y >= sack.y && pos.y <= sack.y + sack.h) {
                    this.spawnItem(sack.category);
                    return;
                }
            }

            // 2. Check Kettles (Brew Button, Undo Item, or Unlock Kettle)
            const unlockedCount = (typeof playerState !== 'undefined') ? playerState.unlockedKettles : 1;
            for (let i = 0; i < this.kettles.length; i++) {
                const k = this.kettles[i];
                if (pos.x >= k.x && pos.x <= k.x + k.w && pos.y >= k.y && pos.y <= k.y + k.h) {
                    if (i < unlockedCount) {
                        // Clicked BREW button
                        if (pos.x >= k.btnX && pos.x <= k.btnX + k.btnW &&
                            pos.y >= k.btnY && pos.y <= k.btnY + k.btnH) {
                            this.brewKettle(i);
                            return;
                        }
                        // Clicked Kettle body -> Undo last ingredient back to grid
                        if (k.items.length > 0) {
                            const emptyCell = this.findEmptyCell();
                            if (emptyCell) {
                                this.grid[emptyCell.row][emptyCell.col] = k.items.pop();
                            } else {
                                this.floatingTexts.push(new FloatingTitle(k.x + k.w / 2, k.y, "Grid Full!", "#ef4444"));
                            }
                        }
                    } else if (i === unlockedCount && typeof playerState !== 'undefined') {
                        // Unlock next kettle
                        const unlockCost = playerState.kettleCosts ? playerState.kettleCosts[i] : 50;
                        if (playerState.canAfford(unlockCost)) {
                            gameEvents.emit('SPEND_TIPS', unlockCost);
                            playerState.unlockedKettles++;
                            this.floatingTexts.push(new FloatingTitle(k.x + k.w / 2, k.y, "Kettle Unlocked!", "#4ade80"));
                        } else {
                            this.floatingTexts.push(new FloatingTitle(k.x + k.w / 2, k.y, `Need $${unlockCost}!`, "#ef4444"));
                        }
                    }
                    return;
                }
            }

            // 3. Check Grid Tiles to Start Dragging
            const col = Math.floor((pos.x - this.gridOffset.x) / this.tileSize);
            const row = Math.floor((pos.y - this.gridOffset.y) / this.tileSize);

            if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
                const item = this.grid[row][col];
                if (item) {
                    this.dragState = {
                        item: item,
                        startRow: row,
                        startCol: col,
                        mouseX: pos.x,
                        mouseY: pos.y
                    };
                }
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
            const endX = (pos && pos.x !== undefined) ? pos.x : this.dragState.mouseX;
            const endY = (pos && pos.y !== undefined) ? pos.y : this.dragState.mouseY;

            this.dragState = null;

            // 1. DUMP IN FLOOR DRAIN
            if (this.drain && endX >= this.drain.x && endX <= this.drain.x + this.drain.w &&
                endY >= this.drain.y && endY <= this.drain.y + this.drain.h) {
                this.grid[startR][startC] = null;
                this.floatingTexts.push(new FloatingTitle(endX, endY, "Dumped!", "#ef4444"));
                return;
            }

            // 2. DROP INTO UNLOCKED KETTLE
            const unlockedCount = (typeof playerState !== 'undefined') ? playerState.unlockedKettles : 1;
            for (let i = 0; i < unlockedCount; i++) {
                const k = this.kettles[i];
                if (endX >= k.x && endX <= k.x + k.w && endY >= k.y && endY <= k.y + k.h) {
                    if (k.items.length < 7) {
                        k.items.push(dragItem);
                        this.grid[startR][startC] = null;
                    } else {
                        this.floatingTexts.push(new FloatingTitle(endX, endY, "Kettle Full!", "#ef4444"));
                    }
                    return;
                }
            }

            // 3. GRID MERGE, SWAP, OR MOVE
            const targetCol = Math.floor((endX - this.gridOffset.x) / this.tileSize);
            const targetRow = Math.floor((endY - this.gridOffset.y) / this.tileSize);

            if (targetRow >= 0 && targetRow < this.rows && targetCol >= 0 && targetCol < this.cols) {
                if (targetRow === startR && targetCol === startC) {
                    this.grid[startR][startC] = dragItem;
                    return;
                }

                const targetItem = this.grid[targetRow][targetCol];

                // MERGE: Identical ingredient & category
                if (targetItem && targetItem.name === dragItem.name && targetItem.category === dragItem.category) {
                    const nextName = gameRecipes.getMergeResult(dragItem.name);
                    if (nextName) {
                        this.grid[targetRow][targetCol] = {
                            id: Math.random().toString(),
                            name: nextName,
                            category: dragItem.category
                        };
                        this.grid[startR][startC] = null;

                        this.currentMergeCombo = (this.currentMergeCombo || 0) + 1;
                        gameEvents.emit('MERGE_COMBO', this.currentMergeCombo);
                        gameEvents.emit('INGREDIENT_MERGED');
                        return;
                    }
                }

                // SWAP: Occupied by a different tile
                if (targetItem) {
                    this.grid[startR][startC] = targetItem;
                    this.grid[targetRow][targetCol] = dragItem;
                    return;
                }

                // MOVE: Empty cell
                this.grid[targetRow][targetCol] = dragItem;
                this.grid[startR][startC] = null;
                return;
            }

            // 4. OUTSIDE GRID: Keep in original slot
            this.grid[startR][startC] = dragItem;
        });
    }

    brewKettle(kettleIndex) {
        const k = this.kettles[kettleIndex];
        if (!k || k.items.length === 0) return;

        const ingredients = k.items.map(item => item.name);
        const brewPreview = gameRecipes.evaluateBrew(ingredients);

        const isSpecialDrink = brewPreview && (brewPreview.type === 'cocktail' || brewPreview.type === 'soda');
        const hasWater = k.items.some(i => i.category === 'Water');
        const hasGrain = k.items.some(i => i.category === 'Grain');
        const hasYeast = k.items.some(i => i.category === 'Yeast');
        const hasHops = k.items.some(i => i.category === 'Hops');

        if (!isSpecialDrink && (!hasWater || !hasGrain || !hasYeast || !hasHops)) {
            this.floatingTexts.push(
                new FloatingTitle(k.x + (k.w / 2), k.y - 20, "Needs Water, Grain, Yeast & Hops!", "#ef4444")
            );
            return;
        }

        let totalBrewCost = 0;
        k.items.forEach(item => {
            totalBrewCost += gameRecipes.getIngredientCost(item.name);
        });

        if (typeof playerState !== 'undefined' && !playerState.canAfford(totalBrewCost)) {
            this.floatingTexts.push(
                new FloatingTitle(k.x + (k.w / 2), k.y - 20, `Need $${totalBrewCost.toFixed(2)} to Brew!`, "#ef4444")
            );
            return;
        }

        gameEvents.emit('SPEND_TIPS', totalBrewCost);
        this.currentMergeCombo = 0;

        let brewResult = brewPreview;

        if (!brewResult || brewResult.name === 'Swill') {
            brewResult = { name: 'Swill', type: 'Swill', count: 5 };
            this.floatingTexts.push(
                new FloatingTitle(k.x + (k.w / 2), k.y - 20, `Brewed Swill (Cost: $${totalBrewCost.toFixed(2)})`, '#94a3b8')
            );
        } else {
            // NEW: CONTRACT ORDER FULFILLMENT CHECK!
            const orderIndex = this.activeOrders.findIndex(o => o.name === brewResult.name);
            if (orderIndex !== -1) {
                const bounty = this.activeOrders[orderIndex].bounty;
                gameEvents.emit('EARN_TIPS', bounty);
                this.floatingTexts.push(new FloatingTitle(k.x + (k.w / 2), k.y - 60, `CONTRACT DONE! +$${bounty}`, '#4ade80'));
                this.activeOrders.splice(orderIndex, 1); // Remove fulfilled order
            }

            const isNew = (typeof playerState !== 'undefined') && !playerState.unlockedRecipes.includes(brewResult.name);
            if (isNew) gameEvents.emit('RECIPE_DISCOVERED', brewResult.name);
            const prefix = isNew ? '📖 NEW: ' : `+${brewResult.count} `;
            this.floatingTexts.push(
                new FloatingTitle(k.x + (k.w / 2), k.y - 20, `${prefix}${brewResult.name}!`, '#facc15')
            );
        }

        gameEvents.emit('ADD_AMMO', brewResult);
        gameEvents.emit('BREW_FINISH');
        k.items = [];
    }

    update(dt) {
        if (!this.isActive) return;
        this.floatingTexts = this.floatingTexts.filter(text => {
            if (text.update) text.update(dt);
            return text.active;
        });
    }
}

const brewingPhase = new BrewingPhase();