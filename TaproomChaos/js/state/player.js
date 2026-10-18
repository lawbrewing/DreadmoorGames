// js/state/player.js
class PlayerState {
    constructor() {
        // Tie this directly to the config file, with a strict numeric fallback
        const baseTips = (typeof gameEconomy !== 'undefined' && !isNaN(gameEconomy.startingTips))
            ? gameEconomy.startingTips
            : 50;

        this.tips = Number(baseTips);

        // Start with an EMPTY taplist! The player must brew before opening the doors.
        this.ammo = [];
        this.unlockedRecipes = [];
        this.unlockedKettles = 1; // Starts with 1 kettle, max 3
        this.kettleCosts = [0, 50, 125];
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for money coming in from the Action Phase
        gameEvents.on('EARN_TIPS', (amount) => {
            const num = Number(amount);
            if (!isNaN(num)) {
                this.tips = Number(this.tips) || 0;
                this.tips += num;
                console.log(`Earned $${num}. Total Tips: $${this.tips}`);
            } else {
                console.error(`EARN_TIPS received invalid amount:`, amount);
            }
        });

        // Listen for money being spent/lost
        gameEvents.on('SPEND_TIPS', (amount) => {
            const num = Number(amount);
            if (!isNaN(num)) {
                this.tips = Number(this.tips) || 0;
                this.tips = Math.max(0, this.tips - num);
                console.log(`Spent $${num}. Total Tips: $${this.tips}`);
            } else {
                console.error(`SPEND_TIPS received invalid amount:`, amount);
            }
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
            const amountToAdd = Number(beer.count) || 1;

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
        const safeTips = Number(this.tips) || 0;
        const safeCost = Number(cost) || 0;
        return safeTips >= safeCost;
    }
}
// Create a global instance
const playerState = new PlayerState();