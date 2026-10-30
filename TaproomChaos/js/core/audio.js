// js/core/audio.js

class GameAudioManager {
    constructor() {
        // Base folder path (automatically falls back to 'assets/audio/' if needed)
        this.basePath = 'audio/';
        this.fallbackPath = 'assets/audio/';

        // 1. Anytime Tracks (Eligible in all seasons)
        this.anytimeTracks = [
            'Four_Pillars_of_the_Batch.mp3',
            'Masters_of_Grain.mp3',
            'My_Ground_To_Hold.mp3',
            'The_Fourth_Quarter.mp3',
            'Wooden_Spoon_Queen.mp3'
        ];

        // 2. Strictly Season-Locked Tracks
        this.seasonalTracks = {
            spring: ['spring1.mp3', 'spring2.mp3'],
            summer: ['summer1.mp3', 'summer2.mp3'],
            fall: ['oktober1.mp3', 'oktober2.mp3'],
            winter: ['newyear1.mp3', 'newyear2.mp3']
        };

        // 3. Vinyl Scratch Transitions
        this.allScratches = [
            'scratch1.mp3',
            'scratch2.mp3',
            'scratch3.mp3',
            'scratch4.mp3',
            'scratch5.mp3',
            'scratch6.mp3'
        ];

        // 4. Sound Effects (SFX)
        this.sfxFiles = {
            shoot: 'shoot.mp3',
            glass: 'glass.mp3',
            upgrade: 'upgrade.mp3',
            angry: 'angry.mp3',
            cheer: 'cheer.mp3',
            brew: 'brew.mp3',
            bankrupt: 'bankrupt.mp3',
            discover: 'discover.mp3'
        };

        // Non-duplicate shuffle bag state
        this.scratchBag = [];
        this.lastScratchPlayed = null;

        this.trackBag = [];
        this.playedTracksInCycle = new Set();
        this.lastTrackPlayed = null;
        this.currentTrackFile = null;
        this.activeSeason = 'spring';

        // Audio Elements & Volumes
        this.musicVolume = 0.45;
        this.scratchVolume = 0.65;
        this.sfxVolume = 0.80;
        this.isMuted = false;
        this.isUnlocked = false;
        this.isTransitioningTrack = false;

        this.musicPlayer = new Audio();
        this.musicPlayer.preload = 'auto';
        this.musicPlayer.volume = this.musicVolume;

        this.scratchPlayer = new Audio();
        this.scratchPlayer.preload = 'auto';
        this.scratchPlayer.volume = this.scratchVolume;

        // Pre-warmed SFX pools so rapid throws/merges overlap cleanly without cutting off
        this.sfxPools = {};
        this.initSFXPools();
        this.setupTrackLifecycle();
        this.setupEventListeners();
    }

    // --- HELPER: RESOLVE AUDIO PATH WITH AUTOMATIC FALLBACK ---
    setAudioSourceWithFallback(audioEl, fileName, onReadyToPlay = null) {
        const primaryUrl = `${this.basePath}${fileName}`;
        const backupUrl = `${this.fallbackPath}${fileName}`;
        let triedBackup = false;

        audioEl.onerror = () => {
            if (!triedBackup) {
                triedBackup = true;
                audioEl.src = backupUrl;
                if (onReadyToPlay) onReadyToPlay();
            } else {
                console.warn(`[Audio] Could not load audio file: ${fileName}`);
            }
        };

        audioEl.src = primaryUrl;
        if (onReadyToPlay) onReadyToPlay();
    }

    // --- HELPER: FISHER-YATES SHUFFLE (WITH ANTI-BACK-TO-BACK GUARD) ---
    shuffleArray(arr, lastItem = null) {
        const copy = [...arr];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        // Prevent the first item of a fresh shuffle from matching the last item of the previous cycle
        if (copy.length > 1 && lastItem && copy[0] === lastItem) {
            const swapIdx = 1 + Math.floor(Math.random() * (copy.length - 1));
            [copy[0], copy[swapIdx]] = [copy[swapIdx], copy[0]];
        }
        return copy;
    }

