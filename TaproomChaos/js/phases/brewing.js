// js/phases/brewing.js

class BrewingPhase {
    constructor() {
        this.cols = 6;
        this.rows = 4;

        this.grid = [];
        this.isActive = false;
        this.dragState = null;
        this.floatingTexts = [];
        this.currentMergeCombo = 0;
        this.activeOrders = [];

        this.calculateLayout();
        this.resetGrid();
        this.setupEventListeners();
    }

    calculateLayout() {
        const aspect = window.innerWidth / Math.max(1, window.innerHeight);
        const H = 720;
        const W = window.GAME_WIDTH || Math.max(1280, Math.round(H * aspect));

        // 1. LEFT COLUMN: Native Menu Button + 6 Large Sacks + Floor Drain
        const leftPad = 14;
        const leftColW = Math.round(Math.max(216, Math.min(284, W * 0.17)));
        const gap = 12;
        const sackW = Math.floor((leftColW - gap) / 2);
        const sackH = 148;

        this.menuBtn = { x: leftPad, y: 12, w: leftColW, h: 48 };

        const row1 = 72;
        const row2 = row1 + sackH + gap; // 232
        const row3 = row2 + sackH + gap; // 392
        const drainY = row3 + sackH + gap; // 552

        this.sacks = [
            { id: 'sack_water', category: 'Water', cost: 0.25, x: leftPad, y: row1, w: sackW, h: sackH, color: '#3b82f6' },
            { id: 'sack_grain', category: 'Grain', cost: 0.25, x: leftPad + sackW + gap, y: row1, w: sackW, h: sackH, color: '#eab308' },
            { id: 'sack_hops', category: 'Hops', cost: 0.25, x: leftPad, y: row2, w: sackW, h: sackH, color: '#22c55e' },
            { id: 'sack_yeast', category: 'Yeast', cost: 0.25, x: leftPad + sackW + gap, y: row2, w: sackW, h: sackH, color: '#d9f99d' },
            { id: 'sack_adjunct', category: 'Adjunct', cost: 0.25, x: leftPad, y: row3, w: sackW, h: sackH, color: '#f97316' },
            { id: 'sack_specialty', category: 'Specialty', cost: 1.50, x: leftPad + sackW + gap, y: row3, w: sackW, h: sackH, color: '#a855f7' }
        ];

        this.drain = { x: leftPad, y: drainY, w: leftColW, h: H - drainY - 12 };

        // 2. RIGHT COLUMN: Large Shift Contracts Board (Top) + 3 Stacked Kettles (Bottom)
        const rightPad = 14;
        this.boardW = Math.round(Math.max(310, Math.min(410, W * 0.24)));
        this.boardX = W - this.boardW - rightPad;
        this.boardY = 12;
        this.boardH = 282;

        const kW = this.boardW;
        const kH = 112;
        const kGap = 20;
        const kStartY = this.boardY + this.boardH + 20; // 314

        const k1 = (this.kettles && this.kettles[0]) ? this.kettles[0].items : [];
        const k2 = (this.kettles && this.kettles[1]) ? this.kettles[1].items : [];
        const k3 = (this.kettles && this.kettles[2]) ? this.kettles[2].items : [];

        this.kettles = [0, 1, 2].map((idx) => {
            const ky = kStartY + idx * (kH + kGap);
            const btnW = 94;
            const btnH = 52;
            return {
                x: this.boardX,
                y: ky,
                w: kW,
                h: kH,
                btnX: this.boardX + kW - btnW - 14,
                btnY: ky + 42,
                btnW: btnW,
                btnH: btnH,
                items: idx === 0 ? k1 : (idx === 1 ? k2 : k3)
            };
        });

        // 3. CENTER COLUMN: Full-Height 6x4 Grid
        const centerLeft = leftPad + leftColW + 20;
        const centerRight = this.boardX - 20;
        const availableW = Math.max(400, centerRight - centerLeft);
        const gridTop = 52;
        const availableH = H - gridTop - 16;

        // Calculate largest square tile that fits the center zone (accounting for 28px metal tray border)
        this.tileSize = Math.floor(Math.min((availableW - 28) / this.cols, (availableH - 28) / this.rows));

        const actualGridW = this.tileSize * this.cols;
        const actualGridH = this.tileSize * this.rows;

        this.gridOffset = {
            x: Math.round(centerLeft + (availableW - actualGridW) / 2),
            y: Math.round(gridTop + (availableH - actualGridH) / 2)
        };
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
        this.calculateLayout();
        if (!this.grid || this.grid.length === 0) {
            this.resetGrid();
        }
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
                new FloatingTitle(this.gridOffset.x + ((this.cols * this.tileSize) / 2), this.gridOffset.y - 15, "Grid is Full!", "#ef4444")
            );
        }
    }

    setupEventListeners() {
        if (typeof gameEvents === 'undefined') return;

        gameEvents.on('DRAG_START', (pos) => {
            if (!this.isActive) return;

            // 1. Check Dispenser Sacks
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
                if (pos.x >= k.x && pos.x <= k.x + k.w && pos.y >= k.y && pos.y <= k.y + k.h + 10) {
                    if (i < unlockedCount) {
                        if (pos.x >= k.btnX && pos.x <= k.btnX + k.btnW &&
                            pos.y >= k.btnY && pos.y <= k.btnY + k.btnH) {
                            this.brewKettle(i);
                            return;
                        }
                        if (k.items.length > 0) {
                            const emptyCell = this.findEmptyCell();
                            if (emptyCell) {
                                this.grid[emptyCell.row][emptyCell.col] = k.items.pop();
                            } else {
                                this.floatingTexts.push(new FloatingTitle(k.x + k.w / 2, k.y, "Grid Full!", "#ef4444"));
                            }
                        }
                    } else if (i === unlockedCount && typeof playerState !== 'undefined') {
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
                if (endX >= k.x && endX <= k.x + k.w && endY >= k.y && endY <= k.y + k.h + 10) {
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

                if (targetItem) {
                    this.grid[startR][startC] = targetItem;
                    this.grid[targetRow][targetCol] = dragItem;
                    return;
                }

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
            const orderIndex = this.activeOrders.findIndex(o => o.name === brewResult.name);
            if (orderIndex !== -1) {
                const bounty = this.activeOrders[orderIndex].bounty;
                gameEvents.emit('EARN_TIPS', bounty);
                this.floatingTexts.push(new FloatingTitle(k.x + (k.w / 2), k.y - 60, `CONTRACT DONE! +$${bounty}`, '#4ade80'));
                this.activeOrders.splice(orderIndex, 1);
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