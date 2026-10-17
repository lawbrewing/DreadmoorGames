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
        const ctx = this.ctx;

        // 1. Hardwood Taproom Floor with subtle plank lines
        const floorGrad = ctx.createLinearGradient(0, 0, 0, 550);
        floorGrad.addColorStop(0, '#09090b');
        floorGrad.addColorStop(1, '#1c1917');
        ctx.fillStyle = floorGrad;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 2;
        for (let y = 100; y < 540; y += 45) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.canvas.width, y);
            ctx.stroke();
        }

        // 2. Patrons (ANIMATED SPRITES via SpriteManager)
        state.patrons.forEach(patron => {
            // Fallbacks to prevent NaN gradient crashes
            const px = patron.x || 0;
            const py = patron.y || 0;
            const cHeight = this.canvas.height || 600;

            // Depth Scale: Patrons get bigger as they approach the foreground
            const scale = 0.6 + (py / cHeight) * 0.7;
            const drawW = 64 * scale;
            const drawH = 64 * scale;

            // Floor Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.beginPath();
            ctx.ellipse(px, py, drawW * 0.35, 8 * scale, 0, 0, Math.PI * 2);
            ctx.fill();

            const drawX = px - (drawW / 2);
            const drawY = py - drawH;

            // Ask the SpriteManager to render the specific frame!
            if (typeof spriteManager !== 'undefined' && spriteManager.isLoaded && patron.rosterKey) {
                // They walk UP to the bar, and face DOWN when waiting for their drink
                const dir = patron.state === 'walk' ? 'UP' : 'DOWN';
                const frame = patron.animFrame || 0;

                ctx.save();
                ctx.translate(drawX, drawY);
                ctx.scale(scale, scale); // Scale the 64x64 sprite to create depth
                spriteManager.drawSprite(ctx, patron.rosterKey, patron.state, dir, frame, 0, 0);
                ctx.restore();
            } else {
                // Fallback box if sprites are still loading or blocked by CORS
                ctx.fillStyle = '#ff00ff';
                ctx.fillRect(drawX, drawY, drawW, drawH);
            }

            // Patron Type Pill Badge above head
            const labelY = drawY - (5 * scale);
            ctx.font = `bold ${Math.floor(12 * scale)}px Inter`;
            const textStr = patron.type ? patron.type.toUpperCase() : 'PATRON';
            const textW = ctx.measureText(textStr).width + (14 * scale);

            ctx.fillStyle = 'rgba(9, 9, 11, 0.85)';
            // Turn the border Red if their patience is running low!
            ctx.strokeStyle = patron.currentPatience < 15 ? '#ef4444' : '#10b981';
            ctx.lineWidth = 1.5 * scale;
            ctx.beginPath();
            ctx.roundRect(px - textW / 2, labelY - 12 * scale, textW, 18 * scale, 6 * scale);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(textStr, px, labelY + (2 * scale));
        });

        // 3. The Mahogany Bar (Foreground)
        const barGrad = ctx.createLinearGradient(0, 540, 0, 720);
        barGrad.addColorStop(0, '#451a03');
        barGrad.addColorStop(0.15, '#291509');
        barGrad.addColorStop(1, '#0c0a09');
        ctx.fillStyle = barGrad;
        ctx.fillRect(0, 550, this.canvas.width, 170);

        // Polished Bar Top Ledge & Brass Rail
        ctx.fillStyle = '#78350f';
        ctx.fillRect(0, 538, this.canvas.width, 12);
        ctx.fillStyle = '#d97706';
        ctx.fillRect(0, 536, this.canvas.width, 3);

        // 4. Draw Projectiles (Sliding Frothy Pint Mugs!)
        state.projectiles.forEach(p => {
            // NaN Fallbacks for projectiles just to be completely safe
            const px = p.x || 0;
            const py = p.y || 0;
            const pz = p.z || 0;
            const r = p.radius || 15;
            const renderY = py - pz;

            // Drop shadow on floor
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.beginPath();
            ctx.ellipse(px, py, r, r * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Glass handle
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(px + r * 0.75, renderY, r * 0.45, -Math.PI / 2, Math.PI / 2);
            ctx.stroke();

            // Golden Pint Body
            const beerGrad = ctx.createLinearGradient(px - r, renderY - r, px + r, renderY + r);
            beerGrad.addColorStop(0, '#facc15');
            beerGrad.addColorStop(1, '#ca8a04');
            ctx.fillStyle = beerGrad;
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(px - r * 0.8, renderY - r, r * 1.6, r * 1.9, 4);
            ctx.fill();
            ctx.stroke();

            // Frothy Foam Head
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(px - r * 0.4, renderY - r, r * 0.45, 0, Math.PI * 2);
            ctx.arc(px, renderY - r - 2, r * 0.55, 0, Math.PI * 2);
            ctx.arc(px + r * 0.4, renderY - r, r * 0.45, 0, Math.PI * 2);
            ctx.fill();
        });

        // 5. Draw Aiming Line
        if (state.isAiming) {
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.75)';
            ctx.lineWidth = 4;
            ctx.setLineDash([10, 10]);
            ctx.beginPath();
            ctx.moveTo(state.aimStart.x, state.aimStart.y);
            ctx.lineTo(state.aimCurrent.x, state.aimCurrent.y);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // 6. Draw Floating Text
        state.floatingTexts.forEach(ft => {
            ctx.save();
            ctx.fillStyle = ft.color;
            ctx.globalAlpha = ft.alpha;
            ctx.font = 'bold 28px Oswald';
            ctx.textAlign = 'center';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 4;
            ctx.strokeText(ft.text, ft.x, ft.y);
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        });
    }

    // --- BREWING RENDERING ---
    drawBrewing(state) {
        const ctx = this.ctx;

        // 1. Rich Brewhouse Background with subtle radial spotlight
        const bgGrad = ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, 80,
            this.canvas.width / 2, this.canvas.height / 2, 780
        );
        bgGrad.addColorStop(0, '#27272a');
        bgGrad.addColorStop(1, '#09090b');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 2. Draw the 6 Custom Ingredient Dispensers
        state.sacks.forEach(sack => this.drawGeneratorSack(sack));

        // 3. Draw the Stainless Merge Grid Tray
        const trayX = state.gridOffset.x - 10;
        const trayY = state.gridOffset.y - 10;
        const trayW = (state.cols * state.tileSize) + 20;
        const trayH = (state.rows * state.tileSize) + 20;

        ctx.fillStyle = 'rgba(24, 24, 27, 0.9)';
        ctx.strokeStyle = '#52525b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(trayX, trayY, trayW, trayH, 14);
        ctx.fill();
        ctx.stroke();

        for (let r = 0; r < state.rows; r++) {
            for (let c = 0; c < state.cols; c++) {
                const cellX = state.gridOffset.x + (c * state.tileSize);
                const cellY = state.gridOffset.y + (r * state.tileSize);

                // Recessed slot with subtle inner shadow
                ctx.fillStyle = '#121215';
                ctx.strokeStyle = '#27272a';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.roundRect(cellX + 3, cellY + 3, state.tileSize - 6, state.tileSize - 6, 10);
                ctx.fill();
                ctx.stroke();

                const item = state.grid[r][c];
                if (item) {
                    this.drawIngredientTile(cellX, cellY, state.tileSize, item);
                }
            }
        }

        // 4. Draw the 3-Kettle Brewhouse Line (With Visual Tier Upgrades!)
        const unlockedCount = (typeof playerState !== 'undefined') ? playerState.unlockedKettles : 1;

        // Draw overhead connecting copper steam manifold pipe between unlocked kettles
        if (unlockedCount > 1) {
            const firstK = state.kettles[0];
            const lastUnlockedK = state.kettles[unlockedCount - 1];
            const pipeStartX = firstK.x + 30;
            const pipeEndX = lastUnlockedK.x + lastUnlockedK.w - 30;
            const pipeY = firstK.y + 52;

            // Outer Copper/Gold Manifold Pipe
            this.ctx.strokeStyle = unlockedCount === 3 ? '#f59e0b' : '#b45309';
            this.ctx.lineWidth = 12;
            this.ctx.lineCap = 'round';
            this.ctx.beginPath();
            this.ctx.moveTo(pipeStartX, pipeY);
            this.ctx.lineTo(pipeEndX, pipeY);
            this.ctx.stroke();

            // Pipe Specular Highlight
            this.ctx.strokeStyle = unlockedCount === 3 ? '#fef08a' : '#fbbf24';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(pipeStartX, pipeY - 2);
            this.ctx.lineTo(pipeEndX, pipeY - 2);
            this.ctx.stroke();
        }

        state.kettles.forEach((kettle, idx) => {
            const kx = kettle.x;
            const ky = kettle.y;
            const kw = kettle.w;
            const kh = kettle.h;
            const isUnlocked = idx < unlockedCount;

            if (!isUnlocked) {
                // --- LOCKED KETTLE SLOT (Blueprint / Padlock) ---
                this.ctx.fillStyle = 'rgba(24, 24, 27, 0.6)';
                this.ctx.strokeStyle = idx === 1 ? '#b45309' : '#38bdf8';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([6, 6]);
                this.ctx.beginPath();
                this.ctx.roundRect(kx, ky + 10, kw, kh - 10, 12);
                this.ctx.fill();
                this.ctx.stroke();
                this.ctx.setLineDash([]);

                const unlockCost = (typeof playerState !== 'undefined') ? playerState.kettleCosts[idx] : 50;
                const isNext = idx === unlockedCount;
                const tierTitle = idx === 1 ? '🔒 COPPER BOIL KETTLE' : '🔒 SMART PRO BREW VAT';

                this.ctx.fillStyle = isNext ? '#facc15' : '#71717a';
                this.ctx.font = 'bold 15px Oswald';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(tierTitle, kx + (kw / 2), ky + 46);

                this.ctx.font = 'bold 12px Inter';
                this.ctx.fillStyle = isNext ? '#4ade80' : '#52525b';
                this.ctx.fillText(
                    isNext ? `Click to Upgrade ($${unlockCost})` : `Unlock Kettle #${idx} First`,
                    kx + (kw / 2),
                    ky + 72
                );

                const reqShift = idx === 1 ? 'Rec. by Shift 5 (Copper Tier)' : 'Rec. by Shift 10 (Digital Tier)';
                this.ctx.font = 'italic 10px Inter';
                this.ctx.fillStyle = '#a1a1aa';
                this.ctx.fillText(reqShift, kx + (kw / 2), ky + 94);
                return;
            }

            // --- DETERMINE VISUAL TIER PALETTE ---
            const kettleBodyGrad = this.ctx.createLinearGradient(kx, ky, kx + kw, ky);
            let rimColor = '#71717a';
            let borderStroke = '#71717a';
            let rivetColor = '#a1a1aa';

            if (idx === 0) {
                // KETTLE #1: Forged Steel Mash Tun (Gains brass trim once Brewhouse reaches Level 2+)
                kettleBodyGrad.addColorStop(0, '#27272a');
                kettleBodyGrad.addColorStop(0.25, '#52525b');
                kettleBodyGrad.addColorStop(0.5, '#3f3f46');
                kettleBodyGrad.addColorStop(0.85, '#27272a');
                kettleBodyGrad.addColorStop(1, '#18181b');
                rimColor = unlockedCount >= 2 ? '#d97706' : '#71717a';
                borderStroke = unlockedCount === 3 ? '#facc15' : '#71717a';
                rivetColor = unlockedCount >= 2 ? '#fbbf24' : '#a1a1aa';
            } else if (idx === 1) {
                // KETTLE #2: Artisanal Hammered Copper Kettle
                kettleBodyGrad.addColorStop(0, '#451a03');
                kettleBodyGrad.addColorStop(0.25, '#b45309');
                kettleBodyGrad.addColorStop(0.5, '#d97706');
                kettleBodyGrad.addColorStop(0.8, '#92400e');
                kettleBodyGrad.addColorStop(1, '#451a03');
                rimColor = '#f59e0b';
                borderStroke = '#fbbf24';
                rivetColor = '#fde68a';
            } else {
                // KETTLE #3: High-Tech Chrome & Neon Smart Vat
                kettleBodyGrad.addColorStop(0, '#0f172a');
                kettleBodyGrad.addColorStop(0.25, '#475569');
                kettleBodyGrad.addColorStop(0.5, '#64748b');
                kettleBodyGrad.addColorStop(0.8, '#334155');
                kettleBodyGrad.addColorStop(1, '#0f172a');
                rimColor = '#38bdf8';
                borderStroke = '#38bdf8';
                rivetColor = '#7dd3fc';
            }

            // Draw Kettle Belly
            this.ctx.fillStyle = kettleBodyGrad;
            this.ctx.strokeStyle = borderStroke;
            this.ctx.lineWidth = 2.5;
            this.ctx.beginPath();
            this.ctx.moveTo(kx, ky + 18);
            this.ctx.lineTo(kx + kw, ky + 18);
            this.ctx.bezierCurveTo(kx + kw + 6, ky + kh - 8, kx + kw - 10, ky + kh + 10, kx + kw - 20, ky + kh + 10);
            this.ctx.lineTo(kx + 20, ky + kh + 10);
            this.ctx.bezierCurveTo(kx + 10, ky + kh + 10, kx - 6, ky + kh - 8, kx, ky + 18);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();

            // Draw Rivet Band across the upper belly
            this.ctx.fillStyle = rivetColor;
            for (let rx = kx + 18; rx < kx + kw - 15; rx += 28) {
                this.ctx.beginPath();
                this.ctx.arc(rx, ky + 36, 2, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // --- TIER-SPECIFIC HARDWARE ATTACHMENTS ---
            const hasItems = kettle.items.length > 0;

            // Copper Kettle (#2) & Upgraded Kettle (#1) get an Analog Steam Pressure Gauge
            if (idx === 1 || (idx === 0 && unlockedCount >= 2)) {
                const gx = kx + 2;
                const gy = ky + 58;
                // Brass gauge casing
                this.ctx.fillStyle = '#fef3c7';
                this.ctx.strokeStyle = '#b45309';
                this.ctx.lineWidth = 2.5;
                this.ctx.beginPath();
                this.ctx.arc(gx, gy, 10, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();
                // Red pressure needle (tilts high when items are inside!)
                this.ctx.strokeStyle = '#dc2626';
                this.ctx.lineWidth = 1.8;
                this.ctx.beginPath();
                this.ctx.moveTo(gx, gy);
                this.ctx.lineTo(hasItems ? gx + 6 : gx - 5, hasItems ? gy - 5 : gy - 4);
                this.ctx.stroke();
            }

            // Smart Pro Vat (#3) gets a Glowing Sight-Glass & Digital PID Temp Readout
            if (idx === 2) {
                // Vertical Neon Sight-Glass Strip
                this.ctx.fillStyle = hasItems ? '#22d3ee' : '#1e293b';
                this.ctx.strokeStyle = '#94a3b8';
                this.ctx.lineWidth = 1.5;
                this.ctx.beginPath();
                this.ctx.roundRect(kx + 12, ky + 44, 8, 42, 4);
                this.ctx.fill();
                this.ctx.stroke();

                // Digital PID Screen on the top-left shoulder
                this.ctx.fillStyle = '#09090b';
                this.ctx.strokeStyle = '#38bdf8';
                this.ctx.lineWidth = 1.5;
                this.ctx.fillRect(kx - 8, ky + 46, 28, 16);
                this.ctx.strokeRect(kx - 8, ky + 46, 28, 16);

                this.ctx.fillStyle = hasItems ? '#4ade80' : '#38bdf8';
                this.ctx.font = 'bold 9px Inter';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(hasItems ? '152°' : 'RDY', kx + 6, ky + 57);
            }

            // Kettle Open Mouth Rim
            this.ctx.fillStyle = rimColor;
            this.ctx.strokeStyle = '#18181b';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.ellipse(kx + (kw / 2), ky + 18, (kw / 2) + 2, 16, 0, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();

            // Inner Wort Liquid Opening
            const wortGrad = this.ctx.createRadialGradient(
                kx + (kw / 2), ky + 18, 4,
                kx + (kw / 2), ky + 18, kw / 2
            );
            if (hasItems) {
                wortGrad.addColorStop(0, '#f59e0b');
                wortGrad.addColorStop(0.7, '#92400e');
                wortGrad.addColorStop(1, '#1c1917');
            } else {
                wortGrad.addColorStop(0, '#27272a');
                wortGrad.addColorStop(1, '#09090b');
            }
            this.ctx.fillStyle = wortGrad;
            this.ctx.beginPath();
            this.ctx.ellipse(kx + (kw / 2), ky + 18, (kw / 2) - 6, 12, 0, 0, Math.PI * 2);
            this.ctx.fill();

            // Draw Floating Mini-Tiles inside this Kettle
            const count = kettle.items.length;
            if (count > 0) {
                const poolStartX = kx + 22;
                const poolWidth = kw - 110; // Leaves room for the gauge on left & BREW button on right
                const tileW = Math.min(44, Math.floor(poolWidth / count) - 2);
                const spacing = Math.min(44, Math.floor(poolWidth / count));

                kettle.items.forEach((item, index) => {
                    const itemX = poolStartX + (index * spacing);
                    const bobY = ky + 28 + ((index % 2 === 0) ? -2 : 2);
                    this.drawIngredientTile(itemX, bobY, Math.max(30, tileW), item, true);
                });

                this.ctx.fillStyle = '#e4e4e7';
                this.ctx.font = '10px Inter';
                this.ctx.textAlign = 'left';
                this.ctx.fillText(`${count} in vat (click to undo)`, kx + 24, ky + kh);

                // LIVE RECIPE PREVIEW PILL (Above the Kettle Mouth)
                if (count > 0 && typeof gameRecipes !== 'undefined') {
                    const ingNames = kettle.items.map(i => i.name);

                    // If there's only 1 ingredient, warn them they need at least 2
                    let pillText = '⚠️ Need at least 2 ingredients';
                    let pillBg = 'rgba(127, 29, 29, 0.92)';
                    let pillBorder = '#ef4444';

                    if (kettle.items.length >= 2) {
                        const preview = gameRecipes.evaluateBrew(ingNames);
                        if (preview) {
                            const isKnown = (typeof playerState !== 'undefined') && playerState.unlockedRecipes.includes(preview.name);
                            if (preview.type === 'soda' || preview.type === 'crowd_control' || isKnown) {
                                pillText = `✓ Ready: ${preview.name}`;
                                pillBg = 'rgba(20, 83, 45, 0.92)';
                                pillBorder = '#4ade80';
                            } else {
                                pillText = '✨ Mystery Valid Recipe!';
                                pillBg = 'rgba(88, 28, 135, 0.92)';
                                pillBorder = '#c084fc';
                            }
                        } else {
                            // 2+ ingredients, but it doesn't match any valid recipe -> Ruined batch warning!
                            pillText = '❌ Invalid Recipe (Trash Batch)';
                            pillBg = 'rgba(127, 29, 29, 0.92)';
                            pillBorder = '#ef4444';
                        }
                    }

                    this.ctx.fillStyle = pillBg;
                    this.ctx.strokeStyle = pillBorder;
                    this.ctx.lineWidth = 1.5;
                    this.ctx.beginPath();
                    this.ctx.roundRect(kx + 12, ky - 12, kw - 24, 20, 10);
                    this.ctx.fill();
                    this.ctx.stroke();

                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.font = 'bold 10px Inter';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText(pillText, kx + (kw / 2), ky + 2);
                }
            } else {
                const emptyLabel = idx === 0 ? 'STEEL TUN #1' : (idx === 1 ? 'COPPER KETTLE #2' : 'SMART VAT #3');
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
                this.ctx.font = 'bold 11px Inter';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(emptyLabel, kx + (kw / 2) - 30, ky + 66);
            }

            // 5. Draw this Kettle's Individual "BREW!" Button
            let brewCost = 0;
            if (typeof gameRecipes !== 'undefined') {
                kettle.items.forEach(item => {
                    brewCost += gameRecipes.getIngredientCost(item.name);
                });
            }

            this.ctx.fillStyle = hasItems ? '#16a34a' : '#27272a';
            this.ctx.strokeStyle = hasItems ? '#86efac' : borderStroke;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.roundRect(kettle.btnX, kettle.btnY, kettle.btnW, kettle.btnH, 6);
            this.ctx.fill();
            this.ctx.stroke();

            this.ctx.fillStyle = '#ffffff';
            this.ctx.textAlign = 'center';
            if (brewCost > 0) {
                this.ctx.font = 'bold 14px Oswald';
                this.ctx.fillText('BREW', kettle.btnX + (kettle.btnW / 2), kettle.btnY + 20);
                this.ctx.font = 'bold 11px Inter';
                this.ctx.fillStyle = '#dcfce7';
                this.ctx.fillText(`$${brewCost}`, kettle.btnX + (kettle.btnW / 2), kettle.btnY + 36);
            } else {
                this.ctx.font = 'bold 15px Oswald';
                this.ctx.fillText('BREW', kettle.btnX + (kettle.btnW / 2), kettle.btnY + 28);
            }
        });

        // --- MISSING PIECE #2: 5B. Draw the Industrial Floor Drain (Trash Slot) ---
        if (state.drain) {
            const dx = state.drain.x;
            const dy = state.drain.y;
            const dw = state.drain.w;
            const dh = state.drain.h;

            this.ctx.fillStyle = '#18181b';
            this.ctx.strokeStyle = '#52525b';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.roundRect(dx, dy, dw, dh, 12);
            this.ctx.fill();
            this.ctx.stroke();

            // Circular Steel Grate in Center
            const gcx = dx + (dw / 2);
            const gcy = dy + 44;
            this.ctx.fillStyle = '#09090b';
            this.ctx.strokeStyle = '#71717a';
            this.ctx.lineWidth = 2.5;
            this.ctx.beginPath();
            this.ctx.arc(gcx, gcy, 24, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();

            // Grate Bars
            for (let gx = -14; gx <= 14; gx += 7) {
                this.ctx.beginPath();
                this.ctx.moveTo(gcx + gx, gcy - 18);
                this.ctx.lineTo(gcx + gx, gcy + 18);
                this.ctx.stroke();
            }

            this.ctx.fillStyle = '#a1a1aa';
            this.ctx.font = 'bold 11px Oswald';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('FLOOR DRAIN', gcx, dy + dh - 20);
            this.ctx.font = '10px Inter';
            this.ctx.fillStyle = '#71717a';
            this.ctx.fillText('(Drag here to dump)', gcx, dy + dh - 7);
        }

        // 6. Draw the item currently being dragged
        if (state.dragState && state.dragState.item) {
            this.drawIngredientTile(
                state.dragState.mouseX - (state.tileSize / 2),
                state.dragState.mouseY - (state.tileSize / 2),
                state.tileSize,
                state.dragState.item
            );
        }

        // --- MISSING PIECE #3: 7. Draw Brewing Floating Feedback Popups ---
        if (state.floatingTexts) {
            state.floatingTexts.forEach(ft => {
                this.ctx.save();
                this.ctx.globalAlpha = Math.max(0, ft.alpha);
                this.ctx.font = 'bold 20px Oswald';
                this.ctx.textAlign = 'center';
                this.ctx.strokeStyle = '#000000';
                this.ctx.lineWidth = 3;
                this.ctx.strokeText(ft.text, ft.x, ft.y);
                this.ctx.fillStyle = ft.color || '#ffffff';
                this.ctx.fillText(ft.text, ft.x, ft.y);
                this.ctx.restore();
            });
        }
    }

    drawGeneratorSack(sack) {
        const ctx = this.ctx;
        const { x, y, w, h, category, color, cost } = sack;
        const cx = x + (w / 2);
        const cy = y + 32;

        ctx.save();

        // Base Shadow & Container Plate
        const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
        bgGrad.addColorStop(0, '#27272a');
        bgGrad.addColorStop(1, '#09090b');
        ctx.fillStyle = bgGrad;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 12);
        ctx.fill();
        ctx.stroke();

        // Category-Specific Dispenser Silhouette
        if (category === 'Water') {
            // Brass & Blue Tap Spigot
            ctx.strokeStyle = '#60a5fa';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(cx - 16, cy - 6);
            ctx.lineTo(cx + 4, cy - 6);
            ctx.quadraticCurveTo(cx + 12, cy - 6, cx + 12, cy + 4);
            ctx.stroke();
            // Red valve wheel on top
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(cx - 4, cy - 14);
            ctx.lineTo(cx + 8, cy - 14);
            ctx.stroke();
            // Falling droplet
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(cx + 12, cy + 12, 4, 0, Math.PI * 2);
            ctx.fill();
        } else if (category === 'Grain' || category === 'Adjunct') {
            // Open Rolled-Cuff Burlap Sack
            ctx.fillStyle = category === 'Grain' ? '#a16207' : '#9a3412';
            ctx.strokeStyle = '#1c1917';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(cx - 18, cy - 6, 36, 24, 6);
            ctx.fill();
            ctx.stroke();
            // Overflowing golden grain mound at top
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.ellipse(cx, cy - 6, 16, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else if (category === 'Yeast') {
            // Lab Propagator Jar with Pressure Lid
            ctx.fillStyle = 'rgba(163, 230, 53, 0.25)';
            ctx.strokeStyle = '#d9f99d';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(cx - 13, cy - 10, 26, 26, 5);
            ctx.fill();
            ctx.stroke();
            // Bubbling yeast slurry inside
            ctx.fillStyle = '#a3e635';
            ctx.fillRect(cx - 11, cy + 2, 22, 12);
        } else if (category === 'Hops') {
            // Strapped Burlap Hop Bale with Leaf Crest
            ctx.fillStyle = '#14532d';
            ctx.strokeStyle = '#4ade80';
            ctx.lineWidth = 2;
            ctx.fillRect(cx - 16, cy - 10, 32, 24);
            ctx.strokeRect(cx - 16, cy - 10, 32, 24);
            this.drawCustomIcon(cx, cy + 2, 'Hops', 'Citra', '#4ade80', 0.65, 3);
        } else {
            // Wooden Specialty Smuggler Crate
            ctx.fillStyle = '#4c1d95';
            ctx.strokeStyle = '#c084fc';
            ctx.lineWidth = 2;
            ctx.fillRect(cx - 17, cy - 10, 34, 24);
            ctx.strokeRect(cx - 17, cy - 10, 34, 24);
            // Diagonal crate slat
            ctx.beginPath();
            ctx.moveTo(cx - 17, cy - 10);
            ctx.lineTo(cx + 17, cy + 14);
            ctx.stroke();
        }

        // Category Title & Price Tag
        ctx.fillStyle = '#f4f4f5';
        ctx.font = 'bold 11px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(category.toUpperCase(), cx, y + h - 19);

        ctx.fillStyle = color;
        ctx.font = 'bold 11px Inter';
        ctx.fillText(`$${cost || 1}`, cx, y + h - 5);

        ctx.restore();
    }

    drawIngredientTile(x, y, size, item, isMini = false) {
        const ctx = this.ctx;
        const pad = isMini ? 4 : 5;
        const tx = x + pad;
        const ty = y + pad;
        const s = size - (pad * 2);

        // 1. Determine Tier Level (1-5) for mergeable chains
        let level = 0;
        if (typeof gameRecipes !== 'undefined' && gameRecipes.chains[item.category]) {
            level = gameRecipes.chains[item.category].indexOf(item.name) + 1;
        }

        // 2. Per-Tier Visual Palettes
        const tierPalettes = {
            'Water': [
                { bgTop: '#134e4a', bgBot: '#042f2e', border: '#2dd4bf', icon: '#5eead4' }, // L1: Winnebago (Murky Lake Teal)
                { bgTop: '#1e3a8a', bgBot: '#0f172a', border: '#60a5fa', icon: '#93c5fd' }, // L2: Tap (Standard Blue)
                { bgTop: '#0369a1', bgBot: '#082f49', border: '#38bdf8', icon: '#7dd3fc' }, // L3: Filtered (Crisp Sky)
                { bgTop: '#0e7490', bgBot: '#083344', border: '#22d3ee', icon: '#a5f3fc' }, // L4: Soft (Bright Cyan Glow)
                { bgTop: '#312e81', bgBot: '#1e1b4b', border: '#818cf8', icon: '#c7d2fe' }  // L5: Hard (Deep Mineral Indigo)
            ],
            'Grain': [
                { bgTop: '#422006', bgBot: '#1c1917', border: '#fde047', icon: '#fef08a' }, // L1: Wheat Malt
                { bgTop: '#713f12', bgBot: '#271c19', border: '#facc15', icon: '#eab308' }, // L2: Maris Otter
                { bgTop: '#78350f', bgBot: '#291509', border: '#f59e0b', icon: '#d97706' }, // L3: Pilsen Malt
                { bgTop: '#7c2d12', bgBot: '#2a1208', border: '#fb923c', icon: '#b45309' }, // L4: Pale Malt
                { bgTop: '#451a03', bgBot: '#1c0a00', border: '#f97316', icon: '#9a3412' }  // L5: Brewers Malt
            ],
            'Adjunct': [
                { bgTop: '#334155', bgBot: '#0f172a', border: '#e2e8f0', icon: '#f8fafc' }, // L1: Flaked Rice
                { bgTop: '#713f12', bgBot: '#1c1917', border: '#fde047', icon: '#fde047' }, // L2: White Wheat
                { bgTop: '#7c2d12', bgBot: '#271206', border: '#fb923c', icon: '#f97316' }, // L3: Caramel 90L
                { bgTop: '#7f1d1d', bgBot: '#280909', border: '#f87171', icon: '#ef4444' }, // L4: Munich Malt
                { bgTop: '#271c19', bgBot: '#09090b', border: '#a8a29e', icon: '#78350f' }  // L5: Chocolate Malt
            ],
            'Yeast': [
                { bgTop: '#3f6212', bgBot: '#1a2e05', border: '#a3e635', icon: '#fde047' }, // L1: Saison
                { bgTop: '#7c2d12', bgBot: '#2a1205', border: '#fb923c', icon: '#f97316' }, // L2: Hornindal Kveik
                { bgTop: '#1e3a8a', bgBot: '#0f172a', border: '#38bdf8', icon: '#bae6fd' }, // L3: Kolsch
                { bgTop: '#14532d', bgBot: '#052e16', border: '#4ade80', icon: '#86efac' }, // L4: American Ale
                { bgTop: '#701a75', bgBot: '#2e1065', border: '#e879f9', icon: '#f0abfc' }  // L5: Lactobacillus
            ],
            'Hops': [
                { bgTop: '#14532d', bgBot: '#052e16', border: '#4ade80', icon: '#22c55e' }, // L1: Hallertau
                { bgTop: '#065f46', bgBot: '#022c22', border: '#34d399', icon: '#10b981' }, // L2: Tettnang
                { bgTop: '#3f6212', bgBot: '#1a2e05', border: '#facc15', icon: '#a3e635' }, // L3: Lemondrop
                { bgTop: '#15803d', bgBot: '#052e16', border: '#fbbf24', icon: '#4ade80' }, // L4: Citra
                { bgTop: '#365314', bgBot: '#14532d', border: '#fb923c', icon: '#84cc16' }  // L5: Mandarina Bavaria
            ]
        };

        const specialtyPalettes = {
            'Marshmallow': { bgTop: '#4c1d95', bgBot: '#1e1b4b', border: '#f8fafc', icon: '#ffffff' },
            'Mojito': { bgTop: '#065f46', bgBot: '#022c22', border: '#34d399', icon: '#6ee7b7' },
            'Raspberry Puree': { bgTop: '#881337', bgBot: '#4c0519', border: '#fb7185', icon: '#f43f5e' },
            'Lactose': { bgTop: '#1e3a8a', bgBot: '#0f172a', border: '#93c5fd', icon: '#f8fafc' },
            'Bitters': { bgTop: '#78350f', bgBot: '#271206', border: '#f59e0b', icon: '#fbbf24' },
            'Cherry Juice': { bgTop: '#7f1d1d', bgBot: '#450a0a', border: '#f87171', icon: '#ef4444' },
            'Lime': { bgTop: '#365314', bgBot: '#14532d', border: '#a3e635', icon: '#84cc16' },
            'Brandy': { bgTop: '#7c2d12', bgBot: '#2a1205', border: '#fb923c', icon: '#ea580c' },
            'Tequila': { bgTop: '#713f12', bgBot: '#1c1917', border: '#facc15', icon: '#fde047' },
            'Coffee': { bgTop: '#44403c', bgBot: '#1c1917', border: '#d6d3d1', icon: '#78350f' },
            'Oak Chips': { bgTop: '#78350f', bgBot: '#271c19', border: '#d97706', icon: '#b45309' },
            'Galaxy Hop': { bgTop: '#3b0764', bgBot: '#09090b', border: '#38bdf8', icon: '#a855f7' }
        };

        let pal = { bgTop: '#3f3f46', bgBot: '#18181b', border: '#a1a1aa', icon: '#e4e4e7' };
        if (level > 0 && tierPalettes[item.category]) {
            pal = tierPalettes[item.category][level - 1];
        } else if (item.category === 'Specialty' && specialtyPalettes[item.name]) {
            pal = specialtyPalettes[item.name];
        }

        // 3. Draw 3D Beveled Tile Base with Radial Lighting
        const grad = ctx.createRadialGradient(
            tx + (s / 2), ty + (s * 0.36), 4,
            tx + (s / 2), ty + (s / 2), s * 0.78
        );
        grad.addColorStop(0, pal.bgTop);
        grad.addColorStop(1, pal.bgBot);

        ctx.fillStyle = grad;
        ctx.strokeStyle = pal.border;
        ctx.lineWidth = isMini ? 2 : 2.5;
        ctx.beginPath();
        ctx.roundRect(tx, ty, s, s, isMini ? 6 : 10);
        ctx.fill();
        ctx.stroke();

        // Subtle inner top gloss highlight
        if (!isMini) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(tx + 2, ty + 2, s - 4, s - 4, 8);
            ctx.stroke();
        }

        // 4. Draw Level-Aware Custom Artwork
        const iconY = isMini ? ty + (s / 2) - 4 : ty + 34;
        const iconScale = isMini ? 0.65 : 1.0;
        this.drawCustomIcon(tx + (s / 2), iconY, item.category, item.name, pal.icon, iconScale, level || 1);

        // 5. Draw Tier Pips or Specialty Diamond Gem
        if (!isMini) {
            if (level > 0) {
                for (let i = 0; i < 5; i++) {
                    ctx.fillStyle = i < level ? pal.border : 'rgba(255, 255, 255, 0.16)';
                    ctx.beginPath();
                    ctx.arc(tx + 13 + (i * 9), ty + 9, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else {
                // Sparkling Diamond Gem in top-right corner for Specialties
                ctx.fillStyle = '#e0f2fe';
                ctx.strokeStyle = pal.border;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(tx + s - 12, ty + 5);
                ctx.lineTo(tx + s - 6, ty + 11);
                ctx.lineTo(tx + s - 12, ty + 17);
                ctx.lineTo(tx + s - 18, ty + 11);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
        }

        // 6. Clean Nameplate Pill at Bottom
        const bannerH = isMini ? 15 : 22;
        ctx.fillStyle = 'rgba(9, 9, 11, 0.84)';
        ctx.beginPath();
        ctx.roundRect(tx + 2, ty + s - bannerH - 2, s - 4, bannerH, isMini ? 4 : 6);
        ctx.fill();

        ctx.fillStyle = '#f4f4f5';
        ctx.textAlign = 'center';
        if (isMini) {
            ctx.font = 'bold 8px Inter';
            ctx.fillText(item.name.substring(0, 7), tx + (s / 2), ty + s - 6);
        } else {
            ctx.font = 'bold 9.5px Inter';
            const words = item.name.split(' ');
            if (words.length > 1) {
                ctx.fillText(words[0], tx + (s / 2), ty + s - 13);
                ctx.fillText(words.slice(1).join(' '), tx + (s / 2), ty + s - 4);
            } else {
                ctx.fillText(item.name, tx + (s / 2), ty + s - 8);
            }
        }
    }

    drawCustomIcon(cx, cy, category, name, color, scale = 1.0, level = 1) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // =========================================================================
        // 1. WATER: Evolves from Murky Lake Wave (L1) -> Pure Crystal Drop (L5)
        // =========================================================================
        if (category === 'Water') {
            if (level >= 4) {
                // Spring ripple rings at the base
                ctx.strokeStyle = 'rgba(165, 243, 252, 0.5)';
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.ellipse(0, 11, 15, 4.5, 0, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Main 3D Water Droplet
            const dGrad = ctx.createRadialGradient(-4, 0, 2, 0, 2, 16);
            dGrad.addColorStop(0, '#ffffff');
            dGrad.addColorStop(0.35, color);
            dGrad.addColorStop(1, level === 1 ? '#115e59' : '#0369a1');

            ctx.fillStyle = dGrad;
            ctx.strokeStyle = '#082f49';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, -16);
            ctx.bezierCurveTo(13, -1, 13, 13, 0, 13);
            ctx.bezierCurveTo(-13, 13, -13, -1, 0, -16);
            ctx.fill();
            ctx.stroke();

            // Glossy Specular Highlight
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.arc(-3.5, 3.5, 5, Math.PI * 0.65, Math.PI * 1.15);
            ctx.stroke();

            if (level === 1) {
                // Lake Winnebago floating duckweed/algae specks & wave crest
                ctx.fillStyle = '#4ade80';
                ctx.beginPath();
                ctx.arc(3, 5, 1.8, 0, Math.PI * 2);
                ctx.arc(-2, -2, 1.4, 0, Math.PI * 2);
                ctx.arc(4, -1, 1.2, 0, Math.PI * 2);
                ctx.fill();
            } else if (level === 3) {
                // Filtered Water: Crisp 4-point sparkle star
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.moveTo(10, -14); ctx.lineTo(11.5, -10.5); ctx.lineTo(15, -9);
                ctx.lineTo(11.5, -7.5); ctx.lineTo(10, -4); ctx.lineTo(8.5, -7.5);
                ctx.lineTo(5, -9); ctx.lineTo(8.5, -10.5);
                ctx.closePath();
                ctx.fill();
            } else if (level === 5) {
                // Hard Mineral Water: Faceted mineral crystal core inside drop
                ctx.strokeStyle = '#e0e7ff';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(0, -6);
                ctx.lineTo(5, 2);
                ctx.lineTo(0, 8);
                ctx.lineTo(-5, 2);
                ctx.closePath();
                ctx.stroke();
            }

            // =========================================================================
            // 2. GRAIN: Cinched Malt Sack (L1-L4) -> Roasted Malt Tun Barrel (L5)
            // =========================================================================
        } else if (category === 'Grain') {
            if (level === 5) {
                // Level 5 (Brewers Malt): Toasted Wooden Malt Cask with Gold Hoops
                const bGrad = ctx.createLinearGradient(-12, 0, 12, 0);
                bGrad.addColorStop(0, '#451a03');
                bGrad.addColorStop(0.5, '#9a3412');
                bGrad.addColorStop(1, '#451a03');
                ctx.fillStyle = bGrad;
                ctx.strokeStyle = '#1c1917';
                ctx.lineWidth = 2;

                ctx.beginPath();
                ctx.moveTo(-9, -13);
                ctx.lineTo(9, -13);
                ctx.quadraticCurveTo(15, 0, 9, 13);
                ctx.lineTo(-9, 13);
                ctx.quadraticCurveTo(-15, 0, -9, -13);
                ctx.fill();
                ctx.stroke();

                // Gold iron hoops
                ctx.strokeStyle = '#facc15';
                ctx.lineWidth = 2.5;
                [-7, 7].forEach(hy => {
                    ctx.beginPath();
                    ctx.moveTo(-11, hy);
                    ctx.quadraticCurveTo(0, hy + 2, 11, hy);
                    ctx.stroke();
                });

                // Glowing grain emblem in center
                ctx.fillStyle = '#fde047';
                ctx.beginPath();
                ctx.ellipse(0, 0, 3, 5.5, 0, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Levels 1-4: Plump Burlap Malt Sack
                const sGrad = ctx.createRadialGradient(-3, 2, 2, 0, 2, 16);
                sGrad.addColorStop(0, color);
                sGrad.addColorStop(1, '#451a03');

                ctx.fillStyle = sGrad;
                ctx.strokeStyle = '#1c1917';
                ctx.lineWidth = 2;

                // Ruffled sack neck & plump belly
                ctx.beginPath();
                ctx.moveTo(-6, -7);
                ctx.quadraticCurveTo(-12, -15, -4, -13);
                ctx.quadraticCurveTo(0, -16, 4, -13);
                ctx.quadraticCurveTo(12, -15, 6, -7);
                ctx.bezierCurveTo(15, -1, 15, 11, 10, 13);
                ctx.lineTo(-10, 13);
                ctx.bezierCurveTo(-15, 11, -15, -1, -6, -7);
                ctx.fill();
                ctx.stroke();

                // Golden Malt Kernels peeking out the top of the open sack (L3+)
                if (level >= 3) {
                    ctx.fillStyle = '#fde047';
                    [[-3, -9], [0, -10], [3, -9]].forEach(([gx, gy]) => {
                        ctx.beginPath();
                        ctx.arc(gx, gy, 2.2, 0, Math.PI * 2);
                        ctx.fill();
                    });
                }

                // Stitched burlap stripes indicating level (1 to 3 stripes)
                if (level >= 2) {
                    ctx.strokeStyle = 'rgba(28, 25, 23, 0.5)';
                    ctx.lineWidth = 1.6;
                    for (let b = 0; b < level - 1; b++) {
                        const by = 0 + (b * 4);
                        ctx.beginPath();
                        ctx.moveTo(-9, by);
                        ctx.quadraticCurveTo(0, by + 2, 9, by);
                        ctx.stroke();
                    }
                }

                // Hemp rope tie
                ctx.strokeStyle = '#fde68a';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(-7, -7);
                ctx.quadraticCurveTo(0, -5, 7, -7);
                ctx.stroke();
            }

            // =========================================================================
            // 3. ADJUNCT: Distinct Visuals for Rice, Wheat, Caramel, Munich & Chocolate!
            // =========================================================================
        } else if (category === 'Adjunct') {
            if (level === 1) {
                // L1 Flaked Rice: Fluffy White Rice Mound in a wooden bowl
                ctx.fillStyle = '#f8fafc';
                ctx.strokeStyle = '#94a3b8';
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.arc(0, 2, 11, Math.PI, 0);
                ctx.fill();
                ctx.stroke();

                // Dark Bowl Base
                ctx.fillStyle = '#475569';
                ctx.strokeStyle = '#0f172a';
                ctx.beginPath();
                ctx.arc(0, 1, 12, 0, Math.PI);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            } else if (level === 3) {
                // L3 Caramel 90L: Glossy Melting Caramel Cube
                ctx.fillStyle = '#ea580c';
                ctx.strokeStyle = '#431407';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.roundRect(-10, -10, 20, 20, 5);
                ctx.fill();
                ctx.stroke();

                // Creamy caramel top drizzle
                ctx.fillStyle = '#fdba74';
                ctx.beginPath();
                ctx.moveTo(-9, -8);
                ctx.lineTo(9, -8);
                ctx.lineTo(9, -1);
                ctx.quadraticCurveTo(5, 4, 3, -2);
                ctx.quadraticCurveTo(0, 6, -3, -1);
                ctx.quadraticCurveTo(-6, 3, -9, -2);
                ctx.closePath();
                ctx.fill();
            } else if (level === 5) {
                // L5 Chocolate Malt: Scored Dark Espresso Chocolate Bar
                ctx.save();
                ctx.rotate(-0.15);
                ctx.fillStyle = '#451a03';
                ctx.strokeStyle = '#1c1917';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.roundRect(-9, -12, 18, 24, 3);
                ctx.fill();
                ctx.stroke();

                // Chocolate squares
                ctx.fillStyle = '#78350f';
                [[-6, -9], [1, -9], [-6, -2], [1, -2], [-6, 5], [1, 5]].forEach(([cx, cy]) => {
                    ctx.fillRect(cx, cy, 5, 5);
                });
                ctx.restore();
            } else {
                // L2 (White Wheat) & L4 (Munich Malt): Botanical Wheat Ears
                const drawWheatEar = (ox, oy, rot, sScale) => {
                    ctx.save();
                    ctx.translate(ox, oy);
                    ctx.rotate(rot);
                    ctx.scale(sScale, sScale);

                    ctx.strokeStyle = '#78350f';
                    ctx.lineWidth = 2.2;
                    ctx.beginPath();
                    ctx.moveTo(0, 14);
                    ctx.lineTo(0, -12);
                    ctx.stroke();

                    for (let i = 0; i < 4; i++) {
                        const ky = 7 - (i * 4.5);
                        ctx.fillStyle = color;
                        ctx.strokeStyle = '#451a03';
                        ctx.lineWidth = 1.2;

                        // Left & Right Kernels
                        [-1, 1].forEach(dir => {
                            ctx.save();
                            ctx.translate(dir * 3.5, ky);
                            ctx.rotate(dir * 0.45);
                            ctx.beginPath();
                            ctx.ellipse(0, 0, 2.5, 4.6, 0, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.stroke();
                            ctx.restore();
                        });
                    }
                    ctx.restore();
                };

                if (level >= 4) {
                    drawWheatEar(-4, 1, -0.3, 0.88);
                    drawWheatEar(4, 1, 0.3, 0.88);
                } else {
                    drawWheatEar(0, 1, 0.25, 1.0);
                }
            }

            // =========================================================================
            // 4. YEAST: Erlenmeyer Starter Flask with Active Krausen Foam
            // =========================================================================
        } else if (category === 'Yeast') {
            // Liquid level rises with tier
            const fillTop = 7 - (level * 2);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(-6, fillTop);
            ctx.lineTo(6, fillTop);
            ctx.lineTo(12, 12);
            ctx.lineTo(-12, 12);
            ctx.closePath();
            ctx.fill();

            // Magnetic stir-plate pill at bottom of flask
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.roundRect(-4, 9, 8, 2.5, 1.2);
            ctx.fill();

            // Rising CO2 & Krausen Foam Bubbles (overflows top at L4-L5!)
            ctx.fillStyle = level === 5 ? '#f5d0fe' : '#ffffff';
            for (let b = 0; b < level + 2; b++) {
                const bx = ((b % 3) - 1) * 3.2;
                const by = fillTop - (b * 2.4);
                ctx.beginPath();
                ctx.arc(bx, by, 1.8 + (b % 2) * 0.8, 0, Math.PI * 2);
                ctx.fill();
            }

            // Glass Flask Body Outline
            ctx.strokeStyle = '#f8fafc';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(-4, -13);
            ctx.lineTo(4, -13);
            ctx.lineTo(4, -6);
            ctx.lineTo(12.5, 10);
            ctx.quadraticCurveTo(13.5, 13, 9.5, 13);
            ctx.lineTo(-9.5, 13);
            ctx.quadraticCurveTo(-13.5, 13, -12.5, 10);
            ctx.lineTo(-4, -6);
            ctx.closePath();
            ctx.stroke();

            // Scientific volume graduation ticks
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
            ctx.lineWidth = 1.2;
            [2, 6, 10].forEach(ty => {
                ctx.beginPath();
                ctx.moveTo(3, ty);
                ctx.lineTo(6, ty);
                ctx.stroke();
            });

            // =========================================================================
            // 5. HOPS: Crisp Overlapping Bracts + Glowing Golden Lupulin Glands
            // =========================================================================
        } else if (category === 'Hops') {
            // Level 4 (Citra) & Level 5 (Mandarina) get a glowing citrus halo behind the cone
            if (level >= 4) {
                ctx.strokeStyle = level === 5 ? 'rgba(251, 146, 60, 0.55)' : 'rgba(250, 204, 21, 0.45)';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.arc(0, 0, 14, 0, Math.PI * 2);
                ctx.stroke();
            }

            const drawBract = (px, py, rot) => {
                ctx.save();
                ctx.translate(px, py);
                ctx.rotate(rot);
                ctx.fillStyle = color;
                ctx.strokeStyle = '#052e16';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(0, -6);
                ctx.quadraticCurveTo(6.5, 0, 0, 7.5);
                ctx.quadraticCurveTo(-6.5, 0, 0, -6);
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            };

            // Stem
            ctx.strokeStyle = '#4ade80';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(0, -15);
            ctx.lineTo(0, -9);
            ctx.stroke();

            // Layered Hop Cone Scales (Bottom -> Middle -> Top)
            drawBract(-5, 5, 0.3);
            drawBract(5, 5, -0.3);
            drawBract(0, 7, 0);

            drawBract(-6.5, -1, 0.35);
            drawBract(6.5, -1, -0.35);
            drawBract(0, 1, 0);

            drawBract(-4.5, -7, 0.25);
            drawBract(4.5, -7, -0.25);
            drawBract(0, -6, 0);

            // Golden Lupulin Resin Drops on Level 3+
            if (level >= 3) {
                ctx.fillStyle = level === 5 ? '#fb923c' : '#fde047';
                ctx.beginPath();
                ctx.arc(-3, 2, 1.7, 0, Math.PI * 2);
                ctx.arc(3, 2, 1.7, 0, Math.PI * 2);
                ctx.arc(0, -3, 1.9, 0, Math.PI * 2);
                if (level >= 4) {
                    ctx.arc(-5, -4, 1.5, 0, Math.PI * 2);
                    ctx.arc(5, -4, 1.5, 0, Math.PI * 2);
                }
                ctx.fill();
            }

            // =========================================================================
            // 6. SPECIALTY INGREDIENTS: 12 Hand-Crafted Silhouettes
            // =========================================================================
        } else if (category === 'Specialty') {
            switch (name) {
                case 'Marshmallow':
                    // Roasting Skewer Stick
                    ctx.strokeStyle = '#a16207';
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    ctx.moveTo(-12, 12);
                    ctx.lineTo(12, -12);
                    ctx.stroke();

                    // Plump Puffy Cylinder
                    ctx.fillStyle = '#ffffff';
                    ctx.strokeStyle = '#cbd5e1';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.roundRect(-9, -7, 18, 17, 4);
                    ctx.fill();
                    ctx.stroke();

                    // Golden-Brown Toasted Cap (NOT Burnt!)
                    ctx.fillStyle = '#d97706';
                    ctx.beginPath();
                    ctx.ellipse(0, -7, 9, 3.8, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    break;

                case 'Mojito':
                    // Cocktail Straw
                    ctx.strokeStyle = '#f43f5e';
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    ctx.moveTo(2, 4);
                    ctx.lineTo(8, -14);
                    ctx.stroke();

                    // Highball Glass with Muddled Mint & Lime
                    ctx.fillStyle = 'rgba(52, 211, 153, 0.5)';
                    ctx.strokeStyle = '#ecfdf5';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.roundRect(-8, -8, 16, 20, 3);
                    ctx.fill();
                    ctx.stroke();

                    // Vibrant Mint Leaves on Rim
                    ctx.fillStyle = '#10b981';
                    ctx.beginPath();
                    ctx.ellipse(-5, -8, 5, 2.8, -0.4, 0, Math.PI * 2);
                    ctx.ellipse(1, -9, 5, 2.8, 0.4, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case 'Raspberry Puree':
                    // Rich Drupelet Berry Cluster with Glossy Highlights
                    ctx.fillStyle = '#f43f5e';
                    ctx.strokeStyle = '#881337';
                    ctx.lineWidth = 1.2;
                    const drupes = [
                        [-4, -5], [0, -5], [4, -5],
                        [-6, 0], [-2, 0], [2, 0], [6, 0],
                        [-4, 5], [0, 5], [4, 5],
                        [-2, 9], [2, 9]
                    ];
                    drupes.forEach(([dx, dy]) => {
                        ctx.beginPath();
                        ctx.arc(dx, dy, 3.2, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.stroke();
                    });
                    // Leafy Crown
                    ctx.fillStyle = '#4ade80';
                    ctx.beginPath();
                    ctx.moveTo(0, -6);
                    ctx.lineTo(-7, -12);
                    ctx.lineTo(0, -10);
                    ctx.lineTo(7, -12);
                    ctx.closePath();
                    ctx.fill();
                    break;

                case 'Lactose':
                    // Glass Milk Bottle with Blue Label Stripe & Foil Cap
                    ctx.fillStyle = '#f8fafc';
                    ctx.strokeStyle = '#93c5fd';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(-4, -13);
                    ctx.lineTo(4, -13);
                    ctx.lineTo(5, -7);
                    ctx.lineTo(9, -2);
                    ctx.lineTo(9, 12);
                    ctx.lineTo(-9, 12);
                    ctx.lineTo(-9, -2);
                    ctx.lineTo(-5, -7);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();

                    // Blue Creamery Stripe & Cap
                    ctx.fillStyle = '#3b82f6';
                    ctx.fillRect(-8, 1, 16, 5);
                    ctx.fillRect(-5, -14, 10, 3);
                    break;

                case 'Bitters':
                    // Classic Apothecary Dasher Bottle with Oversized Paper Label
                    ctx.fillStyle = '#78350f';
                    ctx.strokeStyle = '#fde68a';
                    ctx.lineWidth = 1.8;
                    ctx.beginPath();
                    ctx.roundRect(-7, -2, 14, 15, 3);
                    ctx.fill();
                    ctx.stroke();

                    // Oversized white Angostura-style collar label
                    ctx.fillStyle = '#fef3c7';
                    ctx.fillRect(-6, 1, 12, 8);
                    ctx.strokeStyle = '#dc2626';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(-5, 2, 10, 6);

                    // Metal Dasher Spout
                    ctx.fillStyle = '#cbd5e1';
                    ctx.beginPath();
                    ctx.moveTo(-3, -2);
                    ctx.lineTo(3, -2);
                    ctx.lineTo(1.5, -13);
                    ctx.lineTo(-1.5, -13);
                    ctx.closePath();
                    ctx.fill();
                    break;

                case 'Cherry Juice':
                    // Stems & Leaf
                    ctx.strokeStyle = '#4ade80';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(-6, 5);
                    ctx.quadraticCurveTo(-4, -8, 1, -12);
                    ctx.moveTo(6, 6);
                    ctx.quadraticCurveTo(4, -6, 1, -12);
                    ctx.stroke();

                    // Glossy Twin Cherries
                    [[-6, 6], [6, 7]].forEach(([cx, cy]) => {
                        ctx.fillStyle = '#dc2626';
                        ctx.strokeStyle = '#450a0a';
                        ctx.lineWidth = 1.8;
                        ctx.beginPath();
                        ctx.arc(cx, cy, 5.5, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.stroke();

                        ctx.fillStyle = '#ffffff';
                        ctx.beginPath();
                        ctx.arc(cx - 2, cy - 2, 1.5, 0, Math.PI * 2);
                        ctx.fill();
                    });
                    break;

                case 'Lime':
                    // Fresh Citrus Wheel with Pulp Wedges
                    ctx.fillStyle = '#65a30d';
                    ctx.strokeStyle = '#bef264';
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    ctx.arc(0, 0, 11, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();

                    ctx.strokeStyle = '#ecfccb';
                    ctx.lineWidth = 1.5;
                    for (let a = 0; a < 3; a++) {
                        const ang = (a * Math.PI) / 3;
                        ctx.beginPath();
                        ctx.moveTo(Math.cos(ang) * -9, Math.sin(ang) * -9);
                        ctx.lineTo(Math.cos(ang) * 9, Math.sin(ang) * 9);
                        ctx.stroke();
                    }
                    break;

                case 'Brandy':
                    // Warm Amber Pour inside Tulip Snifter
                    ctx.fillStyle = '#ea580c';
                    ctx.beginPath();
                    ctx.arc(0, -1, 8.5, 0.1 * Math.PI, 0.9 * Math.PI);
                    ctx.fill();

                    // Crystal Snifter Bowl & Stem
                    ctx.strokeStyle = '#fed7aa';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(-6, -11);
                    ctx.bezierCurveTo(-13, 2, -8, 7, 0, 7);
                    ctx.bezierCurveTo(8, 7, 13, 2, 6, -11);
                    ctx.moveTo(0, 7);
                    ctx.lineTo(0, 12);
                    ctx.moveTo(-6, 12);
                    ctx.lineTo(6, 12);
                    ctx.stroke();
                    break;

                case 'Tequila':
                    // Spiky Blue Agave Crown + Golden Piña Core
                    ctx.fillStyle = '#2dd4bf';
                    ctx.strokeStyle = '#115e59';
                    ctx.lineWidth = 1.2;
                    [-0.95, -0.5, 0, 0.5, 0.95].forEach(a => {
                        ctx.save();
                        ctx.rotate(a);
                        ctx.beginPath();
                        ctx.moveTo(-3, 6);
                        ctx.lineTo(0, -14);
                        ctx.lineTo(3, 6);
                        ctx.closePath();
                        ctx.fill();
                        ctx.stroke();
                        ctx.restore();
                    });

                    // Roasted Golden Piña Heart
                    ctx.fillStyle = '#eab308';
                    ctx.strokeStyle = '#713f12';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.arc(0, 7, 6, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    break;

                case 'Coffee':
                    // Steaming Ceramic Espresso Cup with Roasted Bean Emblem
                    ctx.strokeStyle = '#d6d3d1';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(7, 2, 4, -Math.PI / 2, Math.PI / 2);
                    ctx.stroke();

                    ctx.fillStyle = '#44403c';
                    ctx.strokeStyle = '#f5f5f4';
                    ctx.beginPath();
                    ctx.roundRect(-8, -4, 15, 14, [2, 2, 6, 6]);
                    ctx.fill();
                    ctx.stroke();

                    // Rising Steam Wisps
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
                    ctx.lineWidth = 1.5;
                    [-3, 2].forEach(sx => {
                        ctx.beginPath();
                        ctx.moveTo(sx, -7);
                        ctx.quadraticCurveTo(sx - 2, -10, sx, -13);
                        ctx.stroke();
                    });

                    // Mini Coffee Bean on Mug
                    ctx.fillStyle = '#a8a29e';
                    ctx.beginPath();
                    ctx.ellipse(-0.5, 3, 2.5, 3.8, 0, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case 'Oak Chips':
                    // Crossed Charred Bourbon Barrel Staves with Woodgrain
                    [[-0.25, '#9a3412'], [0.3, '#d97706']].forEach(([rot, col]) => {
                        ctx.save();
                        ctx.rotate(rot);
                        ctx.fillStyle = col;
                        ctx.strokeStyle = '#271206';
                        ctx.lineWidth = 1.8;
                        ctx.beginPath();
                        ctx.roundRect(-10, -4, 20, 8, 2);
                        ctx.fill();
                        ctx.stroke();

                        // Woodgrain line
                        ctx.strokeStyle = 'rgba(39, 18, 6, 0.45)';
                        ctx.lineWidth = 1.2;
                        ctx.beginPath();
                        ctx.moveTo(-7, 0);
                        ctx.lineTo(7, 0);
                        ctx.stroke();
                        ctx.restore();
                    });
                    break;

                default:
                    // Galaxy Hop / Cosmic Specialty: Orbiting Star Ring + Purple Cone
                    ctx.strokeStyle = '#38bdf8';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.ellipse(0, 0, 14, 5, -0.4, 0, Math.PI * 2);
                    ctx.stroke();

                    ctx.fillStyle = '#c084fc';
                    ctx.strokeStyle = '#3b0764';
                    ctx.lineWidth = 1.8;
                    ctx.beginPath();
                    ctx.arc(0, 0, 7, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    break;
            }
        }
        ctx.restore();
    }

    drawItem(item, x, y, size) {
        this.drawIngredientTile(x, y, size, item);
    }
}