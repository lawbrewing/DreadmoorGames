// js/phases/brewing.js

class BrewingPhase {
    constructor() {
        this.isActive = false;
        this.recipes = null;
        this.loadRecipes(); // Fetch the JSON on boot

        // Grid configuration
        this.cols = 6;
        this.rows = 5;
        this.tileSize = 90;
        this.gridOffset = { x: 350, y: 160 };
        this.grid = [];
        this.dragState = null;

        this.injectionCost = 15;
        this.btnInject = { x: 20, y: 120, w: 200, h: 50 };

        // TWO Generators now!
        this.generators = [
            { id: 'grain', name: 'Grain Sack', x: 350, y: 30, w: 100, h: 100, color: '#b45309', produces: 'Base Malt' },
            { id: 'water', name: 'Water Tap', x: 470, y: 30, w: 100, h: 100, color: '#0ea5e9', produces: 'Tap Water' }
        ];

        this.kettle = { x: 350, y: 620, w: 540, h: 80, color: '#3f3f46' };
        this.setupEventListeners();
    }

    // Add this method right below the constructor
    async loadRecipes() {
        try {
            const response = await fetch('js/config/recipes.json');
            this.recipes = await response.json();
            console.log("[Brewing] Recipes loaded from config!");
        } catch (error) {
            console.error("[Brewing] Failed to load recipes.json", error);
        }
    }

    setupEventListeners() {
        gameEvents.on('DRAG_START', (pos) => {
            if (!this.isActive) return;

            // 1. Did they click the Tip Injection Button?
            if (this.isHit(pos, this.btnInject.x, this.btnInject.y, this.btnInject.w, this.btnInject.h)) {
                this.handleInjectionClick();
                return;
            }

            // 2. Did they click a Generator?
            for (let gen of this.generators) {
                if (this.isHit(pos, gen.x, gen.y, gen.w, gen.h)) {
                    this.tapGenerator(gen);
                    return;
                }
            }

            // 3. Did they click an item on the grid to pick it up?
            const { col, row, valid } = this.getGridCoords(pos.x, pos.y);
            if (valid && this.grid[row][col]) {
                // Pick it up!
                this.dragState = {
                    item: this.grid[row][col],
                    startCol: col,
                    startRow: row,
                    mouseX: pos.x,
                    mouseY: pos.y
                };

                // Temporarily remove it from the grid so it doesn't draw twice
                this.grid[row][col] = null;
            }
        });

        gameEvents.on('DRAG_MOVE', (pos) => {
            if (!this.isActive || !this.dragState) return;
            // Update the dragged item's visual coordinates to follow the mouse
            this.dragState.mouseX = pos.x;
            this.dragState.mouseY = pos.y;
        });

        gameEvents.on('DRAG_END', (pos) => {
            if (!this.isActive || !this.dragState) return;

            const sourceItem = this.dragState.item;
            const startCol = this.dragState.startCol;
            const startRow = this.dragState.startRow;

            // 1. Did they drop it in the Kettle?
            if (this.isHit(pos, this.kettle.x, this.kettle.y, this.kettle.w, this.kettle.h)) {
                if (this.recipes && this.recipes.brews[sourceItem.name]) {
                    const brewData = this.recipes.brews[sourceItem.name];
                    console.log(`Brewed ${brewData.ammoName}!`);

                    // Add it to the Taproom Inventory
                    gameEvents.emit('ADD_AMMO', { name: brewData.ammoName, type: brewData.type });
                } else {
                    console.log("This item isn't ready to brew yet!");
                    this.grid[startRow][startCol] = sourceItem; // Bounce it back
                }
                this.dragState = null;
                return;
            }

            // 2. Otherwise, handle Grid Drops
            const { col, row, valid } = this.getGridCoords(pos.x, pos.y);
            this.dragState = null;

            // Dropped out of bounds? Snap it back.
            if (!valid) {
                this.grid[startRow][startCol] = sourceItem;
                return;
            }

            const targetItem = this.grid[row][col];

            if (!targetItem) {
                this.grid[row][col] = sourceItem;
            } else if (targetItem.name === sourceItem.name && targetItem.tier === sourceItem.tier) {
                this.grid[row][col] = this.upgradeItem(targetItem);
                gameEvents.emit('MERGE_SUCCESS', { newItem: this.grid[row][col] });
            } else {
                this.grid[row][col] = sourceItem;
                this.grid[startRow][startCol] = targetItem;
            }
        });
    }

    // Helper: Check if a click hit a specific rectangle
    isHit(pos, x, y, w, h) {
        return pos.x >= x && pos.x <= x + w && pos.y >= y && pos.y <= y + h;
    }

    // Helper: Convert screen X/Y to Grid Col/Row
    getGridCoords(x, y) {
        const col = Math.floor((x - this.gridOffset.x) / this.tileSize);
        const row = Math.floor((y - this.gridOffset.y) / this.tileSize);
        const valid = col >= 0 && col < this.cols && row >= 0 && row < this.rows;
        return { col, row, valid };
    }

    tapGenerator(gen) {
        // Find the first empty slot on the board
        let targetCell = null;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (!this.grid[r][c]) {
                    targetCell = { r, c };
                    break;
                }
            }
            if (targetCell) break;
        }

        if (targetCell) {
            // Spawn the Tier 1 item
            this.grid[targetCell.r][targetCell.c] = {
                name: gen.produces,
                tier: 1,
                color: '#d97706' // Amber base malt
            };
            console.log(`Generated ${gen.produces}`);
        } else {
            console.log("Grid full! Merge items to make space.");
        }
    }

    handleInjectionClick() {
        if (!playerState.canAfford(this.injectionCost)) return;

        let targetCell = null;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c] === null) {
                    targetCell = { r, c };
                    break;
                }
            }
            if (targetCell) break;
        }

        if (!targetCell) return;

        gameEvents.emit('SPEND_TIPS', this.injectionCost);
        this.grid[targetCell.r][targetCell.c] = { name: 'Galaxy Hop', tier: 3, color: '#10b981' };
    }

    upgradeItem(item) {
        if (!this.recipes || !this.recipes.merges[item.name]) return item;
        const mergeData = this.recipes.merges[item.name];
        return { name: mergeData.result, tier: item.tier + 1, color: mergeData.color };
    }

    init() {
        this.isActive = true;
        this.dragState = null;

        // Initialize a completely EMPTY board to force the player to use Generators
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
        
}

const brewingPhase = new BrewingPhase();