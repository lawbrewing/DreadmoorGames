// js/state/player.js

class PlayerState {
    constructor() {
        // Tie this directly to the config file we made earlier
        this.tips = typeof gameEconomy !== 'undefined' ? gameEconomy.startingTips : 50;

        // Start with an EMPTY taplist! The player must brew before opening the doors.
        this.ammo = [];

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for money coming in from the Action Phase
        gameEvents.on('EARN_TIPS', (amount) => {
            this.tips += amount;
            console.log(`Earned $${amount}. Total Tips: $${this.tips}`);
        });

        // Listen for money being spent/lost
        gameEvents.on('SPEND_TIPS', (amount) => {
            this.tips -= amount;
            console.log(`Spent $${amount}. Total Tips: $${this.tips}`);
        });

        // Listen for new recipes being discovered!
        gameEvents.on('RECIPE_DISCOVERED', (recipeName) => {
            if (!this.unlockedRecipes.includes(recipeName)) {
                this.unlockedRecipes.push(recipeName);
                console.log(`NEW RECIPE UNLOCKED: ${recipeName}`);
            }
        });

        // Listen for new beer being crafted and added to the taplist
        gameEvents.on('ADD_AMMO', (beer) => {
            // Check how much ammo was passed in, default to 1 if not specified
            const amountToAdd = beer.count || 1;

            const existing = this.ammo.find(a => a.name === beer.name);
            if (existing) {
                existing.count += amountToAdd;
            } else {
                this.ammo.push({ name: beer.name, type: beer.type, count: amountToAdd });
            }
        });

        // NEW: Listen for ammo being consumed in the taproom!
        gameEvents.on('USE_AMMO', (beerName) => {
            const existing = this.ammo.find(a => a.name === beerName);
            if (existing) {
                existing.count--;
                // If we run out of this beer, remove it from the list
                if (existing.count <= 0) {
                    this.ammo = this.ammo.filter(a => a.name !== beerName);
                    // Tell the taproom phase to reset its selection if we run out
                    gameEvents.emit('AMMO_DEPLETED');
                }
            }
        });
    }

    canAfford(cost) {
        return this.tips >= cost;
    }
}

// Create a global instance
const playerState = new PlayerState();