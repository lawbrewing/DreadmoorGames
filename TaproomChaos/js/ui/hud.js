// js/ui/hud.js

class GameHUD {
    constructor() {
        // Main Panels
        this.taproomHUD = document.getElementById('taproomHUD');
        this.brewingHUD = document.getElementById('brewingHUD');

        // Brewing Elements
        this.hudTips = document.getElementById('hudTips');
        this.inventoryList = document.getElementById('inventoryList');

        // Taproom Elements
        this.ammoList = document.getElementById('ammoList');
        this.hudTimer = document.getElementById('hudTimer');

        // Core Buttons & Screens
        this.gameOverScreen = document.getElementById('gameOverScreen');
        this.btnRestart = document.getElementById('btnRestart');
        this.btnStartShift = document.getElementById('btnStartShift');

        // NEW: Recipe Book & Forecast Elements
        this.forecastTicker = document.getElementById('forecastTicker');
        this.btnOpenRecipeBook = document.getElementById('btnOpenRecipeBook');
        this.btnCloseRecipeBook = document.getElementById('btnCloseRecipeBook');
        this.recipeBookOverlay = document.getElementById('recipeBookOverlay');
        this.recipeListContainer = document.getElementById('recipeListContainer');

        this.lastTips = -1;
        this.lastTime = -1;
        this.lastAmmo = [];
        this.lastInventory = '';

        this.setupListeners();
    }

    setupListeners() {
        if (this.btnRestart) {
            this.btnRestart.addEventListener('click', () => location.reload());
        }

        if (this.btnStartShift) {
            this.btnStartShift.addEventListener('click', () => {
                gameEvents.emit('CHANGE_STATE', { newState: 'TAPROOM' });
            });
        }

        // NEW: Recipe Book Listeners
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
    }

