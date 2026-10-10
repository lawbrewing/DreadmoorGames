// js/ui/hud.js

class GameHUD {
    constructor() {
        this.taproomHUD = document.getElementById('taproomHUD');
        this.brewingHUD = document.getElementById('brewingHUD');
        this.btnStartShift = document.getElementById('btnStartShift');
        this.ammoList = document.getElementById('ammoList');
        this.hudTips = document.getElementById('hudTips');
        this.btnInject = document.getElementById('btnInject');
        this.inventoryList = document.getElementById('inventoryList');

        this.hudTimer = document.getElementById('hudTimer');
        this.gameOverScreen = document.getElementById('gameOverScreen');
        this.btnRestart = document.getElementById('btnRestart');
        this.btnStartShift = document.getElementById('btnStartShift');
        this.lastTips = -1;
        this.lastAmmoJSON = "";
        this.lastTime = -1;

        this.setupListeners();
    }

    setupListeners() {
        this.btnInject.addEventListener('click', () => {
            gameEvents.emit('HUD_INJECT_CLICK');
        });

        this.btnRestart.addEventListener('click', () => {
            location.reload();
        });

        // ADD THIS BLOCK!
        if (this.btnStartShift) {
            this.btnStartShift.addEventListener('click', () => {
                gameEvents.emit('CHANGE_STATE', { newState: 'TAPROOM' });
            });
        }
    }

    switchPhase(phaseName) {
        if (phaseName === 'TAPROOM') {
            this.taproomHUD.style.display = 'block';
            this.brewingHUD.style.display = 'none';
        } else {
            this.taproomHUD.style.display = 'none';
            this.brewingHUD.style.display = 'block';
        }
    }

    showGameOver() {
        this.taproomHUD.style.display = 'none';
        this.brewingHUD.style.display = 'none';
        this.gameOverScreen.style.display = 'flex';
    }

    update() {
        if (this.lastTips !== playerState.tips) {
            this.lastTips = playerState.tips;
            this.hudTips.innerText = `Tips: $${playerState.tips}.00`;

            if (playerState.canAfford(gameEconomy.injectionCost)) {
                this.btnInject.style.borderColor = '#f4f4f5';
                this.btnInject.style.color = '#f4f4f5';
                this.btnInject.innerText = `+ Galaxy Hop ($${gameEconomy.injectionCost})`;
            } else {
                this.btnInject.style.borderColor = '#52525b';
                this.btnInject.style.color = '#52525b';
                this.btnInject.innerText = `Need $${gameEconomy.injectionCost}`;
            }
        }

        const currentAmmoJSON = JSON.stringify(playerState.ammo);
        if (this.lastAmmoJSON !== currentAmmoJSON) {
            this.lastAmmoJSON = currentAmmoJSON;
            this.rebuildLists();
        }

        if (currentState === 'TAPROOM' && typeof taproomPhase !== 'undefined') {
            const seconds = Math.ceil(taproomPhase.timeRemaining);
            if (this.lastTime !== seconds) {
                this.lastTime = seconds;
                // Add the Shift Name to the UI!
                this.hudTimer.innerText = `${progressionState.getShiftName()} | TIME LEFT: ${seconds}s`;

                // Make the text turn red during a Boss Round to warn the player
                if (progressionState.isBossRound()) {
                    this.hudTimer.style.color = '#ef4444'; // Red!
                } else {
                    this.hudTimer.style.color = '#facc15'; // Standard Yellow
                }
            }
        }
    }

    rebuildLists() {
        this.ammoList.innerHTML = '';
        playerState.ammo.forEach((ammo, index) => {
            const li = document.createElement('li');
            li.style.cursor = 'pointer';
            li.style.margin = '10px 0';

            if (index === taproomPhase.selectedAmmoIndex) {
                li.style.color = '#f59e0b';
                li.innerText = `► ${ammo.name} (x${ammo.count})`;
            } else {
                li.style.color = '#a1a1aa';
                li.innerText = `  ${ammo.name} (x${ammo.count})`;
            }

            li.addEventListener('click', () => {
                taproomPhase.selectedAmmoIndex = index;
                this.rebuildLists();
            });
            this.ammoList.appendChild(li);
        });

        this.inventoryList.innerHTML = '';
        playerState.ammo.forEach(ammo => {
            const li = document.createElement('li');
            li.innerText = `${ammo.name}: ${ammo.count}`;
            this.inventoryList.appendChild(li);
        });
    }
}