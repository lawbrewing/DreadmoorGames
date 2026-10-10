// js/config/recipes.js

const gameRecipes = {
    "merges": {
        "Base Malt": { "result": "Specialty Grain", "color": "#92400e" },
        "Specialty Grain": { "result": "Hop Pellet", "color": "#16a34a" },
        "Hop Pellet": { "result": "Liquid Yeast", "color": "#fef08a" },
        "Liquid Yeast": { "result": "Craft Beer Ammo", "color": "#eab308" },

        "Tap Water": { "result": "Carbonated Water", "color": "#38bdf8" },
        "Carbonated Water": { "result": "Craft Soda Ammo", "color": "#ef4444" },

        // --- NEW: THE SPIRITS TREE ---
        "Well Liquor": { "result": "Aged Spirits", "color": "#d97706" },
        "Aged Spirits": { "result": "Craft Cocktail Ammo", "color": "#be123c" }
    },
    "brews": {
        "Craft Beer Ammo": { "ammoName": "nIPLy Cold IPA", "type": "premium" },
        "Craft Soda Ammo": { "ammoName": "Craft Soda", "type": "soda" },
        "Craft Beer Ammo+Marshmallow": { "ammoName": "NOT Burnt Marshmallow Pastry Stout", "type": "premium" },
        "Craft Beer Ammo+Raspberry": { "ammoName": "Raspberry Cabana Sour", "type": "premium" },
        "Cacao Nibs+Craft Beer Ammo+Marshmallow": { "ammoName": "S'mores Imperial Porter", "type": "premium" },

        // --- NEW: COCKTAIL BREWS ---
        "Craft Cocktail Ammo": { "ammoName": "Old Fashioned", "type": "cocktail" },
        "Craft Cocktail Ammo+Raspberry": { "ammoName": "Raspberry Margarita", "type": "cocktail" }
    }
};