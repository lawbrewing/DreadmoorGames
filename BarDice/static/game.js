const { useState, useEffect, useRef, useMemo } = React;

// --- ICONS ---
const Icons = {
    Star: () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 0L14.59 8.06L22.5 5.5L17.3 12L22.5 18.5L14.59 15.94L12 24L9.41 15.94L1.5 18.5L6.7 12L1.5 5.5L9.41 8.06L12 0Z"/></svg>,
    Beer: () => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 7h10v11a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V7Z" fill="#eab308" stroke="#eab308" fillOpacity="0.5"/>
            <path d="M6 7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v0H6v0Z" fill="white" stroke="white"/>
            <path d="M17 8h1a4 4 0 0 1 0 8h-1" stroke="currentColor"/>
            <line x1="7" y1="7" x2="17" y2="7" stroke="currentColor"/>
            <line x1="7" y1="21" x2="17" y2="21" stroke="currentColor"/>
            <line x1="7" y1="7" x2="7" y2="21" stroke="currentColor"/>
            <line x1="17" y1="7" x2="17" y2="21" stroke="currentColor"/>
        </svg>
    ),
    DollarSign: () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    Skull: () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><path d="M8 20v2h8v-2"/><path d="M12.5 17l.5-2 .5 2h2l.5-2 .5 2"/><path d="M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20"/></svg>,
    RefreshCw: () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>,
    Check: () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    Help: () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    Mug: () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 6h2a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M4 6h13v14H4V6Z"/><path d="M8 6v14"/><path d="M12 6v14"/><path d="M4 10h13"/></svg>,
    Party: () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M15 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/><path d="M19 12c0 2.2-1.5 4.3-4.5 4.3S10 14.2 10 12c0-2.3 1.5-4.3 4.5-4.3S19 9.8 19 12z"/><path d="M21 12c0 3.3-2.5 6-7 6s-7-2.7-7-6c0-3.3 2.5-6 7-6s7 2.7 7 6z"/><path d="M22 12c0 4.4-3.4 8-10 8S2 16.4 2 12 5.4 4 12 4s10 3.6 10 8z"/></svg>,
    TrendingUp: () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
};

const Icon = ({ name, size = 16, className = "" }) => {
    const Component = Icons[name];
    if (!Component) return null;
    return <div className={className} style={{ width: size, height: size, display: 'inline-block' }}><Component /></div>;
};