    // --- DETERMINE CURRENT LOCKED SEASON (4 SHIFTS PER SEASON) ---
    getCurrentSeason() {
        if (typeof taproomPhase !== 'undefined' && taproomPhase.season) {
            return String(taproomPhase.season).toLowerCase();
        }
        const prog = (typeof progressionState !== 'undefined') ? progressionState : {};
        if (prog.season || prog.currentSeason) {
            return String(prog.season || prog.currentSeason).toLowerCase();
        }
        const shift = prog.shift || prog.currentShift || prog.day || 1;
        const seasons = ['spring', 'summer', 'fall', 'winter'];
        const seasonIndex = Math.floor((shift - 1) / 4) % 4;
        return seasons[seasonIndex];
    }

    isTrackAllowedInSeason(trackFile, season) {
        if (this.anytimeTracks.includes(trackFile)) return true;
        const allowedSeasonal = this.seasonalTracks[season] || [];
        return allowedSeasonal.includes(trackFile);
    }

    // --- NON-DUPLICATE SCRATCH PICKER ---
    getNextScratch() {
        if (this.scratchBag.length === 0) {
            this.scratchBag = this.shuffleArray(this.allScratches, this.lastScratchPlayed);
        }
        const nextScratch = this.scratchBag.shift();
        this.lastScratchPlayed = nextScratch;
        return nextScratch;
    }

    // --- NON-DUPLICATE SEASON-AWARE TRACK PICKER ---
    getNextTrack() {
        const season = this.getCurrentSeason();
        this.activeSeason = season;

        const seasonSpecific = this.seasonalTracks[season] || this.seasonalTracks.spring;
        const eligiblePool = [...this.anytimeTracks, ...seasonSpecific];

        // 1. Purge any queued tracks from a previous season
        this.trackBag = this.trackBag.filter(t => this.isTrackAllowedInSeason(t, season));

        // 2. If the season changed mid-cycle, inject the new season's tracks into the current bag
        seasonSpecific.forEach(sTrack => {
            if (!this.playedTracksInCycle.has(sTrack) && !this.trackBag.includes(sTrack)) {
                const insertAt = Math.floor(Math.random() * (this.trackBag.length + 1));
                this.trackBag.splice(insertAt, 0, sTrack);
            }
        });

        // 3. Once all eligible tracks have played, reset the cycle and reshuffle a fresh deck
        if (this.trackBag.length === 0) {
            this.playedTracksInCycle.clear();
            this.trackBag = this.shuffleArray(eligiblePool, this.lastTrackPlayed);
        }

        const nextTrack = this.trackBag.shift();
        this.playedTracksInCycle.add(nextTrack);
        this.lastTrackPlayed = nextTrack;
        return nextTrack;
    }

    // --- JUKEBOX PLAYBACK & SCRATCH TRANSITIONS ---
    startJukebox() {
        if (this.isMuted) return;

        // If we haven't picked a track yet, pick one and assign it to the audio element.
        // We do NOT pick a new track if one is already queued up!
        if (!this.currentTrackFile) {
            this.currentTrackFile = this.getNextTrack();
            this.setAudioSourceWithFallback(this.musicPlayer, this.currentTrackFile);
        }

        this.musicPlayer.volume = this.musicVolume;
        const playPromise = this.musicPlayer.play();

        if (playPromise !== undefined) {
            playPromise.then(() => {
                this.isUnlocked = true;
                this.isTransitioningTrack = false;
            }).catch(err => {
                console.warn('[Audio] Autoplay blocked, waiting for next touch.');
                this.isUnlocked = false;
            });
        }
    }

    playNextTrackDirect() {
        if (this.isMuted) return;
        this.isTransitioningTrack = false;

        this.currentTrackFile = this.getNextTrack();
        this.setAudioSourceWithFallback(this.musicPlayer, this.currentTrackFile);

        this.musicPlayer.volume = this.musicVolume;
        const playPromise = this.musicPlayer.play();

        if (playPromise !== undefined) {
            playPromise.catch(() => {
                this.isUnlocked = false;
            });
        }
    }

