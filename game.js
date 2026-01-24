class Game {
    constructor() {
        this.taps = [];
        this.activeCharIdx = 0;
        this.activePoseIdx = 0;
        this.activeStationIdx = 0;
        this.activePaddleIdx = 0;
        this.activeSlotIdx = 0;
        this.labMode = 'customer'; 
        this.editTarget = 'paddle'; 
        this.selectedObject = null;
        this.showGhostDrink = false;

        CONFIG.Stations.forEach((xRatio, i) => {
            this.taps.push(new TapStation(i, xRatio, SPRITE_DATA.taps[i]));
        });
        
        window.addEventListener('resize', () => this.resize());
        this.resize();
        this.initInput();
    }

    resize() {
        canvas.width = window.innerWidth; canvas.height = window.innerHeight;
        const scaleX = canvas.width / WORLD.w; const scaleY = canvas.height / WORLD.h;
        screenScale = Math.min(scaleX, scaleY);
        screenOffset.x = (canvas.width - WORLD.w * screenScale) / 2;
        screenOffset.y = (canvas.height - WORLD.h * screenScale) / 2;
    }

    initInput() {
        const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            const rawX = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
            const rawY = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
            return { x: (rawX - screenOffset.x) / screenScale, y: (rawY - screenOffset.y) / screenScale };
        };

        canvas.addEventListener('mousedown', (e) => {
            const pos = getPos(e);
            
            // Toggle Logic: Click Top Left HUD to switch Target
            if (pos.y < 150 && pos.x < 350) {
                 this.editTarget = this.editTarget === 'paddle' ? 'drink' : 'paddle';
                 if (this.editTarget === 'drink') this.showGhostDrink = true;
                 return;
            }

            if (this.labMode === 'customer') {
                const p = SPRITE_DATA.customers[this.activeCharIdx].poses[this.activePoseIdx];
                if (Math.abs(pos.x - p.x) < 150 && Math.abs(pos.y - p.y + 200) < 400) this.selectedObject = p;
            } else if (this.labMode === 'spill') {
                this.selectedObject = SPRITE_DATA.spills[this.activeStationIdx];
            } else if (this.labMode === 'paddle') {
                const p = SPRITE_DATA.paddles[this.activePaddleIdx];
                this.selectedObject = (this.editTarget === 'paddle') ? p : SPRITE_DATA.paddleDrinks[this.activePaddleIdx][p.sizeIdx][this.activeSlotIdx];
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.selectedObject) return;
            const pos = getPos(e);
            if (this.labMode === 'customer') {
                this.selectedObject.x = Math.round(pos.x);
                this.selectedObject.y = Math.round(pos.y);
            } else if (this.labMode === 'spill') {
                const worldX = WORLD.w * CONFIG.Stations[this.activeStationIdx];
                this.selectedObject.x = Math.round(pos.x - worldX);
                this.selectedObject.y = Math.round(pos.y - CONFIG.TapY);
            } else if (this.labMode === 'paddle') {
                const p = SPRITE_DATA.paddles[this.activePaddleIdx];
                const stationIdx = p.owner === 'judge' ? 1 : 2;
                const worldX = WORLD.w * CONFIG.Stations[stationIdx];
                if (this.editTarget === 'drink') {
                    // Position relative to the paddle center
                    this.selectedObject.x = Math.round(pos.x - (worldX + p.x));
                    this.selectedObject.y = Math.round(pos.y - (CONFIG.TapY + p.y));
                } else {
                    this.selectedObject.x = Math.round(pos.x - worldX);
                    this.selectedObject.y = Math.round(pos.y - CONFIG.TapY);
                }
            }
        });

        window.addEventListener('mouseup', () => { this.selectedObject = null; });

        window.addEventListener('keydown', (e) => {
            const currentPaddle = SPRITE_DATA.paddles[this.activePaddleIdx];
            let p = this.labMode === 'customer' ? SPRITE_DATA.customers[this.activeCharIdx].poses[this.activePoseIdx] : (this.labMode === 'spill' ? SPRITE_DATA.spills[this.activeStationIdx] : (this.editTarget === 'paddle' ? currentPaddle : SPRITE_DATA.paddleDrinks[this.activePaddleIdx][currentPaddle.sizeIdx][this.activeSlotIdx]));

            if (e.key === '6') this.labMode = 'spill';
            if (e.key === '7') this.labMode = 'paddle';
            if (e.key === '8') this.labMode = 'customer';
            
            if (this.labMode === 'paddle') {
                if (['1','2','3','4','5'].includes(e.key)) {
                    const slot = parseInt(e.key) - 1;
                    if (slot < currentPaddle.sizeIdx + 2) this.activeSlotIdx = slot;
                }
                if (e.key === 'v') { 
                    currentPaddle.sizeIdx = (currentPaddle.sizeIdx + 1) % 4;
                    this.activeSlotIdx = 0; 
                }
                if (e.key === 'g') this.showGhostDrink = !this.showGhostDrink;
            } else if (this.labMode === 'customer') {
                if (e.key === '1') this.activePoseIdx = 0;
                if (e.key === '2') this.activePoseIdx = 1;
                if (e.key === '3') this.activePoseIdx = 2;
            }

            if (e.key === 'Tab') { 
                e.preventDefault(); 
                if (this.labMode === 'customer') this.activeCharIdx = (this.activeCharIdx + 1) % SPRITE_DATA.customers.length;
                else if (this.labMode === 'spill') this.activeStationIdx = (this.activeStationIdx + 1) % 3;
                else this.activePaddleIdx = (this.activePaddleIdx + 1) % 2;
            }

            if (p) {
                if (e.key === 'ArrowUp') p.s += 0.01;
                if (e.key === 'ArrowDown') p.s -= 0.01;
                // Clip adjustments for paddles/spills/customers
                if (p.clip && (this.editTarget === 'paddle' || this.labMode !== 'paddle')) {
                    if (e.key === 'q') p.clip.sx++; if (e.key === 'a') p.clip.sx--;
                    if (e.key === 'w') p.clip.sw--; if (e.key === 's') p.clip.sw++;
                    if (e.key === 'e') p.clip.sy++; if (e.key === 'd') p.clip.sy--;
                    if (e.key === 'r') p.clip.sh--; if (e.key === 'f') p.clip.sh++;
                }
            }
        });
    }

    draw() {
        ctx.fillStyle = "#000"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(screenOffset.x, screenOffset.y);
        ctx.scale(screenScale, screenScale);
        if (assets.bg) ctx.drawImage(assets.bg, 0, 0, WORLD.w, WORLD.h);
        
        // Character
        const cData = SPRITE_DATA.customers[this.activeCharIdx];
        const pData = cData.poses[this.activePoseIdx];
        if (assets[cData.id]) {
            const img = assets[cData.id];
            const fW = img.width / 3; const fH = img.height;
            const dW = fW * pData.s; const dH = fH * pData.s;
            ctx.drawImage(img, (this.activePoseIdx * fW) + pData.clip.sx, pData.clip.sy, fW + pData.clip.sw, fH + pData.clip.sh, pData.x - dW/2, pData.y - dH, dW, dH);
        }

        this.taps.forEach(t => t.draw());

        // Spills
        if (this.labMode === 'spill') {
            const s = SPRITE_DATA.spills[this.activeStationIdx];
            const worldX = WORLD.w * CONFIG.Stations[this.activeStationIdx];
            if (assets.spill) {
                const dW = assets.spill.width * s.s; const dH = assets.spill.height * s.s;
                ctx.drawImage(assets.spill, s.clip.sx, s.clip.sy, assets.spill.width + s.clip.sw, assets.spill.height + s.clip.sh, (worldX + s.x) - dW/2, (CONFIG.TapY + s.y) - dH, dW, dH);
            }
        }

        // Paddles
        if (this.labMode === 'paddle') {
            const p = SPRITE_DATA.paddles[this.activePaddleIdx];
            const stationIdx = p.owner === 'judge' ? 1 : 2;
            const worldX = WORLD.w * CONFIG.Stations[stationIdx];
            if (assets.paddles) {
                const img = assets.paddles;
                const fH = img.height / 4; 
                const dW = img.width * p.s; const dH = fH * p.s;
                ctx.drawImage(img, p.clip.sx, (p.sizeIdx * fH) + p.clip.sy, img.width + p.clip.sw, fH + p.clip.sh, (worldX + p.x) - dW/2, (CONFIG.TapY + p.y) - dH, dW, dH);
            }
            if (this.showGhostDrink) {
                const currentSlots = SPRITE_DATA.paddleDrinks[this.activePaddleIdx][p.sizeIdx];
                // Show a variety of drinks so you can see different shapes
                const ghostTypes = ['full', 'half', 'mix_from_1', 'mix_from_2', 'empty'];
                currentSlots.forEach((d, i) => {
                    ctx.globalAlpha = (this.editTarget === 'drink' && i === this.activeSlotIdx) ? 1.0 : 0.4;
                    this.drawPaddleDrink(ghostTypes[i % ghostTypes.length], stationIdx, worldX + p.x + d.x, CONFIG.TapY + p.y + d.y, d.s);
                });
                ctx.globalAlpha = 1.0;
            }
        }

        // HUD
        ctx.fillStyle = "rgba(0,0,0,0.85)";
        ctx.fillRect(10, 10, 650, 310);
        ctx.fillStyle = "#0f0";
        ctx.font = "16px monospace";
        ctx.fillText(`🛠 LAB MODE: ${this.labMode.toUpperCase()}`, 20, 40);
        
        let cur = null;
        if (this.labMode === 'customer') {
            cur = pData;
            ctx.fillText(`CHAR: ${cData.name} (Pose ${this.activePoseIdx+1})`, 20, 70);
        } else if (this.labMode === 'spill') {
            cur = SPRITE_DATA.spills[this.activeStationIdx];
            ctx.fillText(`SPILL: Tap ${this.activeStationIdx}`, 20, 70);
        } else {
            cur = this.editTarget === 'paddle' ? SPRITE_DATA.paddles[this.activePaddleIdx] : SPRITE_DATA.paddleDrinks[this.activePaddleIdx][SPRITE_DATA.paddles[this.activePaddleIdx].sizeIdx][this.activeSlotIdx];
            ctx.fillStyle = "#ff0";
            ctx.fillText(`EDITING: ${this.editTarget.toUpperCase()} (Click Top HUD to toggle)`, 20, 70);
            ctx.fillStyle = "#0f0";
            ctx.fillText(`BEERS: ${SPRITE_DATA.paddles[this.activePaddleIdx].sizeIdx + 2} | ACTIVE SLOT: ${this.activeSlotIdx + 1}`, 20, 100);
            ctx.fillText(`G: Toggle Ghost | V: Cycle Row | TAB: Toggle Judge/VIP`, 20, 130);
        }

        if (cur) {
            ctx.fillText(`HUD COORDS - X:${cur.x} Y:${cur.y} SCALE:${cur.s.toFixed(2)}`, 20, 160);
            if (cur.clip) ctx.fillText(`CLIP: L:${cur.clip.sx} R:${cur.clip.sw} T:${cur.clip.sy} B:${cur.clip.sh}`, 20, 190);
        }
        ctx.restore();
    }

    drawPaddleDrink(stage, station, x, y, drinkScale) {
        const data = SPRITE_DATA.glasses[station][stage];
        const def = SPRITE_DATA.glassDefaults;
        let img, cols, frameIdx;
        switch(stage) {
            case 'empty': img = assets.empty; cols = 4; frameIdx = 0; break;
            case 'half': img = assets.half; cols = 3; frameIdx = station; break;
            case 'mix_from_1': img = assets.mix; cols = 3; frameIdx = (station === 0) ? 1 : (station === 1 ? 2 : -1); break;
            case 'mix_from_2': img = assets.mix; cols = 3; frameIdx = (station === 0) ? 0 : -1; break;
            case 'full': img = assets.full; cols = 4; frameIdx = station + 1; break;
        }
        if (img && frameIdx !== -1) {
            const fW = img.width / cols;
            const drawW = def.w * def.scale * data.s * drinkScale;
            const drawH = drawW * (img.height / fW);
            ctx.drawImage(img, (frameIdx * fW) + def.clip.sx, 0, fW + def.clip.sw, img.height, x - drawW/2, y - drawH, drawW, drawH);
        }
    }
}