    switchPhase(phaseName) {
        if (phaseName === 'TAPROOM') {
            if (this.taproomHUD) this.taproomHUD.style.display = 'block';
            if (this.brewingHUD) this.brewingHUD.style.display = 'none';
            if (this.forecastTicker) this.forecastTicker.style.display = 'none';
        } else {
            if (this.taproomHUD) this.taproomHUD.style.display = 'none';
            if (this.brewingHUD) this.brewingHUD.style.display = 'block';

            // Show and update the forecast!
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
        if (!container) {
            console.warn("recipeListContainer element not found in DOM!");
            return;
        }
        container.innerHTML = '';

        // Fallback to playerState.unlockedRecipes if no explicit list is passed
        const recipesToRender = (unlockedList && unlockedList.length > 0)
            ? unlockedList
            : (typeof playerState !== 'undefined' ? playerState.unlockedRecipes : []);

        // --- PROGRESS HEADER ---
        const totalMasterRecipes = (typeof gameRecipes !== 'undefined' && gameRecipes.recipeList) ? gameRecipes.recipeList.length : 25;
        const unlockedCount = recipesToRender.length;

        const headerDiv = document.createElement('div');
        headerDiv.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #27272a;
            padding: 10px 14px;
            margin-bottom: 12px;
            border-radius: 6px;
            border: 1px solid #52525b;
        `;
        headerDiv.innerHTML = `
            <span style="color: #f4f4f5; font-weight: bold; font-size: 13px;">📖 BREWHOUSE LOG</span>
            <span style="color: #4ade80; font-weight: bold; font-size: 13px;">Unlocked: ${unlockedCount} / ${totalMasterRecipes}</span>
        `;
        container.appendChild(headerDiv);

        if (recipesToRender.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.style.cssText = `color: #71717a; text-align: center; padding: 20px; font-style: italic;`;
            emptyDiv.innerHTML = `No recipes discovered yet!<br>Experiment in the brew kettles to unlock craft styles.`;
            container.appendChild(emptyDiv);
            return;
        }

        recipesToRender.forEach(recipeName => {
            const recipeData = typeof gameRecipes !== 'undefined'
                ? gameRecipes.recipeList.find(r => r.name === recipeName)
                : null;

            const recipeType = recipeData ? recipeData.type : 'premium';
            const tacticalHint = typeof gameRecipes !== 'undefined'
                ? gameRecipes.getForecastHint(recipeName, recipeType)
                : 'Reliable craft beer for steady tips.';

            // Format the ingredients array nicely into a comma-separated list
            const ingredientsString = recipeData && recipeData.ingredients
                ? recipeData.ingredients.join(', ')
                : 'Standard Baseline Ingredients';

            // --- GET THE STYLE ICON! ---
            const styleIcon = typeof gameRecipes !== 'undefined'
                ? gameRecipes.getStyleIcon(recipeName, recipeType)
                : '🍺';

            const card = document.createElement('div');
            card.style.cssText = `
                background: #18181b;
                border: 1px solid #3f3f46;
                padding: 12px;
                margin-bottom: 10px;
                border-radius: 6px;
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
        // 1. Update tips
        if (this.hudTips && typeof playerState !== 'undefined') {
            if (this.lastTips !== playerState.tips) {
                this.lastTips = playerState.tips;
                this.hudTips.innerText = `Tips: $${this.lastTips}`;
            }
        }
        // 1B. Update Brewing Phase Stockpile (Inventory List)
        if (this.inventoryList && typeof playerState !== 'undefined') {
            const currentInvStr = JSON.stringify(playerState.ammo);
            if (this.lastInventory !== currentInvStr) {
                this.lastInventory = currentInvStr;
                this.inventoryList.innerHTML = '';

                playerState.ammo.forEach(ammo => {
                    const li = document.createElement('li');

                    // Color-code by drink type
                    let badgeColor = '#a1a1aa'; // Swill
                    if (ammo.type === 'premium') badgeColor = '#facc15';
                    if (ammo.type === 'cocktail') badgeColor = '#f43f5e';
                    if (ammo.type === 'soda') badgeColor = '#38bdf8';

                    li.style.cssText = `
                        background: #18181b;
                        border-left: 4px solid ${badgeColor};
                        padding: 8px 10px;
                        margin-bottom: 8px;
                        border-radius: 4px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        font-size: 13px;
                    `;

                    const countText = ammo.count === Infinity ? '∞' : `x${ammo.count}`;
                    li.innerHTML = `
                        <span style="color: #f4f4f5; font-weight: 600;">🛢️ ${ammo.name}</span>
                        <span style="color: ${badgeColor}; font-weight: bold;">${countText}</span>
                    `;
                    this.inventoryList.appendChild(li);
                });
            }
        }
        // 2. Update Taproom specific HUD
        if (typeof currentState !== 'undefined' && currentState === 'TAPROOM' && typeof taproomPhase !== 'undefined') {
            const seconds = Math.ceil(taproomPhase.timeRemaining);
            if (this.lastTime !== seconds && this.hudTimer) {
                this.lastTime = seconds;
                this.hudTimer.innerText = `${progressionState.getShiftName()} | TIME LEFT: ${seconds}s`;

                if (progressionState.isBossRound()) {
                    this.hudTimer.style.color = '#ef4444';
                } else {
                    this.hudTimer.style.color = '#facc15';
                }
            }

            // 3. Update Ammo List (Clickable + Number Key Hints!)
            if (typeof playerState !== 'undefined' && this.ammoList) {
                const currentAmmoStr = JSON.stringify(playerState.ammo) + '_' + taproomPhase.selectedAmmoIndex;
                if (this.lastAmmo !== currentAmmoStr) {
                    this.lastAmmo = currentAmmoStr;
                    this.ammoList.innerHTML = '';

                    playerState.ammo.forEach((ammo, index) => {
                        const li = document.createElement('li');
                        const countStr = ammo.count === Infinity ? '∞' : `x${ammo.count}`;
                        const isSelected = index === taproomPhase.selectedAmmoIndex;

                        li.style.cssText = `
                            cursor: pointer;
                            pointer-events: auto;
                            padding: 6px 10px;
                            margin-bottom: 5px;
                            border-radius: 6px;
                            background: ${isSelected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(39, 39, 42, 0.7)'};
                            border: 2px solid ${isSelected ? '#10b981' : 'transparent'};
                            color: ${isSelected ? '#10b981' : '#f4f4f5'};
                            font-size: 16px;
                            user-select: none;
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
        if (this.gameOverScreen) {
            this.gameOverScreen.style.display = 'flex';
        }
    }
}