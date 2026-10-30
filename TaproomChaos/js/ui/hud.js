// js/ui/hud.js

class GameHUD {
    constructor() {
        // Main Unified Drawer Panels
        this.taproomHUD = document.getElementById('taproomHUD');
        this.brewingHUD = document.getElementById('brewingHUD');
        this.btnToggleHUD = document.getElementById('btnToggleHUD');

        // Brewing Elements
        this.hudTips = document.getElementById('hudTips');
        this.hudTaproomTips = document.getElementById('hudTaproomTips');
        this.inventoryList = document.getElementById('inventoryList');

        // Taproom Elements
        this.ammoList = document.getElementById('ammoList');
        this.hudTimer = document.getElementById('hudTimer');

        // Core Buttons & Screens
        this.gameOverScreen = document.getElementById('gameOverScreen');
        this.gameOverStatsBox = document.getElementById('gameOverStatsBox');
        this.playerNameInput = document.getElementById('playerNameInput');
        this.btnSubmitScore = document.getElementById('btnSubmitScore');
        this.btnRestart = document.getElementById('btnRestart');
        this.btnStartShift = document.getElementById('btnStartShift');

        // Recipe Book & Forecast Elements
        this.forecastTicker = document.getElementById('forecastTicker');
        this.btnOpenRecipeBook = document.getElementById('btnOpenRecipeBook');
        this.btnCloseRecipeBook = document.getElementById('btnCloseRecipeBook');
        this.recipeBookOverlay = document.getElementById('recipeBookOverlay');
        this.recipeListContainer = document.getElementById('recipeListContainer');

        // Jukebox Controls
        this.btnMuteMusic = document.getElementById('btn-mute-music');
        this.btnSkipTrack = document.getElementById('btn-skip-track');

        this.activePhase = 'BREWING';
        this.lastTips = -1;
        this.lastTime = -1;
        this.lastAmmo = '';
        this.lastInventory = '';

        this.setupListeners();
    }

