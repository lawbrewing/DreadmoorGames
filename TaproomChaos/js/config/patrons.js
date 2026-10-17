// js/config/patrons.js
const PATRON_ROSTER = {
    // --- NON-ALCOHOLIC ---
    'kid': {
        spriteFolder: 'assets/sprites/kid/',
        filePrefix: 'kid',
        speed: 45,
        patience: 35,
        craves: ['soda'],
        hasFullAnimations: true,
        tipBase: 6
    },
    'pregnant': {
        spriteFolder: 'assets/sprites/pregnant/',
        filePrefix: 'pregnant',
        speed: 25,
        patience: 50,
        craves: ['soda'],
        hasFullAnimations: false,
        tipBase: 8
    },

    // --- STANDARD & SPECIALTY REGULARS ---
    'regular': {
        spriteFolder: 'assets/sprites/regular/',
        filePrefix: 'regular',
        speed: 35,
        patience: 40,
        craves: ['premium', 'crowd_control'],
        hasFullAnimations: true,
        tipBase: 12
    },
    'girl': {
        spriteFolder: 'assets/sprites/girl/',
        filePrefix: 'girl',
        speed: 35,
        patience: 40,
        craves: ['premium'],
        favoriteDrink: 'Raspberry Cabana (Sour)',
        hasFullAnimations: false,
        tipBase: 12
    },
    'black': {
        spriteFolder: 'assets/sprites/black/',
        filePrefix: 'black',
        speed: 35,
        patience: 40,
        craves: ['premium'],
        favoriteDrink: 'Baltic Porter',
        hasFullAnimations: false,
        tipBase: 12
    },
    'crip': {
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
    'hipster': {
        spriteFolder: 'assets/sprites/hipster/',
        filePrefix: 'hipster',
        speed: 35,
        patience: 30,
        craves: ['premium'],
        hasFullAnimations: false,
        tipBase: 15
    },
    'karen': {
        spriteFolder: 'assets/sprites/karen/',
        filePrefix: 'karen',
        speed: 40,
        patience: 18,
        craves: ['premium'],
        hasFullAnimations: false,
        tipBase: 5
    },
    'viking': {
        spriteFolder: 'assets/sprites/viking/',
        filePrefix: 'viking',
        speed: 20,
        patience: 60,
        craves: ['premium', 'crowd_control'],
        volumeRequired: 2,
        hasFullAnimations: false,
        tipBase: 20
    },
    'old_timer': {
        spriteFolder: 'assets/sprites/old timer/',
        filePrefix: 'old timer',
        speed: 15,
        patience: 999,
        hasFullAnimations: false,
        isHazard: true
    },

    // --- HIGH SOCIETY ---
    'vip': {
        spriteFolder: 'assets/sprites/vip/',
        filePrefix: 'vip',
        speed: 35,
        patience: 35,
        craves: ['premium', 'cocktail'],
        hasFullAnimations: false,
        tipBase: 28
    },

    // --- SEASONAL BOSSES ---
    'summer_bro': { spriteFolder: 'assets/sprites/summer bro/', filePrefix: 'summer bro', speed: 25, patience: 45, craves: ['premium'], isBoss: true, hasFullAnimations: false, tipBase: 40 },
    'summer_belle': { spriteFolder: 'assets/sprites/summer belle/', filePrefix: 'summer belle', speed: 25, patience: 45, craves: ['premium'], isBoss: true, hasFullAnimations: false, tipBase: 40 },
    'flood_farmer': { spriteFolder: 'assets/sprites/flood farmer/', filePrefix: 'flood farmer', speed: 20, patience: 50, craves: ['premium'], isBoss: true, hasFullAnimations: false, tipBase: 40 },
    'flood_queen': { spriteFolder: 'assets/sprites/flood queen/', filePrefix: 'flood queen', speed: 20, patience: 50, craves: ['premium'], isBoss: true, hasFullAnimations: false, tipBase: 40 },
    'okt_fairy': { spriteFolder: 'assets/sprites/okt fairy/', filePrefix: 'okt fairy', speed: 30, patience: 40, craves: ['premium'], isBoss: true, hasFullAnimations: false, tipBase: 45 },
    'okt_zombie': { spriteFolder: 'assets/sprites/okt zombie/', filePrefix: 'okt zombie', speed: 15, patience: 60, craves: ['premium'], isBoss: true, hasFullAnimations: false, tipBase: 45 },
    'holiday_elf': { spriteFolder: 'assets/sprites/holiday elf/', filePrefix: 'holiday elf', speed: 35, patience: 35, craves: ['premium'], isBoss: true, hasFullAnimations: false, tipBase: 50 },
    'holiday_santa': { spriteFolder: 'assets/sprites/holiday santa/', filePrefix: 'holiday santa', speed: 20, patience: 65, craves: ['premium'], isBoss: true, hasFullAnimations: false, tipBase: 60 }
};

// --- SPAWN POOLS (Lowercase to match roster keys) ---
window.POOL_PARTY = ['regular', 'girl', 'black', 'crip'];
window.POOL_SODA = ['kid', 'pregnant'];
window.POOL_HAZARDS = ['karen', 'hipster', 'viking'];

window.PATRON_ROSTER = PATRON_ROSTER;