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

    // THE MASTER RECIPE LIST
    recipeList: [
        // --- LAW BREWING LORE EXACT MATCHES ---
        { name: 'nIPLy', type: 'premium', count: 5, ingredients: ['Pilsen Malt', 'Flaked Rice', 'Citra', 'Kolsch', 'Soft'] },
        { name: 'NOT Burnt Marshmallow', type: 'premium', count: 5, ingredients: ['Pale Malt', 'Chocolate Malt', 'Lactose', 'Marshmallow', 'Tettnang', 'American Ale', 'Hard'] },
        { name: 'Raspberry Cabana', type: 'premium', count: 5, ingredients: ['Pilsen Malt', 'White Wheat', 'Tettnang', 'Raspberry Puree', 'Filtered', 'Lactobacillus'] },
        { name: 'The Patient Egret', type: 'premium', count: 5, ingredients: ['Soft', 'Pale Malt', 'Chocolate Malt', 'Caramel 90L', 'Tettnang', 'American Ale'] },
        { name: 'Stolem', type: 'premium', count: 5, ingredients: ['Filtered', 'Brewers Malt', 'Munich Malt', 'Chocolate Malt', 'Hallertau', 'Kolsch'] },
        { name: 'Gutless Rusty', type: 'premium', count: 5, ingredients: ['Soft', 'Pilsen Malt', 'Flaked Rice', 'Hallertau', 'Kolsch'] },
        { name: 'It Was All a Dreamsicle', type: 'premium', count: 5, ingredients: ['Soft', 'Pale Malt', 'Lactose', 'Marshmallow', 'Citra', 'Mandarina Bavaria', 'American Ale'] },
        { name: 'Hopped Up On Enemy\'s Blood', type: 'premium', count: 5, ingredients: ['Hard', 'Brewers Malt', 'Caramel 90L', 'Mandarina Bavaria', 'Citra', 'American Ale'] },
        { name: 'Angels With Filthy Souls', type: 'premium', count: 5, ingredients: ['Hard', 'Maris Otter', 'Munich Malt', 'Tettnang', 'American Ale', 'Oak Chips', 'Cherry Juice'] },
        { name: 'Stolem\'s Nightcap', type: 'premium', count: 5, ingredients: ['Hard', 'Brewers Malt', 'Chocolate Malt', 'Brandy', 'Oak Chips', 'Tettnang', 'American Ale'] },
        { name: 'Tangier Management', type: 'premium', count: 5, ingredients: ['Soft', 'Pale Malt', 'White Wheat', 'Mandarina Bavaria', 'American Ale'] },
        { name: 'Ninjas?! Why\'d they have to be ninjas?!', type: 'premium', count: 5, ingredients: ['Filtered', 'Pilsen Malt', 'Flaked Rice', 'Lemondrop', 'Citra', 'Hornindal Kveik'] },
        { name: 'Pumpkin Porter', type: 'premium', count: 5, ingredients: ['Filtered', 'Maris Otter', 'Chocolate Malt', 'Caramel 90L', 'Bitters', 'Hallertau', 'American Ale'] },

        // --- GENERIC STYLE FALLBACKS ---
        { name: 'Arctic Blast (Cold IPA)', type: 'premium', count: 5, ingredients: ['Maris Otter', 'Flaked Rice', 'Lemondrop', 'Hornindal Kveik', 'Filtered'] },
        { name: 'Double IPA', type: 'premium', count: 5, ingredients: ['Brewers Malt', 'Caramel 90L', 'Citra', 'Mandarina Bavaria', 'American Ale', 'Soft'] },
        { name: 'NEIPA', type: 'premium', count: 5, ingredients: ['Pale Malt', 'White Wheat', 'Citra', 'Mandarina Bavaria', 'Hornindal Kveik', 'Soft'] },
        { name: 'Mocha Pastry Stout', type: 'premium', count: 5, ingredients: ['Maris Otter', 'Chocolate Malt', 'Lactose', 'Coffee', 'American Ale', 'Tettnang', 'Filtered'] },
        { name: 'Barrel-Aged Stout', type: 'premium', count: 5, ingredients: ['Pale Malt', 'Chocolate Malt', 'Coffee', 'Oak Chips', 'American Ale', 'Tettnang', 'Filtered'] },
        { name: 'Dark Mild', type: 'premium', count: 5, ingredients: ['Pale Malt', 'Caramel 90L', 'Chocolate Malt', 'Tettnang', 'American Ale', 'Hard'] },
        { name: 'Amber Ale', type: 'premium', count: 5, ingredients: ['Pale Malt', 'Caramel 90L', 'Hallertau', 'American Ale', 'Filtered'] },
        { name: 'Classic Pilsner', type: 'premium', count: 5, ingredients: ['Pilsen Malt', 'Hallertau', 'Kolsch', 'Soft'] },
        { name: 'Helles Lager', type: 'premium', count: 5, ingredients: ['Pilsen Malt', 'Munich Malt', 'Hallertau', 'Kolsch', 'Soft'] },
        { name: 'Cherry Limeade Sour', type: 'premium', count: 5, ingredients: ['Pilsen Malt', 'White Wheat', 'Lactobacillus', 'Cherry Juice', 'Lime', 'Tettnang', 'Filtered'] },
        { name: 'LFO (Saison)', type: 'premium', count: 5, ingredients: ['Pilsen Malt', 'Wheat Malt', 'Lemondrop', 'Saison', 'Soft'] },

        // --- COCKTAILS ---
        { name: 'Old Fashioned', type: 'cocktail', count: 5, ingredients: ['Brandy', 'Bitters', 'Cherry Juice', 'Oak Chips'] },
        { name: 'Margarita', type: 'cocktail', count: 5, ingredients: ['Lime', 'Tequila'] }
    ],

    getForecastHint: function(recipeName, type) {
        const nameLower = recipeName.toLowerCase();
        if (nameLower.includes('ipa') || nameLower.includes('hopped') || nameLower.includes('ninjas') || nameLower.includes('niply')) {
            return '⚡ High synergy with Tech Conventions and heavy afternoon IPA demand surges.';
        }
        if (nameLower.includes('stout') || nameLower.includes('porter') || nameLower.includes('ale') || nameLower.includes('stolem') || nameLower.includes('angels')) {
            return '❄️ Ideal for chilly weather shifts and brisk autumn evening rushes.';
        }
        if (nameLower.includes('sour') || nameLower.includes('saison') || nameLower.includes('lager') || nameLower.includes('cabana')) {
            return '☀️ A prime crowd-pleaser for hot summer heatwaves and outdoor patio crowds.';
        }
        if (type === 'cocktail') {
            return '🍸 Premium high-roller pour—save these for high-paying VIP and date-night tables.';
        }
        if (type === 'soda') {
            return '🥤 Essential non-alcoholic fallback to keep kids and designated drivers happy.';
        }
        return '📈 Reliable baseline craft beer for steady, dependable daily tip flow.';
    },

    getStyleIcon: function(recipeName, type) {
        const styleLookup = (recipeName + ' ' + (type || 'premium')).toLowerCase();

        if (styleLookup.includes('ipa')) return '🌿';
        if (styleLookup.includes('stout') || styleLookup.includes('imperial')) return '☕';
        if (styleLookup.includes('porter') || styleLookup.includes('ale') || styleLookup.includes('mild')) return '🍺';
        if (styleLookup.includes('sour')) return '🍒';
        if (styleLookup.includes('lager') || styleLookup.includes('pilsner') || styleLookup.includes('oktoberfest')) return '🍻';
        if (styleLookup.includes('saison')) return '🌾';
        if (styleLookup.includes('soda') || styleLookup.includes('mocktail')) return '🥤';
        if (styleLookup.includes('cocktail')) return '🍸';

        return '⭐';
    },

    getMergeResult: function(itemName) {
        for (const category in this.chains) {
            const chain = this.chains[category];
            const index = chain.indexOf(itemName);
            if (index !== -1 && index < chain.length - 1) {
                return chain[index + 1];
            }
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

    getIngredientCost(itemName) {
        const tier1 = ['Tap Water', 'Base Malt', 'Standard Yeast', 'Cascade Hops'];
        if (tier1.includes(itemName)) return 0.25;

        const tier2 = ['Spring Water', 'Roasted Malt', 'Belgian Yeast', 'Citra Hops'];
        if (tier2.includes(itemName)) return 0.50;

        const tier3 = ['Glacial Water', 'Caramel Malt', 'Champagne Yeast', 'Galaxy Hops'];
        if (tier3.includes(itemName)) return 1.00;

        if (itemName === 'Coffee Beans' || itemName === 'Cacao Nibs') return 1.50;

        return 0.50;
    }, // <-- Added comma here

    getRandomDrop(category) {
        const currentTips = (typeof playerState !== 'undefined') ? playerState.tips : 10.00;
        const isBroke = currentTips < 3.00;

        const roll = Math.random();

        if (category === 'Water') {
            if (isBroke || roll < 0.50) return 'Tap Water';
            if (roll < 0.85) return 'Spring Water';
            return 'Glacial Water';
        }
        if (category === 'Grain') {
            if (isBroke || roll < 0.50) return 'Base Malt';
            if (roll < 0.85) return 'Roasted Malt';
            return 'Caramel Malt';
        }
        if (category === 'Yeast') {
            if (isBroke || roll < 0.50) return 'Standard Yeast';
            if (roll < 0.85) return 'Belgian Yeast';
            return 'Champagne Yeast';
        }
        if (category === 'Hops') {
            if (isBroke || roll < 0.50) return 'Cascade Hops';
            if (roll < 0.85) return 'Citra Hops';
            return 'Galaxy Hops';
        }
        if (category === 'Adjunct') {
            return roll < 0.5 ? 'Coffee Beans' : 'Cacao Nibs';
        }

        return 'Tap Water';
    }, // <-- Added comma here

    evaluateBrew: function(ingredientsList) {
        if (!ingredientsList || ingredientsList.length < 2) return null;

        const sortedInput = [...ingredientsList].sort();

        // 1. Check Master Recipe List First
        for (let recipe of this.recipeList) {
            if (ingredientsList.length === recipe.ingredients.length) {
                const sortedRecipe = [...recipe.ingredients].sort();
                const isMatch = sortedInput.every((val, index) => val === sortedRecipe[index]);
                if (isMatch) {
                    const hasWater = ingredientsList.some(i => this.getCategory(i) === 'Water');
                    const hasGrain = ingredientsList.some(i => this.getCategory(i) === 'Grain');
                    const hasHop = ingredientsList.some(i => this.getCategory(i) === 'Hops');
                    const hasYeast = ingredientsList.some(i => this.getCategory(i) === 'Yeast');

                    const isCocktail = recipe.type === 'cocktail';
                    if (!isCocktail && (!hasWater || !hasGrain || !hasHop || !hasYeast)) {
                        return null;
                    }

                    return { name: recipe.name, type: recipe.type, count: recipe.count };
                }
            }
        }

        // 2. DYNAMIC SODA/MOCKTAIL LOGIC
        const sodaFlavors = ['Mojito', 'Raspberry Puree', 'Lime', 'Cherry Juice'];
        const hasTap = ingredientsList.includes('Tap') || ingredientsList.some(i => this.getCategory(i) === 'Water');
        const hasFlavor = ingredientsList.some(i => sodaFlavors.includes(i));
        const onlyAllowed = ingredientsList.every(i => this.getCategory(i) === 'Water' || sodaFlavors.includes(i));

        if (hasTap && hasFlavor && onlyAllowed) {
            let sodaName = 'Craft Soda';
            if (ingredientsList.includes('Lime')) sodaName = 'subLime (Mocktail)';
            else if (ingredientsList.includes('Cherry Juice')) sodaName = 'Cherry Bomb (Soda)';
            else if (ingredientsList.includes('Raspberry Puree')) sodaName = 'Razzle Dazzle (Soda)';
            else if (ingredientsList.includes('Mojito')) sodaName = 'No-jito (Mocktail)';

            return { name: sodaName, type: 'soda', count: 5 };
        }

        // 3. UNIVERSAL SWILL FALLBACK
        const hasWater = ingredientsList.some(i => this.getCategory(i) === 'Water');
        const hasGrain = ingredientsList.some(i => this.getCategory(i) === 'Grain');
        const hasHop = ingredientsList.some(i => this.getCategory(i) === 'Hops');
        const hasYeast = ingredientsList.some(i => this.getCategory(i) === 'Yeast');

        if (hasWater && hasGrain && hasHop && hasYeast) {
            return { name: 'Swill', type: 'crowd_control', count: 5 };
        }

        return null;
    }
};