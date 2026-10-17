// js/config/patrons.js

const PATRON_ROSTER = {
    // --- NON-ALCOHOLIC ---
    'KID': {
        spriteFolder: 'assets/sprites/kid/',
        filePrefix: 'kid',
        speed: 45,
        patience: 35,
        craves: ['soda'],
        hasFullAnimations: true, // Can use emote, jump, run safely
        tipBase: 6
    },
    'PREGNANT': {
        spriteFolder: 'assets/sprites/pregnant/',
        filePrefix: 'pregnant',
        speed: 25,
        patience: 50,
        craves: ['soda'],
        hasFullAnimations: false, // Relies on core safe animations
        tipBase: 8
    },

    // --- STANDARD & SPECIALTY REGULARS (The Combo Party Pool) ---
    'REGULAR': {
        spriteFolder: 'assets/sprites/regular/',
        filePrefix: 'regular',
        speed: 35,
        patience: 40,
        craves: ['premium', 'crowd_control'],
        hasFullAnimations: true,
        tipBase: 12
    },
    'GIRL': {
        spriteFolder: 'assets/sprites/girl/',
        filePrefix: 'girl',
        speed: 35,
        patience: 40,
        craves: ['premium'],
        favoriteDrink: 'Raspberry Cabana (Sour)',
        hasFullAnimations: false,
        tipBase: 12
    },
    'BLACK': {
        spriteFolder: 'assets/sprites/black/',
        filePrefix: 'black',
        speed: 35,
        patience: 40,
        craves: ['premium'],
        favoriteDrink: 'Baltic Porter',
        hasFullAnimations: false,
        tipBase: 12
    },
    'CRIP': {
        spriteFolder: 'assets/sprites/crip/',
        filePrefix: 'crip',
        speed: 35,
        patience: 40,
        craves: ['premium'],
        favoriteDrink: 'Classic Pilsner',
        hasFullAnimations: false,
        tipBase: 12
    },

    // --- PICKY & HAZARDS ---
    'HIPSTER': {
        spriteFolder: 'assets/sprites/hipster/',
        filePrefix: 'hipster',
        speed: 35,
        patience: 30,
        craves: ['premium'],
        hasFullAnimations: false,
        tipBase: 15
    },
    'KAREN': {
        spriteFolder: 'assets/sprites/karen/',
        filePrefix: 'karen',
        speed: 40,
        patience: 18,
        craves: ['premium'],
        hasFullAnimations: false,
        tipBase: 5
    },
    'VIKING': {
        spriteFolder: 'assets/sprites/viking/',
        filePrefix: 'viking',
        speed: 20,
        patience: 60,
        craves: ['premium', 'crowd_control'],
        volumeRequired: 2,
        hasFullAnimations: false,
        tipBase: 20
    },
    'OLD_TIMER': {
        spriteFolder: 'assets/sprites/old timer/', // Exact folder name with space
        filePrefix: 'old timer',
        speed: 15,
        patience: 999,
        hasFullAnimations: false,
        isHazard: true
    },

    // --- HIGH SOCIETY ---
    'VIP': {
        spriteFolder: 'assets/sprites/vip/',
        filePrefix: 'vip',
        speed: 35,
        patience: 35,
        craves: ['premium', 'cocktail'],
        hasFullAnimations: false,
        tipBase: 28
    },

    // --- SEASONAL BOSSES ---
    // Heatwave
    'SUMMER_BRO': { spriteFolder: 'assets/sprites/summer bro/', filePrefix: 'summer bro', speed: 25, patience: 45, craves: ['premium'], isBoss: true, hasFullAnimations: false, tipBase: 40 },
    'SUMMER_BELLE': { spriteFolder: 'assets/sprites/summer belle/', filePrefix: 'summer belle', speed: 25, patience: 45, craves: ['premium'], isBoss: true, hasFullAnimations: false, tipBase: 40 },
    // Rain/Storm
    'FLOOD_FARMER': { spriteFolder: 'assets/sprites/flood farmer/', filePrefix: 'flood farmer', speed: 20, patience: 50, craves: ['premium'], isBoss: true, hasFullAnimations: false, tipBase: 40 },
    'FLOOD_QUEEN': { spriteFolder: 'assets/sprites/flood queen/', filePrefix: 'flood queen', speed: 20, patience: 50, craves: ['premium'], isBoss: true, hasFullAnimations: false, tipBase: 40 },
    // Fall/Oktoberfest
    'OKT_FAIRY': { spriteFolder: 'assets/sprites/okt fairy/', filePrefix: 'okt fairy', speed: 30, patience: 40, craves: ['premium'], isBoss: true, hasFullAnimations: false, tipBase: 45 },
    'OKT_ZOMBIE': { spriteFolder: 'assets/sprites/okt zombie/', filePrefix: 'okt zombie', speed: 15, patience: 60, craves: ['premium'], isBoss: true, hasFullAnimations: false, tipBase: 45 },
    // Winter/Holiday
    'HOLIDAY_ELF': { spriteFolder: 'assets/sprites/holiday elf/', filePrefix: 'holiday elf', speed: 35, patience: 35, craves: ['premium'], isBoss: true, hasFullAnimations: false, tipBase: 50 },
    'HOLIDAY_SANTA': { spriteFolder: 'assets/sprites/holiday santa/', filePrefix: 'holiday santa', speed: 20, patience: 65, craves: ['premium'], isBoss: true, hasFullAnimations: false, tipBase: 60 }
};

// Spawn Pools
const POOL_PARTY = ['REGULAR', 'GIRL', 'BLACK', 'CRIP']; // Used to build groups of 2 or 3
const POOL_SODA = ['KID', 'PREGNANT'];
const POOL_HAZARDS = ['KAREN', 'HIPSTER', 'VIKING'];