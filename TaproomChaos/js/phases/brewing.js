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

        // MOVED RIGHT: Shifted past the 250px HTML HUD
        this.sacks = [
            { id: 'sack_water', category: 'Water', x: 280, y: 140, w: 80, h: 80, color: '#3b82f6' },
            { id: 'sack_grain', category: 'Grain', x: 380, y: 140, w: 80, h: 80, color: '#eab308' },
            { id: 'sack_adjunct', category: 'Adjunct', x: 280, y: 240, w: 80, h: 80, color: '#f97316' },
            { id: 'sack_yeast', category: 'Yeast', x: 380, y: 240, w: 80, h: 80, color: '#d9f99d' },
            { id: 'sack_hops', category: 'Hops', x: 280, y: 340, w: 80, h: 80, color: '#22c55e' },
            { id: 'sack_specialty', category: 'Specialty', x: 380, y: 340, w: 80, h: 80, color: '#a855f7' }
        ];

        // EXPANDED: Made the kettle wider and moved the Brew button to the far right edge
        this.kettle = {
            x: 500, y: 610, w: 660, h: 80, color: '#3f3f46',
            items: [],
            maxItems: 7,
            btnX: 1020, btnY: 625, btnW: 130, btnH: 50
        };

        this.setupEventListeners();
    }

    setupEventListeners() {
        gameEvents.on('DRAG_START', (pos) => {
            if (!this.isActive) return;

            // 1. Did they click the Brew Button?
            if (this.isHit(pos, this.kettle.btnX, this.kettle.btnY, this.kettle.btnW, this.kettle.btnH)) {
                this.brewKettle();
                return;
            }

            // 2. Did they click a sack?
            for (let sack of this.sacks) {
                if (pos.x >= sack.x && pos.x <= sack.x + sack.w &&
                    pos.y >= sack.y && pos.y <= sack.y + sack.h) {
                    this.spawnItem(sack.category);
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
                // Temporarily remove it from the grid
                this.grid[row][col] = null;
            }
        });

        // HTML Button override just in case they click it
        gameEvents.on('HUD_INJECT_CLICK', () => {
            if (this.isActive) this.handleInjectionClick();
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

            // 1. Did they drop it in the Kettle?
            if (this.isHit(pos, this.kettle.x, this.kettle.y, this.kettle.w, this.kettle.h)) {
                if (this.kettle.items.length < this.kettle.maxItems) {
                    this.kettle.items.push(sourceItem);
                    console.log(`Added ${sourceItem.name} to kettle.`);
                } else {
                    console.log("Kettle is full!");
                    this.grid[startRow][startCol] = sourceItem; // Bounce back
                }
                this.dragState = null;
                return;
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
                // Try to Merge using the new config engine!
                const upgradedName = gameRecipes.getMergeResult(targetItem.name);

                if (upgradedName) {
                    console.log(`Merged ${targetItem.name} into ${upgradedName}!`);
                    this.grid[row][col] = {
                        id: Math.random().toString(),
                        name: upgradedName,
                        category: sourceItem.category
                    };
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

    // --- NEW PUZZLE SPAWN LOGIC ---
    spawnItem(category) {
        // Costs $1 per pull
        if (!playerState.canAfford(1)) {
            console.log("Not enough tips to buy ingredients!");
            return;
        }

        const emptyCell = this.findEmptyCell();
        if (emptyCell) {
            gameEvents.emit('SPEND_TIPS', 1);

            // Get the random drop from our new config engine!
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

    // --- NEW DYNAMIC BREW LOGIC ---
    brewKettle() {
        if (this.kettle.items.length === 0) return;

        // Pass an array of NAMES to the evaluator, not a joined string!
        const ingredients = this.kettle.items.map(item => item.name);

        console.log("Attempting to brew with:", ingredients);

        // Let the config engine do the math!
        const brewResult = gameRecipes.evaluateBrew(ingredients);

        if (brewResult) {
            console.log(`SUCCESS! Brewed ${brewResult.name}!`);
            gameEvents.emit('ADD_AMMO', brewResult);
        } else {
            console.log("FAILED! That recipe makes no sense. You get 5 Swill.");
            gameEvents.emit('ADD_AMMO', { name: 'Swill', type: 'crowd_control', count: 5 });
        }

        // Empty the kettle
        this.kettle.items = [];
    }

    handleInjectionClick() {
        const injectionCost = gameEconomy ? gameEconomy.injectionCost : 15;
        if (!playerState.canAfford(injectionCost)) return;

        const emptyCell = this.findEmptyCell();
        if (!emptyCell) return;

        gameEvents.emit('SPEND_TIPS', injectionCost);
        this.grid[emptyCell.row][emptyCell.col] = { id: Math.random().toString(), name: 'Galaxy Hop', category: 'Specialty' };
    }

    isHit(pos, x, y, w, h) {
        return pos.x >= x && pos.x <= x + w && pos.y >= y && pos.y <= y + h;
    }

    getGridCoords(x, y) {
        // FIXED THE MANGLED MATH HERE
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

    update(deltaTime) {
        if (!this.isActive) return;
    }

    shutdown() {
        console.log("[Brewing] Shutting down phase.");
        this.isActive = false;
        this.dragState = null;
    }
}

const brewingPhase = new BrewingPhase();