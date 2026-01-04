/**
 * LAW ON TAP - DOM ENGINE
 * Logic: Toggles CSS classes. The browser handles the graphics.
 */

const CONFIG = {
    POUR_SPEED: 1.5, // Percent per frame (approx 60fps)
    PERFECT_MIN: 80,
    PERFECT_MAX: 96,
    SPILL_PENALTY: 2000
};

// Audio Elements (Simple Preload)
const audio = {
    pour: new Audio("https://lawbrewing.github.io/DreadmoorGames/assets/pour_start.mp3"),
    stop: new Audio("https://lawbrewing.github.io/DreadmoorGames/assets/pour_stop.mp3"),
    ding: new Audio("https://lawbrewing.github.io/DreadmoorGames/assets/perfect_ding.mp3")
};

class TapStation {
    constructor(elementId, beerColor) {
        this.element = document.getElementById(elementId);
        this.liquid = this.element.querySelector('.beer-liquid');
        this.handle = this.element.querySelector('.handle');
        this.hitbox = this.element.querySelector('.hitbox');
        
        // State
        this.fillLevel = 0;
        this.isPouring = false;
        this.isLocked = false;
        
        // Setup Color
        this.liquid.style.backgroundColor = beerColor;

        // Input Events
        this.hitbox.addEventListener('mousedown', () => this.startPour());
        this.hitbox.addEventListener('touchstart', (e) => { e.preventDefault(); this.startPour(); });
        
        // Stop pouring listeners (Global)
        window.addEventListener('mouseup', () => this.stopPour());
        window.addEventListener('touchend', () => this.stopPour());
    }

    startPour() {
        if(this.isLocked) return;
        this.isPouring = true;
        this.element.classList.add('pouring'); // Triggers CSS Rotation!
        audio.pour.currentTime = 0;
        audio.pour.play().catch(e => {}); // Ignore auto-play blocks
    }

    stopPour() {
        if(!this.isPouring) return;
        this.isPouring = false;
        this.element.classList.remove('pouring'); // Resets CSS Rotation
        audio.stop.currentTime = 0;
        audio.stop.play().catch(e => {});
        this.checkResult();
    }

    checkResult() {
        if (this.fillLevel >= CONFIG.PERFECT_MIN && this.fillLevel <= CONFIG.PERFECT_MAX) {
            console.log("PERFECT!");
            audio.ding.play();
            // Reset after success
            setTimeout(() => this.reset(), 1000);
        } else if (this.fillLevel > 10) {
            console.log("Bad Pour - Dumped");
            this.reset();
        }
    }

    reset() {
        this.fillLevel = 0;
        this.liquid.style.height = '0%';
    }

    update() {
        if (this.isPouring && !this.isLocked) {
            this.fillLevel += CONFIG.POUR_SPEED;
            this.liquid.style.height = `${this.fillLevel}%`;

            if (this.fillLevel >= 100) {
                this.triggerSpill();
            }
        }
    }

    triggerSpill() {
        this.isLocked = true;
        this.isPouring = false;
        this.element.classList.remove('pouring');
        console.log("SPILL!");
        // Unlock after delay
        setTimeout(() => {
            this.isLocked = false;
            this.reset();
        }, CONFIG.SPILL_PENALTY);
    }
}

// Initialize Taps
const taps = [
    new TapStation('tap-0', '#3b2600'), // Stout
    new TapStation('tap-1', '#d48600'), // IPA
    new TapStation('tap-2', '#ffd700')  // Lager
];

// Game Loop (Just for logic updates)
function loop() {
    taps.forEach(tap => tap.update());
    requestAnimationFrame(loop);
}

// Start
document.getElementById('loading-screen').style.display = 'none';
loop();