    setupListeners() {
        // Remove inline onclick so GameHUD controls the active drawer cleanly across both phases
        if (this.btnToggleHUD) {
            this.btnToggleHUD.removeAttribute('onclick');
            this.btnToggleHUD.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleActiveDrawer();
            });
        }

        if (this.btnRestart) {
            this.btnRestart.addEventListener('click', () => location.reload());
        }

        if (this.btnStartShift) {
            this.btnStartShift.addEventListener('click', () => {
                gameEvents.emit('CHANGE_STATE', { newState: 'TAPROOM' });
            });
        }

        if (this.btnOpenRecipeBook) {
            this.btnOpenRecipeBook.addEventListener('click', () => {
                this.renderRecipeBook();
                if (this.recipeBookOverlay) this.recipeBookOverlay.style.display = 'block';
            });
        }

        if (this.btnCloseRecipeBook) {
            this.btnCloseRecipeBook.addEventListener('click', () => {
                if (this.recipeBookOverlay) this.recipeBookOverlay.style.display = 'none';
            });
        }

        // --- NEW: Jukebox Control Listeners ---
        if (this.btnMuteMusic) {
            this.btnMuteMusic.addEventListener('click', () => {
                if (window.audioManager) {
                    window.audioManager.isMuted = !window.audioManager.isMuted;
                    window.audioManager.musicPlayer.muted = window.audioManager.isMuted;
                    window.audioManager.scratchPlayer.muted = window.audioManager.isMuted;
                    this.btnMuteMusic.innerText = window.audioManager.isMuted ? "Unmute" : "Mute";
                    this.btnMuteMusic.style.backgroundColor = window.audioManager.isMuted ? "#ef4444" : "";
                }
            });
        }

        if (this.btnSkipTrack) {
            this.btnSkipTrack.addEventListener('click', () => {
                const skipCost = 1.00;
                if (typeof playerState !== 'undefined' && playerState.canAfford(skipCost)) {
                    gameEvents.emit('SPEND_TIPS', skipCost);
                    if (window.audioManager) {
                        window.audioManager.transitionWithScratch();
                    }
                } else {
                    // Flash red if they can't afford the skip
                    const origColor = this.btnSkipTrack.style.backgroundColor;
                    this.btnSkipTrack.style.backgroundColor = "#ef4444";
                    setTimeout(() => this.btnSkipTrack.style.backgroundColor = origColor, 300);
                }
            });
        }

        // --- Telemetry Player Sync ---
        if (this.playerNameInput) {
            const savedName = localStorage.getItem('law_player_name') || 'Michael Law';
            this.playerNameInput.value = savedName;
        }

        if (this.btnSubmitScore) {
            this.btnSubmitScore.addEventListener('click', async () => {
                const chosenName = (this.playerNameInput && this.playerNameInput.value.trim()) || 'Michael Law';
                localStorage.setItem('law_player_name', chosenName);
                if (window.taproomTelemetry) {
                    window.taproomTelemetry.hasSubmittedRun = false; // Allow explicit re-sync with updated name
                    this.btnSubmitScore.innerText = 'SYNCING...';
                    await window.taproomTelemetry.submitScore(chosenName);
                    this.btnSubmitScore.innerText = '✓ SYNCED';
                    this.btnSubmitScore.style.background = '#059669';
                }
            });
        }
    }

    toggleActiveDrawer() {
        const activePanel = this.activePhase === 'TAPROOM' ? this.taproomHUD : this.brewingHUD;
        if (!activePanel) return;

        const isOpen = activePanel.classList.toggle('open');
        if (this.btnToggleHUD) {
            this.btnToggleHUD.innerText = isOpen ? '✕ CLOSE' : '☰ MENU';
        }
    }

    switchPhase(phaseName) {
        this.activePhase = phaseName;

        // Always keep the unified MENU button visible in both phases!
        if (this.btnToggleHUD) {
            this.btnToggleHUD.style.display = 'block';
        }

        if (phaseName === 'TAPROOM') {
            if (this.forecastTicker) this.forecastTicker.style.display = 'none';

            if (this.brewingHUD) {
                this.brewingHUD.classList.remove('open');
            }
            if (this.taproomHUD) {
                this.taproomHUD.classList.remove('open');
            }
            if (this.btnToggleHUD) {
                this.btnToggleHUD.innerText = '☰ MENU';
            }
        } else {
            if (this.taproomHUD) {
                this.taproomHUD.classList.remove('open');
            }
            if (this.brewingHUD) {
                this.brewingHUD.classList.add('open');
            }
            if (this.btnToggleHUD) {
                this.btnToggleHUD.innerText = '✕ CLOSE';
            }

            if (this.forecastTicker) {
                this.forecastTicker.style.display = 'block';
                if (typeof progressionState !== 'undefined' && progressionState.forecast) {
                    this.forecastTicker.innerText = `FORECAST: ${progressionState.forecast.message}`;
                }
            }
        }
    }

    renderRecipeBook(unlockedList = null) {
        const container = this.recipeListContainer || document.getElementById('recipeListContainer');
        if (!container) return;
        container.innerHTML = '';

        const recipesToRender = (unlockedList && unlockedList.length > 0)
            ? unlockedList
            : (typeof playerState !== 'undefined' ? playerState.unlockedRecipes : []);

        const totalMasterRecipes = (typeof gameRecipes !== 'undefined' && gameRecipes.recipeList) ? gameRecipes.recipeList.length : 25;
        const unlockedCount = recipesToRender.length;

        const headerDiv = document.createElement('div');
        headerDiv.style.cssText = `
            grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: center;
            background: #27272a; padding: 10px 14px; margin-bottom: 12px;
            border-radius: 6px; border: 1px solid #52525b;
        `;
        headerDiv.innerHTML = `
            <span style="color: #f4f4f5; font-weight: bold; font-size: 13px;">📖 BREWHOUSE LOG</span>
            <span style="color: #4ade80; font-weight: bold; font-size: 13px;">Unlocked: ${unlockedCount} / ${totalMasterRecipes}</span>
        `;
        container.appendChild(headerDiv);

        if (recipesToRender.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.style.cssText = `grid-column: 1 / -1; color: #71717a; text-align: center; padding: 20px; font-style: italic;`;
            emptyDiv.innerHTML = `No recipes discovered yet!<br>Experiment in the brew kettles to unlock craft styles.`;
            container.appendChild(emptyDiv);
            return;
        }

        recipesToRender.forEach(recipeName => {
            const recipeData = typeof gameRecipes !== 'undefined' ? gameRecipes.recipeList.find(r => r.name === recipeName) : null;
            const recipeType = recipeData ? recipeData.type : 'premium';
            const tacticalHint = typeof gameRecipes !== 'undefined' ? gameRecipes.getForecastHint(recipeName, recipeType) : 'Reliable craft beer for steady tips.';
            const ingredientsString = recipeData && recipeData.ingredients ? recipeData.ingredients.join(', ') : 'Standard Baseline Ingredients';
            const styleIcon = typeof gameRecipes !== 'undefined' ? gameRecipes.getStyleIcon(recipeName, recipeType) : '🍺';

            const card = document.createElement('div');
            card.style.cssText = `
                background: #18181b; border: 1px solid #3f3f46;
                padding: 12px; margin-bottom: 10px; border-radius: 6px;
            `;

            card.innerHTML = `
                <div style="color: #facc15; font-weight: bold; font-size: 14px;">${styleIcon} ${recipeName}</div>
                <div style="color: #38bdf8; font-size: 11.5px; margin-top: 5px;">🧪 <b>Recipe:</b> ${ingredientsString}</div>
                <div style="color: #a1a1aa; font-size: 11px; margin-top: 6px; line-height: 1.4;">📈 <b>Forecast Synergy:</b> ${tacticalHint}</div>
            `;
            container.appendChild(card);
        });
    }

    update() {
        if (typeof playerState !== 'undefined') {
            if (this.lastTips !== playerState.tips) {
                this.lastTips = playerState.tips;
                // Force strict 2-decimal formatting so $1.25 renders cleanly
                if (this.hudTips) this.hudTips.innerText = `Tips: $${this.lastTips.toFixed(2)}`;
                if (this.hudTaproomTips) this.hudTaproomTips.innerText = `Tips: $${this.lastTips.toFixed(2)}`;
            }
        }

        if (this.inventoryList && typeof playerState !== 'undefined') {
            const currentInvStr = JSON.stringify(playerState.ammo);
            if (this.lastInventory !== currentInvStr) {
                this.lastInventory = currentInvStr;
                this.inventoryList.innerHTML = '';

                playerState.ammo.forEach(ammo => {
                    const li = document.createElement('li');
                    let badgeColor = '#a1a1aa';
                    if (ammo.type === 'premium') badgeColor = '#facc15';
                    if (ammo.type === 'cocktail') badgeColor = '#f43f5e';
                    if (ammo.type === 'soda') badgeColor = '#38bdf8';
                    if (ammo.type === 'Swill') badgeColor = '#94a3b8'; // Style Swill drops

                    li.style.cssText = `
                        background: #18181b; border-left: 4px solid ${badgeColor};
                        padding: 8px 10px; margin-bottom: 8px; border-radius: 4px;
                        display: flex; justify-content: space-between; align-items: center; font-size: 13px;
                    `;

                    const countText = ammo.count === Infinity || ammo.count === 'Infinite' ? '∞' : `x${ammo.count}`;
                    li.innerHTML = `
                        <span style="color: #f4f4f5; font-weight: 600;">🛢️ ${ammo.name}</span>
                        <span style="color: ${badgeColor}; font-weight: bold;">${countText}</span>
                    `;
                    this.inventoryList.appendChild(li);
                });
            }
        }

        if (typeof currentState !== 'undefined' && currentState === 'TAPROOM' && typeof taproomPhase !== 'undefined') {
            const seconds = Math.ceil(taproomPhase.timeRemaining);
            if (this.lastTime !== seconds && this.hudTimer) {
                this.lastTime = seconds;
                const shiftTitle = (typeof progressionState !== 'undefined' && typeof progressionState.getShiftName === 'function')
                    ? progressionState.getShiftName()
                    : `SHIFT ${taproomPhase.shift || 1}`;
                this.hudTimer.innerText = `${shiftTitle} | ${seconds}s`;
                this.hudTimer.style.color = (typeof progressionState !== 'undefined' && progressionState.isBossRound && progressionState.isBossRound()) ? '#ef4444' : '#facc15';
            }

            if (typeof playerState !== 'undefined' && this.ammoList) {
                const currentAmmoStr = JSON.stringify(playerState.ammo) + '_' + taproomPhase.selectedAmmoIndex;
                if (this.lastAmmo !== currentAmmoStr) {
                    this.lastAmmo = currentAmmoStr;
                    this.ammoList.innerHTML = '';

                    playerState.ammo.forEach((ammo, index) => {
                        const li = document.createElement('li');
                        const countStr = ammo.count === Infinity || ammo.count === 'Infinite' ? '∞' : `x${ammo.count}`;
                        const isSelected = index === taproomPhase.selectedAmmoIndex;

                        li.style.cssText = `
                            cursor: pointer; pointer-events: auto; padding: 8px 10px;
                            margin-bottom: 6px; border-radius: 6px;
                            background: ${isSelected ? 'rgba(16, 185, 129, 0.22)' : '#18181b'};
                            border: 2px solid ${isSelected ? '#10b981' : '#3f3f46'};
                            color: ${isSelected ? '#10b981' : '#f4f4f5'};
                            font-size: 14px; user-select: none;
                        `;

                        li.innerText = `[${index + 1}] ${isSelected ? '▶ ' : ''}${ammo.name} (${countStr})`;

                        li.addEventListener('click', (e) => {
                            e.stopPropagation();
                            taproomPhase.selectedAmmoIndex = index;
                        });

                        this.ammoList.appendChild(li);
                    });
                }
            }
        }
    }

    showGameOver() {
        // Render run telemetry summary and auto-post to /api/scores/taproom_chaos
        if (window.taproomTelemetry) {
            const st = window.taproomTelemetry.stats;
            const prog = (typeof progressionState !== 'undefined') ? progressionState : {};
            const levelReached = prog.shift || prog.currentShift || (typeof taproomPhase !== 'undefined' ? taproomPhase.shift : 1) || 1;
            const finalScore = (typeof playerState !== 'undefined')
                ? Math.max(0, Math.floor(playerState.totalEarned || playerState.score || playerState.tips || 0))
                : 0;

            if (this.gameOverStatsBox) {
                this.gameOverStatsBox.innerHTML = `
                    <div style="color: #facc15; font-weight: bold; margin-bottom: 6px; text-align: center;">📊 SHIFT TELEMETRY (LEVEL ${levelReached})</div>
                    <div style="display: flex; justify-content: space-between;"><span>Final Score:</span> <b>$${finalScore}</b></div>
                    <div style="display: flex; justify-content: space-between;"><span>Shifts Cleared:</span> <b>${st.shiftsCleared}</b></div>
                    <div style="display: flex; justify-content: space-between;"><span>Highest Combo Merges:</span> <b style="color:#38bdf8;">${st.highestComboMerges}x</b></div>
                    <div style="display: flex; justify-content: space-between;"><span>Perfect Serves:</span> <b style="color:#4ade80;">${st.perfectServes}</b></div>
                    <div style="display: flex; justify-content: space-between;"><span>Glasses Smashed:</span> <b style="color:#f87171;">${st.glassesSmashed}</b></div>
                    <div style="display: flex; justify-content: space-between;"><span>Kiddie Hordes Triggered:</span> <b>${st.kiddieHordesTriggered}</b></div>
                `;
            }

            const chosenName = (this.playerNameInput && this.playerNameInput.value.trim())
                || localStorage.getItem('law_player_name')
                || 'Michael Law';
            window.taproomTelemetry.submitScore(chosenName);
        }

        if (this.gameOverScreen) {
            this.gameOverScreen.style.display = 'flex';
        }
    }
}