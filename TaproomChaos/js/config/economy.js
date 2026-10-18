// js/config/economy.js

const gameEconomy = {
    startingTips: 65, // A slightly safer buffer to learn the ropes without immediate bankruptcy

    // NEW: Explicitly define the penalty when a patron storms out angry!
    escapePenalty: 10,

    tips: {
        swill: 4,          // Reliable early baseline to cover production costs and leave a small profit
        soda: 6,           // Quick refreshment for kids and casual patrons
        badServe: 0,       // Patron leaves disgusted (No tip)
        standard: 12,      // Solid payout for standard craft beers
        vipPremium: 28,    // High reward for satisfying VIPs with complex styles
        vipCombo: 45       // Massive payout when keeping tethered couples happy
    }
};