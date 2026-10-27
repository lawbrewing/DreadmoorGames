// js/core/renderer.js

class GameRenderer {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.brewMergeEffects = [];
        this.brewTileAnims = {};
        this.prevBrewGrid = {};
        this.brewSteamParticles = [];
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // --- UNIFIED HUD BAR & "BACK TO LIBRARY" CLEANUP ACROSS BOTH SCREENS ---
    setupSlidingHud() {
        if (this.hudInitialized) return;
        this.hudInitialized = true;

        // Find any loose "BACK TO LIBRARY" or "LIBRARY" button floating over the top-left canvas
        const allEls = document.querySelectorAll('a, button, div, span');
        let libraryBtn = null;
        let menuBar = null;

        for (const el of allEls) {
            const txt = (el.innerText || el.textContent || '').trim().toUpperCase();
            if ((txt === 'BACK TO LIBRARY' || txt === 'LIBRARY' || txt === '← LIBRARY') && el.offsetWidth < 260 && el.offsetTop < 90) {
                libraryBtn = el;
            }
            if (el.id && (el.id.toLowerCase().includes('hud') || el.id.toLowerCase().includes('menu'))) {
                menuBar = el;
            }
        }

        // If a collapsible HUD drawer/bar exists, tuck the Library link inside it; otherwise hide the floating button
        if (libraryBtn) {
            if (menuBar && menuBar !== libraryBtn && !menuBar.contains(libraryBtn)) {
                libraryBtn.style.position = 'static';
                libraryBtn.style.margin = '0 8px';
                menuBar.appendChild(libraryBtn);
            } else {
                libraryBtn.style.display = 'none';
            }
        }
    }

