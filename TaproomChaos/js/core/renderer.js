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

        // 7. Draw the HUD (Ammo)
        this.ctx.fillStyle = 'rgba(9, 9, 11, 0.8)';
        this.ctx.fillRect(10, 10, 280, 50 + (playerState.ammo.length * 35));
        this.ctx.fillStyle = '#dc2626';
        this.ctx.font = 'bold 24px Oswald';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('ON TAP:', 25, 45);

        let yOffset = 80;
        playerState.ammo.forEach((ammo, index) => {
            if (index === state.selectedAmmoIndex) {
                this.ctx.fillStyle = '#f59e0b';
                this.ctx.fillText(`► ${ammo.name} (x${ammo.count})`, 25, yOffset);
            } else {
                this.ctx.fillStyle = '#a1a1aa';
                this.ctx.fillText(`  ${ammo.name} (x${ammo.count})`, 25, yOffset);
            }
            ammo.hitbox = { x: 25, y: yOffset - 16, w: 250, h: 24 };
            yOffset += 35;
        });
    }

    // --- BREWING RENDERING ---
    drawBrewing(state) {
        // 1. Background
        this.ctx.fillStyle = '#f4e8d1';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 2. Sidebar (Tips)
        this.ctx.fillStyle = '#27272a';
        this.ctx.fillRect(0, 0, 250, this.canvas.width);

        this.ctx.fillStyle = '#dc2626';
        this.ctx.font = 'bold 24px Oswald';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('TIP INJECTION', 20, 40);

        this.ctx.fillStyle = '#f4f4f5';
        this.ctx.font = '18px Inter';
        this.ctx.fillText(`Tips: $${playerState ? playerState.tips : 0}.00`, 20, 80);

        const canAfford = playerState && playerState.canAfford(state.injectionCost);
        this.ctx.strokeStyle = canAfford ? '#f4f4f5' : '#52525b';
        this.ctx.fillStyle = canAfford ? '#f4f4f5' : '#52525b';
        this.ctx.strokeRect(state.btnInject.x, state.btnInject.y, state.btnInject.w, state.btnInject.h);
        this.ctx.fillText(`+ Galaxy Hop ($${state.injectionCost})`, 35, 152);

        // Keg Room Inventory
        this.ctx.fillStyle = '#dc2626';
        this.ctx.font = 'bold 20px Oswald';
        this.ctx.fillText('INVENTORY:', 20, 240);
        this.ctx.fillStyle = '#f4f4f5';
        this.ctx.font = '16px Inter';
        let invYOffset = 270;
        if (playerState && playerState.ammo) {
            playerState.ammo.forEach(ammo => {
                this.ctx.fillText(`${ammo.name}: ${ammo.count}`, 20, invYOffset);
                invYOffset += 25;
            });
        }

        // 3. Draw Generators
        state.generators.forEach(gen => {
            this.ctx.fillStyle = 'rgba(0,0,0,0.1)';
            this.ctx.fillRect(gen.x + 5, gen.y + 5, gen.w, gen.h);
            this.ctx.fillStyle = gen.color;
            this.ctx.fillRect(gen.x, gen.y, gen.w, gen.h);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 16px Inter';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(gen.name, gen.x + gen.w / 2, gen.y + gen.h / 2 + 6);
        });

        // 4. Draw the Grid
        for (let r = 0; r < state.rows; r++) {
            for (let c = 0; c < state.cols; c++) {
                const x = state.gridOffset.x + (c * state.tileSize);
                const y = state.gridOffset.y + (r * state.tileSize);

                this.ctx.strokeStyle = 'rgba(0,0,0,0.1)';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(x, y, state.tileSize, state.tileSize);

                const item = state.grid[r][c];
                if (item) {
                    this.drawItem(item, x, y, state.tileSize);
                }
            }
        }

        // 4.5 Draw the Brew Kettle
        this.ctx.fillStyle = '#27272a';
        this.ctx.fillRect(state.kettle.x, state.kettle.y + 10, state.kettle.w, state.kettle.h);
        this.ctx.fillStyle = state.kettle.color;
        this.ctx.fillRect(state.kettle.x, state.kettle.y, state.kettle.w, state.kettle.h);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 24px Inter';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('DROP HERE TO BREW', state.kettle.x + state.kettle.w / 2, state.kettle.y + 45);

        // 5. Draw the Dragged Item
        if (state.dragState) {
            const drawX = state.dragState.mouseX - (state.tileSize / 2);
            const drawY = state.dragState.mouseY - (state.tileSize / 2);
            this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
            this.ctx.shadowBlur = 15;
            this.ctx.shadowOffsetX = 5;
            this.ctx.shadowOffsetY = 10;
            this.drawItem(state.dragState.item, drawX, drawY, state.tileSize);
            this.ctx.shadowColor = 'transparent';
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