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
            this.btnOpenRecipeBook.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                this.renderRecipeBook();
                if (this.recipeBookOverlay) this.recipeBookOverlay.style.display = 'block';
            });
        }

        if (this.btnCloseRecipeBook) {
            this.btnCloseRecipeBook.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
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
        if (!container || typeof gameRecipes === 'undefined') return;
        container.innerHTML = '';

        const unlockedRecipes = (unlockedList && unlockedList.length > 0)
            ? unlockedList
            : (typeof playerState !== 'undefined' ? playerState.unlockedRecipes : []);

        const allRecipes = gameRecipes.recipeList || [];
        const unlockedCount = unlockedRecipes.length;

        const headerDiv = document.createElement('div');
        headerDiv.style.cssText = `
            grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: center;
            background: #27272a; padding: 10px 14px; margin-bottom: 12px;
            border-radius: 6px; border: 1px solid #52525b;
        `;
        headerDiv.innerHTML = `
            <span style="color: #f4f4f5; font-weight: bold; font-size: 13px;">📖 BREWHOUSE LOG</span>
            <span style="color: #4ade80; font-weight: bold; font-size: 13px;">Unlocked: ${unlockedCount} / ${allRecipes.length}</span>
        `;
        container.appendChild(headerDiv);

        allRecipes.forEach(recipeData => {
            const isUnlocked = unlockedRecipes.includes(recipeData.name);
            const styleIcon = gameRecipes.getStyleIcon(recipeData.name, recipeData.type);
            const card = document.createElement('div');

            if (isUnlocked) {
                // UNLOCKED RECIPE
                const ingredientsString = recipeData.ingredients.join(', ');
                const tacticalHint = gameRecipes.getForecastHint(recipeData.name, recipeData.type);

                card.style.cssText = `background: #18181b; border: 1px solid #4ade80; padding: 12px; margin-bottom: 10px; border-radius: 6px;`;
                card.innerHTML = `
                    <div style="color: #facc15; font-weight: bold; font-size: 14px;">${styleIcon} ${recipeData.name}</div>
                    <div style="color: #38bdf8; font-size: 11.5px; margin-top: 5px;">🧪 <b>Recipe:</b> ${ingredientsString}</div>
                    <div style="color: #a1a1aa; font-size: 11px; margin-top: 6px; line-height: 1.4;">📈 <b>Forecast Synergy:</b> ${tacticalHint}</div>
                `;
            } else {
                // LOCKED RECIPE (DYNAMIC HINT)
                const hintString = gameRecipes.getDynamicContractHint(recipeData);

                card.style.cssText = `background: #09090b; border: 1px dashed #52525b; padding: 12px; margin-bottom: 10px; border-radius: 6px; opacity: 0.8;`;
                card.innerHTML = `
                    <div style="color: #71717a; font-weight: bold; font-size: 14px;">🔒 UNDISCOVERED (${styleIcon})</div>
                    <div style="color: #a1a1aa; font-size: 11.5px; margin-top: 5px; line-height: 1.4;">💡 <b>Hint:</b> ${hintString}</div>
                `;
            }
            container.appendChild(card);
        });
    }

    update() {
        if (typeof playerState !== 'undefined') {

            // DYNAMIC SHIFT GOAL LOGIC
            const prog = (typeof progressionState !== 'undefined') ? progressionState : {};
            const currentShift = prog.shift || prog.currentShift || 1;
            const shiftGoal = currentShift * 40; // $40 per shift level (approx 3-4 patrons)

            if (this.lastTips !== playerState.tips || this.lastGoal !== shiftGoal) {
                this.lastTips = playerState.tips;
                this.lastGoal = shiftGoal;

                const tipDisplay = `$${this.lastTips.toFixed(2)}`;
                const isFailing = this.lastTips < shiftGoal;
                const goalColor = isFailing ? '#ef4444' : '#4ade80'; // Red if failing, Green if passing

                if (this.hudTips) {
                    this.hudTips.innerHTML = `Bank: <span style="color: #4ade80;">${tipDisplay}</span> <br> <span style="font-size: 12px; color: ${goalColor};">Shift Goal: $${shiftGoal} (~${Math.ceil(shiftGoal / 12)} patrons)</span>`;
                }
                if (this.hudTaproomTips) {
                    this.hudTaproomTips.innerHTML = `Bank: <span style="color: #4ade80;">${tipDisplay}</span> / <span style="color: ${goalColor};">$${shiftGoal}</span>`;
                }
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