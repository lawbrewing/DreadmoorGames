// js/config/population.js

const gamePopulation = {
    baseSpawnInterval: 2.5, // Seconds between spawns

    // Base stats for each patron type
    stats: {
        "VIP": { speed: 25, color: "#f59e0b" },
        "Spouse": { speed: 20, color: "#ec4899" },
        "Old Timer": { speed: 18, color: "#71717a" },
        "Kid": { speed: 45, color: "#3b82f6" }
    },

    // The dice roll probabilities (must add up to 1.0)
    spawnRates: {
        tetheredPair: 0.15, // 15% chance to spawn VIP + Spouse
        vip: 0.25,          // 25% chance for solo VIP
        kid: 0.20,          // 20% chance for Kid
        oldTimer: 0.40      // 40% chance for Old Timer
    },

    // Horde Mechanics
    hordeSize: 4,
    hordeDelayMs: 400
};