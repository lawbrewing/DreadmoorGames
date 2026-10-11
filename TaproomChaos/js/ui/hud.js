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

    renderRecipeBook() {
        if (!this.recipeListContainer || typeof gameRecipes === 'undefined' || typeof playerState === 'undefined') return;

        this.recipeListContainer.innerHTML = ''; // Clear old entries

        gameRecipes.recipeList.forEach(recipe => {
            const isUnlocked = playerState.unlockedRecipes.includes(recipe.name);
            const card = document.createElement('div');

            card.style.background = isUnlocked ? '#312e81' : '#27272a';
            card.style.padding = '15px';
            card.style.borderRadius = '8px';
            card.style.border = isUnlocked ? '2px solid #818cf8' : '2px dashed #52525b';

            if (isUnlocked) {
                card.innerHTML = `
                    <h3 style="margin: 0 0 10px 0; color: #facc15;">${recipe.name}</h3>
                    <p style="margin: 0; font-size: 14px; color: #d4d4d8;">
                        <strong>Ingredients:</strong> ${recipe.ingredients.join(', ')}
                    </p>
                `;
            } else {
                card.innerHTML = `
                    <h3 style="margin: 0 0 10px 0; color: #52525b;">??? (Undiscovered)</h3>
                    <p style="margin: 0; font-size: 14px; color: #52525b;">
                        <em>Brew this recipe to unlock its secrets...</em>
                    </p>
                `;
            }
            this.recipeListContainer.appendChild(card);
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

            // 3. Update Ammo List
            if (typeof playerState !== 'undefined' && this.ammoList) {
                const currentAmmoStr = JSON.stringify(playerState.ammo);
                if (this.lastAmmo !== currentAmmoStr) {
                    this.lastAmmo = currentAmmoStr;
                    this.ammoList.innerHTML = '';

                    playerState.ammo.forEach((ammo, index) => {
                        const li = document.createElement('li');
                        li.innerText = `${ammo.name} (x${ammo.count})`;

                        if (index === taproomPhase.selectedAmmoIndex) {
                            li.style.color = '#10b981'; // Green for selected
                            li.innerText = `▶ ${li.innerText}`;
                        } else {
                            li.style.color = '#f4f4f5';
                        }
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