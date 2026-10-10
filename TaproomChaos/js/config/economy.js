// js/config/economy.js

const gameEconomy = {
    startingTips: 50,
    injectionCost: 15, // Cost to force-spawn a Galaxy Hop
    escapePenalty: 5,  // Money lost when a patron reaches the bar

    // Payouts for successful serves
    tips: {
        vipPremium: 15,
        vipCombo: 45,      // The "Happy Wife, Happy Life" multiplier
        spouseCocktail: 20,
        kidSoda: 10,
        oldTimer: 2,
        badServe: 0
    }
};