    // --- SEASONAL & GAMEPLAY-REACTIVE NEON SIGN RENDERER ---
    drawNeonSign(state, signX, signY, signScale = 0.10, season = 'spring') {
        if (!this.neonSignImg) {
            this.neonSignImg = new Image();
            this.neonSignImg.src = 'assets/sprites/BarProps/lawbrewhollow.png';
        }
        const signAsset = this.neonSignImg;
        if (!signAsset.complete || signAsset.naturalWidth === 0) return;

        const ctx = this.ctx;
        const now = Date.now();
        const time = now / 1000;
        ctx.save();

        const drawW = signAsset.naturalWidth * signScale;
        const drawH = signAsset.naturalHeight * signScale;

        const patrons = state.patrons || state.entities || state.customers || [];
        const someoneCheering = patrons.some(c => c.currentState === 'CHEER');
        const someoneAngry = patrons.some(c => c.currentState === 'ANGRY');
        const lowPatience = patrons.some(c => (c.currentState === 'IDLE' || c.currentState === 'ENTER') && c.maxPatience && (c.currentPatience / c.maxPatience) < 0.28);
        const judgePresent = patrons.some(c => c.type === 'judge' || c.rosterKey === 'judge' || (typeof PATRON_ROSTER !== 'undefined' && PATRON_ROSTER[c.rosterKey] && PATRON_ROSTER[c.rosterKey].isBoss));
        const timeLeft = state.timeRemaining !== undefined ? state.timeRemaining : 60;

        // 1. Seasonal Base Palette (cycles smoothly when idle)
        let primaryColor = "rgba(255, 204, 0, 1)";
        let secondaryColor = "rgba(255, 204, 0, 0.35)";

        if (season === 'winter') {
            const phase = Math.floor(time * 2.2) % 3;
            primaryColor = phase === 0 ? "rgba(239, 68, 68, 1)" : (phase === 1 ? "rgba(34, 197, 94, 1)" : "rgba(250, 204, 21, 1)");
            secondaryColor = phase === 0 ? "rgba(34, 197, 94, 0.38)" : "rgba(239, 68, 68, 0.38)";
        } else if (season === 'summer') {
            const phase = Math.floor(time * 2.5) % 3;
            primaryColor = phase === 0 ? "rgba(239, 68, 68, 1)" : (phase === 1 ? "rgba(248, 250, 252, 1)" : "rgba(56, 189, 248, 1)");
            secondaryColor = "rgba(59, 130, 246, 0.38)";
        } else if (season === 'fall') {
            const mix = Math.sin(time * 3) > 0;
            primaryColor = mix ? "rgba(249, 115, 22, 1)" : "rgba(250, 204, 21, 1)";
            secondaryColor = "rgba(217, 119, 6, 0.38)";
        } else {
            const mix = Math.sin(time * 2.5) > 0;
            primaryColor = mix ? "rgba(52, 211, 153, 1)" : "rgba(244, 114, 182, 1)";
            secondaryColor = "rgba(16, 185, 129, 0.35)";
        }

        // 2. Gameplay-Reactive Color & Blink Pattern Overrides
        let blinkPattern = 1.0;
        let pulse = 0.8 + Math.sin(time * 5) * 0.15;

        if (state.isGameOver) {
            primaryColor = "rgba(127, 29, 29, 1)";
            secondaryColor = "rgba(69, 10, 10, 0.25)";
            blinkPattern = Math.random() > 0.15 ? 0.22 : 0.7;
        } else if (someoneAngry) {
            primaryColor = "rgba(239, 68, 68, 1)";
            secondaryColor = "rgba(220, 38, 38, 0.45)";
            blinkPattern = Math.sin(time * 28) > 0 ? 1.0 : 0.25;
            pulse = 1.1;
        } else if (judgePresent || state.isBossRound) {
            const siren = Math.sin(time * 16) > 0;
            primaryColor = siren ? "rgba(239, 68, 68, 1)" : "rgba(250, 204, 21, 1)";
            secondaryColor = "rgba(239, 68, 68, 0.4)";
            blinkPattern = 0.85 + Math.sin(time * 20) * 0.15;
        } else if (someoneCheering || (state.combo !== undefined && state.combo >= 3)) {
            const partyColors = ["rgba(74, 222, 128, 1)", "rgba(56, 189, 248, 1)", "rgba(250, 204, 21, 1)", "rgba(232, 121, 249, 1)"];
            primaryColor = partyColors[Math.floor(time * 12) % partyColors.length];
            secondaryColor = "rgba(250, 204, 21, 0.45)";
            blinkPattern = 0.9 + Math.sin(time * 24) * 0.1;
            pulse = 1.15;
        } else if (timeLeft <= 10 || lowPatience) {
            primaryColor = "rgba(251, 146, 60, 1)";
            secondaryColor = "rgba(239, 68, 68, 0.38)";
            blinkPattern = Math.sin(time * 18) > -0.3 ? 1.0 : 0.35;
        } else {
            blinkPattern = Math.random() > 0.015 ? 1.0 : 0.45;
        }

        const finalAlpha = Math.min(1, blinkPattern * pulse);

        ctx.globalCompositeOperation = "screen";
        const glowRadius = drawW * (someoneCheering ? 0.95 : 0.8);
        const glowGrad = ctx.createRadialGradient(signX, signY, 6, signX, signY, glowRadius);
        glowGrad.addColorStop(0, primaryColor);
        glowGrad.addColorStop(0.5, secondaryColor);
        glowGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = glowGrad;
        ctx.globalAlpha = finalAlpha * 0.68;
        ctx.beginPath();
        ctx.arc(signX, signY, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = finalAlpha;
        ctx.shadowColor = primaryColor;
        ctx.shadowBlur = 26 * pulse;
        ctx.drawImage(signAsset, signX - drawW / 2, signY - drawH / 2, drawW, drawH);
        ctx.restore();
    }

    // --- ENHANCE EXISTING SPRITES (FLOWERS IN POTS & BLINKING FIXTURE LIGHTS) ---
    drawExistingSpriteEnhancements(ctx, item, season, seasonStage, time) {
        ctx.save();

        // 1. Draw Vibrant Seasonal Flowers Inside Existing Hanging Pots & Bookshelf Pots
        if (item.type === 'plant_hanging_rope_pot' || item.type === 'bookshelf_wall_cafe') {
            const flowerPalettes = {
                spring: ['#f472b6', '#fde047', '#c084fc', '#fb7185'],
                summer: ['#facc15', '#ef4444', '#fb923c', '#38bdf8'],
                fall: ['#ea580c', '#dc2626', '#f59e0b', '#fde047'],
                winter: ['#dc2626', '#f8fafc', '#ef4444', '#fde047']
            };
            const pal = flowerPalettes[season] || flowerPalettes.spring;

            const drawBloomCluster = (cx, cy, spread, count) => {
                for (let i = 0; i < count; i++) {
                    const angle = (i / count) * Math.PI * 2 + 0.4;
                    const fx = cx + Math.cos(angle) * (spread * (0.45 + (i % 2) * 0.4));
                    const fy = cy + Math.sin(angle) * (spread * 0.38);
                    const color = pal[i % pal.length];

                    ctx.fillStyle = color;
                    for (let p = 0; p < 5; p++) {
                        const pa = (p * Math.PI * 2) / 5 + (time * 0.4);
                        ctx.beginPath();
                        ctx.arc(fx + Math.cos(pa) * 3.2, fy + Math.sin(pa) * 3.2, 2.6, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    ctx.fillStyle = season === 'winter' ? '#facc15' : '#fef08a';
                    ctx.beginPath();
                    ctx.arc(fx, fy, 2.0, 0, Math.PI * 2);
                    ctx.fill();
                }
            };

            if (item.type === 'plant_hanging_rope_pot') {
                drawBloomCluster(item.x, item.y - 54, 22, 5 + seasonStage);
                if (season === 'winter' && seasonStage >= 2) {
                    ctx.fillStyle = '#dc2626';
                    ctx.beginPath();
                    ctx.ellipse(item.x - 6, item.y - 38, 6, 3.5, -0.4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.ellipse(item.x + 6, item.y - 38, 6, 3.5, 0.4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#facc15';
                    ctx.beginPath();
                    ctx.arc(item.x, item.y - 38, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (item.type === 'bookshelf_wall_cafe') {
                drawBloomCluster(item.x + 18, item.y - 78, 12, 4);
                drawBloomCluster(item.x + 18, item.y - 36, 12, 4);

                if (season === 'spring' && seasonStage >= 2) {
                    ['#f472b6', '#38bdf8', '#facc15'].forEach((col, idx) => {
                        ctx.fillStyle = col;
                        ctx.beginPath();
                        ctx.ellipse(item.x - 24 + idx * 9, item.y - 52 + idx * 3, 3.5, 5, 0, 0, Math.PI * 2);
                        ctx.fill();
                    });
                } else if (season === 'fall' && seasonStage >= 2) {
                    ctx.fillStyle = '#ea580c';
                    ctx.beginPath();
                    ctx.ellipse(item.x - 18, item.y - 50, 7, 5.5, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // 2. Blinking Truss Spotlights on stage_small_lights
        if (item.type === 'stage_small_lights') {
            const spotColors = ['#ef4444', '#38bdf8', '#facc15', '#c084fc'];
            const lampOffsets = [
                { dx: -46, dy: -122 },
                { dx: -18, dy: -134 },
                { dx: 12, dy: -146 },
                { dx: 40, dy: -158 }
            ];
            ctx.globalCompositeOperation = 'screen';
            lampOffsets.forEach((pos, idx) => {
                const isOn = Math.sin(time * 7 + idx * 1.6) > -0.2;
                const intensity = isOn ? (0.75 + 0.25 * Math.sin(time * 14 + idx)) : 0.15;
                const col = spotColors[(idx + Math.floor(time * 2)) % spotColors.length];
                const lx = item.x + pos.dx;
                const ly = item.y + pos.dy;

                ctx.globalAlpha = intensity;
                ctx.shadowColor = col;
                ctx.shadowBlur = 14;
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(lx, ly, 4.5, 0, Math.PI * 2);
                ctx.fill();

                if (isOn) {
                    const coneGrad = ctx.createLinearGradient(lx, ly, lx + 10, item.y - 30);
                    coneGrad.addColorStop(0, col);
                    coneGrad.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = coneGrad;
                    ctx.globalAlpha = intensity * 0.28;
                    ctx.beginPath();
                    ctx.moveTo(lx - 4, ly + 3);
                    ctx.lineTo(lx + 4, ly + 3);
                    ctx.lineTo(lx + 28, item.y - 25);
                    ctx.lineTo(lx - 22, item.y - 25);
                    ctx.closePath();
                    ctx.fill();
                }
            });
        }

        // 3. Chasing Neon Arch Tube & Blinking Marquee on Jukebox
        if (item.type === 'jukebox') {
            ctx.globalCompositeOperation = 'screen';
            const jukeColors = ['#f43f5e', '#38bdf8', '#facc15', '#4ade80'];
            for (let i = 0; i < 6; i++) {
                const angle = Math.PI + (i / 5) * Math.PI;
                const jx = item.x + Math.cos(angle) * 24;
                const jy = (item.y - 88) + Math.sin(angle) * 22;
                const activeBulb = (Math.floor(time * 8) % 6) === i;
                ctx.globalAlpha = activeBulb ? 0.95 : 0.35;
                ctx.fillStyle = jukeColors[i % jukeColors.length];
                ctx.shadowColor = ctx.fillStyle;
                ctx.shadowBlur = activeBulb ? 12 : 4;
                ctx.beginPath();
                ctx.arc(jx, jy, activeBulb ? 3.8 : 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // 4. Warm Breathing/Blinking Bulb Halo inside Rattan Floor Lamp
        if (item.type === 'lamp_floor_rattan') {
            ctx.globalCompositeOperation = 'screen';
            const lampPulse = 0.55 + 0.35 * Math.sin(time * 4.5);
            const lGrad = ctx.createRadialGradient(item.x, item.y - 92, 4, item.x, item.y - 92, 48);
            lGrad.addColorStop(0, '#fef08a');
            lGrad.addColorStop(0.45, 'rgba(251, 191, 36, 0.45)');
            lGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
            ctx.globalAlpha = lampPulse;
            ctx.fillStyle = lGrad;
            ctx.beginPath();
            ctx.arc(item.x, item.y - 92, 48, 0, Math.PI * 2);
            ctx.fill();
        }

        // 5. Dancing Fire & Blinking Embers inside the Brick Pizza Oven
        if (item.type === 'pizza_oven_brick') {
            const mouthX = item.x - 28;
            const mouthY = item.y - 98;
            ctx.globalCompositeOperation = 'screen';
            for (let f = 0; f < 3; f++) {
                const flameH = 10 + Math.sin(time * 12 + f * 2) * 5;
                const fx = mouthX + (f - 1) * 7;
                ctx.fillStyle = f === 1 ? '#fde047' : '#f97316';
                ctx.shadowColor = '#ea580c';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.moveTo(fx - 4, mouthY);
                ctx.quadraticCurveTo(fx, mouthY - flameH, fx + 4, mouthY);
                ctx.closePath();
                ctx.fill();
            }
        }

        ctx.restore();
    }

    // --- CUSTOM DEPTH-SORTED SEASONAL HERO PROPS (TREES, STATUES, BUNNIES, HEATWAVE) ---
    drawCustomSeasonalProp(ctx, item, seasonStage, time) {
        const x = item.x;
        const y = item.y;
        ctx.save();
        ctx.translate(x, y);

        if (item.customType === 'christmas_tree') {
            // 1. Red & Gold Tree Skirt + Floor Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.beginPath(); ctx.ellipse(0, 4, 54, 22, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#991b1b';
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.ellipse(0, 0, 48, 19, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

            // Trunk
            ctx.fillStyle = '#451a03';
            ctx.fillRect(-10, -24, 20, 24);

            // 2. Four Scalloped Evergreen Pine Tiers
            const tiers = [
                { y: -20, w: 52, h: 42 },
                { y: -52, w: 43, h: 38 },
                { y: -80, w: 33, h: 34 },
                { y: -106, w: 22, h: 30 }
            ];
            tiers.forEach(t => {
                const tGrad = ctx.createLinearGradient(-t.w, t.y - t.h, t.w, t.y);
                tGrad.addColorStop(0, '#15803d');
                tGrad.addColorStop(0.5, '#166534');
                tGrad.addColorStop(1, '#052e16');
                ctx.fillStyle = tGrad;
                ctx.strokeStyle = '#052e16';
                ctx.lineWidth = 2;

                ctx.beginPath();
                ctx.moveTo(0, t.y - t.h);
                ctx.lineTo(t.w, t.y);
                for (let s = 3; s >= -3; s--) {
                    const sx = (s / 3) * t.w;
                    ctx.quadraticCurveTo(sx - (t.w / 6), t.y + 7, sx - (t.w / 3), t.y);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                ctx.strokeStyle = '#fde047';
                ctx.lineWidth = 2.2;
                ctx.beginPath();
                ctx.moveTo(-t.w * 0.72, t.y - t.h * 0.28);
                ctx.quadraticCurveTo(0, t.y + 4, t.w * 0.72, t.y - t.h * 0.18);
                ctx.stroke();
            });

            // 3. Creative Taproom Ornaments (Mini Beer Mugs & Candy Canes)
            const drawMiniMug = (ox, oy) => {
                ctx.fillStyle = '#facc15';
                ctx.strokeStyle = '#fef08a';
                ctx.lineWidth = 1.2;
                ctx.fillRect(ox - 3.5, oy - 4, 7, 8);
                ctx.strokeRect(ox - 3.5, oy - 4, 7, 8);
                ctx.fillStyle = '#ffffff';
                ctx.beginPath(); ctx.arc(ox, oy - 4.5, 4, 0, Math.PI * 2); ctx.fill();
            };
            const drawCandyCane = (ox, oy, tilt) => {
                ctx.save();
                ctx.translate(ox, oy);
                ctx.rotate(tilt);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(0, -3); ctx.arc(-3, -3, 3, 0, Math.PI, true); ctx.stroke();
                ctx.strokeStyle = '#ef4444';
                ctx.setLineDash([2.5, 2.5]);
                ctx.stroke();
                ctx.restore();
            };

            drawMiniMug(-22, -32);
            drawMiniMug(20, -60);
            drawMiniMug(-10, -88);
            drawCandyCane(26, -30, 0.25);
            drawCandyCane(-24, -62, -0.25);
            drawCandyCane(12, -92, 0.2);

            // 4. Blinking Multi-Color LED Fairy Lights
            const lights = [
                [-32, -22], [-12, -26], [10, -24], [32, -20],
                [-26, -50], [-4, -54], [18, -48],
                [-18, -76], [2, -78], [16, -74],
                [-9, -102], [8, -100], [0, -116]
            ];
            const ledColors = ['#ef4444', '#38bdf8', '#facc15', '#4ade80', '#f472b6'];
            lights.forEach(([lx, ly], idx) => {
                const col = ledColors[idx % ledColors.length];
                const blink = 0.35 + 0.65 * Math.max(0, Math.sin(time * 6 + idx * 1.3));
                ctx.save();
                ctx.globalCompositeOperation = 'screen';
                ctx.globalAlpha = blink;
                ctx.shadowColor = col;
                ctx.shadowBlur = 12;
                ctx.fillStyle = col;
                ctx.beginPath(); ctx.arc(lx, ly, 3.8, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.beginPath(); ctx.arc(lx, ly, 1.6, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            });

            // 5. Radiant Pulsing Star Topper
            ctx.save();
            const starPulse = 0.85 + 0.2 * Math.sin(time * 5);
            ctx.translate(0, -138);
            ctx.scale(starPulse, starPulse);
            ctx.shadowColor = '#facc15';
            ctx.shadowBlur = 18;
            ctx.fillStyle = '#fde047';
            ctx.beginPath();
            for (let i = 0; i < 10; i++) {
                const rad = i % 2 === 0 ? 13 : 5.5;
                const ang = (i * Math.PI) / 5 - Math.PI / 2;
                if (i === 0) ctx.moveTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
                else ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            // 6. SHIFT 2+ PROGRESSION: Wrapped Christmas Presents Under the Tree
            if (seasonStage >= 2) {
                const gifts = [
                    { gx: -34, gy: 6, gw: 22, gh: 18, box: '#dc2626', rib: '#facc15' },
                    { gx: 22, gy: 8, gw: 24, gh: 19, box: '#2563eb', rib: '#f8fafc' },
                    { gx: -8, gy: 12, gw: 20, gh: 15, box: '#16a34a', rib: '#ef4444' },
                    { gx: 8, gy: 15, gw: 16, gh: 13, box: '#9333ea', rib: '#fde047' }
                ];
                gifts.forEach(g => {
                    ctx.fillStyle = g.box;
                    ctx.strokeStyle = '#18181b';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.roundRect(g.gx, g.gy - g.gh, g.gw, g.gh, 3);
                    ctx.fill();
                    ctx.stroke();

                    ctx.fillStyle = g.rib;
                    ctx.fillRect(g.gx + g.gw / 2 - 2, g.gy - g.gh, 4, g.gh);
                    ctx.fillRect(g.gx, g.gy - g.gh / 2 - 2, g.gw, 4);

                    ctx.beginPath();
                    ctx.ellipse(g.gx + g.gw / 2 - 4, g.gy - g.gh - 2, 4, 2.5, -0.4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.ellipse(g.gx + g.gw / 2 + 4, g.gy - g.gh - 2, 4, 2.5, 0.4, 0, Math.PI * 2);
                    ctx.fill();
                });
            }
        } else if (item.customType === 'oktoberfest_statue') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.beginPath(); ctx.ellipse(0, 4, 48, 20, 0, 0, Math.PI * 2); ctx.fill();

            ctx.fillStyle = '#57534e';
            ctx.strokeStyle = '#1c1917';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.roundRect(-36, -34, 72, 34, 5); ctx.fill(); ctx.stroke();

            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(-30, -30, 60, 22);
            ctx.fillStyle = '#0284c7';
            for (let dx = -24; dx <= 24; dx += 12) {
                ctx.beginPath();
                ctx.moveTo(dx, -29);
                ctx.lineTo(dx + 6, -19);
                ctx.lineTo(dx, -9);
                ctx.lineTo(dx - 6, -19);
                ctx.closePath();
                ctx.fill();
            }

            ctx.fillStyle = '#facc15';
            ctx.fillRect(-20, -6, 40, 5);

            ctx.fillStyle = '#78350f';
            ctx.strokeStyle = '#271206';
            ctx.beginPath(); ctx.roundRect(-26, -64, 52, 30, 8); ctx.fill(); ctx.stroke();
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(-16, -64); ctx.lineTo(-16, -34);
            ctx.moveTo(16, -64); ctx.lineTo(16, -34);
            ctx.stroke();

            const goldGrad = ctx.createLinearGradient(-18, -115, 18, -60);
            goldGrad.addColorStop(0, '#fef08a');
            goldGrad.addColorStop(0.5, '#f59e0b');
            goldGrad.addColorStop(1, '#b45309');
            ctx.fillStyle = goldGrad;
            ctx.strokeStyle = '#451a03';
            ctx.lineWidth = 2;

            ctx.beginPath(); ctx.roundRect(-16, -96, 32, 34, 8); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.arc(0, -108, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#15803d';
            ctx.beginPath(); ctx.ellipse(0, -117, 16, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#14532d';
            ctx.beginPath(); ctx.moveTo(-10, -117); ctx.lineTo(0, -129); ctx.lineTo(10, -117); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#f8fafc';
            ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.moveTo(8, -120); ctx.quadraticCurveTo(16, -132, 12, -136); ctx.stroke();

            ctx.fillStyle = '#facc15';
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.roundRect(16, -105, 16, 22, 3); ctx.fill(); ctx.stroke();
            ctx.strokeStyle = '#fde047';
            ctx.beginPath(); ctx.arc(32, -94, 5, -Math.PI / 2, Math.PI / 2); ctx.stroke();

            ctx.fillStyle = '#ffffff';
            [[20, -106, 5], [25, -108, 6], [29, -105, 4.5]].forEach(([fx, fy, fr]) => {
                ctx.beginPath();
                ctx.arc(fx, fy, fr, 0, Math.PI * 2);
                ctx.fill();
            });

            ctx.strokeStyle = '#b45309';
            ctx.lineWidth = 4.5;
            ctx.beginPath();
            ctx.arc(-23, -92, 8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            [[-28, -96], [-18, -96], [-23, -85]].forEach(([sx, sy]) => {
                ctx.fillRect(sx, sy, 2, 2);
            });
        } else if (item.customType === 'jack_o_lantern') {
            const s = item.scale || 1.0;
            ctx.scale(s, s);
            ctx.fillStyle = 'rgba(0,0,0,0.42)';
            ctx.beginPath(); ctx.ellipse(0, 4, 24, 10, 0, 0, Math.PI * 2); ctx.fill();

            const pGrad = ctx.createRadialGradient(-4, -14, 3, 0, -12, 24);
            pGrad.addColorStop(0, '#fb923c');
            pGrad.addColorStop(0.6, '#ea580c');
            pGrad.addColorStop(1, '#9a3412');
            ctx.fillStyle = pGrad;
            ctx.strokeStyle = '#431407';
            ctx.lineWidth = 1.8;

            ctx.beginPath(); ctx.ellipse(-9, -12, 11, 14, -0.1, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.ellipse(9, -12, 11, 14, 0.1, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.ellipse(0, -12, 12, 15, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

            ctx.strokeStyle = '#15803d';
            ctx.lineWidth = 3.5;
            ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(0, -26); ctx.quadraticCurveTo(4, -34, 8, -31); ctx.stroke();

            const flicker = 0.75 + 0.25 * Math.sin(time * 16 + x);
            ctx.save();
            ctx.shadowColor = '#fde047';
            ctx.shadowBlur = 14 * flicker;
            ctx.fillStyle = `rgba(254, 240, 138, ${flicker})`;

            ctx.beginPath();
            ctx.moveTo(-10, -15); ctx.lineTo(-4, -20); ctx.lineTo(-3, -13); ctx.closePath();
            ctx.moveTo(10, -15); ctx.lineTo(4, -20); ctx.lineTo(3, -13); ctx.closePath();
            ctx.moveTo(-2.5, -10); ctx.lineTo(0, -14); ctx.lineTo(2.5, -10); ctx.closePath();
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(-11, -7);
            ctx.lineTo(-6, -4);
            ctx.lineTo(-4, -7);
            ctx.lineTo(0, -3);
            ctx.lineTo(4, -7);
            ctx.lineTo(6, -4);
            ctx.lineTo(11, -7);
            ctx.lineTo(8, -1);
            ctx.lineTo(0, 0);
            ctx.lineTo(-8, -1);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        } else if (item.customType === 'easter_bunny') {
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.beginPath(); ctx.ellipse(0, 4, 42, 17, 0, 0, Math.PI * 2); ctx.fill();

            ctx.fillStyle = '#f8fafc';
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.roundRect(-30, -24, 60, 24, 6); ctx.fill(); ctx.stroke();

            ctx.fillStyle = '#4ade80';
            ctx.beginPath(); ctx.ellipse(0, -24, 30, 9, 0, 0, Math.PI * 2); ctx.fill();

            const furGrad = ctx.createLinearGradient(-15, -95, 15, -24);
            furGrad.addColorStop(0, '#ffffff');
            furGrad.addColorStop(1, '#e2e8f0');
            ctx.fillStyle = furGrad;
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 1.8;

            ctx.beginPath(); ctx.ellipse(0, -46, 19, 24, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.arc(0, -76, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

            [[-7, -104, -0.15], [7, -104, 0.22]].forEach(([ex, ey, rot]) => {
                ctx.save();
                ctx.translate(ex, ey);
                ctx.rotate(rot);
                ctx.fillStyle = furGrad;
                ctx.beginPath(); ctx.ellipse(0, 0, 5.5, 17, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#fbcfe8';
                ctx.beginPath(); ctx.ellipse(0, 1, 3, 12, 0, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            });

            ctx.fillStyle = '#1e293b';
            ctx.beginPath(); ctx.arc(-5, -78, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(5, -78, 2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#f472b6';
            ctx.beginPath(); ctx.arc(0, -73, 2.8, 0, Math.PI * 2); ctx.fill();

            ctx.fillStyle = '#ec4899';
            ctx.beginPath();
            ctx.moveTo(0, -61); ctx.lineTo(-8, -65); ctx.lineTo(-8, -57); ctx.closePath();
            ctx.moveTo(0, -61); ctx.lineTo(8, -65); ctx.lineTo(8, -57); ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#d97706';
            ctx.strokeStyle = '#78350f';
            ctx.beginPath(); ctx.roundRect(-16, -48, 32, 16, 5); ctx.fill(); ctx.stroke();
            const eggColors = ['#f472b6', '#38bdf8', '#facc15', '#a78bfa'];
            eggColors.forEach((col, idx) => {
                ctx.fillStyle = col;
                ctx.beginPath();
                ctx.ellipse(-10 + idx * 6.5, -50, 4.2, 5.8, (idx - 1.5) * 0.15, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            });
        } else if (item.customType === 'summer_heatwave') {
            ctx.fillStyle = 'rgba(0,0,0,0.42)';
            ctx.beginPath(); ctx.ellipse(0, 4, 48, 18, 0, 0, Math.PI * 2); ctx.fill();

            const tubGrad = ctx.createLinearGradient(-36, -30, 36, 0);
            tubGrad.addColorStop(0, '#94a3b8');
            tubGrad.addColorStop(0.5, '#e2e8f0');
            tubGrad.addColorStop(1, '#475569');
            ctx.fillStyle = tubGrad;
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-36, -32); ctx.lineTo(36, -32); ctx.lineTo(28, 0); ctx.lineTo(-28, 0); ctx.closePath();
            ctx.fill(); ctx.stroke();

            ctx.fillStyle = '#dc2626';
            ctx.fillRect(-31, -20, 62, 6);
            ctx.fillStyle = '#1d4ed8';
            ctx.fillRect(-30, -14, 60, 5);

            ctx.fillStyle = '#bae6fd';
            ctx.beginPath(); ctx.ellipse(0, -32, 34, 10, 0, 0, Math.PI * 2); ctx.fill();
            [[-18, -38, -0.2], [-6, -42, 0.05], [8, -40, 0.2]].forEach(([bx, by, rot]) => {
                ctx.save();
                ctx.translate(bx, by);
                ctx.rotate(rot);
                ctx.fillStyle = '#451a03';
                ctx.strokeStyle = '#fef08a';
                ctx.lineWidth = 1.2;
                ctx.fillRect(-3.5, -10, 7, 14);
                ctx.fillStyle = '#ef4444';
                ctx.fillRect(-2.5, -13, 5, 3);
                ctx.restore();
            });

            ctx.save();
            ctx.translate(18, -34);
            ctx.rotate(0.25);
            ctx.fillStyle = '#16a34a';
            ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI, false); ctx.fill();
            ctx.fillStyle = '#ef4444';
            ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI, false); ctx.fill();
            ctx.fillStyle = '#18181b';
            [[-4, 4], [0, 6], [4, 4]].forEach(([sx, sy]) => {
                ctx.beginPath(); ctx.arc(sx, sy, 1.2, 0, Math.PI * 2); ctx.fill();
            });
            ctx.restore();

            if (seasonStage >= 3) {
                for (let sp = 0; sp < 8; sp++) {
                    const ang = (sp / 8) * Math.PI * 2 + time * 10;
                    const dist = 6 + ((time * 35 + sp * 4) % 18);
                    const sx = -26 + Math.cos(ang) * dist;
                    const sy = -58 + Math.sin(ang) * dist;
                    ctx.fillStyle = sp % 2 === 0 ? '#fef08a' : '#38bdf8';
                    ctx.beginPath(); ctx.arc(sx, sy, 2, 0, Math.PI * 2); ctx.fill();
                }
            }
        }

        ctx.restore();
    }

    // --- SEASONAL WALL, DOORWAY & COUNTER OVERLAYS (PROGRESSIVE BY SHIFT) ---
    drawSeasonalFestivities(ctx, w, h, season, seasonStage, time, beerBaseX, beerBaseY, cafeBaseX, cafeBaseY) {
        ctx.save();

        // 1. Seasonal Center Billiards Rug (Stage 2+)
        if (seasonStage >= 2) {
            const rx = w / 2;
            const ry = 420;
            ctx.save();
            ctx.translate(rx, ry - 15);
            const rugColors = {
                spring: { fill: 'rgba(20, 83, 45, 0.50)', border: '#f472b6' },
                summer: { fill: 'rgba(30, 58, 138, 0.55)', border: '#ef4444' },
                fall: { fill: 'rgba(124, 45, 18, 0.55)', border: '#f59e0b' },
                winter: { fill: 'rgba(127, 29, 29, 0.58)', border: '#facc15' }
            };
            const rc = rugColors[season] || rugColors.spring;
            ctx.fillStyle = rc.fill;
            ctx.strokeStyle = rc.border;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(0, 0, 148, 74, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.ellipse(0, 0, 136, 66, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // 2. Back-Wall Festive Bunting, Garlands & Blinking String Lights
        const swagCount = 8;
        const swagWidth = w / swagCount;
        const wallY = 14;

        for (let i = 0; i < swagCount; i++) {
            const startX = i * swagWidth;
            const midX = startX + swagWidth / 2;
            const endX = startX + swagWidth;

            if (midX > (w / 2) - 85 && midX < (w / 2) + 85) continue;

            if (season === 'winter') {
                ctx.strokeStyle = '#14532d';
                ctx.lineWidth = 8;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(startX, wallY);
                ctx.quadraticCurveTo(midX, wallY + 26, endX, wallY);
                ctx.stroke();

                ctx.fillStyle = '#dc2626';
                ctx.beginPath(); ctx.arc(startX, wallY + 2, 5, 0, Math.PI * 2); ctx.fill();

                const bulbColors = ['#ef4444', '#22c55e', '#facc15', '#38bdf8', '#f472b6'];
                for (let b = 1; b <= 3; b++) {
                    const t = b / 4;
                    const bx = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * midX + t * t * endX;
                    const by = (1 - t) * (1 - t) * wallY + 2 * (1 - t) * t * (wallY + 26) + t * t * wallY;
                    const col = bulbColors[(i + b) % bulbColors.length];
                    const twinkle = 0.35 + 0.65 * Math.max(0, Math.sin(time * 6 + i * 1.7 + b));

                    ctx.save();
                    ctx.globalCompositeOperation = 'screen';
                    ctx.globalAlpha = twinkle;
                    ctx.shadowColor = col;
                    ctx.shadowBlur = 12;
                    ctx.fillStyle = col;
                    ctx.beginPath(); ctx.arc(bx, by + 3, 4, 0, Math.PI * 2); ctx.fill();
                    ctx.restore();
                }
            } else if (season === 'summer') {
                const rOuter = swagWidth * 0.44;
                const cx = midX;
                const cy = wallY - 4;

                ctx.fillStyle = '#dc2626';
                ctx.beginPath(); ctx.arc(cx, cy, rOuter, 0, Math.PI, false); ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#f8fafc';
                ctx.beginPath(); ctx.arc(cx, cy, rOuter * 0.72, 0, Math.PI, false); ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#1d4ed8';
                ctx.beginPath(); ctx.arc(cx, cy, rOuter * 0.44, 0, Math.PI, false); ctx.closePath(); ctx.fill();

                ctx.strokeStyle = 'rgba(0,0,0,0.22)';
                ctx.lineWidth = 1;
                for (let a = 1; a < 6; a++) {
                    const ang = (a / 6) * Math.PI;
                    ctx.beginPath();
                    ctx.moveTo(cx, cy);
                    ctx.lineTo(cx + Math.cos(ang) * rOuter, cy + Math.sin(ang) * rOuter);
                    ctx.stroke();
                }
            } else if (season === 'fall') {
                ctx.strokeStyle = '#451a03';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(startX, wallY);
                ctx.quadraticCurveTo(midX, wallY + 22, endX, wallY);
                ctx.stroke();

                const fallColors = ['#0284c7', '#f8fafc', '#ea580c', '#facc15'];
                for (let p = 1; p <= 4; p++) {
                    const t = p / 5;
                    const px = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * midX + t * t * endX;
                    const py = (1 - t) * (1 - t) * wallY + 2 * (1 - t) * t * (wallY + 22) + t * t * wallY;
                    ctx.fillStyle = fallColors[(i + p) % fallColors.length];
                    ctx.beginPath();
                    ctx.moveTo(px - 7, py);
                    ctx.lineTo(px + 7, py);
                    ctx.lineTo(px, py + 16);
                    ctx.closePath();
                    ctx.fill();
                }
            } else {
                ctx.strokeStyle = '#15803d';
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.moveTo(startX, wallY);
                ctx.quadraticCurveTo(midX, wallY + 22, endX, wallY);
                ctx.stroke();

                const springColors = ['#f472b6', '#fde047', '#a7f3d0', '#c084fc'];
                for (let f = 1; f <= 3; f++) {
                    const t = f / 4;
                    const fx = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * midX + t * t * endX;
                    const fy = (1 - t) * (1 - t) * wallY + 2 * (1 - t) * t * (wallY + 22) + t * t * wallY;
                    ctx.fillStyle = springColors[(i + f) % springColors.length];
                    ctx.beginPath(); ctx.arc(fx, fy, 4.5, 0, Math.PI * 2); ctx.fill();
                }
            }
        }

        // 3. Doorway & Progressive Shift Accents
        const doorCenterX = w / 2;

        if (season === 'winter') {
            if (seasonStage >= 3) {
                const wy = 82;
                ctx.strokeStyle = '#14532d';
                ctx.lineWidth = 9;
                ctx.beginPath(); ctx.arc(doorCenterX, wy, 18, 0, Math.PI * 2); ctx.stroke();
                ctx.strokeStyle = '#16a34a';
                ctx.lineWidth = 4;
                ctx.stroke();

                ctx.fillStyle = '#dc2626';
                ctx.beginPath();
                ctx.arc(doorCenterX, wy - 17, 5.5, 0, Math.PI * 2);
                ctx.moveTo(doorCenterX - 3, wy - 14); ctx.lineTo(doorCenterX - 10, wy - 2); ctx.lineTo(doorCenterX - 2, wy - 4);
                ctx.moveTo(doorCenterX + 3, wy - 14); ctx.lineTo(doorCenterX + 10, wy - 2); ctx.lineTo(doorCenterX + 2, wy - 4);
                ctx.fill();

                for (let wBulb = 0; wBulb < 6; wBulb++) {
                    const ang = (wBulb / 6) * Math.PI * 2 + time;
                    const bx = doorCenterX + Math.cos(ang) * 18;
                    const by = wy + Math.sin(ang) * 18;
                    ctx.fillStyle = wBulb % 2 === 0 ? '#fde047' : '#ef4444';
                    ctx.beginPath(); ctx.arc(bx, by, 2.8, 0, Math.PI * 2); ctx.fill();
                }
            }
        } else if (season === 'summer') {
            const drawAmericanFlag = (fx, fy, dir) => {
                ctx.save();
                ctx.translate(fx, fy);
                ctx.strokeStyle = '#d97706';
                ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(dir * 28, -32); ctx.stroke();
                ctx.fillStyle = '#facc15';
                ctx.beginPath(); ctx.arc(dir * 28, -32, 3.5, 0, Math.PI * 2); ctx.fill();

                ctx.translate(dir * 16, -24);
                ctx.rotate(dir * 0.25);
                for (let s = 0; s < 7; s++) {
                    ctx.fillStyle = s % 2 === 0 ? '#dc2626' : '#f8fafc';
                    ctx.fillRect(dir > 0 ? 0 : -26, s * 2.5, 26, 2.5);
                }
                ctx.fillStyle = '#1e3a8a';
                ctx.fillRect(dir > 0 ? 0 : -12, 0, 12, 9);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(dir > 0 ? 3 : -9, 2, 2, 2);
                ctx.fillRect(dir > 0 ? 7 : -5, 5, 2, 2);
                ctx.restore();
            };
            drawAmericanFlag(doorCenterX - 88, 95, -1);
            drawAmericanFlag(doorCenterX + 88, 95, 1);

            if (seasonStage >= 2) {
                const fanX = 95;
                const fanY = 255;
                ctx.fillStyle = '#475569';
                ctx.beginPath(); ctx.ellipse(fanX, fanY, 16, 7, 0, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#94a3b8';
                ctx.lineWidth = 4;
                ctx.beginPath(); ctx.moveTo(fanX, fanY); ctx.lineTo(fanX, fanY - 42); ctx.stroke();

                const headX = fanX + Math.sin(time * 2.5) * 4;
                const headY = fanY - 46;
                ctx.strokeStyle = '#cbd5e1';
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(headX, headY, 16, 0, Math.PI * 2); ctx.stroke();
                for (let b = 0; b < 3; b++) {
                    const ang = time * 18 + (b * Math.PI * 2) / 3;
                    ctx.fillStyle = 'rgba(186, 230, 253, 0.65)';
                    ctx.beginPath();
                    ctx.ellipse(headX + Math.cos(ang) * 7, headY + Math.sin(ang) * 7, 7, 3.5, ang, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        } else if (season === 'spring') {
            const drawSpringBarrel = (px, py) => {
                ctx.fillStyle = 'rgba(0,0,0,0.35)';
                ctx.beginPath(); ctx.ellipse(px, py + 10, 18, 7, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#78350f';
                ctx.strokeStyle = '#451a03';
                ctx.lineWidth = 1.8;
                ctx.beginPath(); ctx.roundRect(px - 14, py - 10, 28, 20, 4); ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#16a34a';
                ctx.beginPath(); ctx.arc(px, py - 12, 14, 0, Math.PI * 2); ctx.fill();
                ['#f472b6', '#facc15', '#c084fc', '#fb7185'].forEach((col, idx) => {
                    ctx.fillStyle = col;
                    ctx.beginPath(); ctx.arc(px + (idx - 1.5) * 6, py - 13 - (idx % 2) * 4, 4, 0, Math.PI * 2); ctx.fill();
                });
            };
            drawSpringBarrel(doorCenterX - 96, 172);
            drawSpringBarrel(doorCenterX + 96, 172);

            if (seasonStage >= 3) {
                ctx.strokeStyle = '#15803d';
                ctx.lineWidth = 8;
                ctx.beginPath();
                ctx.arc(doorCenterX, 115, 78, Math.PI * 1.05, Math.PI * 1.95, false);
                ctx.stroke();
                for (let a = 0; a <= 8; a++) {
                    const ang = Math.PI * 1.08 + (a / 8) * (Math.PI * 0.84);
                    const ax = doorCenterX + Math.cos(ang) * 78;
                    const ay = 115 + Math.sin(ang) * 78;
                    ctx.fillStyle = a % 2 === 0 ? '#f472b6' : '#fde047';
                    ctx.beginPath(); ctx.arc(ax, ay, 5, 0, Math.PI * 2); ctx.fill();
                }
            }
        }

        ctx.restore();
    }

    // --- TAPROOM RENDERING (SEASON-LOCKED ARCHITECTURE + PROGRESSIVE SEASONAL ITEMS) ---
    drawTaproom(state) {
        if (typeof this.setupSlidingHud === 'function') {
            this.setupSlidingHud();
        }

        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const time = Date.now() / 1000;

        if (typeof spriteManager === 'undefined' || !spriteManager.isLoaded) return;

        // 1. LIVE PROGRESSION TIER & SEASON (Locked for 4 shifts per season)
        const prog = (typeof progressionState !== 'undefined') ? progressionState : {};
        const currentShift = state.shift || prog.shift || prog.currentShift || prog.day || 1;
        const unlockedKettles = (typeof playerState !== 'undefined' && playerState.unlockedKettles) ? playerState.unlockedKettles : 1;
        const isBossRound = Boolean(state.isBossRound || (typeof prog.isBossRound === 'function' ? prog.isBossRound() : prog.isBossRound));

        const shiftsPerSeason = 4;
        const seasonCycle = ['spring', 'summer', 'fall', 'winter'];
        const seasonIndex = Math.floor((currentShift - 1) / shiftsPerSeason) % 4;

        const rawSeason = state.season || prog.season || prog.currentSeason || seasonCycle[seasonIndex];
        const season = String(rawSeason).toLowerCase();

        const seasonStage = state.shiftInSeason || (((currentShift - 1) % shiftsPerSeason) + 1);
        const currentYear = state.year || prog.year || prog.currentYear || (1 + Math.floor((currentShift - 1) / (shiftsPerSeason * 4)));

        const progressionScore = (currentYear - 1) * 2 + Math.floor((currentShift - 1) / shiftsPerSeason) + (unlockedKettles - 1);
        const venueTier = Math.min(4, Math.max(1, 1 + progressionScore));

        // STRICTLY SEASONAL FLOORS & WALLS
        const seasonalArchitecture = {
            spring: { floor: 'floor_wood_restaurant', wall: 'wall_wainscot_restaurant' },
            summer: { floor: 'floor_tile_cafe_pattern', wall: 'wall_cream_cafe' },
            fall: { floor: 'floor_wood_restaurant', wall: 'wall_brick_bar' },
            winter: { floor: 'floor_dark_bar', wall: 'wall_brick_bar' }
        };
        const arch = seasonalArchitecture[season] || seasonalArchitecture.spring;
        const floorKey = arch.floor;
        const wallKey = arch.wall;

        ctx.fillStyle = '#18181b';
        ctx.fillRect(0, 0, w, h);

        ctx.imageSmoothingEnabled = false;

        // Draw Tiled Floor
        const floorImg = spriteManager.images[floorKey] || spriteManager.images['floor_dark_bar'];
        if (floorImg && floorImg.complete && floorImg.naturalWidth > 0) {
            for (let y = -100; y < h + 200; y += 109) {
                for (let x = -200; x < w + 200; x += 175) {
                    ctx.drawImage(floorImg, Math.floor(x), Math.floor(y));
                }
            }
        }

        // Draw Back Wall
        const wallImg = spriteManager.images[wallKey] || spriteManager.images['wall_brick_bar'];
        if (wallImg && wallImg.complete && wallImg.naturalWidth > 0) {
            for (let x = -100; x < w + 200; x += 180) {
                ctx.drawImage(wallImg, Math.floor(x), -15);
            }
        }

        // Rear Entrance Door
        const doorImg = spriteManager.images['door_entrance_glass_wood_frame'];
        if (doorImg && doorImg.complete && doorImg.naturalWidth > 0) {
            ctx.drawImage(doorImg, Math.floor((w / 2) - (doorImg.width / 2)), -15);
        }

        ctx.imageSmoothingEnabled = true;

        const stageX = 250;
        const stageY = 310;
        const ovenX = w - 235;
        const ovenY = 275;
        const beerBaseX = 245;
        const beerBaseY = 650;
        const cafeBaseX = w - 245;
        const cafeBaseY = 650;

        // Draw Seasonal Wall Bunting, Doorway Wreaths/Flags & Center Rug
        this.drawSeasonalFestivities(ctx, w, h, season, seasonStage, time, beerBaseX, beerBaseY, cafeBaseX, cafeBaseY);

        // Draw Seasonal & Gameplay-Reactive Law Brewing Neon Sign
        this.drawNeonSign(state, 465, 80, 0.10, season);

        // 2. AMBIENT FLOOR LIGHTING
        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        const ovenGlow = ctx.createRadialGradient(ovenX - 15, ovenY - 10, 8, ovenX - 15, ovenY - 10, 115);
        ovenGlow.addColorStop(0, `rgba(251, 146, 60, ${0.42 + Math.sin(time * 6) * 0.08})`);
        ovenGlow.addColorStop(0.5, 'rgba(234, 88, 12, 0.18)');
        ovenGlow.addColorStop(1, 'rgba(234, 88, 12, 0)');
        ctx.fillStyle = ovenGlow;
        ctx.beginPath(); ctx.ellipse(ovenX - 15, ovenY - 10, 115, 58, 0, 0, Math.PI * 2); ctx.fill();

        const stagePulse = 0.38 + Math.sin(time * 4) * 0.08;
        const stageGlow = ctx.createRadialGradient(stageX, stageY - 15, 10, stageX, stageY - 15, 135);
        stageGlow.addColorStop(0, `rgba(192, 132, 252, ${stagePulse})`);
        stageGlow.addColorStop(0.55, `rgba(56, 189, 248, ${stagePulse * 0.55})`);
        stageGlow.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = stageGlow;
        ctx.beginPath(); ctx.ellipse(stageX, stageY - 15, 135, 68, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // 3. PERFECTLY ALIGNED U-COUNTERS & CALIBRATED ISOMETRIC DEPTH SORTING (renderY)
        let roomProps = [
            // --- ZONE A: STAGE & JUKEBOX ---
            // renderY: stageY - 58 ensures dancers on the stage deck (y: 275..305) always render ON TOP of the stage!
            { type: 'stage_small_lights', x: stageX, y: stageY, renderY: stageY - 58, scale: 0.88, rx: 95, ry: 48, hitOffsetY: -35, allowStage: true },
            { type: 'jukebox', x: stageX + 130, y: stageY - 30, renderY: stageY - 44, scale: 0.78, rx: 45, ry: 30, hitOffsetY: -22 },

            // --- ZONE B: KITCHEN & SHELF ---
            { type: 'bookshelf_wall_cafe', x: (w / 2) + 205, y: 205, renderY: 140, scale: 0.76 },
            { type: 'pizza_oven_brick', x: ovenX, y: ovenY, renderY: ovenY - 22, scale: 0.85, flipX: true, rx: 82, ry: 45, hitOffsetY: -35 },

            // --- ZONE C: LOUNGE ---
            { type: 'lamp_floor_rattan', x: 115, y: 450, renderY: 434, scale: 0.78, rx: 38, ry: 25, hitOffsetY: -18 },
            { type: venueTier >= 2 ? 'booth_sofa_double' : 'booth_leather', x: 235, y: 465, renderY: 442, scale: 0.84, rx: 86, ry: 46, hitOffsetY: -35 },

            // --- ZONE D: GAME FLOOR ---
            { type: 'pool_table', x: w / 2, y: 420, renderY: 396, scale: 0.88, rx: 112, ry: 56, hitOffsetY: -38 },

            // --- ZONE E: LEFT BEER BAR (Flushed U-Shape) ---
            { type: 'bar_counter_straight', x: beerBaseX + 92, y: beerBaseY - 25, renderY: beerBaseY - 45, scale: 0.90, flipX: false, rx: 82, ry: 44, hitOffsetY: -32 },
            { type: 'bar_counter_corner', x: beerBaseX, y: beerBaseY, renderY: beerBaseY - 22, scale: 0.90, flipX: false, rx: 82, ry: 44, hitOffsetY: -32 },
            { type: 'beer_tap_tower', x: beerBaseX + 72, y: beerBaseY - 96, renderY: beerBaseY - 20, scale: 0.74 },
            { type: 'beer_mugs_group', x: beerBaseX - 5, y: beerBaseY - 90, renderY: beerBaseY - 19, scale: 0.30 },
            // 3 Barstools in front of the Beer U-Counter (renderY calibrated to stool base)
            { type: 'stool_bar_metal_row', x: beerBaseX + 120, y: beerBaseY + 30, renderY: beerBaseY + 2, scale: 0.82 },

            // --- ZONE F: RIGHT COFFEE BAR (Flushed U-Shape — Exact Coordinates Preserved) ---
            { type: 'bar_counter_straight', x: cafeBaseX - 92, y: cafeBaseY - 25, renderY: cafeBaseY - 45, scale: 0.90, flipX: true, rx: 82, ry: 44, hitOffsetY: -32 },
            { type: 'bar_counter_corner', x: cafeBaseX, y: cafeBaseY, renderY: cafeBaseY - 22, scale: 0.90, flipX: true, rx: 82, ry: 44, hitOffsetY: -32 },
            { type: 'espresso_machine_commercial', x: cafeBaseX - 75, y: cafeBaseY - 115, renderY: cafeBaseY - 20, scale: 0.40, flipX: false },
            { type: 'macaron_tower', x: cafeBaseX - 10, y: cafeBaseY - 92, renderY: cafeBaseY - 19, scale: 0.35 },
            { type: 'grinder_coffee', x: cafeBaseX + 32, y: cafeBaseY - 88, renderY: cafeBaseY - 18, scale: 0.35 },
            { type: 'stool_wood_high', x: cafeBaseX - 145, y: cafeBaseY - 10, renderY: cafeBaseY - 26, scale: 0.58, flipX: true },

            // --- ZONE G: HANGING PLANTS ---
            { type: 'plant_hanging_rope_pot', x: 115, y: 165, scale: 0.68, renderY: 9999 },
            { type: 'plant_hanging_rope_pot', x: w - 115, y: 165, scale: 0.68, renderY: 9999 },

            // Mounted Dartboard on the Right Wall (Locked to wall depth so patrons never clip behind it)
            { type: 'dartboard_mounted', x: w - 100, y: 350, renderY: 180, scale: 0.78, flipX: false }
        ];

        // 4. SEASONAL DEPTH-SORTED HERO PROPS
        if (season === 'winter') {
            roomProps.push({ customType: 'christmas_tree', x: 525, y: 265, renderY: 255, rx: 52, ry: 28, hitOffsetY: -8 });
        } else if (season === 'fall') {
            roomProps.push({ customType: 'oktoberfest_statue', x: 525, y: 265, renderY: 255, rx: 48, ry: 26, hitOffsetY: -10 });
            if (seasonStage >= 2) {
                roomProps.push({ customType: 'jack_o_lantern', x: (w / 2) - 96, y: 185, renderY: 178, scale: 1.0, rx: 24, ry: 14 });
                roomProps.push({ customType: 'jack_o_lantern', x: (w / 2) + 96, y: 185, renderY: 178, scale: 0.9, rx: 22, ry: 14 });
                roomProps.push({ customType: 'jack_o_lantern', x: stageX - 95, y: stageY + 10, renderY: stageY + 2, scale: 1.05, rx: 25, ry: 15 });
            }
            if (seasonStage >= 3) {
                roomProps.push({ customType: 'jack_o_lantern', x: ovenX + 95, y: ovenY + 12, renderY: ovenY + 4, scale: 0.95, rx: 24, ry: 14 });
            }
        } else if (season === 'spring') {
            if (seasonStage >= 2) {
                roomProps.push({ customType: 'easter_bunny', x: 525, y: 265, renderY: 255, rx: 42, ry: 24, hitOffsetY: -8 });
            }
        } else if (season === 'summer') {
            if (seasonStage >= 2) {
                roomProps.push({ customType: 'summer_heatwave', x: 525, y: 265, renderY: 255, rx: 48, ry: 24, hitOffsetY: -8 });
            }
        }

        // 5. LEVEL-BASED PROGRESSION SWAPS
        if (venueTier >= 3) {
            roomProps.push({ type: 'table_family_long', x: w - 235, y: 410, renderY: 386, scale: 0.82, rx: 88, ry: 48, hitOffsetY: -32 });
            roomProps.push({ type: 'cake_display_case_curved', x: w - 415, y: cafeBaseY - 82, renderY: cafeBaseY - 98, scale: 0.76, rx: 62, ry: 36, hitOffsetY: -25 });
        } else {
            roomProps.push({ type: 'table_high_round', x: w - 265, y: 435, renderY: 414, scale: 0.82, rx: 56, ry: 34, hitOffsetY: -25 });
            roomProps.push({ type: 'stool_wood_high', x: w - 330, y: 435, renderY: 418, scale: 0.60, flipX: true });
        }

        if (venueTier >= 2) {
            roomProps.push({ type: 'coat_hook_stand', x: (w / 2) + 115, y: 210, renderY: 198, scale: 0.72, rx: 28, ry: 18, hitOffsetY: -12 });
        }

        state.obstacles = roomProps
            .filter(p => p.rx && p.ry)
            .map(p => ({
                x: p.x,
                y: p.y + (p.hitOffsetY || 0),
                rx: p.rx,
                ry: p.ry,
                allowStage: Boolean(p.allowStage)
            }));

        state.nav = {
            door: { x: w / 2, y: 132 },
            dartboardTarget: { x: w - 100, y: 295 }
        };

        // 6. MERGE & DEPTH-SORT RENDERABLES
        let renderables = [];
        roomProps.forEach(p => { p.isProp = true; renderables.push(p); });

        const activePatrons = state.patrons || state.entities || state.customers || [];
        activePatrons.forEach(p => { p.isProp = false; renderables.push(p); });

        renderables.sort((a, b) => (a.renderY || a.y) - (b.renderY || b.y));

        // 7. UNIFIED RENDER LOOP
        renderables.forEach(item => {
            if (item.isProp) {
                if (item.customType) {
                    this.drawCustomSeasonalProp(ctx, item, seasonStage, time);
                    return;
                }

                ctx.globalAlpha = 1.0;
                const propImg = spriteManager.images[item.type];

                if (propImg && propImg.complete && propImg.naturalWidth > 0) {
                    const pScale = item.scale || 1.0;
                    const drawW = propImg.width * pScale;
                    const drawH = propImg.height * pScale;

                    ctx.save();
                    ctx.translate(item.x, item.y);

                    ctx.shadowColor = 'rgba(0, 0, 0, 0.42)';
                    ctx.shadowBlur = 10;
                    ctx.shadowOffsetY = 5;

                    if (item.flipX) {
                        ctx.scale(-1, 1);
                    }

                    ctx.drawImage(propImg, -drawW / 2, -drawH, drawW, drawH);
                    ctx.restore();

                    this.drawExistingSpriteEnhancements(ctx, item, season, seasonStage, time);
                }
            } else {
                // --- DRAW PATRONS & CRAVING SPEECH BUBBLES ---
                const px = item.x || 0;
                const py = item.y || 0;
                let scale = 1.55 + (py / h) * 0.95;
                if (item.rosterKey === 'kid') scale *= 0.65;

                const drawW = 64 * scale;
                const drawH = 64 * scale;
                const patronConfig = typeof PATRON_ROSTER !== 'undefined' ? PATRON_ROSTER[item.rosterKey] : null;
                const patronAlpha = item.alpha !== undefined ? item.alpha : 1.0;

                if (patronConfig && patronConfig.isBoss) {
                    ctx.save();
                    ctx.globalCompositeOperation = 'screen';
                    ctx.globalAlpha = patronAlpha;
                    const aura = ctx.createRadialGradient(px, py, 0, px, py, drawW * 1.2);
                    aura.addColorStop(0, 'rgba(239, 68, 68, 0.5)');
                    aura.addColorStop(1, 'rgba(239, 68, 68, 0)');
                    ctx.fillStyle = aura;
                    ctx.beginPath(); ctx.ellipse(px, py, drawW * 1.2, drawH * 0.4, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.restore();
                }

                ctx.globalAlpha = patronAlpha;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
                ctx.beginPath(); ctx.ellipse(px, py, drawW * 0.35, 10 * scale, 0, 0, Math.PI * 2); ctx.fill();

                const drawX = px - (drawW / 2);
                const drawY = py - drawH;
                if (typeof spriteManager !== 'undefined' && spriteManager.isLoaded && item.rosterKey) {
                    let spriteState = item.spriteRow || 'walk';
                    let dir = item.facing || 'DOWN';
                    let rawFrame = Math.floor(item.animFrame || 0);

                    let maxFrames = 9;
                    if (spriteState === 'spellcast') maxFrames = 7;
                    if (spriteState === 'thrust') maxFrames = 8;
                    if (spriteState === 'slash') maxFrames = 6;
                    if (spriteState === 'shoot') maxFrames = 13;

                    ctx.save();
                    ctx.translate(drawX, drawY);
                    ctx.scale(scale, scale);
                    ctx.globalAlpha = patronAlpha;
                    spriteManager.drawSprite(ctx, item.rosterKey, spriteState, dir, rawFrame % maxFrames, 0, 0);
                    ctx.restore();
                }

                if (!item.isLeaving && (item.currentState === 'ENTER' || item.currentState === 'IDLE')) {
                    const bubbleY = drawY - (14 * scale);
                    let styleLookup = 'premium';
                    if (patronConfig && patronConfig.favoriteStyle) styleLookup = patronConfig.favoriteStyle.toLowerCase();
                    else if (patronConfig && patronConfig.craves) styleLookup = patronConfig.craves.join(' ').toLowerCase();

                    let bubbleColor = '#d97706'; let hintIcon = '⭐';
                    if (styleLookup.includes('ipa')) { bubbleColor = '#22c55e'; hintIcon = '🌿'; }
                    else if (styleLookup.includes('stout') || styleLookup.includes('imperial')) { bubbleColor = '#451a03'; hintIcon = '☕'; }
                    else if (styleLookup.includes('porter') || styleLookup.includes('ale') || styleLookup.includes('mild')) { bubbleColor = '#b45309'; hintIcon = '🍺'; }
                    else if (styleLookup.includes('sour')) { bubbleColor = '#f43f5e'; hintIcon = '🍒'; }
                    else if (styleLookup.includes('lager') || styleLookup.includes('pilsner') || styleLookup.includes('oktoberfest')) { bubbleColor = '#facc15'; hintIcon = '🍻'; }
                    else if (styleLookup.includes('saison')) { bubbleColor = '#fb923c'; hintIcon = '🌾'; }
                    else if (styleLookup.includes('soda') || styleLookup.includes('mocktail')) { bubbleColor = '#38bdf8'; hintIcon = '🥤'; }
                    else if (styleLookup.includes('cocktail')) { bubbleColor = '#c084fc'; hintIcon = '🍸'; }

                    const bubbleSize = Math.max(28, 18 * scale);
                    ctx.globalAlpha = patronAlpha;
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                    ctx.beginPath(); ctx.arc(px, bubbleY - (bubbleSize / 2), bubbleSize / 2, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.moveTo(px - 5, bubbleY - 2); ctx.lineTo(px + 5, bubbleY - 2); ctx.lineTo(px, bubbleY + 7); ctx.closePath(); ctx.fill();
                    ctx.strokeStyle = bubbleColor; ctx.lineWidth = 2.5;
                    ctx.beginPath(); ctx.arc(px, bubbleY - (bubbleSize / 2), bubbleSize / 2, Math.PI * 0.75, Math.PI * 0.25, false); ctx.lineTo(px, bubbleY + 7); ctx.closePath(); ctx.stroke();
                    ctx.font = `${Math.floor(bubbleSize * 0.55)}px Arial`;
                    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.fillText(hintIcon, px, bubbleY - (bubbleSize / 2) + 1);
                }

                ctx.globalAlpha = 1.0;
            }
        });

        // 8. COMPACT SHIFT & SEASON TIMER HUD
        const timeLeft = Math.max(0, Math.ceil(state.timeRemaining || state.timeLeft || 0));
        const seasonIcons = { spring: '🌸', summer: '🎆', fall: '🎃', winter: '🎄' };
        const sIcon = seasonIcons[season] || '🍻';
        ctx.fillStyle = 'rgba(9, 9, 11, 0.88)';
        ctx.beginPath(); ctx.roundRect((w / 2) - 80, 8, 160, 34, 8); ctx.fill();
        ctx.strokeStyle = isBossRound ? '#ef4444' : '#dc2626';
        ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#f4f4f5'; ctx.font = 'bold 17px Oswald'; ctx.textAlign = 'center';
        ctx.fillText(`${sIcon} SHIFT: ${timeLeft}s`, w / 2, 30);

        // 9. PROJECTILES
        (state.projectiles || []).forEach(p => {
            const px = p.x || 0; const py = p.y || 0; const pz = p.z || 0;
            const r = p.radius || 15; const renderY = py - pz;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; ctx.beginPath(); ctx.ellipse(px, py, r, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px + r * 0.75, renderY, r * 0.45, -Math.PI / 2, Math.PI / 2); ctx.stroke();

            const beerGrad = ctx.createLinearGradient(px - r, renderY - r, px + r, renderY + r);
            beerGrad.addColorStop(0, '#facc15'); beerGrad.addColorStop(1, '#ca8a04');
            if (p.type === 'porter' || p.type === 'stout') { beerGrad.addColorStop(0, '#451a03'); beerGrad.addColorStop(1, '#1c1917'); }
            else if (p.type === 'sour') { beerGrad.addColorStop(0, '#f43f5e'); beerGrad.addColorStop(1, '#9f1239'); }
            else if (p.type === 'soda' || p.type === 'mocktail') { beerGrad.addColorStop(0, '#38bdf8'); beerGrad.addColorStop(1, '#0284c7'); }

            ctx.fillStyle = beerGrad; ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.roundRect(px - r * 0.8, renderY - r, r * 1.6, r * 1.9, 4); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#ffffff';
            [[-r * 0.4, 0, r * 0.45], [0, -2, r * 0.55], [r * 0.4, 0, r * 0.45]].forEach(([ox, oy, rad]) => {
                ctx.beginPath();
                ctx.arc(px + ox, renderY - r + oy, rad, 0, Math.PI * 2);
                ctx.fill();
            });
        });

        // 10. AIMING LINE, FLOATING TEXT, PARTICLES & DARTS
        if (state.isAiming && state.aimStart && state.aimCurrent) {
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.75)'; ctx.lineWidth = 4; ctx.setLineDash([10, 10]);
            ctx.beginPath(); ctx.moveTo(state.aimStart.x, state.aimStart.y); ctx.lineTo(state.aimCurrent.x, state.aimCurrent.y); ctx.stroke();
            ctx.setLineDash([]);
        }

        (state.floatingTexts || []).forEach(ft => {
            ctx.save(); ctx.fillStyle = ft.color; ctx.globalAlpha = ft.alpha;
            ctx.font = 'bold 28px Oswald'; ctx.textAlign = 'center';
            ctx.strokeStyle = '#000000'; ctx.lineWidth = 4;
            ctx.strokeText(ft.text, ft.x, ft.y); ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        });

        (state.particles || []).forEach(p => {
            ctx.save();
            ctx.globalAlpha = Math.min(1, p.life * 1.5);
            if (p.type === 'coin') {
                ctx.fillStyle = '#facc15';
                ctx.beginPath();
                const spinWidth = 8 * Math.abs(Math.sin(p.life * 15));
                ctx.ellipse(p.x, p.y, Math.max(1, spinWidth), 8, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#ca8a04'; ctx.lineWidth = 1.5; ctx.stroke();
            }
            ctx.restore();
        });

        (state.darts || []).forEach(d => {
            const currentX = d.x + (d.targetX - d.x) * d.progress;
            const currentY = d.y + (d.targetY - d.y) * d.progress;
            ctx.save();
            ctx.translate(currentX, currentY);
            ctx.rotate(-Math.PI / 8);
            ctx.fillStyle = '#cbd5e1'; ctx.fillRect(-8, 0, 8, 2);
            ctx.fillStyle = '#0f172a'; ctx.fillRect(0, -1, 10, 4);
            ctx.fillStyle = '#ef4444';
            ctx.beginPath(); ctx.moveTo(10, 1); ctx.lineTo(16, -4); ctx.lineTo(16, 6); ctx.closePath(); ctx.fill();
            ctx.restore();
        });
    }

    // --- BREWING RENDERING (DEEP VISUAL & MERGE OVERHAUL) ---
    drawBrewing(state) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const time = Date.now() / 1000;

        if (!this.brewMergeEffects) this.brewMergeEffects = [];
        if (!this.brewTileAnims) this.brewTileAnims = {};
        if (!this.prevBrewGrid) this.prevBrewGrid = {};
        if (!this.brewSteamParticles) this.brewSteamParticles = [];

        const dragItem = (state.dragState && state.dragState.item) ? state.dragState.item : null;
        const dragX = state.dragState ? state.dragState.mouseX : -999;
        const dragY = state.dragState ? state.dragState.mouseY : -999;

        // 1. INDUSTRIAL CRAFT BREWHOUSE ENVIRONMENT BACKGROUND
        const bgGrad = ctx.createRadialGradient(w / 2, h * 0.45, 60, w / 2, h / 2, 820);
        bgGrad.addColorStop(0, '#27272a');
        bgGrad.addColorStop(0.55, '#141418');
        bgGrad.addColorStop(1, '#070709');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 80) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 0; y < h; y += 80) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        const lampGlow = ctx.createRadialGradient(
            state.gridOffset.x + (state.cols * state.tileSize) / 2,
            state.gridOffset.y - 40,
            10,
            state.gridOffset.x + (state.cols * state.tileSize) / 2,
            state.gridOffset.y + 160,
            420
        );
        lampGlow.addColorStop(0, 'rgba(251, 191, 36, 0.08)');
        lampGlow.addColorStop(1, 'rgba(251, 191, 36, 0)');
        ctx.fillStyle = lampGlow;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();

        // 2. DRAW THE 6 CUSTOM INGREDIENT DISPENSERS
        (state.sacks || []).forEach(sack => this.drawGeneratorSack(sack, time));

        // 3. DRAW THE STAINLESS STEEL MERGE TABLE & INTERACTIVE SLOTS
        const trayX = state.gridOffset.x - 14;
        const trayY = state.gridOffset.y - 14;
        const trayW = (state.cols * state.tileSize) + 28;
        const trayH = (state.rows * state.tileSize) + 28;

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 10;

        const trayGrad = ctx.createLinearGradient(trayX, trayY, trayX + trayW, trayY + trayH);
        trayGrad.addColorStop(0, '#3f3f46');
        trayGrad.addColorStop(0.15, '#27272a');
        trayGrad.addColorStop(0.5, '#18181b');
        trayGrad.addColorStop(0.85, '#27272a');
        trayGrad.addColorStop(1, '#09090b');

        ctx.fillStyle = trayGrad;
        ctx.strokeStyle = '#71717a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(trayX, trayY, trayW, trayH, 16);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(trayX + 4, trayY + 4, trayW - 8, trayH - 8, 12);
        ctx.stroke();

        const boltOffsets = [
            [trayX + 10, trayY + 10], [trayX + trayW - 10, trayY + 10],
            [trayX + 10, trayY + trayH - 10], [trayX + trayW - 10, trayY + trayH - 10]
        ];
        boltOffsets.forEach(([bx, by]) => {
            ctx.fillStyle = '#71717a';
            ctx.beginPath(); ctx.arc(bx, by, 3.2, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#18181b';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(bx - 2, by - 2); ctx.lineTo(bx + 2, by + 2); ctx.stroke();
        });

        const dragLevel = dragItem ? this.getIngredientLevel(dragItem) : 0;
        const canDragMerge = dragItem && dragLevel >= 1 && dragLevel < 5;
        let hoveredMergeTarget = null;

        for (let r = 0; r < state.rows; r++) {
            for (let c = 0; c < state.cols; c++) {
                const cellKey = `${r}_${c}`;
                const cellX = state.gridOffset.x + (c * state.tileSize);
                const cellY = state.gridOffset.y + (r * state.tileSize);
                const cellCenterX = cellX + state.tileSize / 2;
                const cellCenterY = cellY + state.tileSize / 2;
                const item = state.grid[r][c];

                // Detect Newly Merged or Newly Spawned Tiles for Tactile Bounce & Shockwave
                const prevSig = this.prevBrewGrid[cellKey];
                const currSig = item ? `${item.category}:${item.name}` : null;
                if (currSig && prevSig !== currSig) {
                    const currLv = this.getIngredientLevel(item);
                    const prevParts = prevSig ? prevSig.split(':') : null;
                    const prevLv = prevParts ? this.getIngredientLevel({ category: prevParts[0], name: prevParts[1] }) : 0;

                    if (prevSig && currLv > prevLv && currLv >= 2) {
                        this.brewTileAnims[cellKey] = { startTime: time, type: 'merge', level: currLv };
                        this.spawnMergeBurst(cellCenterX, cellCenterY, item.category, currLv);
                    } else if (!prevSig) {
                        this.brewTileAnims[cellKey] = { startTime: time, type: 'spawn', level: currLv };
                    }
                }
                this.prevBrewGrid[cellKey] = currSig;

                const isMatchingTarget = Boolean(
                    canDragMerge &&
                    item &&
                    item !== dragItem &&
                    item.name === dragItem.name &&
                    item.category === dragItem.category
                );

                const isHoveredCell = dragItem &&
                    dragX >= cellX && dragX < cellX + state.tileSize &&
                    dragY >= cellY && dragY < cellY + state.tileSize;

                ctx.save();
                const slotGrad = ctx.createLinearGradient(cellX, cellY, cellX, cellY + state.tileSize);
                slotGrad.addColorStop(0, '#09090b');
                slotGrad.addColorStop(1, '#18181b');
                ctx.fillStyle = slotGrad;
                ctx.strokeStyle = isMatchingTarget ? '#4ade80' : (isHoveredCell ? '#a1a1aa' : '#27272a');
                ctx.lineWidth = isMatchingTarget ? 2.5 : 1.8;
                ctx.beginPath();
                ctx.roundRect(cellX + 3, cellY + 3, state.tileSize - 6, state.tileSize - 6, 11);
                ctx.fill();
                ctx.stroke();

                if (!item) {
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(cellCenterX - 6, cellCenterY); ctx.lineTo(cellCenterX + 6, cellCenterY);
                    ctx.moveTo(cellCenterX, cellCenterY - 6); ctx.lineTo(cellCenterX, cellCenterY + 6);
                    ctx.stroke();
                }
                ctx.restore();

                if (item) {
                    let animScale = 1.0;
                    const anim = this.brewTileAnims[cellKey];
                    if (anim) {
                        const elapsed = time - anim.startTime;
                        const duration = anim.type === 'merge' ? 0.38 : 0.22;
                        if (elapsed < duration) {
                            const p = elapsed / duration;
                            const amplitude = anim.type === 'merge' ? 0.34 : 0.16;
                            animScale = 1 + Math.sin(p * Math.PI) * amplitude * (1 - p * 0.4);
                        } else {
                            delete this.brewTileAnims[cellKey];
                        }
                    }

                    const dimTile = Boolean(dragItem && !isMatchingTarget && item !== dragItem);

                    ctx.save();
                    if (dimTile) ctx.globalAlpha = 0.80;
                    if (animScale !== 1.0) {
                        ctx.translate(cellCenterX, cellCenterY);
                        ctx.scale(animScale, animScale);
                        ctx.translate(-cellCenterX, -cellCenterY);
                    }

                    this.drawIngredientTile(cellX, cellY, state.tileSize, item, false, {
                        isMergeTarget: isMatchingTarget,
                        isHoveredTarget: Boolean(isMatchingTarget && isHoveredCell),
                        time
                    });
                    ctx.restore();

                    if (isMatchingTarget && isHoveredCell) {
                        hoveredMergeTarget = { item, cellCenterX, cellCenterY, level: dragLevel };
                    }
                }
            }
        }

        // Render Active Merge Shockwaves & Sparkle Particles Over the Grid
        this.updateAndDrawMergeEffects(ctx, time);

        // 4. DRAW THE 3-KETTLE BREWHOUSE LINE
        const unlockedCount = (typeof playerState !== 'undefined') ? playerState.unlockedKettles : 1;

        if (unlockedCount > 1 && state.kettles && state.kettles.length >= unlockedCount) {
            const firstK = state.kettles[0];
            const lastUnlockedK = state.kettles[unlockedCount - 1];
            const pipeStartX = firstK.x + 30;
            const pipeEndX = lastUnlockedK.x + lastUnlockedK.w - 30;
            const pipeY = firstK.y + 52;

            this.ctx.strokeStyle = unlockedCount === 3 ? '#f59e0b' : '#b45309';
            this.ctx.lineWidth = 12;
            this.ctx.lineCap = 'round';
            this.ctx.beginPath();
            this.ctx.moveTo(pipeStartX, pipeY);
            this.ctx.lineTo(pipeEndX, pipeY);
            this.ctx.stroke();

            this.ctx.strokeStyle = unlockedCount === 3 ? '#fef08a' : '#fbbf24';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(pipeStartX, pipeY - 2);
            this.ctx.lineTo(pipeEndX, pipeY - 2);
            this.ctx.stroke();
        }

        (state.kettles || []).forEach((kettle, idx) => {
            const kx = kettle.x;
            const ky = kettle.y;
            const kw = kettle.w;
            const kh = kettle.h;
            const isUnlocked = idx < unlockedCount;

            if (!isUnlocked) {
                this.ctx.fillStyle = 'rgba(24, 24, 27, 0.68)';
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

            const isHoveringKettle = Boolean(
                dragItem &&
                dragX >= kx && dragX <= kx + kw &&
                dragY >= ky && dragY <= ky + kh
            );

            const kettleBodyGrad = this.ctx.createLinearGradient(kx, ky, kx + kw, ky);
            let rimColor = '#71717a';
            let borderStroke = '#71717a';
            let rivetColor = '#a1a1aa';

            if (idx === 0) {
                kettleBodyGrad.addColorStop(0, '#27272a');
                kettleBodyGrad.addColorStop(0.25, '#52525b');
                kettleBodyGrad.addColorStop(0.5, '#3f3f46');
                kettleBodyGrad.addColorStop(0.85, '#27272a');
                kettleBodyGrad.addColorStop(1, '#18181b');
                rimColor = unlockedCount >= 2 ? '#d97706' : '#71717a';
                borderStroke = unlockedCount === 3 ? '#facc15' : '#71717a';
                rivetColor = unlockedCount >= 2 ? '#fbbf24' : '#a1a1aa';
            } else if (idx === 1) {
                kettleBodyGrad.addColorStop(0, '#451a03');
                kettleBodyGrad.addColorStop(0.25, '#b45309');
                kettleBodyGrad.addColorStop(0.5, '#d97706');
                kettleBodyGrad.addColorStop(0.8, '#92400e');
                kettleBodyGrad.addColorStop(1, '#451a03');
                rimColor = '#f59e0b';
                borderStroke = '#fbbf24';
                rivetColor = '#fde68a';
            } else {
                kettleBodyGrad.addColorStop(0, '#0f172a');
                kettleBodyGrad.addColorStop(0.25, '#475569');
                kettleBodyGrad.addColorStop(0.5, '#64748b');
                kettleBodyGrad.addColorStop(0.8, '#334155');
                kettleBodyGrad.addColorStop(1, '#0f172a');
                rimColor = '#38bdf8';
                borderStroke = '#38bdf8';
                rivetColor = '#7dd3fc';
            }

            ctx.save();
            if (isHoveringKettle) {
                ctx.shadowColor = '#4ade80';
                ctx.shadowBlur = 18;
            }
            this.ctx.fillStyle = kettleBodyGrad;
            this.ctx.strokeStyle = isHoveringKettle ? '#4ade80' : borderStroke;
            this.ctx.lineWidth = isHoveringKettle ? 3.5 : 2.5;
            this.ctx.beginPath();
            this.ctx.moveTo(kx, ky + 18);
            this.ctx.lineTo(kx + kw, ky + 18);
            this.ctx.bezierCurveTo(kx + kw + 6, ky + kh - 8, kx + kw - 10, ky + kh + 10, kx + kw - 20, ky + kh + 10);
            this.ctx.lineTo(kx + 20, ky + kh + 10);
            this.ctx.bezierCurveTo(kx + 10, ky + kh + 10, kx - 6, ky + kh - 8, kx, ky + 18);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
            ctx.restore();

            this.ctx.fillStyle = rivetColor;
            for (let rx = kx + 18; rx < kx + kw - 15; rx += 28) {
                this.ctx.beginPath();
                this.ctx.arc(rx, ky + 36, 2.2, 0, Math.PI * 2);
                this.ctx.fill();
            }

            const hasItems = kettle.items.length > 0;

            if (idx === 1 || (idx === 0 && unlockedCount >= 2)) {
                const gx = kx + 2;
                const gy = ky + 58;
                this.ctx.fillStyle = '#fef3c7';
                this.ctx.strokeStyle = '#b45309';
                this.ctx.lineWidth = 2.5;
                this.ctx.beginPath();
                this.ctx.arc(gx, gy, 10, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();

                this.ctx.strokeStyle = '#dc2626';
                this.ctx.lineWidth = 1.8;
                this.ctx.beginPath();
                this.ctx.moveTo(gx, gy);
                const needleJitter = hasItems ? Math.sin(time * 12) * 1.5 : 0;
                this.ctx.lineTo(hasItems ? gx + 6 : gx - 5, (hasItems ? gy - 5 : gy - 4) + needleJitter);
                this.ctx.stroke();
            }

            if (idx === 2) {
                this.ctx.fillStyle = hasItems ? '#22d3ee' : '#1e293b';
                this.ctx.strokeStyle = '#94a3b8';
                this.ctx.lineWidth = 1.5;
                this.ctx.beginPath();
                this.ctx.roundRect(kx + 12, ky + 44, 8, 42, 4);
                this.ctx.fill();
                this.ctx.stroke();

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

            this.ctx.fillStyle = isHoveringKettle ? '#4ade80' : rimColor;
            this.ctx.strokeStyle = '#18181b';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.ellipse(kx + (kw / 2), ky + 18, (kw / 2) + 2, 16, 0, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();

            const wortGrad = this.ctx.createRadialGradient(
                kx + (kw / 2), ky + 18, 4,
                kx + (kw / 2), ky + 18, kw / 2
            );
            if (hasItems) {
                wortGrad.addColorStop(0, '#fbbf24');
                wortGrad.addColorStop(0.65, '#b45309');
                wortGrad.addColorStop(1, '#1c1917');
            } else {
                wortGrad.addColorStop(0, '#27272a');
                wortGrad.addColorStop(1, '#09090b');
            }
            this.ctx.fillStyle = wortGrad;
            this.ctx.beginPath();
            this.ctx.ellipse(kx + (kw / 2), ky + 18, (kw / 2) - 6, 12, 0, 0, Math.PI * 2);
            this.ctx.fill();

            if (hasItems) {
                ctx.save();
                for (let b = 0; b < 5; b++) {
                    const bx = kx + (kw * 0.25) + ((b * 37 + Math.sin(time * 3 + b) * 12) % (kw * 0.5));
                    const by = ky + 15 + Math.cos(time * 4 + b) * 4;
                    ctx.fillStyle = 'rgba(254, 243, 199, 0.55)';
                    ctx.beginPath();
                    ctx.arc(bx, by, 2.2 + (b % 2), 0, Math.PI * 2);
                    ctx.fill();
                }
                for (let s = 0; s < 3; s++) {
                    const phase = (time * 0.8 + s * 0.33) % 1;
                    const sx = kx + (kw * 0.35) + s * 28 + Math.sin(time * 2 + s) * 6;
                    const sy = ky + 10 - phase * 26;
                    ctx.fillStyle = `rgba(255, 255, 255, ${(1 - phase) * 0.22})`;
                    ctx.beginPath();
                    ctx.arc(sx, sy, 6 + phase * 8, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }

            const count = kettle.items.length;
            if (count > 0) {
                const poolStartX = kx + 22;
                const poolWidth = kw - 110;
                const tileW = Math.min(44, Math.floor(poolWidth / count) - 2);
                const spacing = Math.min(44, Math.floor(poolWidth / count));

                kettle.items.forEach((item, index) => {
                    const itemX = poolStartX + (index * spacing);
                    const bobY = ky + 28 + Math.sin(time * 4 + index) * 2.5;
                    this.drawIngredientTile(itemX, bobY, Math.max(30, tileW), item, true, { time });
                });

                this.ctx.fillStyle = '#e4e4e7';
                this.ctx.font = '10px Inter';
                this.ctx.textAlign = 'left';
                this.ctx.fillText(`${count} in vat (click to undo)`, kx + 24, ky + kh);

                if (typeof gameRecipes !== 'undefined') {
                    const ingNames = kettle.items.map(i => i.name);
                    let pillText = '⚠️ Need at least 2 ingredients';
                    let pillBg = 'rgba(127, 29, 29, 0.94)';
                    let pillBorder = '#ef4444';

                    if (kettle.items.length >= 2) {
                        const preview = gameRecipes.evaluateBrew(ingNames);
                        if (preview) {
                            const isKnown = (typeof playerState !== 'undefined') && playerState.unlockedRecipes.includes(preview.name);
                            const styleIcon = gameRecipes.getStyleIcon(preview.name, preview.type);

                            if (preview.type === 'soda' || preview.type === 'crowd_control' || isKnown) {
                                pillText = `${styleIcon} ${preview.name}`;
                                pillBg = 'rgba(20, 83, 45, 0.95)';
                                pillBorder = '#4ade80';
                            } else {
                                pillText = '✨ Mystery Valid Recipe!';
                                pillBg = 'rgba(88, 28, 135, 0.95)';
                                pillBorder = '#c084fc';
                            }
                        } else {
                            pillText = '❌ Trash Batch';
                            pillBg = 'rgba(127, 29, 29, 0.94)';
                            pillBorder = '#ef4444';
                        }
                    }

                    this.ctx.fillStyle = pillBg;
                    this.ctx.strokeStyle = pillBorder;
                    this.ctx.lineWidth = 1.8;
                    this.ctx.beginPath();
                    this.ctx.roundRect(kx + 12, ky - 13, kw - 24, 21, 10);
                    this.ctx.fill();
                    this.ctx.stroke();

                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.font = 'bold 11px Inter';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText(pillText, kx + (kw / 2), ky + 1);
                }
            } else {
                const emptyLabel = isHoveringKettle
                    ? '⬇ DROP TO ADD TO KETTLE'
                    : (idx === 0 ? 'STEEL TUN #1' : (idx === 1 ? 'COPPER KETTLE #2' : 'SMART VAT #3'));
                this.ctx.fillStyle = isHoveringKettle ? '#4ade80' : 'rgba(255, 255, 255, 0.45)';
                this.ctx.font = 'bold 11px Inter';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(emptyLabel, kx + (kw / 2) - 30, ky + 66);
            }

            let brewCost = 0;
            if (typeof gameRecipes !== 'undefined') {
                kettle.items.forEach(item => {
                    brewCost += gameRecipes.getIngredientCost(item.name);
                });
            }

            const btnGrad = this.ctx.createLinearGradient(kettle.btnX, kettle.btnY, kettle.btnX, kettle.btnY + kettle.btnH);
            if (hasItems) {
                btnGrad.addColorStop(0, '#22c55e');
                btnGrad.addColorStop(1, '#15803d');
            } else {
                btnGrad.addColorStop(0, '#3f3f46');
                btnGrad.addColorStop(1, '#18181b');
            }

            this.ctx.fillStyle = btnGrad;
            this.ctx.strokeStyle = hasItems ? '#86efac' : borderStroke;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.roundRect(kettle.btnX, kettle.btnY, kettle.btnW, kettle.btnH, 7);
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

        // 5B. DRAW THE INDUSTRIAL FLOOR DRAIN
        if (state.drain) {
            const dx = state.drain.x;
            const dy = state.drain.y;
            const dw = state.drain.w;
            const dh = state.drain.h;
            const isHoveringDrain = Boolean(
                dragItem &&
                dragX >= dx && dragX <= dx + dw &&
                dragY >= dy && dragY <= dy + dh
            );

            this.ctx.fillStyle = isHoveringDrain ? '#280909' : '#18181b';
            this.ctx.strokeStyle = isHoveringDrain ? '#ef4444' : '#52525b';
            this.ctx.lineWidth = isHoveringDrain ? 3.5 : 3;
            this.ctx.beginPath();
            this.ctx.roundRect(dx, dy, dw, dh, 12);
            this.ctx.fill();
            this.ctx.stroke();

            const gcx = dx + (dw / 2);
            const gcy = dy + 44;
            this.ctx.fillStyle = '#09090b';
            this.ctx.strokeStyle = isHoveringDrain ? '#f87171' : '#71717a';
            this.ctx.lineWidth = 2.5;
            this.ctx.beginPath();
            this.ctx.arc(gcx, gcy, 24, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();

            for (let gx = -14; gx <= 14; gx += 7) {
                this.ctx.beginPath();
                this.ctx.moveTo(gcx + gx, gcy - 18);
                this.ctx.lineTo(gcx + gx, gcy + 18);
                this.ctx.stroke();
            }

            this.ctx.fillStyle = isHoveringDrain ? '#fca5a5' : '#a1a1aa';
            this.ctx.font = 'bold 11px Oswald';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(isHoveringDrain ? 'RELEASE TO DUMP' : 'FLOOR DRAIN', gcx, dy + dh - 20);
            this.ctx.font = '10px Inter';
            this.ctx.fillStyle = isHoveringDrain ? '#f87171' : '#71717a';
            this.ctx.fillText('(Drag here to dump)', gcx, dy + dh - 7);
        }

        // 6. DRAW THE ITEM CURRENTLY BEING DRAGGED + LIVE MERGE PREVIEW TOOLTIP
        if (dragItem) {
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
            ctx.shadowBlur = 18;
            ctx.shadowOffsetY = 10;

            const liftedSize = state.tileSize * 1.08;
            this.drawIngredientTile(
                dragX - (liftedSize / 2),
                dragY - (liftedSize / 2),
                liftedSize,
                dragItem,
                false,
                { isDragged: true, time }
            );
            ctx.restore();

            if (hoveredMergeTarget && typeof gameRecipes !== 'undefined' && gameRecipes.chains[dragItem.category]) {
                const nextName = gameRecipes.chains[dragItem.category][hoveredMergeTarget.level];
                if (nextName) {
                    ctx.save();
                    const pillW = 168;
                    const pillH = 26;
                    const px = Math.max(12, Math.min(w - pillW - 12, dragX - pillW / 2));
                    const py = Math.max(12, dragY - (state.tileSize * 0.78) - 18);

                    ctx.fillStyle = 'rgba(6, 78, 59, 0.96)';
                    ctx.strokeStyle = '#4ade80';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.roundRect(px, py, pillW, pillH, 13);
                    ctx.fill();
                    ctx.stroke();

                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 11px Inter';
                    ctx.textAlign = 'center';
                    ctx.fillText(`⚡ MERGE → ${nextName} (L${hoveredMergeTarget.level + 1})`, px + pillW / 2, py + 17);
                    ctx.restore();
                }
            }
        }

        // 7. DRAW BREWING FLOATING FEEDBACK POPUPS
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

    // --- HELPER: GET INGREDIENT TIER LEVEL (1-5, or 0 for Specialty) ---
    getIngredientLevel(item) {
        if (!item || typeof gameRecipes === 'undefined' || !gameRecipes.chains[item.category]) return 0;
        return gameRecipes.chains[item.category].indexOf(item.name) + 1;
    }

    // --- HELPER: SPAWN TACTILE MERGE SHOCKWAVE & SPARKLE BURST ---
    spawnMergeBurst(cx, cy, category, newLevel) {
        if (!this.brewMergeEffects) this.brewMergeEffects = [];
        const categoryColors = {
            Water: '#38bdf8',
            Grain: '#facc15',
            Adjunct: '#fb923c',
            Yeast: '#a3e635',
            Hops: '#4ade80'
        };
        const color = newLevel === 5 ? '#fde047' : (categoryColors[category] || '#38bdf8');

        const particles = [];
        const count = 12 + newLevel * 2;
        for (let i = 0; i < count; i++) {
            const ang = (i / count) * Math.PI * 2 + (Math.random() * 0.3);
            const spd = 55 + Math.random() * 85;
            particles.push({
                x: cx,
                y: cy,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                size: 2.5 + Math.random() * 2.5,
                color: i % 2 === 0 ? '#ffffff' : color
            });
        }

        this.brewMergeEffects.push({
            cx,
            cy,
            color,
            startTime: Date.now() / 1000,
            duration: 0.45,
            particles
        });
    }

    // --- HELPER: RENDER ACTIVE MERGE SHOCKWAVES ---
    updateAndDrawMergeEffects(ctx, time) {
        if (!this.brewMergeEffects || this.brewMergeEffects.length === 0) return;

        this.brewMergeEffects = this.brewMergeEffects.filter(fx => {
            const elapsed = time - fx.startTime;
            if (elapsed >= fx.duration) return false;

            const p = elapsed / fx.duration;
            const alpha = 1 - p;

            ctx.save();
            ctx.globalCompositeOperation = 'screen';

            ctx.strokeStyle = fx.color;
            ctx.lineWidth = 4 * alpha;
            ctx.globalAlpha = alpha * 0.9;
            ctx.beginPath();
            ctx.arc(fx.cx, fx.cy, 12 + p * 46, 0, Math.PI * 2);
            ctx.stroke();

            fx.particles.forEach(pt => {
                const px = fx.cx + pt.vx * elapsed;
                const py = fx.cy + pt.vy * elapsed;
                ctx.fillStyle = pt.color;
                ctx.globalAlpha = alpha;
                ctx.beginPath();
                ctx.arc(px, py, pt.size * (1 - p * 0.5), 0, Math.PI * 2);
                ctx.fill();
            });

            ctx.restore();
            return true;
        });
    }

    // --- INDUSTRIAL DISPENSER HOPPERS & SACKS ---
    drawGeneratorSack(sack, time = Date.now() / 1000) {
        const ctx = this.ctx;
        const { x, y, w, h, category, color, cost } = sack;
        const cx = x + (w / 2);
        const cy = y + 32;

        ctx.save();

        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;

        const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
        bgGrad.addColorStop(0, '#3f3f46');
        bgGrad.addColorStop(0.18, '#27272a');
        bgGrad.addColorStop(0.82, '#141417');
        bgGrad.addColorStop(1, '#09090b');
        ctx.fillStyle = bgGrad;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 12);
        ctx.fill();
        ctx.stroke();
        ctx.shadowColor = 'transparent';

        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        [[x + 6, y + 6], [x + w - 6, y + 6]].forEach(([rx, ry]) => {
            ctx.beginPath(); ctx.arc(rx, ry, 1.8, 0, Math.PI * 2); ctx.fill();
        });

        const glowGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 26);
        glowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
        glowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath(); ctx.arc(cx, cy, 26, 0, Math.PI * 2); ctx.fill();

        if (category === 'Water') {
            ctx.strokeStyle = '#60a5fa';
            ctx.lineWidth = 5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(cx - 16, cy - 6);
            ctx.lineTo(cx + 4, cy - 6);
            ctx.quadraticCurveTo(cx + 12, cy - 6, cx + 12, cy + 4);
            ctx.stroke();

            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(cx - 5, cy - 14);
            ctx.lineTo(cx + 9, cy - 14);
            ctx.stroke();

            const dropOffset = (time * 18) % 9;
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(cx + 12, cy + 8 + dropOffset, 3.8, 0, Math.PI * 2);
            ctx.fill();
        } else if (category === 'Grain' || category === 'Adjunct') {
            ctx.fillStyle = category === 'Grain' ? '#a16207' : '#9a3412';
            ctx.strokeStyle = '#1c1917';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(cx - 18, cy - 6, 36, 24, 6);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.ellipse(cx, cy - 6, 16, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.strokeStyle = 'rgba(254, 240, 138, 0.45)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(cx - 12, cy + 6);
            ctx.lineTo(cx + 12, cy + 6);
            ctx.stroke();
        } else if (category === 'Yeast') {
            ctx.fillStyle = 'rgba(163, 230, 53, 0.25)';
            ctx.strokeStyle = '#d9f99d';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(cx - 13, cy - 10, 26, 26, 5);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#a3e635';
            ctx.fillRect(cx - 11, cy + 2, 22, 12);

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(cx - 4, cy + 6 - ((time * 12) % 10), 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx + 5, cy + 8 - ((time * 15 + 4) % 10), 1.6, 0, Math.PI * 2);
            ctx.fill();
        } else if (category === 'Hops') {
            ctx.fillStyle = '#14532d';
            ctx.strokeStyle = '#4ade80';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(cx - 16, cy - 10, 32, 24, 4);
            ctx.fill();
            ctx.stroke();
            this.drawCustomIcon(cx, cy + 2, 'Hops', 'Citra', '#4ade80', 0.65, 3);
        } else {
            ctx.fillStyle = '#4c1d95';
            ctx.strokeStyle = '#c084fc';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(cx - 17, cy - 10, 34, 24, 4);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx - 15, cy - 8);
            ctx.lineTo(cx + 15, cy + 12);
            ctx.stroke();
            ctx.fillStyle = '#facc15';
            ctx.beginPath(); ctx.arc(cx, cy + 2, 4, 0, Math.PI * 2); ctx.fill();
        }

        ctx.fillStyle = 'rgba(9, 9, 11, 0.88)';
        ctx.beginPath();
        ctx.roundRect(x + 4, y + h - 31, w - 8, 27, 7);
        ctx.fill();

        ctx.fillStyle = '#f4f4f5';
        ctx.font = 'bold 10.5px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(category.toUpperCase(), cx, y + h - 18);

        ctx.fillStyle = color;
        ctx.font = 'bold 11px Inter';
        ctx.fillText(`$${cost || 1}`, cx, y + h - 6);

        ctx.restore();
    }

    // --- HIGH-DETAIL, HIGH-READABILITY INGREDIENT TILES ---
    drawIngredientTile(x, y, size, item, isMini = false, opts = {}) {
        const ctx = this.ctx;
        const time = opts.time || (Date.now() / 1000);
        const pad = isMini ? 3.5 : 4.5;
        const tx = x + pad;
        const ty = y + pad;
        const s = size - (pad * 2);

        const level = this.getIngredientLevel(item);
        const isMaxTier = level === 5;
        const isSpecialty = item.category === 'Specialty';

        const tierPalettes = {
            'Water': [
                { bgTop: '#134e4a', bgBot: '#042f2e', border: '#2dd4bf', icon: '#5eead4', accent: '#14b8a6' },
                { bgTop: '#1e3a8a', bgBot: '#0f172a', border: '#60a5fa', icon: '#93c5fd', accent: '#3b82f6' },
                { bgTop: '#0369a1', bgBot: '#082f49', border: '#38bdf8', icon: '#7dd3fc', accent: '#0ea5e9' },
                { bgTop: '#0e7490', bgBot: '#083344', border: '#22d3ee', icon: '#a5f3fc', accent: '#06b6d4' },
                { bgTop: '#312e81', bgBot: '#1e1b4b', border: '#818cf8', icon: '#e0e7ff', accent: '#6366f1' }
            ],
            'Grain': [
                { bgTop: '#422006', bgBot: '#1c1917', border: '#fde047', icon: '#fef08a', accent: '#eab308' },
                { bgTop: '#713f12', bgBot: '#271c19', border: '#facc15', icon: '#eab308', accent: '#ca8a04' },
                { bgTop: '#78350f', bgBot: '#291509', border: '#f59e0b', icon: '#d97706', accent: '#d97706' },
                { bgTop: '#7c2d12', bgBot: '#2a1208', border: '#fb923c', icon: '#f97316', accent: '#ea580c' },
                { bgTop: '#451a03', bgBot: '#1c0a00', border: '#facc15', icon: '#9a3412', accent: '#f59e0b' }
            ],
            'Adjunct': [
                { bgTop: '#334155', bgBot: '#0f172a', border: '#e2e8f0', icon: '#f8fafc', accent: '#94a3b8' },
                { bgTop: '#713f12', bgBot: '#1c1917', border: '#fde047', icon: '#fde047', accent: '#eab308' },
                { bgTop: '#7c2d12', bgBot: '#271206', border: '#fb923c', icon: '#f97316', accent: '#ea580c' },
                { bgTop: '#7f1d1d', bgBot: '#280909', border: '#f87171', icon: '#ef4444', accent: '#dc2626' },
                { bgTop: '#271c19', bgBot: '#09090b', border: '#f59e0b', icon: '#78350f', accent: '#d97706' }
            ],
            'Yeast': [
                { bgTop: '#3f6212', bgBot: '#1a2e05', border: '#a3e635', icon: '#fde047', accent: '#84cc16' },
                { bgTop: '#7c2d12', bgBot: '#2a1205', border: '#fb923c', icon: '#f97316', accent: '#ea580c' },
                { bgTop: '#1e3a8a', bgBot: '#0f172a', border: '#38bdf8', icon: '#bae6fd', accent: '#0284c7' },
                { bgTop: '#14532d', bgBot: '#052e16', border: '#4ade80', icon: '#86efac', accent: '#22c55e' },
                { bgTop: '#701a75', bgBot: '#2e1065', border: '#f0abfc', icon: '#f5d0fe', accent: '#d946ef' }
            ],
            'Hops': [
                { bgTop: '#14532d', bgBot: '#052e16', border: '#4ade80', icon: '#22c55e', accent: '#16a34a' },
                { bgTop: '#065f46', bgBot: '#022c22', border: '#34d399', icon: '#10b981', accent: '#059669' },
                { bgTop: '#3f6212', bgBot: '#1a2e05', border: '#facc15', icon: '#a3e635', accent: '#84cc16' },
                { bgTop: '#15803d', bgBot: '#052e16', border: '#fbbf24', icon: '#4ade80', accent: '#eab308' },
                { bgTop: '#365314', bgBot: '#14532d', border: '#fb923c', icon: '#84cc16', accent: '#f97316' }
            ]
        };

        const specialtyPalettes = {
            'Marshmallow': { bgTop: '#4c1d95', bgBot: '#1e1b4b', border: '#f8fafc', icon: '#ffffff', accent: '#c084fc' },
            'Mojito': { bgTop: '#065f46', bgBot: '#022c22', border: '#34d399', icon: '#6ee7b7', accent: '#10b981' },
            'Raspberry Puree': { bgTop: '#881337', bgBot: '#4c0519', border: '#fb7185', icon: '#f43f5e', accent: '#e11d48' },
            'Lactose': { bgTop: '#1e3a8a', bgBot: '#0f172a', border: '#93c5fd', icon: '#f8fafc', accent: '#60a5fa' },
            'Bitters': { bgTop: '#78350f', bgBot: '#271206', border: '#f59e0b', icon: '#fbbf24', accent: '#d97706' },
            'Cherry Juice': { bgTop: '#7f1d1d', bgBot: '#450a0a', border: '#f87171', icon: '#ef4444', accent: '#dc2626' },
            'Lime': { bgTop: '#365314', bgBot: '#14532d', border: '#a3e635', icon: '#84cc16', accent: '#65a30d' },
            'Brandy': { bgTop: '#7c2d12', bgBot: '#2a1205', border: '#fb923c', icon: '#ea580c', accent: '#f97316' },
            'Tequila': { bgTop: '#713f12', bgBot: '#1c1917', border: '#facc15', icon: '#fde047', accent: '#eab308' },
            'Coffee': { bgTop: '#44403c', bgBot: '#1c1917', border: '#d6d3d1', icon: '#78350f', accent: '#a8a29e' },
            'Oak Chips': { bgTop: '#78350f', bgBot: '#271c19', border: '#d97706', icon: '#b45309', accent: '#f59e0b' },
            'Galaxy Hop': { bgTop: '#3b0764', bgBot: '#09090b', border: '#38bdf8', icon: '#a855f7', accent: '#c084fc' }
        };

        let pal = { bgTop: '#3f3f46', bgBot: '#18181b', border: '#a1a1aa', icon: '#e4e4e7', accent: '#71717a' };
        if (level > 0 && tierPalettes[item.category]) {
            pal = tierPalettes[item.category][level - 1];
        } else if (isSpecialty && specialtyPalettes[item.name]) {
            pal = specialtyPalettes[item.name];
        }

        ctx.save();

        const grad = ctx.createRadialGradient(
            tx + (s / 2), ty + (s * 0.34), 3,
            tx + (s / 2), ty + (s / 2), s * 0.82
        );
        grad.addColorStop(0, pal.bgTop);
        grad.addColorStop(1, pal.bgBot);

        if (opts.isMergeTarget) {
            ctx.shadowColor = opts.isHoveredTarget ? '#fde047' : '#4ade80';
            ctx.shadowBlur = opts.isHoveredTarget ? 22 : (12 + Math.sin(time * 10) * 5);
        } else if (isMaxTier && !isMini) {
            ctx.shadowColor = pal.border;
            ctx.shadowBlur = 10;
        }

        ctx.fillStyle = grad;
        ctx.strokeStyle = opts.isMergeTarget
            ? (opts.isHoveredTarget ? '#fde047' : '#4ade80')
            : (isMaxTier ? '#fde047' : pal.border);
        ctx.lineWidth = isMini ? 2 : (opts.isMergeTarget ? 3.2 : (level >= 4 ? 2.8 : 2.2));
        ctx.beginPath();
        ctx.roundRect(tx, ty, s, s, isMini ? 6 : 10);
        ctx.fill();
        ctx.stroke();
        ctx.shadowColor = 'transparent';

        if (!isMini && (level >= 4 || isSpecialty)) {
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(tx + 1, ty + 1, s - 2, s - 2, 9);
            ctx.clip();

            if (isMaxTier) {
                ctx.save();
                ctx.translate(tx + s / 2, ty + s * 0.42);
                ctx.rotate(time * 0.4);
                ctx.fillStyle = 'rgba(253, 224, 71, 0.08)';
                for (let r = 0; r < 8; r++) {
                    ctx.rotate(Math.PI / 4);
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(-6, -s);
                    ctx.lineTo(6, -s);
                    ctx.closePath();
                    ctx.fill();
                }
                ctx.restore();
            }

            const sweepPos = ((time * 0.65) % 2.2) * (s * 1.6) - (s * 0.4);
            const sheenGrad = ctx.createLinearGradient(tx + sweepPos - 20, ty, tx + sweepPos + 20, ty + s);
            sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
            sheenGrad.addColorStop(0.5, isMaxTier ? 'rgba(254, 240, 138, 0.22)' : 'rgba(255, 255, 255, 0.12)');
            sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = sheenGrad;
            ctx.fillRect(tx, ty, s, s);
            ctx.restore();
        }

        if (!isMini) {
            ctx.strokeStyle = isMaxTier ? 'rgba(254, 240, 138, 0.4)' : 'rgba(255, 255, 255, 0.16)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.roundRect(tx + 2.5, ty + 2.5, s - 5, s - 5, 8);
            ctx.stroke();
        }

        const iconY = isMini ? ty + (s / 2) - 4 : ty + (s * 0.44);
        const iconScale = isMini ? 0.62 : 0.96;
        this.drawCustomIcon(tx + (s / 2), iconY, item.category, item.name, pal.icon, iconScale, level || 1);

        if (!isMini) {
            const badgeText = isSpecialty ? 'SPEC' : (isMaxTier ? '★MAX' : `L${level}`);
            const badgeW = isSpecialty || isMaxTier ? 28 : 19;
            ctx.fillStyle = isMaxTier ? '#facc15' : (isSpecialty ? '#c084fc' : 'rgba(9, 9, 11, 0.78)');
            ctx.strokeStyle = pal.border;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(tx + 4, ty + 4, badgeW, 13, 4);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = (isMaxTier || isSpecialty) ? '#09090b' : '#f4f4f5';
            ctx.font = 'bold 8.5px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(badgeText, tx + 4 + (badgeW / 2), ty + 13.5);

            if (level > 0) {
                const startPipX = tx + s - 38;
                for (let i = 0; i < 5; i++) {
                    const activePip = i < level;
                    ctx.fillStyle = activePip ? (isMaxTier ? '#fde047' : pal.border) : 'rgba(255, 255, 255, 0.15)';
                    ctx.beginPath();
                    ctx.arc(startPipX + (i * 7.5), ty + 10.5, activePip ? 2.7 : 2.0, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else {
                ctx.fillStyle = '#e0f2fe';
                ctx.strokeStyle = pal.border;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(tx + s - 11, ty + 4);
                ctx.lineTo(tx + s - 5, ty + 10);
                ctx.lineTo(tx + s - 11, ty + 16);
                ctx.lineTo(tx + s - 17, ty + 10);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
        }

        const bannerH = isMini ? 14 : 23;
        const bannerY = ty + s - bannerH - 2;

        ctx.fillStyle = 'rgba(9, 9, 11, 0.90)';
        ctx.beginPath();
        ctx.roundRect(tx + 2, bannerY, s - 4, bannerH, isMini ? 4 : [2, 2, 7, 7]);
        ctx.fill();

        if (!isMini) {
            ctx.fillStyle = isMaxTier ? '#facc15' : pal.border;
            ctx.fillRect(tx + 4, bannerY, s - 8, 1.8);
        }

        ctx.fillStyle = isMaxTier ? '#fef08a' : '#f8fafc';
        ctx.textAlign = 'center';
        if (isMini) {
            ctx.font = 'bold 8px Inter';
            ctx.fillText(item.name.substring(0, 7), tx + (s / 2), ty + s - 5.5);
        } else {
            ctx.font = 'bold 9.5px Inter';
            const words = item.name.split(' ');
            if (words.length > 1) {
                ctx.fillText(words[0], tx + (s / 2), bannerY + 10.5);
                ctx.fillStyle = '#e4e4e7';
                ctx.font = 'bold 8.8px Inter';
                ctx.fillText(words.slice(1).join(' '), tx + (s / 2), bannerY + 20);
            } else {
                ctx.fillText(item.name, tx + (s / 2), bannerY + 15);
            }
        }

        if (opts.isMergeTarget && !isMini) {
            const bracketColor = opts.isHoveredTarget ? '#fde047' : '#4ade80';
            ctx.strokeStyle = bracketColor;
            ctx.lineWidth = 2.5;
            const bLen = 8;

            ctx.beginPath(); ctx.moveTo(tx - 2, ty + bLen); ctx.lineTo(tx - 2, ty - 2); ctx.lineTo(tx + bLen, ty - 2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(tx + s - bLen, ty - 2); ctx.lineTo(tx + s + 2, ty - 2); ctx.lineTo(tx + s + 2, ty + bLen); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(tx - 2, ty + s - bLen); ctx.lineTo(tx - 2, ty + s + 2); ctx.lineTo(tx + bLen, ty + s + 2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(tx + s - bLen, ty + s + 2); ctx.lineTo(tx + s + 2, ty + s + 2); ctx.lineTo(tx + s + 2, ty + s - bLen); ctx.stroke();

            ctx.fillStyle = opts.isHoveredTarget ? '#ca8a04' : '#15803d';
            ctx.beginPath();
            ctx.roundRect(tx + (s / 2) - 18, ty - 7, 36, 12, 6);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 7.5px Inter';
            ctx.textAlign = 'center';
            ctx.fillText('MERGE', tx + (s / 2), ty + 1.5);
        }

        ctx.restore();
    }

    drawCustomIcon(cx, cy, category, name, color, scale = 1.0, level = 1) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // 1. WATER
        if (category === 'Water') {
            if (level >= 4) {
                ctx.strokeStyle = 'rgba(165, 243, 252, 0.55)';
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.ellipse(0, 11, 15, 4.5, 0, 0, Math.PI * 2);
                ctx.stroke();
            }

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

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.arc(-3.5, 3.5, 5, Math.PI * 0.65, Math.PI * 1.15);
            ctx.stroke();

            if (level === 1) {
                ctx.fillStyle = '#4ade80';
                [[3, 5, 1.8], [-2, -2, 1.4], [4, -1, 1.2]].forEach(([ax, ay, ar]) => {
                    ctx.beginPath();
                    ctx.arc(ax, ay, ar, 0, Math.PI * 2);
                    ctx.fill();
                });
            } else if (level === 3) {
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.moveTo(10, -14); ctx.lineTo(11.5, -10.5); ctx.lineTo(15, -9);
                ctx.lineTo(11.5, -7.5); ctx.lineTo(10, -4); ctx.lineTo(8.5, -7.5);
                ctx.lineTo(5, -9); ctx.lineTo(8.5, -10.5);
                ctx.closePath();
                ctx.fill();
            } else if (level === 5) {
                ctx.strokeStyle = '#e0e7ff';
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.moveTo(0, -6);
                ctx.lineTo(5, 2);
                ctx.lineTo(0, 8);
                ctx.lineTo(-5, 2);
                ctx.closePath();
                ctx.stroke();
            }

            // 2. GRAIN
        } else if (category === 'Grain') {
            if (level === 5) {
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

                ctx.strokeStyle = '#facc15';
                ctx.lineWidth = 2.5;
                [-7, 7].forEach(hy => {
                    ctx.beginPath();
                    ctx.moveTo(-11, hy);
                    ctx.quadraticCurveTo(0, hy + 2, 11, hy);
                    ctx.stroke();
                });

                ctx.fillStyle = '#fde047';
                ctx.beginPath();
                ctx.ellipse(0, 0, 3, 5.5, 0, 0, Math.PI * 2);
                ctx.fill();
            } else {
                const sGrad = ctx.createRadialGradient(-3, 2, 2, 0, 2, 16);
                sGrad.addColorStop(0, color);
                sGrad.addColorStop(1, '#451a03');

                ctx.fillStyle = sGrad;
                ctx.strokeStyle = '#1c1917';
                ctx.lineWidth = 2;

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

                if (level >= 3) {
                    ctx.fillStyle = '#fde047';
                    [[-3, -9], [0, -10], [3, -9]].forEach(([gx, gy]) => {
                        ctx.beginPath();
                        ctx.arc(gx, gy, 2.2, 0, Math.PI * 2);
                        ctx.fill();
                    });
                }

                if (level >= 2) {
                    ctx.strokeStyle = 'rgba(28, 25, 23, 0.5)';
                    ctx.lineWidth = 1.6;
                    for (let b = 0; b < level - 1; b++) {
                        const by = b * 4;
                        ctx.beginPath();
                        ctx.moveTo(-9, by);
                        ctx.quadraticCurveTo(0, by + 2, 9, by);
                        ctx.stroke();
                    }
                }

                ctx.strokeStyle = '#fde68a';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(-7, -7);
                ctx.quadraticCurveTo(0, -5, 7, -7);
                ctx.stroke();
            }

            // 3. ADJUNCT
        } else if (category === 'Adjunct') {
            if (level === 1) {
                ctx.fillStyle = '#f8fafc';
                ctx.strokeStyle = '#94a3b8';
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.arc(0, 2, 11, Math.PI, 0);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = '#475569';
                ctx.strokeStyle = '#0f172a';
                ctx.beginPath();
                ctx.arc(0, 1, 12, 0, Math.PI);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            } else if (level === 3) {
                ctx.fillStyle = '#ea580c';
                ctx.strokeStyle = '#431407';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.roundRect(-10, -10, 20, 20, 5);
                ctx.fill();
                ctx.stroke();

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
                ctx.save();
                ctx.rotate(-0.15);
                ctx.fillStyle = '#451a03';
                ctx.strokeStyle = '#1c1917';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.roundRect(-9, -12, 18, 24, 3);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = '#78350f';
                [[-6, -9], [1, -9], [-6, -2], [1, -2], [-6, 5], [1, 5]].forEach(([sx, sy]) => {
                    ctx.fillRect(sx, sy, 5, 5);
                });
                ctx.restore();
            } else {
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

            // 4. YEAST
        } else if (category === 'Yeast') {
            const fillTop = 7 - (level * 2);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(-6, fillTop);
            ctx.lineTo(6, fillTop);
            ctx.lineTo(12, 12);
            ctx.lineTo(-12, 12);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.roundRect(-4, 9, 8, 2.5, 1.2);
            ctx.fill();

            ctx.fillStyle = level === 5 ? '#f5d0fe' : '#ffffff';
            for (let b = 0; b < level + 2; b++) {
                const bx = ((b % 3) - 1) * 3.2;
                const by = fillTop - (b * 2.4);
                ctx.beginPath();
                ctx.arc(bx, by, 1.8 + (b % 2) * 0.8, 0, Math.PI * 2);
                ctx.fill();
            }

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

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
            ctx.lineWidth = 1.2;
            [2, 6, 10].forEach(ty => {
                ctx.beginPath();
                ctx.moveTo(3, ty);
                ctx.lineTo(6, ty);
                ctx.stroke();
            });

            // 5. HOPS
        } else if (category === 'Hops') {
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

            ctx.strokeStyle = '#4ade80';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(0, -15);
            ctx.lineTo(0, -9);
            ctx.stroke();

            drawBract(-5, 5, 0.3);
            drawBract(5, 5, -0.3);
            drawBract(0, 7, 0);

            drawBract(-6.5, -1, 0.35);
            drawBract(6.5, -1, -0.35);
            drawBract(0, 1, 0);

            drawBract(-4.5, -7, 0.25);
            drawBract(4.5, -7, -0.25);
            drawBract(0, -6, 0);

            if (level >= 3) {
                ctx.fillStyle = level === 5 ? '#fb923c' : '#fde047';
                const drops = [[-3, 2, 1.7], [3, 2, 1.7], [0, -3, 1.9]];
                if (level >= 4) drops.push([-5, -4, 1.5], [5, -4, 1.5]);

                drops.forEach(([dx, dy, rad]) => {
                    ctx.beginPath();
                    ctx.arc(dx, dy, rad, 0, Math.PI * 2);
                    ctx.fill();
                });
            }

            // 6. SPECIALTY INGREDIENTS
        } else if (category === 'Specialty') {
            switch (name) {
                case 'Marshmallow':
                    ctx.strokeStyle = '#a16207';
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    ctx.moveTo(-12, 12);
                    ctx.lineTo(12, -12);
                    ctx.stroke();

                    ctx.fillStyle = '#ffffff';
                    ctx.strokeStyle = '#cbd5e1';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.roundRect(-9, -7, 18, 17, 4);
                    ctx.fill();
                    ctx.stroke();

                    // Golden-Brown Toasted Cap (not burnt marshmallow)
                    ctx.fillStyle = '#d97706';
                    ctx.beginPath();
                    ctx.ellipse(0, -7, 9, 3.8, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    break;

                case 'Mojito':
                    ctx.strokeStyle = '#f43f5e';
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    ctx.moveTo(2, 4);
                    ctx.lineTo(8, -14);
                    ctx.stroke();

                    ctx.fillStyle = 'rgba(52, 211, 153, 0.5)';
                    ctx.strokeStyle = '#ecfdf5';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.roundRect(-8, -8, 16, 20, 3);
                    ctx.fill();
                    ctx.stroke();

                    ctx.fillStyle = '#10b981';
                    ctx.beginPath();
                    ctx.ellipse(-5, -8, 5, 2.8, -0.4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.ellipse(1, -9, 5, 2.8, 0.4, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case 'Raspberry Puree':
                    ctx.fillStyle = '#f43f5e';
                    ctx.strokeStyle = '#881337';
                    ctx.lineWidth = 1.2;
                    [
                        [-4, -5], [0, -5], [4, -5],
                        [-6, 0], [-2, 0], [2, 0], [6, 0],
                        [-4, 5], [0, 5], [4, 5],
                        [-2, 9], [2, 9]
                    ].forEach(([dx, dy]) => {
                        ctx.beginPath();
                        ctx.arc(dx, dy, 3.2, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.stroke();
                    });
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

                    ctx.fillStyle = '#3b82f6';
                    ctx.fillRect(-8, 1, 16, 5);
                    ctx.fillRect(-5, -14, 10, 3);
                    break;

                case 'Bitters':
                    ctx.fillStyle = '#78350f';
                    ctx.strokeStyle = '#fde68a';
                    ctx.lineWidth = 1.8;
                    ctx.beginPath();
                    ctx.roundRect(-7, -2, 14, 15, 3);
                    ctx.fill();
                    ctx.stroke();

                    ctx.fillStyle = '#fef3c7';
                    ctx.fillRect(-6, 1, 12, 8);
                    ctx.strokeStyle = '#dc2626';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(-5, 2, 10, 6);

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
                    ctx.strokeStyle = '#4ade80';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(-6, 5);
                    ctx.quadraticCurveTo(-4, -8, 1, -12);
                    ctx.moveTo(6, 6);
                    ctx.quadraticCurveTo(4, -6, 1, -12);
                    ctx.stroke();

                    [[-6, 6], [6, 7]].forEach(([chX, chY]) => {
                        ctx.fillStyle = '#dc2626';
                        ctx.strokeStyle = '#450a0a';
                        ctx.lineWidth = 1.8;
                        ctx.beginPath();
                        ctx.arc(chX, chY, 5.5, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.stroke();

                        ctx.fillStyle = '#ffffff';
                        ctx.beginPath();
                        ctx.arc(chX - 2, chY - 2, 1.5, 0, Math.PI * 2);
                        ctx.fill();
                    });
                    break;

                case 'Lime':
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
                    ctx.fillStyle = '#ea580c';
                    ctx.beginPath();
                    ctx.arc(0, -1, 8.5, 0.1 * Math.PI, 0.9 * Math.PI);
                    ctx.fill();

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

                    ctx.fillStyle = '#eab308';
                    ctx.strokeStyle = '#713f12';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.arc(0, 7, 6, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    break;

                case 'Coffee':
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

                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
                    ctx.lineWidth = 1.5;
                    [-3, 2].forEach(sx => {
                        ctx.beginPath();
                        ctx.moveTo(sx, -7);
                        ctx.quadraticCurveTo(sx - 2, -10, sx, -13);
                        ctx.stroke();
                    });

                    ctx.fillStyle = '#a8a29e';
                    ctx.beginPath();
                    ctx.ellipse(-0.5, 3, 2.5, 3.8, 0, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case 'Oak Chips':
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