    transitionWithScratch() {
        if (this.isMuted || this.isTransitioningTrack) return;
        this.isTransitioningTrack = true;

        this.musicPlayer.pause();
        const scratchFile = this.getNextScratch();

        this.setAudioSourceWithFallback(this.scratchPlayer, scratchFile, () => {
            this.scratchPlayer.volume = this.scratchVolume;
            this.scratchPlayer.currentTime = 0;
            this.scratchPlayer.play().catch(() => {
                // If scratch fails to play, go straight into the next song
                this.playNextTrackDirect();
            });
        });
    }

    setupTrackLifecycle() {
        // When a music track finishes, play a non-duplicate scratch before the next song
        this.musicPlayer.addEventListener('ended', () => {
            this.transitionWithScratch();
        });

        // When the scratch finishes, drop immediately into the next randomized song
        this.scratchPlayer.addEventListener('ended', () => {
            this.playNextTrackDirect();
        });
    }

    // --- POLYPHONIC SFX SYSTEM ---
    initSFXPools() {
        Object.keys(this.sfxFiles).forEach(key => {
            const fileName = this.sfxFiles[key];
            this.sfxPools[key] = [];
            for (let i = 0; i < 4; i++) {
                const audio = new Audio();
                audio.preload = 'auto';
                this.setAudioSourceWithFallback(audio, fileName);
                this.sfxPools[key].push(audio);
            }
        });
    }

    playSFX(sfxKey) {
        if (this.isMuted) return;
        const pool = this.sfxPools[sfxKey];
        if (!pool || pool.length === 0) return;

        // Find an idle channel or reuse the oldest one
        let channel = pool.find(a => a.paused || a.ended) || pool[0];
        try {
            channel.volume = this.sfxVolume;
            channel.currentTime = 0;
            channel.play().catch(() => { });
        } catch (e) { }
    }

    // --- EVENT BUS & GAMEPLAY HOOKS ---
    setupEventListeners() {
        // 1. Debounced Unlock Handler
        const unlockHandler = () => {
            if (this.isMuted) return;
            // Only attempt to start if we are locked, OR if unlocked but the browser paused it
            if (!this.isUnlocked || this.musicPlayer.paused) {
                this.startJukebox();
            }
        };

        // ONLY use pointerdown and keydown. 
        // (Removed touchstart and mousedown to prevent mobile multi-fire glitches)
        window.addEventListener('pointerdown', unlockHandler, { passive: true });
        window.addEventListener('keydown', unlockHandler, { passive: true });

        if (typeof gameEvents === 'undefined') return;

        // 2. SFX: Two tiles combined and upgraded -> upgrade.mp3
        gameEvents.on('MERGE_COMBO', () => {
            this.playSFX('upgrade');
        });

        // 3. SFX: Tossed beer misses and hits the ground -> glass.mp3
        gameEvents.on('GLASS_SMASHED', () => {
            this.playSFX('glass');
        });

        // 4. SFX: Beer is tossed -> shoot.mp3
        gameEvents.on('BEER_TOSSED', () => {
            this.playSFX('shoot');
        });

        // 5. New Gameplay Audio Hooks
        gameEvents.on('PATRON_ANGRY', () => this.playSFX('angry'));
        gameEvents.on('EARN_TIPS', () => this.playSFX('cheer'));
        gameEvents.on('BREW_FINISH', () => this.playSFX('brew'));
        gameEvents.on('RECIPE_DISCOVERED', () => this.playSFX('discover'));
        gameEvents.on('BANKRUPT', () => {
            this.musicPlayer.pause();
            this.playSFX('bankrupt');
        });

        // 6. Check season lock on phase transitions (Only scratch if season actually changed)
        gameEvents.on('CHANGE_STATE', () => {
            setTimeout(() => {
                const newSeason = this.getCurrentSeason();

                // If the player is just toggling states (Brewing <-> Taproom) and the music is already playing, DO NOT restart!
                if (this.isUnlocked && !this.musicPlayer.paused && this.activeSeason === newSeason) {
                    return;
                }

                if (this.isUnlocked && this.currentTrackFile && !this.isTrackAllowedInSeason(this.currentTrackFile, newSeason)) {
                    this.transitionWithScratch();
                }
            }, 50);
        });
    }
}

const audioManager = new GameAudioManager();
window.audioManager = audioManager;