// js/state/player.js

class PlayerState {
    constructor() {
        // Starting economy
        this.tips = 0;

        // This will eventually hold our Tier 5 crafted beers
        this.ammo = [
            { name: 'Swill', type: 'crowd_control', count: 'Infinite' },
            { name: 'nIPLy Cold IPA', type: 'premium', count: 5 }
        ];

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for money coming in from the Action Phase
        gameEvents.on('EARN_TIPS', (amount) => {
            this.tips += amount;
            console.log(`Earned $${amount}. Total Tips: $${this.tips}`);
        });

        // Listen for money being spent in the Brewing Phase
        gameEvents.on('SPEND_TIPS', (amount) => {
            this.tips -= amount;
            console.log(`Spent $${amount}. Total Tips: $${this.tips}`);
        });

        // Listen for new beer being crafted and added to the taplist
        gameEvents.on('ADD_AMMO', (beer) => {
            // Check if we already have this beer type, just increase count
            const existing = this.ammo.find(a => a.name === beer.name);
            if (existing && existing.count !== 'Infinite') {
                existing.count++;
            } else if (!existing) {
                this.ammo.push({ name: beer.name, type: beer.type, count: 1 });
            }
        });
    }

    canAfford(cost) {
        return this.tips >= cost;
    }
}

// Create a global instance
const playerState = new PlayerState();