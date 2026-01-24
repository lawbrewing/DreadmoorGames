// --- Update SPRITE_DATA ---
SPRITE_DATA.hud_elements = {
    score: { x: 1650, y: 80, s: 1.0 },
    lives: { x: 80, y: 80, s: 1.0, spacing: 60 },
    gameOver: { x: 960, y: 540, s: 1.0, visible: false }
};

// --- Updated Game Methods ---

class Game {
    // ... previous constructor code ...

    // NEW: Hand-drawn Beer Mug for Lives
    drawBeerLife(x, y, scale, isDead) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        
        // Glass Outline
        ctx.lineWidth = 4;
        ctx.strokeStyle = isDead ? "#333" : "#4a2c0a";
        ctx.fillStyle = isDead ? "rgba(50,50,50,0.5)" : "#f5c400"; // Full amber or empty grey
        
        ctx.beginPath();
        ctx.moveTo(-15, 20); ctx.lineTo(15, 20); 
        ctx.lineTo(12, -20); ctx.lineTo(-12, -20);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        if (!isDead) {
            // Foam top
            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.arc(-10, -22, 8, 0, Math.PI * 2);
            ctx.arc(0, -25, 10, 0, Math.PI * 2);
            ctx.arc(10, -22, 8, 0, Math.PI * 2);
            ctx.fill();
        }

        // Handle
        ctx.beginPath();
        ctx.arc(15, 0, 8, -Math.PI/2, Math.PI/2);
        ctx.stroke();
        ctx.restore();
    }

    drawHUD() {
        const h = SPRITE_DATA.hud_elements;

        // 1. Draw Score (Clean Medieval Text)
        ctx.save();
        ctx.textAlign = "right";
        ctx.font = `bold ${Math.round(60 * h.score.s)}px "MedievalSharp"`;
        // Outer Glow for readability
        ctx.shadowColor = "black"; ctx.shadowBlur = 10;
        ctx.fillStyle = "#ffcc00"; // Gold
        ctx.fillText(`GOLD: ${this.score}`, h.score.x, h.score.y);
        ctx.restore();

        // 2. Draw Lives
        for (let i = 0; i < 3; i++) {
            const isDead = i >= this.lives;
            this.drawBeerLife(h.lives.x + (i * h.lives.spacing), h.lives.y, h.lives.s, isDead);
        }

        // 3. Draw Game Over Sign (Bottom half of your hud.png)
        if (h.gameOver.visible && assets.hud_sheet) {
            const sh = assets.hud_sheet.height / 2;
            const dw = assets.hud_sheet.width * h.gameOver.s;
            const dh = sh * h.gameOver.s;
            ctx.drawImage(assets.hud_sheet, 0, sh, assets.hud_sheet.width, sh, h.gameOver.x - dw/2, h.gameOver.y - dh/2, dw, dh);
        }
    }

    initInput() {
        // ... previous listener setup ...
        window.addEventListener('keydown', (e) => {
            if (e.key === '4') { this.labMode = 'hud_main'; this.editTarget = 'score'; }
            if (this.labMode === 'hud_main') {
                if (e.key === 'q') this.editTarget = 'score';
                if (e.key === 'w') this.editTarget = 'lives';
                if (e.key === 'e') {
                    this.editTarget = 'gameOver';
                    SPRITE_DATA.hud_elements.gameOver.visible = true;
                }
                
                // Arrows move and scale
                if (e.key === 'ArrowUp') SPRITE_DATA.hud_elements[this.editTarget].s += 0.05;
                if (e.key === 'ArrowDown') SPRITE_DATA.hud_elements[this.editTarget].s -= 0.05;
            }
        });
    }

    draw() {
        // ... background/customer drawing ...

        this.drawHUD();

        // Lab readout
        if (this.labMode === 'hud_main') {
            const el = SPRITE_DATA.hud_elements[this.editTarget];
            ctx.fillStyle = "rgba(0,255,0,0.3)";
            ctx.fillRect(el.x - 20, el.y - 20, 40, 40); // Target marker

            ctx.fillStyle = "rgba(0,0,0,0.8)"; ctx.fillRect(10,10,550,180);
            ctx.fillStyle = "#0f0"; ctx.font = "20px monospace";
            ctx.fillText(`HUD LAB | EDIT: ${this.editTarget.toUpperCase()}`, 30, 40);
            ctx.fillStyle = "#fff";
            ctx.fillText(`Q:Score W:Lives E:GameOver`, 30, 80);
            ctx.fillText(`COPY: x:${el.x}, y:${el.y}, s:${el.s.toFixed(2)}`, 30, 130);
        }
    }
}
