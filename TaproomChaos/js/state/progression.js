// js/state/progression.js

class ProgressionState {
    constructor() {
        this.year = 1;
        this.shift = 1;
        this.shiftsPerYear = 20;

        // NEW: Current Forecast State
        this.forecast = this.generateForecast();
    }

    generateForecast() {
        // Events that can happen any time of year
        const generic = [
            { message: "Tech conference at the convention center. Expect thirsty VIPs.", modifier: "vip_spike" },
            { message: "Local startup IPO just went public. The VIPs are celebrating.", modifier: "vip_spike" },
            { message: "Classic car show wrapped up. The Old Timers are thirsty.", modifier: "old_timer_spike" },
            { message: "Bingo night at the hall next door just ended.", modifier: "old_timer_spike" },
            { message: "Quiet Tuesday afternoon. Nothing crazy expected.", modifier: "none" },
            { message: "Brewery tour bus broke down outside. Brace yourself.", modifier: "speed_spike" },
            { message: "It's Friday night. Let the chaos begin.", modifier: "speed_spike" }
        ];

        // Shifts 1-5 (Leading up to Spring Flood)
        const spring = [
            { message: "Beautiful sunny Saturday. The playground is packed.", modifier: "kid_spike" },
            { message: "Light spring rain. A few regulars might trickle in.", modifier: "none" },
            { message: "Patio officially opens today! Expect a bump in traffic.", modifier: "speed_spike" }
        ];

        // Shifts 6-10 (Leading up to Beer Garden Heatwave)
        const summer = [
            { message: "Heatwave advisory. Crisp, cold lagers and IPAs will be popular.", modifier: "ipa_bonus" },
            { message: "Softball tournament finals today. Expect a loud, rowdy crowd.", modifier: "crowd_spike" },
            { message: "PTA meeting just let out down the street. Kids incoming.", modifier: "kid_spike" }
        ];

        // Shifts 11-15 (Leading up to Oktoberfest)
        const autumn = [
            { message: "Crisp autumn evening. People will want something dark and heavy.", modifier: "stout_bonus" },
            { message: "Football Sunday! The bar is going to be packed.", modifier: "crowd_spike" },
            { message: "Local flannel enthusiasts are having a meetup.", modifier: "old_timer_spike" }
        ];

        // Shifts 16-20 (Leading up to New Year's Eve)
        const winter = [
            { message: "First snow of the year. Expect locals seeking Winter Ales.", modifier: "stout_bonus" },
            { message: "Holiday party season is in full swing.", modifier: "vip_spike" },
            { message: "Sub-zero temperatures. Only the bravest regulars are out.", modifier: "none" }
        ];

        // Build the active pool based on the shift
        let activePool = [...generic];

        if (this.shift <= 5) {
            activePool = activePool.concat(spring);
        } else if (this.shift <= 10) {
            activePool = activePool.concat(summer);
        } else if (this.shift <= 15) {
            activePool = activePool.concat(autumn);
        } else {
            activePool = activePool.concat(winter);
        }

        return activePool[Math.floor(Math.random() * activePool.length)];
    }

    isBossRound() {
        // Boss rounds are exactly on shifts 5, 10, 15, and 20
        return this.shift % 5 === 0;
    }

    getShiftName() {
        if (this.shift === 5) return "BOSS: Spring Flood";
        if (this.shift === 10) return "BOSS: Beer Garden Heatwave";
        if (this.shift === 15) return "BOSS: Oktoberfest";
        if (this.shift === 20) return "BOSS: New Year's Eve";
        return `Year ${this.year} - Shift ${this.shift}`;
    }

    getDifficultyMultiplier() {
        // 1. Base Multiplier: Starts at 1.0, increases by 20% every full Year survived
        let mult = 1.0 + ((this.year - 1) * 0.2);

        // 2. Intra-Year Creep: Increases enemy speed by 5% every normal shift
        mult += (this.shift - 1) * 0.05;

        // 3. Boss Spike: An immediate, massive 50% extra speed buff during Boss shifts
        if (this.isBossRound()) {
            mult += 0.5;
        }

        return mult;
    }

    advanceShift() {
        this.shift++;
        if (this.shift > this.shiftsPerYear) {
            this.year++;
            this.shift = 1;
            console.log(`YEAR CLEARED! Welcome to Year ${this.year}! Time to expand the brewery.`);
            gameEvents.emit('YEAR_CLEARED', this.year);
        }

        // Generate tomorrow's forecast!
        this.forecast = this.generateForecast();
    }
}

const progressionState = new ProgressionState();