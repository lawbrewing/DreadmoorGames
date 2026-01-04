/**
 * LAW ON TAP - VERSION 11: SPRITE REVEAL ENGINE
 */

const CONFIG = {
    POUR_SPEED: 1.5, 
    PERFECT_MIN: 80,
    PERFECT_MAX: 96,
    SPILL_PENALTY: 2000
};

const audio = {
    pour: new Audio("https://lawbrewing.github.io/DreadmoorGames/assets/pour_start.mp3"),
    stop: new Audio("https://lawbrewing.github.io/DreadmoorGames/assets/pour_stop.mp3"),
    ding: new Audio("https://lawbrewing.github.io/DreadmoorGames/assets/perfect_ding.mp3")
};

class TapStation {
    constructor(elementId, beerType) {
        this.element = document.getElementById(elementId);
        // We now target the MASK, not a color block
        this.liquidMask = this.element.querySelector('.liquid-mask');
        this.hitbox = this.element.querySelector('.hitbox');
        
        this.fillLevel = 0;
        this.isPouring = false;
        this.isLocked = false;

        // Input
        this.hitbox.addEventListener('mousedown', () => this.startPour());
        this.hitbox.addEventListener('touchstart', (e) => { e.preventDefault(); this.startPour(); });
        window.addEventListener('mouseup', () => this.stopPour());
        window.addEventListener('touchend', () => this.stopPour());
    }

    startPour() {
        if(this.isLocked) return;
        this.isPouring = true;
        this.element.classList.add('pouring'); 
        audio.pour.currentTime = 0;
        audio.pour.play().catch(e => {}); 
    }

    stopPour() {
        if(!this.isPouring) return;
        this.isPouring = false;
        this.element.classList.remove('pouring');
        audio.stop.currentTime = 0;
        audio.stop.play().catch(e => {});
        this.checkResult();
    }

    checkResult() {
        if (this.fillLevel >= CONFIG.PERFECT_MIN && this.fillLevel <= CONFIG.PERFECT_MAX) {
            console.log("PERFECT!");
            audio.ding.play();
            setTimeout(() => this.reset(), 1000);
        } else if (this.fillLevel > 10) {
            console.log("Bad Pour");
            this.reset();
        }
    }

    reset() {
        this.fillLevel = 0;
        this.liquidMask.style.height = '0%';
    }

    update() {
        if (this.isPouring && !this.isLocked) {
            this.fillLevel += CONFIG.POUR_SPEED;
            // Reveal the sprite by increasing the mask height
            this.liquidMask.style.height = `${this.fillLevel}%`;

            if (this.fillLevel >= 100) this.triggerSpill();
        }
    }

    triggerSpill() {
        this.isLocked = true;
        this.isPouring = false;
        this.element.classList.remove('pouring');
        setTimeout(() => {
            this.isLocked = false;
            this.reset();
        }, CONFIG.SPILL_PENALTY);
    }
}

// Initialize
const taps = [
    new TapStation('tap-0', 0), 
    new TapStation('tap-1', 1), 
    new TapStation('tap-2', 2)  
];

function loop() {
    taps.forEach(tap => tap.update());
    requestAnimationFrame(loop);
}

document.getElementById('loading-screen').style.display = 'none';
loop();
