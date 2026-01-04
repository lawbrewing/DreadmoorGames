// ==========================================
// 1. THE TUNING BOARD (UPDATED FOR ROTATED HANDLES)
// ==========================================
const TUNING = {
    // --- TOWER ALIGNMENT ---
    // Adjusts the base towers left/right to look centered
    towers: [
        { x: 10, y: 0 },   // Tap 1 (Barrel Base)
        { x: 0, y: 0 },    // Tap 2 (Hops Base)
        { x: -10, y: 0 }   // Tap 3 (Wheat Base)
    ],

    // --- HANDLE ALIGNMENT (IDLE) ---
    // Fine-tune the position of the Closed handles
    handles: [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 }
    ],

    // --- OPEN HANDLE CORRECTION (THE BIG FIX) ---
    // Shifting the rotated images so the metal stems reconnect
    openHandles: [
        // Tap 1 (Barrel): Lying on side -> Needs to move Left & Down
        { x: -20, y: 25 },  
        
        // Tap 2 (Hops): Upside down -> Needs to move WAY Down
        { x: 0, y: 55 },    
        
        // Tap 3 (Wheat): Lying on side -> Needs to move Right & Down
        { x: 20, y: 25 }    
    ],

    // --- GLASS ALIGNMENT ---
    // Line up the beer liquid with the empty glass sprite
    liquid: { x: 0, y: 0 } 
};
