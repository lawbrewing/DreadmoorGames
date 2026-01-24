// --- Update in SPRITE_DATA ---
hud: {
    bubble: { x: 0, y: -450, s: 0.5, iconX: 0, iconY: -70, iconS: 0.8, typeIdx: 0 }, // typeIdx 0=Sm, 1=Med, 2=Lg
    notification: { x: 0, y: 350, s: 0.6 }
},

// --- Update inside Game Class (KeyDown) ---
if (this.labMode === 'hud' && e.key === 'b') {
    SPRITE_DATA.hud.bubble.typeIdx = (SPRITE_DATA.hud.bubble.typeIdx + 1) % 3;
}

// --- Update inside Game Class (Draw) ---
if (this.labMode === 'hud') {
    const char = cData.poses[0];
    const b = SPRITE_DATA.hud.bubble;
    
    if (this.activeHudIdx === 0 && assets.bubbles) {
        // Calculate frame (3 bubbles on the sheet)
        const frameW = assets.bubbles.width / 3;
        const frameH = assets.bubbles.height;
        const dW = frameW * b.s;
        const dH = frameH * b.s;
        const bX = char.x + b.x;
        const bY = char.y + b.y;

        // Draw clipped bubble
        ctx.drawImage(assets.bubbles, 
            b.typeIdx * frameW, 0, frameW, frameH, // Source
            bX - dW/2, bY - dH, dW, dH              // Destination
        );

        // Draw Icon inside
        if (assets.numbers) {
            const iFrameW = assets.numbers.width / 11;
            const iW = iFrameW * b.iconS;
            const iH = assets.numbers.height * b.iconS;
            // Using index 10 (last icon) as the guide
            ctx.drawImage(assets.numbers, 
                10 * iFrameW, 0, iFrameW, assets.numbers.height, 
                bX + b.iconX - iW/2, bY + b.iconY - iH, iW, iH
            );
        }
    } else if (this.activeHudIdx === 1 && assets.notification) {
        const n = SPRITE_DATA.hud.notification;
        const dW = assets.notification.width * n.s;
        const dH = assets.notification.height * n.s;
        ctx.drawImage(assets.notification, char.x + n.x - dW/2, char.y + n.y - dH, dW, dH);
    }
}
