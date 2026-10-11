// js/core/renderer.js

class GameRenderer {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // --- TAPROOM RENDERING ---
    drawTaproom(state) {
        // 1. Floor
        this.ctx.fillStyle = '#18181b';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 2. The Bar (Foreground)
        this.ctx.fillStyle = '#27272a';
        this.ctx.fillRect(0, 550, this.canvas.width, 170);
        this.ctx.fillStyle = '#3f3f46';
        this.ctx.fillRect(0, 540, this.canvas.width, 10);

        // 3. Draw Patrons
        state.patrons.forEach(patron => {
            const scale = 0.5 + (patron.y / this.canvas.height);
            const width = 60 * scale;
            const height = 140 * scale;

            // Shadow
            this.ctx.fillStyle = 'rgba(0,0,0,0.4)';
            this.ctx.beginPath();
            this.ctx.ellipse(patron.x, patron.y, width / 2, 10 * scale, 0, 0, Math.PI * 2);
            this.ctx.fill();

            // Body
            this.ctx.fillStyle = patron.color;
            this.ctx.fillRect(patron.x - width / 2, patron.y - height, width, height);

            // Label
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = `${Math.floor(14 * scale)}px Inter`;
            this.ctx.textAlign = 'center';
            this.ctx.fillText(patron.type, patron.x, patron.y - height - 10);
        });

        // 4. Draw Projectiles
        state.projectiles.forEach(p => {
            this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
            this.ctx.beginPath();
            this.ctx.ellipse(p.x, p.y, p.radius, p.radius / 2, 0, 0, Math.PI * 2);
            this.ctx.fill();

            const renderY = p.y - p.z;
            this.ctx.fillStyle = '#eab308'; // Beer color
            this.ctx.beginPath();
            this.ctx.arc(p.x, renderY, p.radius, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.fillStyle = 'rgba(255,255,255,0.7)';
            this.ctx.beginPath();
            this.ctx.arc(p.x - 3, renderY - 3, p.radius / 3, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // 5. Draw Aiming Line
        if (state.isAiming) {
            this.ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
            this.ctx.lineWidth = 4;
            this.ctx.setLineDash([10, 10]);
            this.ctx.beginPath();
            this.ctx.moveTo(state.aimStart.x, state.aimStart.y);
            this.ctx.lineTo(state.aimCurrent.x, state.aimCurrent.y);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }

        // 6. Draw Floating Text
        state.floatingTexts.forEach(ft => {
            this.ctx.fillStyle = ft.color;
            this.ctx.globalAlpha = ft.alpha;
            this.ctx.font = 'bold 28px Oswald';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(ft.text, ft.x, ft.y);
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 1;
            this.ctx.strokeText(ft.text, ft.x, ft.y);
            this.ctx.globalAlpha = 1.0;
        });
    }

    // --- BREWING RENDERING ---
    drawBrewing(state) {
        // 1. Draw Background
        this.ctx.fillStyle = '#18181b';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 2. Draw the 6 Ingredient Sacks
        state.sacks.forEach(sack => {
            this.ctx.fillStyle = sack.color;
            this.ctx.fillRect(sack.x, sack.y, sack.w, sack.h);

            // Sack Labels
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '16px Inter';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(sack.category, sack.x + (sack.w / 2), sack.y + (sack.h / 2) + 6);
        });

        // 3. Draw the Merge Grid
        for (let r = 0; r < state.rows; r++) {
            for (let c = 0; c < state.cols; c++) {
                const cellX = state.gridOffset.x + (c * state.tileSize);
                const cellY = state.gridOffset.y + (r * state.tileSize);

                // Draw cell background
                this.ctx.strokeStyle = '#3f3f46';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(cellX, cellY, state.tileSize, state.tileSize);

                const item = state.grid[r][c];
                if (item) {
                    // Assign colors based on category so the puzzle makes sense visually
                    let itemColor = '#52525b'; // Default Grey
                    if (item.category === 'Water') itemColor = '#3b82f6';
                    if (item.category === 'Grain') itemColor = '#eab308';
                    if (item.category === 'Adjunct') itemColor = '#f97316';
                    if (item.category === 'Yeast') itemColor = '#d9f99d';
                    if (item.category === 'Hops') itemColor = '#22c55e';
                    if (item.category === 'Specialty') itemColor = '#a855f7';

                    this.ctx.fillStyle = itemColor;
                    this.ctx.fillRect(cellX + 5, cellY + 5, state.tileSize - 10, state.tileSize - 10);

                    // Draw the Ingredient Name! (Shrunk to fit the box)
                    this.ctx.fillStyle = '#000000';
                    this.ctx.font = 'bold 12px Inter';
                    this.ctx.textAlign = 'center';

                    // Word wrap hack: Split name if it has a space so it fits in the square
                    const words = item.name.split(' ');
                    if (words.length > 1) {
                        this.ctx.fillText(words[0], cellX + (state.tileSize / 2), cellY + (state.tileSize / 2) - 6);
                        this.ctx.fillText(words.slice(1).join(' '), cellX + (state.tileSize / 2), cellY + (state.tileSize / 2) + 8);
                    } else {
                        this.ctx.fillText(item.name, cellX + (state.tileSize / 2), cellY + (state.tileSize / 2) + 4);
                    }
                }
            }
        }

        // 4. Draw the Brew Kettle
        this.ctx.fillStyle = state.kettle.color;
        this.ctx.fillRect(state.kettle.x, state.kettle.y, state.kettle.w, state.kettle.h);

        // Draw slots inside the kettle
        for (let i = 0; i < state.kettle.maxItems; i++) {
            const slotX = state.kettle.x + 10 + (i * 70);
            const slotY = state.kettle.y + 10;

            this.ctx.strokeStyle = '#52525b';
            this.ctx.strokeRect(slotX, slotY, 60, 60);

            // Draw item if it exists in this slot
            if (state.kettle.items[i]) {
                const kItem = state.kettle.items[i];
                this.ctx.fillStyle = '#facc15';
                this.ctx.fillRect(slotX + 5, slotY + 5, 50, 50);

                // Draw initials so we can see what's in the kettle
                this.ctx.fillStyle = '#000000';
                this.ctx.font = 'bold 12px Inter';
                this.ctx.fillText(kItem.name.substring(0, 5), slotX + 30, slotY + 35);
            }
        }

        // 5. Draw the physical "BREW" Button
        this.ctx.fillStyle = '#10b981';
        this.ctx.fillRect(state.kettle.btnX, state.kettle.btnY, state.kettle.btnW, state.kettle.btnH);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 20px Oswald';
        this.ctx.fillText("BREW!", state.kettle.btnX + (state.kettle.btnW / 2), state.kettle.btnY + 32);

        // 6. Draw the item currently being dragged (if any)
        if (state.dragState && state.dragState.item) {
            this.ctx.fillStyle = '#facc15';
            this.ctx.fillRect(state.dragState.mouseX - 30, state.dragState.mouseY - 30, 60, 60);
            this.ctx.fillStyle = '#000';
            this.ctx.font = 'bold 12px Inter';
            this.ctx.fillText(state.dragState.item.name.substring(0, 8), state.dragState.mouseX, state.dragState.mouseY + 4);
        }
    }

    drawItem(item, x, y, size) {
        this.ctx.fillStyle = item.color;
        this.ctx.fillRect(x + 5, y + 5, size - 10, size - 10);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '14px Inter';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`T${item.tier}`, x + size / 2, y + size / 2 + 5);
    }
}