// js/state/progression.js

class ProgressionState {
    constructor() {
        this.year = 1;
        this.shift = 1;
        this.shiftsPerYear = 20; // 4 bosses x 5 rounds = 20 shift year
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
    }
}

const progressionState = new ProgressionState();