// --- ENHANCED CUSTOM AVATARS ---
const Avatars = {
    Pete: () => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-full h-full">
            <rect width="100" height="100" fill="#2d3748"/>
            <path d="M20 60 Q50 95 80 60 L80 40 L20 40 Z" fill="#e2e8f0"/>
            <circle cx="50" cy="45" r="25" fill="#fbd38d"/>
            <path d="M10 40 L90 40 L80 15 L20 15 Z" fill="#1a202c"/>
            <rect x="15" y="35" width="70" height="5" fill="#c53030"/>
            <circle cx="38" cy="45" r="4" fill="#1a202c"/>
            <circle cx="62" cy="45" r="4" fill="#1a202c"/>
            <path d="M45 55 Q50 58 55 55" stroke="#1a202c" strokeWidth="2" fill="none"/>
        </svg>
    ),
    Rick: () => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-full h-full">
            <rect width="100" height="100" fill="#2c5282"/>
            <rect x="25" y="20" width="50" height="65" rx="15" fill="#ed8936"/>
            <path d="M25 25 L35 5 L65 5 L75 25 Z" fill="#1a202c"/>
            <rect x="30" y="40" width="15" height="8" fill="white"/>
            <rect x="55" y="40" width="15" height="8" fill="white"/>
            <circle cx="37" cy="44" r="3" fill="black"/>
            <circle cx="62" cy="44" r="3" fill="black"/>
            <line x1="45" y1="44" x2="55" y2="44" stroke="black" strokeWidth="3"/>
            <path d="M40 70 Q50 78 60 68" stroke="black" strokeWidth="4" fill="none"/>
        </svg>
    ),
    Mara: () => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-full h-full">
            <rect width="100" height="100" fill="#97266d"/>
            <path d="M15 25 Q50 -10 85 25 L95 95 L5 95 Z" fill="#4a3028"/>
            <circle cx="50" cy="50" r="28" fill="#faf089"/>
            <circle cx="40" cy="48" r="4" fill="#2d3748"/>
            <circle cx="60" cy="48" r="4" fill="#2d3748"/>
            <path d="M35 42 Q40 38 45 42" stroke="#2d3748" strokeWidth="2" fill="none"/>
            <path d="M55 42 Q60 38 65 42" stroke="#2d3748" strokeWidth="2" fill="none"/>
            <path d="M42 65 Q50 75 58 65" stroke="#c53030" strokeWidth="3" fill="none"/>
        </svg>
    ),
    James: () => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-full h-full">
            <rect width="100" height="100" fill="#1a202c"/>
            <ellipse cx="50" cy="55" rx="35" ry="32" fill="#c0b2a4"/>
            <circle cx="35" cy="50" r="7" fill="#e2e8f0"/>
            <circle cx="65" cy="50" r="7" fill="#e2e8f0"/>
            <circle cx="35" cy="50" r="3" fill="#2b6cb0"/>
            <circle cx="65" cy="50" r="3" fill="#2b6cb0"/>
            <rect x="25" y="47" width="20" height="6" fill="none" stroke="#1a202c" strokeWidth="2"/>
            <rect x="55" y="47" width="20" height="6" fill="none" stroke="#1a202c" strokeWidth="2"/>
            <line x1="45" y1="50" x2="55" y2="50" stroke="#1a202c" strokeWidth="2"/>
            <path d="M45 62 L50 72 L55 62 Z" fill="#8d7f72"/>
            <line x1="42" y1="82" x2="58" y2="82" stroke="#4a5568" strokeWidth="4"/>
        </svg>
    ),
    Cutter: () => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-full h-full">
            <rect width="100" height="100" fill="#7b341e"/>
            <circle cx="50" cy="55" r="30" fill="#f6ad55"/>
            <!-- Bandana -->
            <path d="M15 35 Q50 10 85 35 L80 45 Q50 35 20 45 Z" fill="#e53e3e"/>
            <circle cx="20" cy="40" r="5" fill="#c53030"/>
            <!-- Eyepatch -->
            <circle cx="35" cy="52" r="8" fill="#1a202c"/>
            <line x1="20" y1="45" x2="50" y2="60" stroke="#1a202c" strokeWidth="2"/>
            <!-- Good Eye -->
            <circle cx="65" cy="52" r="4" fill="#1a202c"/>
            <!-- Scar -->
            <line x1="60" y1="65" x2="70" y2="75" stroke="#c53030" strokeWidth="2"/>
            <line x1="63" y1="68" x2="67" y2="66" stroke="#c53030" strokeWidth="1"/>
            <!-- Scowl -->
            <path d="M40 80 Q50 75 60 82" stroke="#1a202c" strokeWidth="3" fill="none"/>
        </svg>
    ),
    Loomis: () => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-full h-full">
            <rect width="100" height="100" fill="#2b6cb0"/>
            <!-- Neck & Head -->
            <path d="M40 100 Q40 50 60 30 Q70 20 80 30 Q80 40 65 45 Q50 50 50 100 Z" fill="#f7fafc"/>
            <!-- Beak -->
            <path d="M80 30 L98 35 L80 40 Z" fill="#ecc94b"/>
            <!-- Eye -->
            <circle cx="68" cy="32" r="3" fill="#ecc94b"/>
            <circle cx="68" cy="32" r="1.5" fill="#1a202c"/>
            <!-- Feather accent -->
            <path d="M55 25 Q45 20 40 28" stroke="#e2e8f0" strokeWidth="2" fill="none"/>
        </svg>
    )
};

// --- CONSTANTS & LOGIC ---
const HOUSE_START_MONEY = 50;
const PATRON_START_MONEY = 50;
const CONTRIBUTION = 10;
const BUY_A_ROUND_COST = 20;
const GAME_STATE_BAR_VICTORY = 'BAR_VICTORY'; 

// Updated Drink Data with Flavor Text
const ROUND_DRINKS = [
    { name: "nIPLy", desc: "A crisp cold IPA." },
    { name: "NOT Burnt Marshmallow", desc: "A heavy, sweet pastry stout treat." },
    { name: "Raspberry Cabana", desc: "A tart fruited sour." },
    { name: "subLime", desc: "Concepted like Sublime singing 311 songs as if it were real life." },
    { name: "Hopped Up on Enemy's Blood", desc: "A fierce tangerine IPA." },
    { name: "The Patient Egret", desc: "A smooth pineapple milkshake nitro IPA." }
];

const HAND_RANKS = {
    FIVE_OF_A_KIND: 8, FOUR_OF_A_KIND: 7, FULL_HOUSE: 6, STRAIGHT: 5,
    THREE_OF_A_KIND: 4, TWO_PAIR: 3, ONE_PAIR: 2, HIGH_CARD: 1
};

const HAND_NAMES = {
    8: "Keg Stand (5 of a Kind)", 7: "Case of Beer (4 of a Kind)", 6: "Full Tab (Full House)",
    5: "Flight (Straight)", 4: "Six Pack (3 of a Kind)", 3: "Double Fisted (Two Pair)", 2: "Solo Cup (Pair)", 1: "Spilled Drink (High Card)"
};

