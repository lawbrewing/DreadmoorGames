// --- Update SPRITE_DATA ---
SPRITE_DATA.hud = {
    activeFrame: 0,
    notifications: [
        { x: 960, y: 150, s: 0.8, textX: 0, textY: 0 },
        { x: 960, y: 150, s: 0.8, textX: 0, textY: 0 },
        { x: 960, y: 150, s: 0.8, textX: 0, textY: 0 },
        { x: 960, y: 150, s: 0.8, textX: 0, textY: 0 }
    ],
    // New persistent UI elements
    score: { x: 50, y: 50, s: 1.0 },
    lives: { x: 50, y: 100, s: 1.0 },
    orderOutput: { x: 960, y: 1000, s: 1.0 } // Where the "Now Pouring" text goes
};

// --- Add this helper method inside the Game class ---
drawClipped(asset, frameIdx, cols, rows, x, y, scale) {
    if (!asset) return;
    const fw = asset.width / cols;
    const fh = asset.height / rows;
    const sx = (frameIdx % cols) * fw;
    const sy = Math.floor(frameIdx / cols) * fh;
    const dw = fw * scale;
    const dh = fh * scale;
    ctx.drawImage(asset, sx, sy, fw, fh, x - dw / 2, y - dh / 2, dw, dh);
}

// --- Update Game.draw() logic ---
draw() {
    // ... previous BG/Customer/Tap drawing ...

    // 1. Draw In-Game HUD (Always visible or in Mode 0/9)
    this.drawInGameHUD();

    if (this.labMode === 'hud') {
        const frameIdx = SPRITE_DATA.hud.activeFrame;
        const n = SPRITE_DATA.hud.notifications[frameIdx];
        
        // Use the new helper for the 2x2 notification
        this.drawClipped(assets.notification, frameIdx, 2, 2, n.x, n.y, n.s);
        
        ctx.fillStyle = "#fff";
        ctx.font = `${Math.round(24 * n.s)}px monospace`;
        ctx.textAlign = "center";
        ctx.fillText("ORDER: 3x STOUT", n.x + n.textX, n.y + n.textY);
    }
}

drawInGameHUD() {
    const h = SPRITE_DATA.hud;
    
    // Example: Drawing Score using the numbers sheet
    // We'll draw "0000" as a placeholder
    for(let i = 0; i < 4; i++) {
        const charW = (assets.numbers.width / 11) * h.score.s;
        this.drawClipped(assets.numbers, 0, 11, 1, h.score.x + (i * charW), h.score.y, h.score.s);
    }

    // Example: Drawing Lives (using the icon at index 10 of the numbers sheet)
    for(let i = 0; i < 3; i++) {
        const iconW = (assets.numbers.width / 11) * h.lives.s;
        this.drawClipped(assets.numbers, 10, 11, 1, h.lives.x + (i * iconW), h.lives.y, h.lives.s);
    }

    // Order Here / Pouring Output
    ctx.fillStyle = "#0f0";
    ctx.font = "bold 20px monospace";
    ctx.textAlign = "center";
    ctx.fillText("NOW POURING: LAGER", h.orderOutput.x, h.orderOutput.y);
}

// --- Update Game.initInput mousedown for the new targets ---
// In '0' mode, you can select 'score', 'lives', or 'orderOutput' to position them.
