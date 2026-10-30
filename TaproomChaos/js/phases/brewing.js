// js/phases/brewing.js

class BrewingPhase {
    constructor() {
        this.rows = 4;
        this.cols = 5;
        this.tileSize = 108; // Enlarged for mobile touch accuracy
        this.gridOffset = { x: 530, y: 78 };

        this.grid = [];
        this.isActive = false;
        this.dragState = null;
        this.floatingTexts = [];
        this.currentMergeCombo = 0;

        // Positioned right of the 300px sliding drawer with larger touch hitboxes
        this.sacks = [
            { id: 'sack_water', category: 'Water', cost: 0.25, x: 290, y: 78, w: 98, h: 102, color: '#3b82f6' },
            { id: 'sack_grain', category: 'Grain', cost: 0.25, x: 400, y: 78, w: 98, h: 102, color: '#eab308' },
            { id: 'sack_yeast', category: 'Yeast', cost: 0.25, x: 290, y: 192, w: 98, h: 102, color: '#d9f99d' },
            { id: 'sack_hops', category: 'Hops', cost: 0.25, x: 400, y: 192, w: 98, h: 102, color: '#22c55e' },
            { id: 'sack_adjunct', category: 'Adjunct', cost: 0.25, x: 290, y: 306, w: 98, h: 102, color: '#f97316' },
            { id: 'sack_specialty', category: 'Specialty', cost: 1.50, x: 400, y: 306, w: 98, h: 102, color: '#a855f7' }
        ];

        // Floor drain tucked cleanly beneath the dispensers
        this.drain = { x: 290, y: 420, w: 208, h: 100 };

        // 3 Horizontal Brew Kettles along the bottom
        this.kettles = [
            { x: 290, y: 568, w: 300, h: 110, btnX: 502, btnY: 598, btnW: 76, btnH: 52, items: [] },
            { x: 615, y: 568, w: 300, h: 110, btnX: 827, btnY: 598, btnW: 76, btnH: 52, items: [] },
            { x: 940, y: 568, w: 300, h: 110, btnX: 1152, btnY: 598, btnW: 76, btnH: 52, items: [] }
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

        // Allow valid Cocktails/Sodas OR require all 4 core beer components (Water, Grain, Yeast, Hops)
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