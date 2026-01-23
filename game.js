class TapStation {
    constructor(index, xRatio, calibration) {
        this.index = index;
        this.x = canvas.width * xRatio;
        this.y = CONFIG.TapY;
        this.cal = calibration;
        this.pulled = false;
        this.pullTimer = 0;
    }

    pull() {
        this.pulled = true;
        this.pullTimer = 20; // Slightly longer to see the rotation
    }

    update() {
        if (this.pulled) {
            this.pullTimer--;
            if (this.pullTimer <= 0) this.pulled = false;
        }
    }

    draw() {
        this.y = CONFIG.TapY;
        // 1. Tower
        if (assets.tower) {
            const frameW = assets.tower.width / 3;
            const drawW = SPRITE_DATA.tower.h * (frameW / assets.tower.height);
            ctx.drawImage(assets.tower, this.index * frameW, 0, frameW, assets.tower.height, this.x - (drawW/2), this.y, drawW, SPRITE_DATA.tower.h);
        }

        // 2. Handle with Smart Rotation & Calibration
        if (assets.taps) {
            const frameW = assets.taps.width / 3;
            const frameH = assets.taps.height / 2;
            const drawW = this.cal.h * (frameW / frameH);
            const drawH = this.cal.h;
            const rowOffset = this.pulled ? frameH : 0;
            
            ctx.save();
            // Translate to the calibrated position
            ctx.translate(this.x + this.cal.offsetX, this.y + this.cal.offsetY);

            // APPLY ROTATION IF PULLED
            if (this.pulled) {
                if (this.index === 0) ctx.rotate(-Math.PI / 2); // Left: -90°
                if (this.index === 1) ctx.rotate(Math.PI);      // Middle: 180°
                if (this.index === 2) ctx.rotate(Math.PI / 2);  // Right: 90°
            }

            // Draw centered on pivot
            ctx.drawImage(
                assets.taps,
                this.index * frameW, rowOffset, frameW, frameH, 
                -drawW / 2, -drawH / 2, drawW, drawH
            );
            
            // Visual feedback for calibration selection
            if (game.selectedItem && game.selectedItem.obj === this) {
                ctx.strokeStyle = "#0f0";
                ctx.strokeRect(-drawW/2, -drawH/2, drawW, drawH);
            }

            ctx.restore();
        }
    }
}
