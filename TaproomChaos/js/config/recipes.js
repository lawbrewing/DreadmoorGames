// js/config/recipes.js

const gameRecipes = {
    chains: {
        'Water': ['Winnebago', 'Tap', 'Filtered', 'Soft', 'Hard'],
        'Grain': ['Wheat Malt', 'Maris Otter', 'Pilsen Malt', 'Pale Malt', 'Brewers Malt'],
        'Adjunct': ['Flaked Rice', 'White Wheat', 'Caramel 90L', 'Munich Malt', 'Chocolate Malt'],
        'Yeast': ['Saison', 'Hornindal Kveik', 'Kolsch', 'American Ale', 'Lactobacillus'],
        'Hops': ['Hallertau', 'Tettnang', 'Lemondrop', 'Citra', 'Mandarina Bavaria']
    },

    specialties: [
        'Marshmallow', 'Mojito', 'Raspberry Puree', 'Lactose', 'Bitters',
        'Cherry Juice', 'Lime', 'Brandy', 'Tequila', 'Coffee', 'Oak Chips'
    ],

    // THE MASTER RECIPE LIST (25 Realistic Styles)
    recipeList: [
        { name: 'nIPLy (Cold IPA)', type: 'premium', count: 5, ingredients: ['Pilsen Malt', 'Flaked Rice', 'Citra', 'Kolsch', 'Soft'] },
        { name: 'Arctic Blast (Cold IPA)', type: 'premium', count: 5, ingredients: ['Maris Otter', 'Flaked Rice', 'Lemondrop', 'Hornindal Kveik', 'Filtered'] },
        { name: 'Hopped Up (IPA)', type: 'premium', count: 5, ingredients: ['Soft', 'Brewers Malt', 'Caramel 90L', 'Mandarina Bavaria'] },
        { name: 'Double IPA', type: 'premium', count: 5, ingredients: ['Brewers Malt', 'Caramel 90L', 'Citra', 'Mandarina Bavaria', 'American Ale', 'Soft'] },
        { name: 'NEIPA', type: 'premium', count: 5, ingredients: ['Pale Malt', 'White Wheat', 'Citra', 'Mandarina Bavaria', 'Hornindal Kveik', 'Soft'] },
        { name: 'Milkshake IPA', type: 'premium', count: 5, ingredients: ['Pale Malt', 'Lactose', 'Citra', 'Mandarina Bavaria', 'American Ale', 'Soft', 'Raspberry Puree'] },

        { name: 'NOT Burnt Marshmallow (Pastry Stout)', type: 'premium', count: 5, ingredients: ['Pale Malt', 'Chocolate Malt', 'Lactose', 'Marshmallow', 'Tettnang', 'American Ale', 'Hard'] },
        { name: 'Mocha Pastry Stout', type: 'premium', count: 5, ingredients: ['Maris Otter', 'Chocolate Malt', 'Lactose', 'Coffee', 'American Ale', 'Tettnang'] },
        { name: 'Barrel-Aged Stout', type: 'premium', count: 5, ingredients: ['Pale Malt', 'Chocolate Malt', 'Coffee', 'Oak Chips', 'American Ale', 'Tettnang'] },
        { name: 'Baltic Porter', type: 'premium', count: 5, ingredients: ['Brewers Malt', 'Munich Malt', 'Chocolate Malt', 'Tettnang', 'American Ale'] },
        { name: 'Dark Mild', type: 'premium', count: 5, ingredients: ['Pale Malt', 'Caramel 90L', 'Chocolate Malt', 'Tettnang', 'American Ale', 'Hard'] },
        { name: 'Winter Ale', type: 'premium', count: 5, ingredients: ['Maris Otter', 'Munich Malt', 'Tettnang', 'American Ale', 'Cherry Juice', 'Oak Chips'] },
        { name: 'Brown Ale', type: 'premium', count: 5, ingredients: ['Maris Otter', 'Chocolate Malt', 'Caramel 90L', 'Tettnang', 'American Ale'] },
        { name: 'Amber Ale', type: 'premium', count: 5, ingredients: ['Pale Malt', 'Caramel 90L', 'Hallertau', 'American Ale', 'Filtered'] },
        { name: 'ESB', type: 'premium', count: 5, ingredients: ['Maris Otter', 'Caramel 90L', 'Tettnang', 'American Ale', 'Hard'] },

        { name: 'Classic Pilsner', type: 'premium', count: 5, ingredients: ['Pilsen Malt', 'Hallertau', 'Kolsch', 'Soft'] },
        { name: 'Helles Lager', type: 'premium', count: 5, ingredients: ['Pilsen Malt', 'Munich Malt', 'Hallertau', 'Kolsch', 'Soft'] },
        { name: 'Kolsch', type: 'premium', count: 5, ingredients: ['Pilsen Malt', 'White Wheat', 'Hallertau', 'Kolsch', 'Filtered'] },
        { name: 'Cream Ale', type: 'premium', count: 5, ingredients: ['Brewers Malt', 'Flaked Rice', 'Lemondrop', 'Kolsch', 'Filtered'] },

        { name: 'Raspberry Cabana (Sour)', type: 'premium', count: 5, ingredients: ['Pilsen Malt', 'White Wheat', 'Tettnang', 'Raspberry Puree', 'Filtered', 'Lactobacillus'] },
        { name: 'Cherry Limeade Sour', type: 'premium', count: 5, ingredients: ['Pilsen Malt', 'White Wheat', 'Lactobacillus', 'Cherry Juice', 'Lime'] },
        { name: 'Mojito Sour', type: 'premium', count: 5, ingredients: ['Pilsen Malt', 'White Wheat', 'Lactobacillus', 'Mojito', 'Lime'] },

        { name: 'LFO (Saison)', type: 'premium', count: 5, ingredients: ['Pilsen Malt', 'Wheat Malt', 'Lemondrop', 'Saison'] },
        { name: 'Classic Saison', type: 'premium', count: 5, ingredients: ['Pilsen Malt', 'Munich Malt', 'Lemondrop', 'Saison', 'Hard'] },
        { name: 'Hefeweizen', type: 'premium', count: 5, ingredients: ['Wheat Malt', 'White Wheat', 'Hallertau', 'Kolsch'] },

        { name: 'Old Fashioned', type: 'cocktail', count: 5, ingredients: ['Brandy', 'Bitters', 'Cherry Juice', 'Oak Chips'] },
        { name: 'Margarita', type: 'cocktail', count: 5, ingredients: ['Lime', 'Tequila'] }
    ],

    getMergeResult: function(itemName) {
        for (const category in this.chains) {
            const chain = this.chains[category];
            const index = chain.indexOf(itemName);
            if (index !== -1 && index < chain.length - 1) return chain[index + 1];
        }
        return null;
    },

    getCategory: function(itemName) {
        for (const category in this.chains) {
            if (this.chains[category].includes(itemName)) return category;
        }
        if (this.specialties.includes(itemName)) return 'Specialty';
        return null;
    },

    getIngredientCost: function(itemName) {
        const category = this.getCategory(itemName);
        const costs = { 'Water': 1, 'Grain': 2, 'Adjunct': 3, 'Yeast': 4, 'Hops': 5, 'Specialty': 8 };
        return costs[category] || 1;
    },

    getRandomDrop: function(category) {
        if (category === 'Specialty') return this.specialties[Math.floor(Math.random() * this.specialties.length)];
        const chain = this.chains[category];
        const rand = Math.random();
        let level = 0;
        if (rand > 0.50) level = 1;
        if (rand > 0.75) level = 2;
        if (rand > 0.90) level = 3;
        if (rand > 0.97) level = 4;
        return chain[level];
    },

    evaluateBrew: function(ingredientsList) {
        if (!ingredientsList || ingredientsList.length === 0) return null;

        const sortedInput = [...ingredientsList].sort();

        // 1. Check Master Recipe List
        for (let recipe of this.recipeList) {
            if (ingredientsList.length === recipe.ingredients.length) {
                const sortedRecipe = [...recipe.ingredients].sort();
                const isMatch = sortedInput.every((val, index) => val === sortedRecipe[index]);
                if (isMatch) return { name: recipe.name, type: recipe.type, count: recipe.count };
            }
        }

        // 2. DYNAMIC SODA LOGIC
        const sodaFlavors = ['Mojito', 'Raspberry Puree', 'Lime', 'Cherry Juice'];
        const hasTap = ingredientsList.includes('Tap');
        const hasFlavor = ingredientsList.some(i => sodaFlavors.includes(i));
        const onlyAllowed = ingredientsList.every(i => i === 'Tap' || sodaFlavors.includes(i));
        if (hasTap && hasFlavor && onlyAllowed) return { name: 'Craft Soda', type: 'soda', count: 5 };

        // 3. DYNAMIC SWILL LOGIC
        const hasWinnebago = ingredientsList.includes('Winnebago');
        const hasGrain = ingredientsList.some(i => this.getCategory(i) === 'Grain');
        const hasHop = ingredientsList.some(i => this.getCategory(i) === 'Hops');
        const hasYeast = ingredientsList.some(i => this.getCategory(i) === 'Yeast');
        if (hasWinnebago && hasGrain && hasHop && hasYeast) return { name: 'Swill', type: 'crowd_control', count: 5 };

        return null; // TRASH BATCH
    }
};