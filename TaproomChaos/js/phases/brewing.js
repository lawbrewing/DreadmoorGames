// js/phases/brewing.js

class BrewingPhase {
    constructor() {
        this.isActive = false;

        // Grid configuration
        this.cols = 6;
        this.rows = 5;
        this.tileSize = 90;

        // We moved the grid down slightly to make room for the Generators at the top
        this.gridOffset = { x: 350, y: 160 };
        this.grid = [];

        // Drag & Drop State
        this.dragState = null; // Will hold: { item, startCol, startRow, mouseX, mouseY }

        // Sidebar Tip Injection
        this.injectionCost = 15;
        this.btnInject = { x: 20, y: 120, w: 200, h: 50 };

        // Permanent Board Generators
        this.generators = [
            { id: 'grain', name: 'Grain Sack', x: 350, y: 30, w: 100, h: 100, color: '#b45309', produces: 'Base Malt' }
        ];

        // The Brew Kettle (Spans the width of the grid at the bottom)
        this.kettle = { x: 350, y: 620, w: 540, h: 80, color: '#3f3f46' };

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
                // For now, we only allow Tier 5 items to be brewed
                if (sourceItem.tier === 5) {
                    console.log(`Brewed a ${sourceItem.name}! Sending to Taproom.`);

                    // Tell playerState to add this to our ammo pouch
                    gameEvents.emit('ADD_AMMO', {
                        name: 'nIPLy Cold IPA', // We'll make this dynamic based on recipes later
                        type: 'premium'
                    });

                    // The item is consumed! (We just leave this.dragState as null)
                } else {
                    console.log("This item isn't ready to brew yet!");
                    // Bounce it back to where they picked it up
                    this.grid[startRow][startCol] = sourceItem;
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
        const newTier = item.tier + 1;
        switch (newTier) {
            case 2: return { name: 'Specialty Grain', tier: 2, color: '#92400e' };
            case 3: return { name: 'Hop Pellet', tier: 3, color: '#16a34a' };
            case 4: return { name: 'Liquid Yeast', tier: 4, color: '#fef08a' };
            default: return { name: 'Craft Beer Ammo', tier: 5, color: '#eab308' };
        }
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

    draw(ctx, canvas) {
        if (!this.isActive) return;

        // 1. Background
        ctx.fillStyle = '#f4e8d1';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. Sidebar (Tips)
        ctx.fillStyle = '#27272a';
        ctx.fillRect(0, 0, 250, canvas.height);

        ctx.fillStyle = '#dc2626';
        ctx.font = 'bold 24px Oswald';
        ctx.textAlign = 'left';
        ctx.fillText('TIP INJECTION', 20, 40);

        ctx.fillStyle = '#f4f4f5';
        ctx.font = '18px Inter';
        ctx.fillText(`Tips: $${playerState ? playerState.tips : 0}.00`, 20, 80);

        const canAfford = playerState && playerState.canAfford(this.injectionCost);
        ctx.strokeStyle = canAfford ? '#f4f4f5' : '#52525b';
        ctx.fillStyle = canAfford ? '#f4f4f5' : '#52525b';
        ctx.strokeRect(this.btnInject.x, this.btnInject.y, this.btnInject.w, this.btnInject.h);
        ctx.fillText(`+ Galaxy Hop ($${this.injectionCost})`, 35, 152);

        // 3. Draw Generators (The Source)
        this.generators.forEach(gen => {
            // Sack shadow
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.fillRect(gen.x + 5, gen.y + 5, gen.w, gen.h);
            // Sack body
            ctx.fillStyle = gen.color;
            ctx.fillRect(gen.x, gen.y, gen.w, gen.h);
            // Label
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(gen.name, gen.x + gen.w / 2, gen.y + gen.h / 2 + 6);
        });

        // 4. Draw the Grid
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const x = this.gridOffset.x + (c * this.tileSize);
                const y = this.gridOffset.y + (r * this.tileSize);

                // Grid Cell outline
                ctx.strokeStyle = 'rgba(0,0,0,0.1)';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, this.tileSize, this.tileSize);

                const item = this.grid[r][c];
                if (item) {
                    this.drawItem(ctx, item, x, y, this.tileSize);
                }
            }
        }
        // 4.5 Draw the Brew Kettle
        // Kettle Shadow/Depth
        ctx.fillStyle = '#27272a';
        ctx.fillRect(this.kettle.x, this.kettle.y + 10, this.kettle.w, this.kettle.h);
        // Kettle Rim
        ctx.fillStyle = this.kettle.color;
        ctx.fillRect(this.kettle.x, this.kettle.y, this.kettle.w, this.kettle.h);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('DROP HERE TO BREW', this.kettle.x + this.kettle.w / 2, this.kettle.y + 45);
        // 5. Draw the Dragged Item (Drawn LAST so it floats above everything)
        if (this.dragState) {
            // Center the item on the mouse cursor
            const drawX = this.dragState.mouseX - (this.tileSize / 2);
            const drawY = this.dragState.mouseY - (this.tileSize / 2);

            // Add a drop shadow to sell the "lifting" effect
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 5;
            ctx.shadowOffsetY = 10;

            this.drawItem(ctx, this.dragState.item, drawX, drawY, this.tileSize);

            // Reset shadows so we don't mess up the next frame
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }
    }

    // Extracted the item drawing logic so we can use it for grid items AND dragged items
    drawItem(ctx, item, x, y, size) {
        ctx.fillStyle = item.color;
        ctx.fillRect(x + 5, y + 5, size - 10, size - 10);

        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(`T${item.tier}`, x + size / 2, y + size / 2 + 5);
    }
}

const brewingPhase = new BrewingPhase();