const BASE_PATRON_TYPES = [
    { name: "Pinecone Pete", type: "Conservative", Avatar: Avatars.Pete },
    { name: "Rick the Prick", type: "Aggressive", Avatar: Avatars.Rick },
    { name: "Mara Lawson", type: "Random", Avatar: Avatars.Mara },
    { name: "James Roberts", type: "Calculator", Avatar: Avatars.James },
    { name: "Cutter McCoy", type: "Aggressive", Avatar: Avatars.Cutter },
    { name: "Loomis", type: "Random", Avatar: Avatars.Loomis }
];

const getAvatarComponent = (name) => {
    const patronType = BASE_PATRON_TYPES.find(p => p.name === name);
    return patronType ? patronType.Avatar : Avatars.Pete; 
};

const evaluateHand = (dice) => {
    if (!dice || dice[0] === 0) return null; 
    try {
        const counts = {};
        let wilds = 0;
        dice.forEach(d => {
            if (d === 1) wilds++;
            else counts[d] = (counts[d] || 0) + 1;
        });

        const uniqueValues = Object.keys(counts).map(Number).sort((a,b) => b-a);
        const maxCount = uniqueValues.length > 0 ? Math.max(...Object.values(counts)) : 0;
        
        if (maxCount + wilds >= 5) return { rank: HAND_RANKS.FIVE_OF_A_KIND, value: uniqueValues[0] || 6 };
        if (maxCount + wilds >= 4) return { rank: HAND_RANKS.FOUR_OF_A_KIND, value: uniqueValues[0] };

        // Full House
        for (let val of uniqueValues) {
            let w = wilds;
            let c = counts[val];
            if (c + w >= 3) {
                let w_remain = w - (3 - c);
                if (w_remain < 0) w_remain = 0;
                for (let val2 of uniqueValues) {
                    if (val2 === val) continue;
                    if (counts[val2] + w_remain >= 2) return { rank: HAND_RANKS.FULL_HOUSE, value: val * 10 + val2 };
                }
            }
        }

        // Straight
        const needed = [2, 3, 4, 5, 6];
        let missing = 0;
        needed.forEach(n => { if (!dice.includes(n)) missing++; });
        if (missing <= wilds) return { rank: HAND_RANKS.STRAIGHT, value: 6 };

        if (maxCount + wilds >= 3) return { rank: HAND_RANKS.THREE_OF_A_KIND, value: uniqueValues[0] };

        let pairs = 0;
        let w_temp = wilds;
        for (let val of uniqueValues) {
            if (counts[val] >= 2) { pairs++; }
            else if (counts[val] === 1 && w_temp > 0) { pairs++; w_temp--; }
        }
        if (pairs >= 2) return { rank: HAND_RANKS.TWO_PAIR, value: uniqueValues[0] };
        if (maxCount + wilds >= 2) return { rank: HAND_RANKS.ONE_PAIR, value: uniqueValues[0] };

        return { rank: HAND_RANKS.HIGH_CARD, value: Math.max(...dice) };
    } catch (e) {
        return { rank: 1, value: 1 };
    }
};

// --- CSS GRID DICE PIPS ---
const PipMap = {
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8]
};

const renderPips = (val, size) => {
    if (val === 1) return <Icon name="Star" size={size === "large" ? 36 : 18} className="text-yellow-400" />;
    
    const pips = Array(9).fill(null);
    const activeIndices = PipMap[val] || [];
    const pipSize = size === "large" ? "w-3 h-3" : "w-1.5 h-1.5";
    
    return (
        <div className="grid grid-cols-3 grid-rows-3 w-full h-full p-2 gap-1 place-items-center">
            {pips.map((_, i) => (
                <div key={i} className={`rounded-full ${activeIndices.includes(i) ? 'bg-white shadow-sm' : 'bg-transparent'} ${pipSize}`}></div>
            ))}
        </div>
    );
};

const Die = ({ value, held, onClick, size = "large", isRolling = false }) => {
    const isZero = value === 0;
    const sizeClass = size === "large" ? "w-16 h-16" : "w-8 h-8";
    
    if (isZero) {
         return (
            <div className={`${sizeClass} flex items-center justify-center rounded-xl border-2 border-slate-700 bg-slate-900 text-slate-700 shadow-inner`}>
                <Icon name="Mug" size={size === "large" ? 24 : 12} />
            </div>
         );
    }

    return (
        <div 
            onClick={onClick} 
            className={`${sizeClass} flex items-center justify-center rounded-xl border-2 cursor-pointer shadow-lg dice-face ${held ? 'border-yellow-500 bg-yellow-900/50 -translate-y-2' : 'border-slate-600 bg-slate-800 hover:bg-slate-700'} ${isRolling && !held ? 'rolling-animation' : ''}`}
        >
            {renderPips(value, size)}
        </div>
    );
};

