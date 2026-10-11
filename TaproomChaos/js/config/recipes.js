// js/config/recipes.js

const gameRecipes = {
    // The Merge Chains (Index 0 is Level 1, Index 4 is Level 5)
    chains: {
        'Water': ['Winnebago', 'Tap', 'Filtered', 'Soft', 'Hard'],
        'Grain': ['Wheat Malt', 'Maris Otter', 'Pilsen Malt', 'Pale Malt', 'Brewers Malt'],
        'Adjunct': ['Flaked Rice', 'White Wheat', 'Caramel 90L', 'Munich Malt', 'Chocolate Malt'],
        'Yeast': ['Saison', 'Hornindal Kveik', 'Kolsch', 'American Ale', 'Lactobacillus'],
        'Hops': ['Hallertau', 'Tettnang', 'Lemondrop', 'Citra', 'Mandarina Bavaria']
    },

    // Static items that cannot be merged
    specialties: [
        'Marshmallow', 'Mojito', 'Raspberry Puree', 'Lactose', 'Bitters',
        'Cherry Juice', 'Lime', 'Brandy', 'Tequila'
    ],

    // --- HELPER FUNCTIONS ---

    // Find out what an item merges into
    getMergeResult: function(itemName) {
        for (const category in this.chains) {
            const chain = this.chains[category];
            const index = chain.indexOf(itemName);
            // If it's in the chain and NOT the max level, return the next one
            if (index !== -1 && index < chain.length - 1) {
                return chain[index + 1];
            }
        }
        return null; // Specialties and Level 5s don't merge
    },

    // Find an item's category
    getCategory: function(itemName) {
        for (const category in this.chains) {
            if (this.chains[category].includes(itemName)) return category;
        }
        if (this.specialties.includes(itemName)) return 'Specialty';
        return null;
    },

    // Generates a random drop with weighted probabilities
    getRandomDrop: function(category) {
        if (category === 'Specialty') {
            return this.specialties[Math.floor(Math.random() * this.specialties.length)];
        }

        const chain = this.chains[category];
        const rand = Math.random();

        // 50% Lvl 1 | 25% Lvl 2 | 15% Lvl 3 | 7% Lvl 4 | 3% Lvl 5
        let level = 0;
        if (rand > 0.50) level = 1;
        if (rand > 0.75) level = 2;
        if (rand > 0.90) level = 3;
        if (rand > 0.97) level = 4;

        return chain[level];
    },

    // --- THE KETTLE LOGIC ---

    evaluateBrew: function(ingredientsList) {
        if (!ingredientsList || ingredientsList.length === 0) return null;

        // Helper to check if the kettle contains an EXACT recipe
        const matches = (recipe) => {
            if (ingredientsList.length !== recipe.length) return false;
            const sortedInput = [...ingredientsList].sort();
            const sortedRecipe = [...recipe].sort();
            return sortedInput.every((val, index) => val === sortedRecipe[index]);
        };

        // 1. EXACT RECIPES (Order doesn't matter!)
        if (matches(['Soft', 'Brewers Malt', 'Caramel 90L', 'Mandarina Bavaria'])) return { name: 'Hopped Up', type: 'premium', count: 5 };
        if (matches(['Pilsen Malt', 'Wheat Malt', 'Lemondrop', 'Saison'])) return { name: 'LFO', type: 'premium', count: 5 };
        if (matches(['Pilsen Malt', 'Flaked Rice', 'Citra', 'Kolsch', 'Soft'])) return { name: 'nIPLy', type: 'premium', count: 5 };
        if (matches(['Pale Malt', 'Chocolate Malt', 'Lactose', 'Marshmallow', 'Tettnang', 'American Ale', 'Hard'])) return { name: 'NOT Burnt Marshmallow', type: 'premium', count: 5 };
        if (matches(['Pilsen Malt', 'White Wheat', 'Tettnang', 'Raspberry Puree', 'Filtered', 'Lactobacillus'])) return { name: 'Raspberry Cabana', type: 'premium', count: 5 };

        // Cocktails
        if (matches(['Brandy', 'Bitters', 'Cherry Juice'])) return { name: 'Old Fashioned', type: 'cocktail', count: 5 };
        if (matches(['Lime', 'Tequila'])) return { name: 'Margarita', type: 'cocktail', count: 5 };

        // 2. DYNAMIC SODA LOGIC
        const sodaFlavors = ['Mojito', 'Raspberry Puree', 'Lime', 'Cherry Juice'];
        const hasTap = ingredientsList.includes('Tap');
        const hasFlavor = ingredientsList.some(i => sodaFlavors.includes(i));
        const onlyAllowed = ingredientsList.every(i => i === 'Tap' || sodaFlavors.includes(i));

        // If it's Tap Water + Any combination of valid flavors + NOTHING ELSE
        if (hasTap && hasFlavor && onlyAllowed) {
            return { name: 'Craft Soda', type: 'soda', count: 5 };
        }

        // 3. DYNAMIC SWILL LOGIC
        const hasWinnebago = ingredientsList.includes('Winnebago');
        const hasGrain = ingredientsList.some(i => this.getCategory(i) === 'Grain');
        const hasHop = ingredientsList.some(i => this.getCategory(i) === 'Hops' || i === 'Magnum');
        const hasYeast = ingredientsList.some(i => this.getCategory(i) === 'Yeast');

        // If it has the core 4 requirements, it succeeds as Swill (any extra junk is ignored)
        if (hasWinnebago && hasGrain && hasHop && hasYeast) {
            return { name: 'Swill', type: 'crowd_control', count: 5 };
        }

        // Failed brew - waste of ingredients!
        return null;
    }
};