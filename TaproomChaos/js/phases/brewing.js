// js/phases/brewing.js

class BrewingPhase {
    constructor() {
        this.isActive = false;
        this.recipes = null;
        this.recipes = gameRecipes;

        // Grid configuration
        this.cols = 6;
        this.rows = 5;
        this.tileSize = 90;
        this.gridOffset = { x: 350, y: 160 };
        this.grid = [];
        this.dragState = null;

        this.injectionCost = 15;
        this.btnInject = { x: 20, y: 120, w: 200, h: 50 };

        // FOUR Generators!
        this.generators = [
            { id: 'grain', name: 'Grain Sack', x: 350, y: 30, w: 100, h: 100, color: '#b45309', produces: 'Base Malt' },
            { id: 'water', name: 'Water Tap', x: 470, y: 30, w: 100, h: 100, color: '#0ea5e9', produces: 'Tap Water' },
            { id: 'adjunct', name: 'Adjunct Shelf', x: 590, y: 30, w: 100, h: 100, color: '#8b5cf6', produces: 'Random' },
            // NEW: The Liquor Cabinet
            { id: 'spirits', name: 'Liquor Cabinet', x: 710, y: 30, w: 100, h: 100, color: '#be123c', produces: 'Well Liquor' }
        ];

        // The Brew Kettle now has slots and a button
        this.kettle = {
            x: 350, y: 620, w: 540, h: 80, color: '#3f3f46',
            items: [], // Holds dropped items
            maxItems: 3,
            btnX: 740, btnY: 635, btnW: 130, btnH: 50 // The physical Brew button
        };

        // --- ADD THIS LINE! ---
        this.setupEventListeners();
    }
        
    setupEventListeners() {
        gameEvents.on('DRAG_START', (pos) => {
            if (!this.isActive) return;

            // 1. Did they click the Tip Injection Button?
            if (this.isHit(pos, this.btnInject.x, this.btnInject.y, this.btnInject.w, this.btnInject.h)) {
                this.handleInjectionClick();
                return;
            }

            // 2. Did they click the Brew Button?
            if (this.isHit(pos, this.kettle.btnX, this.kettle.btnY, this.kettle.btnW, this.kettle.btnH)) {
                this.brewKettle();
                return;
            }

            // 3. Did they click a Generator? (This is probably what got deleted!)
            for (let gen of this.generators) {
                if (this.isHit(pos, gen.x, gen.y, gen.w, gen.h)) {
                    this.tapGenerator(gen);
                    return;
                }
            }

            // 4. Did they click an item on the grid to pick it up?
            const { col, row, valid } = this.getGridCoords(pos.x, pos.y);
            if (valid && this.grid[row] && this.grid[row][col]) {
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
                // Does the kettle have an open slot?
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

    brewKettle() {
        if (this.kettle.items.length === 0) return;

        // 1. Get the names of everything in the kettle, sort alphabetically, and join with '+'
        const ingredients = this.kettle.items.map(i => i.name).sort().join('+');
        console.log(`Attempting to brew: ${ingredients}`);

        // 2. Check the JSON dictionary
        if (this.recipes && this.recipes.brews[ingredients]) {
            const brewData = this.recipes.brews[ingredients];
            console.log(`SUCCESS! Brewed ${brewData.ammoName}!`);
            gameEvents.emit('ADD_AMMO', { name: brewData.ammoName, type: brewData.type });
        } else {
            // THE PUNISHMENT FOR BAD EXPERIMENTATION
            console.log("FAILED! That combination is gross. Brewed Swill.");
            gameEvents.emit('ADD_AMMO', { name: 'Swill', type: 'crowd_control' });
        }

        // 3. Empty the kettle for the next batch
        this.kettle.items = [];
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
            let itemName = gen.produces;
            let itemColor = '#d97706';

            // If it's the Adjunct shelf, pick a random ingredient!
            if (gen.id === 'adjunct') {
                const adjuncts = [
                    { name: 'Marshmallow', color: '#fdf4ff' },
                    { name: 'Raspberry', color: '#e11d48' },
                    { name: 'Cacao Nibs', color: '#451a03' }
                ];
                const rand = adjuncts[Math.floor(Math.random() * adjuncts.length)];
                itemName = rand.name;
                itemColor = rand.color;
            } else if (gen.id === 'water') {
                itemColor = '#0ea5e9';
            } else if (gen.id === 'spirits') {
                itemColor = '#f43f5e'; // Bright red for Well Liquor
            }

            this.grid[targetCell.r][targetCell.c] = {
                name: itemName,
                tier: 1, // Adjuncts are Tier 1 but don't merge!
                color: itemColor
            };
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
    shutdown() {
        console.log("[Brewing] Shutting down phase.");
        this.isActive = false;
        this.dragState = null; // Drop anything we were holding
    }
        
}

const brewingPhase = new BrewingPhase();