const App = () => {
    const [gameState, setGameState] = useState('START');
    const [numOpponentsToPlay, setNumOpponentsToPlay] = useState(3);
    const [funds, setFunds] = useState(HOUSE_START_MONEY);
    const [pot, setPot] = useState(0); 
    const [round, setRound] = useState(1);
    const [message, setMessage] = useState("Welcome to Law Brewing!");
    
    const [playerDice, setPlayerDice] = useState([0, 0, 0, 0, 0]);
    const [heldDice, setHeldDice] = useState([false, false, false, false, false]);
    const [rollsLeft, setRollsLeft] = useState(3);
    const [playerHand, setPlayerHand] = useState(null);
    const [isRollingDice, setIsRollingDice] = useState(false);
    
    const [opponents, setOpponents] = useState([]);
    const [retiredPatronTypes, setRetiredPatronTypes] = useState([]);
    
    const [turnOrder, setTurnOrder] = useState([]); 
    const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
    const [lastRoundRankings, setLastRoundRankings] = useState([]);

    const playerDiceRef = useRef(playerDice);
    const opponentsRef = useRef(opponents);

    useEffect(() => { playerDiceRef.current = playerDice; }, [playerDice]);
    useEffect(() => { opponentsRef.current = opponents; }, [opponents]);

    useEffect(() => {
        if (gameState === 'ROLLING') {
            const activeId = turnOrder[currentTurnIndex];
            if (activeId !== undefined && activeId !== 'player') {
                const aiDelay = setTimeout(() => {
                    playAITurn(activeId);
                }, 1200);
                return () => clearTimeout(aiDelay);
            }
        }
    }, [currentTurnIndex, gameState, turnOrder]);

    const playAITurn = (aiId) => {
        const newOpps = opponentsRef.current.map(opp => {
            if (opp.id === aiId) {
                let currentDice = [1,1,1,1,1].map(()=>Math.ceil(Math.random()*6));
                for(let r=0; r<2; r++) { 
                    const keeps = getAIKeeps(currentDice, opp.type);
                    currentDice = currentDice.map((d, i) => keeps.includes(i) ? d : Math.ceil(Math.random() * 6));
                }
                return { 
                    ...opp, 
                    dice: currentDice, 
                    hand: evaluateHand(currentDice),
                    status: 'Done' 
                };
            }
            return opp;
        });
        
        setOpponents(newOpps);
        opponentsRef.current = newOpps;
        advanceTurn();
    };

    const advanceTurn = () => {
        const nextIndex = currentTurnIndex + 1;
        if (nextIndex >= turnOrder.length) {
            finishRound();
        } else {
            setCurrentTurnIndex(nextIndex);
            const nextId = turnOrder[nextIndex];
            if (nextId === 'player') {
                setPlayerDice([0,0,0,0,0]); 
                setHeldDice([false,false,false,false,false]);
                setRollsLeft(3);
                setMessage("It's your turn! Roll for the pot.");
            } else {
                const oppName = opponentsRef.current.find(o => o.id === nextId)?.name || "Opponent";
                setMessage(`Waiting for ${oppName}...`);
            }
        }
    };

    const initializeGame = () => {
        setFunds(HOUSE_START_MONEY);
        setRound(1);
        setLastRoundRankings([]);
        setRetiredPatronTypes([]); 
        
        const allPatronTypes = [...BASE_PATRON_TYPES];
        const shuffled = allPatronTypes.sort(() => 0.5 - Math.random());
        const initialTypes = shuffled.slice(0, numOpponentsToPlay);

        const newOpponents = initialTypes.map((pType, i) => ({
            ...pType,
            id: i,
            dice: [0,0,0,0,0],
            hand: null,
            money: PATRON_START_MONEY,
            status: 'Waiting',
            typeId: pType.name,
            Avatar: getAvatarComponent(pType.name)
        }));
        
        setOpponents(newOpponents);
        opponentsRef.current = newOpponents; 

        const order = [...newOpponents.map(o => o.id), 'player'];
        setupRound(order, newOpponents);
    };

    const processEliminations = (currentOpponents) => {
         const survivingOpponents = [];
         const newRetired = [];
         let eliminationMsg = "";

         currentOpponents.forEach(opp => {
             if (opp.money < CONTRIBUTION) {
                 newRetired.push(opp.typeId);
                 eliminationMsg += `\n🚨 ${opp.name} couldn't pay the ante and left.`;
             } else {
                 survivingOpponents.push(opp);
             }
         });

         let finalOpponents = [...survivingOpponents];
         const allRetired = [...retiredPatronTypes, ...newRetired];
         
         if (newRetired.length > 0) {
             const seatsNeeded = numOpponentsToPlay - survivingOpponents.length;
             const sittingTypes = finalOpponents.map(o => o.typeId);
             
             for(let i=0; i<seatsNeeded; i++) {
                 const availableTypes = BASE_PATRON_TYPES.filter(p => !allRetired.includes(p.name) && !sittingTypes.includes(p.name));
                 
                 if (availableTypes.length > 0) {
                     const replacementType = availableTypes[0]; 
                     sittingTypes.push(replacementType.name);
                     
                     finalOpponents.push({
                        ...replacementType,
                        id: Math.max(...currentOpponents.map(o => o.id), 0) + 1 + i, 
                        dice: [0,0,0,0,0],
                        hand: null,
                        money: PATRON_START_MONEY,
                        status: 'Waiting',
                        typeId: replacementType.name,
                        Avatar: getAvatarComponent(replacementType.name)
                     });
                     eliminationMsg += ` ${replacementType.name} sat down.`;
                 } else {
                     eliminationMsg += ` No one else to take the seat!`;
                 }
             }
         }

         return { opponents: finalOpponents, newRetiredList: allRetired, msg: eliminationMsg };
    };

    const startRound = () => {
        const { opponents: nextOpponents, newRetiredList, msg } = processEliminations(opponentsRef.current);
        
        if (newRetiredList.length > retiredPatronTypes.length) {
             setRetiredPatronTypes(newRetiredList);
        }

        if (nextOpponents.length === 0 && newRetiredList.length >= BASE_PATRON_TYPES.length) {
            setGameState(GAME_STATE_BAR_VICTORY);
            return;
        }
        
        setRound(r => r + 1);
        
        let order = [];
        if (lastRoundRankings.length > 0) {
            const worstToBest = [...lastRoundRankings].reverse();
            const currentIds = nextOpponents.map(o => o.id);
            currentIds.push('player');
            order = worstToBest.map(p => p.id).filter(id => currentIds.includes(id));
            
            currentIds.forEach(id => {
                if (!order.includes(id)) order.unshift(id);
            });
        } else {
            order = [...nextOpponents.map(o => o.id), 'player'];
        }
        
        if (msg) {
             setMessage(msg);
             setTimeout(() => setupRound(order, nextOpponents), 2500);
        } else {
             setupRound(order, nextOpponents);
        }
    };

    const setupRound = (order, currentOpponents) => {
        let currentFunds = funds;
        
        if (currentFunds < CONTRIBUTION) {
            setMessage("Womp. Womp. The House cannot afford the ante. GAME OVER.");
            setTimeout(() => setGameState('GAME_OVER'), 2000);
            return;
        }

        let newOpponents = [...currentOpponents];
        currentFunds -= CONTRIBUTION;
        newOpponents = newOpponents.map(opp => ({ ...opp, money: opp.money - CONTRIBUTION }));
        const totalPot = (newOpponents.length + 1) * CONTRIBUTION;
        
        setFunds(currentFunds);
        setPot(totalPot);
        
        setPlayerDice([0,0,0,0,0]);
        setPlayerHand(null);
        setHeldDice([false, false, false, false, false]);
        setRollsLeft(3);

        const resetOpponents = newOpponents.map(opp => ({ ...opp, dice: [0,0,0,0,0], hand: null, status: 'Waiting' }));
        setOpponents(resetOpponents);
        setTurnOrder(order);
        setCurrentTurnIndex(0);
        setGameState('ROLLING');
        
        const firstId = order[0];
        if (firstId === 'player') setMessage(`Ante up! Pot is $${totalPot}. You go first!`);
        else {
            const opp = resetOpponents.find(o => o.id === firstId);
            const name = opp ? opp.name : "Opponent";
            setMessage(`Ante up! Pot is $${totalPot}. ${name} starts.`);
        }
    };

    const rollDice = () => {
        if (rollsLeft <= 0 || turnOrder[currentTurnIndex] !== 'player') return;
        
        setIsRollingDice(true);
        setTimeout(() => setIsRollingDice(false), 400);

        const newDice = playerDice.map((val, idx) => {
            if (heldDice[idx] && val !== 0) return val;
            return Math.ceil(Math.random() * 6);
        });
        
        setPlayerDice(newDice);
        setRollsLeft(rollsLeft - 1);
    };

    useEffect(() => {
         if (gameState === 'ROLLING' && turnOrder[currentTurnIndex] === 'player' && rollsLeft === 0) {
              const timer = setTimeout(() => {
                  advanceTurn();
              }, 1000);
              return () => clearTimeout(timer);
         }
    }, [rollsLeft, currentTurnIndex, gameState]);

    const forceFinish = () => {
        if (turnOrder[currentTurnIndex] !== 'player') return;
        setRollsLeft(0); 
    };

    const getAIKeeps = (dice, type) => {
        let keeps = [];
        dice.forEach((d, i) => { if(d === 1) keeps.push(i); });
        const counts = {};
        dice.forEach(d => counts[d] = (counts[d] || 0) + 1);
        for (let i=0; i<5; i++) {
            if (keeps.includes(i)) continue;
            const val = dice[i];
            if (counts[val] >= 2) keeps.push(i);
            if (type === 'Aggressive' && val >= 5) keeps.push(i);
        }
        return keeps;
    };

    const finishRound = () => {
        setGameState('EVALUATION');
        const finalPHand = evaluateHand(playerDiceRef.current);
        setPlayerHand(finalPHand);
        
        const finalOpponents = opponentsRef.current.map(opp => ({ ...opp, hand: evaluateHand(opp.dice) }));
        setOpponents(finalOpponents);
        
        setTimeout(() => determineWinner(finalPHand, finalOpponents), 1000);
    };

    const determineWinner = (pHand, opps) => {
        const safePHand = pHand || { rank: 1, value: 0 };
        const safeOpps = opps.map(o => ({...o, hand: o.hand || {rank:1, value:0}}));
        
        const allPlayers = [
            { id: 'player', name: 'You', hand: safePHand },
            ...safeOpps.map(o => ({ id: o.id, name: o.name, hand: o.hand, money: o.money, typeId: o.typeId }))
        ];
        
        allPlayers.sort((a, b) => {
            if (b.hand.rank !== a.hand.rank) return b.hand.rank - a.hand.rank;
            return b.hand.value - a.hand.value;
        });
        
        setLastRoundRankings(allPlayers);
        
        const loser = allPlayers[allPlayers.length - 1];
        const winner = allPlayers[0];
        const losingDrink = ROUND_DRINKS[Math.floor(Math.random() * ROUND_DRINKS.length)];
        
        let msg = "";
        let newFunds = funds; 

        if (winner.id === 'player') {
            newFunds += pot; 
            msg += `WINNER: You won the $${pot} Pot!`;
        } else {
            const winnerPatron = opps.find(o => o.id === winner.id);
            setOpponents(prev => prev.map(o => o.id === winner.id ? { ...o, money: o.money + pot } : o));
            msg += `WINNER: ${winnerPatron.name} won the $${pot} Pot.`;
        }
        msg += `\n`;

        if (loser.id === 'player') {
            newFunds -= BUY_A_ROUND_COST;
            msg += `LOSER: You bought a round of ${losingDrink.name} (-$${BUY_A_ROUND_COST}).\n*${losingDrink.desc}*`;
        } else {
            const loserPatron = opps.find(o => o.id === loser.id);
            const newPatronMoney = Math.max(0, loserPatron.money - BUY_A_ROUND_COST);
            
            setOpponents(prev => prev.map(o => o.id === loser.id ? { ...o, money: newPatronMoney } : o));
            msg += `LOSER: ${loserPatron.name} bought a round of ${losingDrink.name} ($${BUY_A_ROUND_COST}).\n*${losingDrink.desc}*`;
        }
        
        setPot(0);
        
        if (newFunds <= 0) {
            setMessage(`FINAL: ${msg} \n\n Womp. Womp. The House is out of money.`);
            setFunds(0); 
            setTimeout(() => setGameState('GAME_OVER'), 4000);
        } else {
            setFunds(newFunds);
            setMessage(msg); 
            setGameState('ROUND_END');
        }
    };

    const toggleDie = (idx) => {
        if (gameState !== 'ROLLING' || rollsLeft === 3 || turnOrder[currentTurnIndex] !== 'player') return;
        if (playerDice[idx] === 0) return;
        const newHeld = [...heldDice];
        newHeld[idx] = !newHeld[idx];
        setHeldDice(newHeld);
    };

    const currentHandDisplay = useMemo(() => evaluateHand(playerDice), [playerDice]);
    const isPlayerTurn = gameState === 'ROLLING' && turnOrder[currentTurnIndex] === 'player';

    return (
        <div className="wood-texture flex flex-col items-center">
            <div className="absolute inset-0 bg-black/40 pointer-events-none"></div>
            
            <div className="w-full max-w-4xl p-3 z-10 flex justify-between items-center glass-panel mt-4 rounded-lg shadow-2xl mx-2 relative z-[50]">
                <div className="flex items-center gap-3">
                    <div>
                        <h1 className="text-xl font-western text-yellow-500 tracking-wider">LAW BREWING BAR DICE</h1>
                        <div className="flex gap-3 text-xs text-slate-300 font-mono">
                            <span className="flex items-center gap-1 cursor-help"><Icon name="DollarSign" size={12} className="text-green-400"/> {funds}</span>
                            <span className="flex items-center gap-1 cursor-help"><Icon name="Beer" size={12} className="text-amber-500"/> ${pot}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <div className="relative cheat-sheet-container">
                        <button className="flex items-center gap-1 text-xs text-slate-300 hover:text-white border border-slate-600 px-2 py-1 rounded bg-slate-800">
                            <Icon name="Help" size={12} /> Hand Ranks
                        </button>
                        <div className="cheat-sheet hidden absolute right-0 top-8 w-64 bg-slate-900 border border-yellow-600 rounded p-3 shadow-xl text-xs">
                            <h3 className="font-bold text-yellow-500 mb-2 border-b border-slate-700 pb-1">Hand Rankings</h3>
                            <ul className="space-y-1 text-slate-300">
                                <li><span className="text-yellow-500">8.</span> Keg Stand (5-Kind)</li>
                                <li><span className="text-yellow-500">7.</span> Case (4-Kind)</li>
                                <li><span className="text-yellow-500">6.</span> Full Tab (Full House)</li>
                                <li><span className="text-yellow-500">5.</span> Flight (Straight)</li>
                                <li><span className="text-yellow-500">4.</span> Six Pack (3-Kind)</li>
                                <li><span className="text-yellow-500">3.</span> Double Fisted (2 Pair)</li>
                                <li><span className="text-yellow-500">2.</span> Solo Cup (Pair)</li>
                                <li><span className="text-yellow-500">1.</span> Spilled Drink (High)</li>
                            </ul>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] text-slate-400 uppercase tracking-widest">Round</div>
                        <div className="text-2xl font-western text-white">{round}</div>
                    </div>
                </div>
            </div>

            <div className="w-full max-w-4xl mt-4 z-10 flex flex-col gap-4 px-3 pb-8">
                <div className="bg-slate-900/90 border-l-4 border-yellow-500 p-3 rounded text-center shadow-lg min-h-[3.5rem] flex items-center justify-center transition-all z-[10]">
                    <span className="text-sm md:text-base font-medium animate-pulse message-box">{message}</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {opponents.map((opp) => {
                        const isMyTurn = gameState === 'ROLLING' && turnOrder[currentTurnIndex] === opp.id;
                        const AvatarComp = opp.Avatar;
                        return (
                            <div key={opp.id} className={`glass-panel p-2 rounded-lg flex flex-col items-center gap-1 transition-all duration-500 ${isMyTurn ? 'active-turn' : 'inactive-turn'} ${gameState === 'ROUND_END' && opp.hand && opp.hand.rank < 3 ? 'border-red-500 bg-red-900/20' : ''}`}>
                                <div className="flex flex-col md:flex-row items-center gap-1 mb-1">
                                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden border border-slate-500">
                                        <AvatarComp />
                                    </div>
                                    <div className="text-center md:text-left overflow-hidden">
                                        <div className="text-[10px] md:text-xs font-bold text-slate-200 truncate w-full">{opp.name}</div>
                                        <div className="flex items-center justify-center md:justify-start text-[10px] text-green-400 font-mono">
                                            <Icon name="DollarSign" size={10} className="text-green-400"/> {opp.money}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-1 justify-center flex-wrap scale-90 origin-top">
                                    {opp.dice.map((d, i) => <Die key={i} value={d} size="small" />)}
                                </div>
                                <div className="text-[10px] font-bold text-yellow-500 mt-1 uppercase text-center h-4 leading-none">
                                    {opp.hand ? HAND_NAMES[opp.hand.rank].split('(')[0] : (d => {
                                        if (opp.dice[0] === 0) return 'Waiting...';
                                        return '...';
                                    })()}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {gameState === 'START' || gameState === 'GAME_OVER' || gameState === GAME_STATE_BAR_VICTORY ? (
                    <div className="glass-panel p-6 rounded-xl flex flex-col items-center justify-center text-center gap-4 mt-2">
                        {gameState === GAME_STATE_BAR_VICTORY ? (
                            <>
                                <div className="text-yellow-500"><Icon name="Party" size={48} /></div>
                                <h2 className="text-2xl font-western text-yellow-500">BAR CONQUERS ALL!</h2>
                                <p className="text-slate-300 text-sm">
                                    You successfully bankrupted every patron and secured the House's future!
                                </p>
                                <div className="text-lg font-bold text-green-400 flex items-center gap-2 mt-4">
                                    Final Funds: <Icon name="DollarSign" size={20} />${funds}
                                </div>
                            </>
                        ) : gameState === 'GAME_OVER' ? (
                            <>
                                <div className="text-red-500"><Icon name="Skull" size={48} /></div>
                                <h2 className="text-2xl font-western text-red-500">BAR CLOSED</h2>
                                <p className="text-slate-300 text-sm">Womp. Womp. The House ran out of money.</p>
                            </>
                        ) : (
                            <>
                                <div className="text-green-400"><Icon name="DollarSign" size={48} /></div>
                                <h2 className="text-2xl font-western">High-Stakes Bar Dice</h2>
                                <div className="text-slate-300 text-xs md:text-sm max-w-md text-left space-y-2 bg-slate-800/50 p-4 rounded-lg mb-4">
                                    <p><span className="text-green-400 font-bold">START:</span> House & Patrons each start with ${HOUSE_START_MONEY}.</p>
                                    <p><span className="text-yellow-400 font-bold">CONTRIBUTE:</span> Everyone puts in ${CONTRIBUTION} to the Pot each round.</p>
                                    <p><span className="text-yellow-400 font-bold">WINNER:</span> Takes the entire Pot.</p>
                                    <p><span className="text-red-400 font-bold">LOSER:</span> Pays a fixed $20 penalty (Buys the Round).</p>
                                    <p className="border-t border-slate-700 pt-2"><span className="text-yellow-400 font-bold">Game End:</span> The House wins by bankrupting all unique Patrons, or the House loses if House Funds reach $0.</p>
                                </div>
                                <div className="flex flex-col items-center gap-2 w-full max-w-xs">
                                    <label className="text-sm text-yellow-500 font-bold">Number of Opponents:</label>
                                    <select 
                                        value={numOpponentsToPlay} 
                                        onChange={(e) => setNumOpponentsToPlay(parseInt(e.target.value))} 
                                        className="bg-slate-800 text-white p-2 rounded border border-yellow-600 w-full text-center"
                                    >
                                        <option value={1}>1 Opponent (1v1)</option>
                                        <option value={2}>2 Opponents</option>
                                        <option value={3}>3 Opponents</option>
                                        <option value={4}>4 Opponents</option>
                                    </select>
                                </div>
                            </>
                        )}
                        <button onClick={initializeGame} className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded shadow-lg uppercase tracking-wider transition-colors text-sm mt-4">
                            {gameState === 'START' ? 'Open Bar' : 'Start New Game'}
                        </button>
                    </div>
                ) : (
                    <div className={`glass-panel p-4 rounded-xl mt-2 border-t-4 transition-all duration-500 ${isPlayerTurn ? 'border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.2)]' : 'border-slate-700 opacity-80 grayscale-[0.5]'}`}>
                        <div className="flex justify-between items-end mb-4">
                            <div>
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    Your Roll
                                    {isPlayerTurn && <span className="text-[10px] bg-yellow-500 text-black px-2 py-0.5 rounded-full font-bold animate-pulse">YOUR TURN</span>}
                                </h2>
                                <div className="text-xs text-slate-400">
                                    Result: <span className="text-yellow-400">{currentHandDisplay ? HAND_NAMES[currentHandDisplay.rank] : 'Roll to Reveal'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-center gap-2 mb-6">
                            {playerDice.map((val, idx) => <Die key={idx} value={val} held={heldDice[idx]} onClick={() => toggleDie(idx)} isRolling={isRollingDice} />)}
                        </div>

                        <div className="flex justify-center gap-3">
                            {gameState === 'ROLLING' && (
                                <>
                                    {isPlayerTurn && rollsLeft > 0 ? (
                                        <button onClick={rollDice} className="btn-pulse px-6 py-3 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded-full shadow-lg flex items-center gap-2 transition-transform transform active:scale-95">
                                            <Icon name="RefreshCw" size={18} /> ROLL ({rollsLeft})
                                        </button>
                                    ) : (
                                        <div className="text-slate-500 font-bold italic py-2">
                                            {isPlayerTurn ? "Out of rolls..." : "Waiting for turn..."}
                                        </div>
                                    )}
                                    
                                    {isPlayerTurn && (rollsLeft < 3 || playerDice[0] !== 0) && (
                                        <button onClick={forceFinish} className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-full shadow-lg flex items-center gap-2 border border-slate-500 text-sm">
                                            <Icon name="Check" size={18} /> FINISH
                                        </button>
                                    )}
                                </>
                            )}
                            {gameState === 'ROUND_END' && (
                                <button onClick={() => { startRound(); }} className="btn-pulse px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-full shadow-lg flex items-center gap-2">
                                    Next Round <Icon name="TrendingUp" size={18} />
                                </button>
                            )}
                        </div>
                        <div className="text-center mt-3 text-[10px] text-slate-500">
                            {isPlayerTurn ? "Click dice to hold. Click FINISH to pass turn." : "Watch your opponents roll."}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
