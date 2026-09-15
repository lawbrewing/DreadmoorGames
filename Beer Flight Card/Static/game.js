// --- VISUAL CONFIG ---
const SUITS = ['♥', '♦', '♣', '♠'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const CPU_NAMES = ["", "Mara Lawson", "James Roberts", "Pinecone Pete"];
const audio = {
    bgm: new Audio('assets/tavern-loop.mp3'), // We will add this file later
    pour: new Audio('assets/glass-clink.mp3'),
    attack: new Audio('assets/slide.mp3')
};

// Configure Background Music
audio.bgm.loop = true;
audio.bgm.volume = 0.4; // Keep it quiet so it doesn't overpower the game

function playSound(soundName) {
    // Clones the audio so rapid clicks don't interrupt each other
    let sound = audio[soundName].cloneNode();
    sound.volume = 0.8;
    sound.play().catch(e => console.log("Audio not ready"));
}

function getBeerColor(rank) {
    const r = parseInt(rank);
    if(isNaN(r)) return '#fff';
    const colors = {
        2: '#faf4d4', 3: '#fff59d', 4: '#ffe082', 5: '#ffca28',
        6: '#ffb300', 7: '#fb8c00', 8: '#8d6e63', 9: '#5d4037', 10: '#212121'
    };
    return colors[r] || '#f4c542';
}

// --- NAVIGATION ---
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active-screen'));
    document.getElementById(id).classList.add('active-screen');
    const sheet = document.getElementById('cheat-sheet');
    sheet.style.display = (id === 'game-screen') ? 'flex' : 'none';
}
function goHome() { showScreen('landing-screen'); }
function goToManualMode() { showScreen('manual-screen'); }

// --- GAME ENGINE ---
let players = []; 
let deck = [];
let currentPlayerIndex = 0;
 
const WIN_TARGET = 3;

let gameState = "IDLE"; 
let lastCallCaller = -1; 
let pendingAction = null; 
let swapSourceIdx = null;
let tempStolenCard = null; 
let kingTargetPlayerIdx = -1;
let kingRevealedCard = null;
let kingRevealedIdx = -1;

class Card {
    constructor(r, s) {
        this.r = r; this.s = s;
        this.isBrew = !isNaN(parseInt(r));
        this.val = this.isBrew ? parseInt(r) : 0;
        this.uid = Math.random().toString(36).substr(2, 9);
    }
}

class Player {
    constructor(id, type, name) {
        this.id = id;
        this.type = type;
        this.name = name;
        this.hand = [];
        this.flight = [];
        this.matchWins = 0; // INDIVIDUAL SCORE TRACKING
    }
}

function startNewMatch() {
    showScreen('game-screen');
    if (audio.bgm.paused) {
        audio.bgm.play().catch(e => console.log("Waiting for interaction"));
    }
    const numOpp = parseInt(document.getElementById('num-opponents').value);
    
    // Init Players (Reset Match Scores)
    players = [new Player(0, 'HUMAN', 'You')];
    for(let i=1; i<=numOpp; i++) {
        // Assign name based on index
        let cName = CPU_NAMES[i] || `CPU ${i}`;
        players.push(new Player(i, 'CPU', cName));
    }

    updateMatchScoreBoard();
    startShift();
}

function updateMatchScoreBoard() {
    // Build dynamic string based on all players
    let scoreStr = players.map(p => {
        let label = p.type==='HUMAN' ? 'YOU' : p.name.split(' ')[0].toUpperCase();
        return `${label}:${p.matchWins}`;
    }).join(' | ');
    
    document.getElementById('match-score-board').innerText = scoreStr;
}

function log(msg) { 
    const d=document.getElementById('log'); 
    d.innerHTML += `<div>> ${msg}</div>`; d.scrollTop=d.scrollHeight; 
}

function startShift() {
    // Deck Re-Init
    deck=[]; for(let s of SUITS) for(let r of RANKS) deck.push(new Card(r,s));
    deck.sort(()=>Math.random()-0.5);

    // Deal 4 cards
    players.forEach(p => {
        p.hand = []; p.flight = [];
        for(let i=0; i<4; i++) p.hand.push(deck.pop());
    });

    lastCallCaller = -1;
    document.getElementById('log').innerHTML="";
    log(`Shift Started. First to ${WIN_TARGET} wins.`);
    
    renderGame();
    startTurn(0); 
}

function startTurn(pIdx) {
    currentPlayerIndex = pIdx;
    const p = players[pIdx];
    
    if(lastCallCaller !== -1 && pIdx === lastCallCaller) {
        endShift(); return;
    }

    const turnDiv = document.getElementById('turn-indicator');
    turnDiv.innerText = p.type === 'HUMAN' ? "YOUR TURN" : `${p.name}'s TURN`;
    turnDiv.style.color = p.type === 'HUMAN' ? 'var(--gold)' : '#888';
    
    document.getElementById('player-options').style.display = 'none';
    document.getElementById('last-call-btn').style.display = 'none';
    
    renderGame();

    if(p.type === 'HUMAN') {
        gameState = 'PLAY';
        document.getElementById('player-options').style.display='block';
        document.getElementById('waste-mode').checked=false;
        if(p.flight.length === 4 && lastCallCaller === -1) {
            document.getElementById('last-call-btn').style.display = 'inline-block';
        }
    } else {
        setTimeout(() => cpuAI(pIdx), 1000);
    }
}

function triggerLastCall() {
    if(currentPlayerIndex === 0 && players[0].flight.length === 4) {
        lastCallCaller = 0;
        log(`🔔 YOU CALLED LAST CALL!`);
        document.getElementById('last-call-btn').style.display='none';
        finishTurn();
    }
}

// --- PLAYER ACTION ---
window.cardAction = function(loc, uid) {
    const human = players[0];
    if(currentPlayerIndex !== 0) return;

    // SWAP MODE (Hand to Flight)
    if(loc==='P_FLIGHT' && gameState==='SWAP_TARGET') {
        const flightIdx = human.flight.findIndex(c => c.uid === uid);
        const handCard = human.hand[swapSourceIdx];
        human.hand.splice(swapSourceIdx, 1); 
        let oldCard = human.flight.splice(flightIdx, 1, handCard)[0];
        log(`Swapped ${oldCard.r} for ${handCard.r}.`);
        finishTurn(); return;
    }

    // ACE SWAP MODE (Stolen Card to Flight)
    if(loc==='P_FLIGHT' && gameState==='ACE_SWAP_TARGET') {
        const flightIdx = human.flight.findIndex(c => c.uid === uid);
        let oldCard = human.flight[flightIdx];
        human.flight[flightIdx] = tempStolenCard; 
        log(`Replaced ${oldCard.r} with stolen ${tempStolenCard.r}.`);
        tempStolenCard = null;
        finishTurn();
        return;
    }

    // TARGET OPPONENT
    if(loc.startsWith('OPP') && gameState==='TARGET_PLAYER') {
        let targetId = parseInt(loc.split('_')[1]);
        if(pendingAction) pendingAction(targetId);
        return;
    }

    // TARGET CARD
    if(loc.startsWith('OPP_CARD') && gameState==='TARGET_CARD') {
        let parts = loc.split('_');
        let targetPid = parseInt(parts[2]);
        let targetCuid = parts[3];
        if(pendingAction) pendingAction(targetPid, targetCuid);
        return;
    }

    // KING GIVE
    if(loc==='HAND' && gameState==='KING_GIVE') {
        const idx = human.hand.findIndex(c => c.uid === uid);
        if(idx === -1) return;
        let myCard = human.hand.splice(idx, 1)[0];
        let opp = players[kingTargetPlayerIdx];
        opp.hand.splice(kingRevealedIdx, 1, myCard); 
        human.hand.push(kingRevealedCard); 
        log(`King Trade: Gave ${myCard.r}, took ${kingRevealedCard.r}.`);
        finishTurn(); return;
    }

    // NORMAL PLAY
    if(loc==='HAND' && gameState==='PLAY') {
        const idx = human.hand.findIndex(c => c.uid === uid);
        const card = human.hand[idx];
        
        if(document.getElementById('waste-mode').checked) {
            human.hand.splice(idx,1); log(`Wasted ${card.r}${card.s}`); finishTurn(); return;
        }

        if(card.isBrew) {
            if(human.flight.length < 4) { 
                human.hand.splice(idx,1); human.flight.push(card); 
                log(`Poured ${card.r}${card.s}`); finishTurn(); 
            } else {
                swapSourceIdx = idx; gameState = 'SWAP_TARGET';
                log("Flight Full. Select beer to REPLACE."); renderGame(); return;
            }
        } else {
            handlePatron(card, idx);
        }
    }
}

function handlePatron(c, handIdx) {
    players[0].hand.splice(handIdx, 1);

    if(c.r==='J') { 
        if(deck.length) players[0].hand.push(deck.pop());
        if(deck.length) players[0].hand.push(deck.pop());
        log("Jack: Draw 2. Discard 1 to finish.");
        gameState='PLAY'; 
        document.getElementById('waste-mode').checked = true; 
        renderGame();
    }
    else if(c.r==='Q') {
        if(getOpponentsWithFlight().length === 0) { log("No targets."); finishTurn(); return; }
        log("Select an Opponent's Beer to REMOVE.");
        startTargetingCard((pid, cuid) => {
            let opp = players[pid];
            let idx = opp.flight.findIndex(c=>c.uid===cuid);
            let rem = opp.flight.splice(idx, 1)[0];
            log(`Barmaid removed ${rem.r} from ${opp.name}.`);
            finishTurn();
        });
    }
    else if(c.r==='A') {
         if(getOpponentsWithFlight().length === 0) { log("No targets."); finishTurn(); return; }
         
         log("Select an Opponent's Beer to STEAL.");
         startTargetingCard((pid, cuid) => {
            let opp = players[pid];
            let idx = opp.flight.findIndex(c=>c.uid===cuid);
            let stolen = opp.flight.splice(idx, 1)[0]; // Remove from opp

            if(players[0].flight.length < 4) {
                players[0].flight.push(stolen);
                log(`Tip Jar stole ${stolen.r} from ${opp.name}.`);
                finishTurn();
            } else {
                tempStolenCard = stolen;
                gameState = 'ACE_SWAP_TARGET';
                log(`Stole ${stolen.r}! Select a card in YOUR flight to replace.`);
                renderGame();
            }
         });
    }
    else if(c.r==='K') {
        let targets = players.filter(p => p.type === 'CPU');
        if(targets.length === 1) initKingPeek(targets[0].id);
        else { log("Select Opponent to Bouncer."); startTargetingPlayer((pid) => initKingPeek(pid)); }
    }
}

function initKingPeek(pid) {
    kingTargetPlayerIdx = pid;
    let opp = players[pid];
    if(opp.hand.length === 0) { log("Opponent has no hand!"); finishTurn(); return; }
    kingRevealedIdx = Math.floor(Math.random() * opp.hand.length);
    kingRevealedCard = opp.hand[kingRevealedIdx];
    const m = document.getElementById('king-modal');
    document.getElementById('king-msg').innerText = `You grabbed a card from ${opp.name}...`;
    document.getElementById('king-card-reveal').innerHTML = renderCardHTML(kingRevealedCard, false);
    m.style.display = 'block';
    gameState = 'KING_DECISION';
}

window.kingAction = function(choice) {
    if(choice === 'RETURN') {
        log(`Returned the ${kingRevealedCard.r} to ${players[kingTargetPlayerIdx].name}.`);
        document.getElementById('king-modal').style.display = 'none';
        finishTurn();
    } else {
        gameState = 'KING_GIVE';
        document.getElementById('king-modal').style.display = 'none';
        const ind = document.getElementById('turn-indicator');
        ind.innerText = "SELECT CARD TO GIVE";
        ind.style.color = "var(--danger)";
        log("Select a card from your hand to trade.");
    }
}

function getOpponentsWithFlight() { return players.filter(p => p.type === 'CPU' && p.flight.length > 0); }

function startTargetingCard(callback) { gameState = 'TARGET_CARD'; pendingAction = callback; renderGame(); }
 
function startTargetingPlayer(callback) { gameState = 'TARGET_PLAYER'; pendingAction = callback; renderGame(); }

function finishTurn() {
    const p = players[currentPlayerIndex];
    while(p.hand.length < 4 && deck.length > 0) {
        let c = deck.pop(); p.hand.push(c);
    }
    gameState = 'IDLE';
    let nextIdx = (currentPlayerIndex + 1) % players.length;
    renderGame();
    startTurn(nextIdx);
}

// --- SMART CPU AI ---
function cpuAI(pid) {
    const cpu = players[pid];
    let played = false;
    
    // 1. SMART LAST CALL
    let myScore = calcScore(cpu.flight);
    // Find the highest score among ALL opponents
    let maxOpponentScore = Math.max(...players.filter(p => p.id !== pid).map(p => calcScore(p.flight)));

    if (cpu.flight.length === 4 && lastCallCaller === -1) {
        if (myScore >= 30 && myScore >= maxOpponentScore) {
            lastCallCaller = pid;
            log(`🔔 ${cpu.name} calls LAST CALL!`);
            finishTurn();
            return;
        }
    }

    // 2. COMBO AWARENESS FOR FLIGHT EVALUATION
    let worstInFlight = null;
    let worstFlightIdx = -1;
    if (cpu.flight.length > 0) {
        let evalFlight = cpu.flight.map((c, i) => {
            let comboWeight = 0;
            // Check for matching ranks (pairs/trips) and suits (flush draws)
            let rankCount = cpu.flight.filter(x => x.r === c.r).length;
            let suitCount = cpu.flight.filter(x => x.s === c.s).length;
            
            if (rankCount > 1) comboWeight += (rankCount * 5); 
            if (suitCount > 2) comboWeight += 5; 
            
            return { score: c.val + comboWeight, val: c.val, idx: i, card: c };
        }).sort((a,b) => a.score - b.score);
        
        worstInFlight = evalFlight[0]; 
        worstFlightIdx = evalFlight[0].idx;
    }

    // 3. PLAY ATTACK CARDS (Patrons)
    let patronIdx = cpu.hand.findIndex(c => !c.isBrew);
    if (patronIdx !== -1 && !played) {
        let pCard = cpu.hand[patronIdx];
        let opponentsWithFlights = players.filter(p => p.id !== pid && p.flight.length > 0);
        
        if (pCard.r === 'J') {
            cpu.hand.splice(patronIdx, 1);
            if(deck.length) cpu.hand.push(deck.pop());
            if(deck.length) cpu.hand.push(deck.pop());
            
            // Discard lowest raw value card
            cpu.hand.sort((a,b) => (a.isBrew ? a.val : 0) - (b.isBrew ? b.val : 0));
            cpu.hand.shift();
            log(`${cpu.name} played Jack (Drew 2, Discarded 1).`);
            played = true;
        } 
        else if (pCard.r === 'Q' && opponentsWithFlights.length > 0) {
            cpu.hand.splice(patronIdx, 1);
            // Find highest card across ALL opponents
            let bestTarget = null, targetOpp = null;
            opponentsWithFlights.forEach(opp => {
                opp.flight.forEach(c => {
                    if (!bestTarget || c.val > bestTarget.val) { bestTarget = c; targetOpp = opp; }
                });
            });
            let idx = targetOpp.flight.findIndex(c => c.uid === bestTarget.uid);
            targetOpp.flight.splice(idx, 1);
            log(`${cpu.name} played Queen! Removed ${bestTarget.r} from ${targetOpp.name}.`);
            played = true;
        }
        else if (pCard.r === 'A' && opponentsWithFlights.length > 0) {
            // Find highest card to steal
            let bestTarget = null, targetOpp = null;
            opponentsWithFlights.forEach(opp => {
                opp.flight.forEach(c => {
                    if (!bestTarget || c.val > bestTarget.val) { bestTarget = c; targetOpp = opp; }
                });
            });
            
            // Only steal if we have room OR it's better than our worst flight card
            if (cpu.flight.length < 4 || (worstInFlight && bestTarget.val > worstInFlight.val)) {
                cpu.hand.splice(patronIdx, 1);
                let idx = targetOpp.flight.findIndex(c => c.uid === bestTarget.uid);
                let stolen = targetOpp.flight.splice(idx, 1)[0];
                
                if (cpu.flight.length < 4) {
                    cpu.flight.push(stolen);
                    log(`${cpu.name} played Ace! Stole ${stolen.r} from ${targetOpp.name}.`);
                } else {
                    let oldCard = cpu.flight[worstFlightIdx];
                    cpu.flight[worstFlightIdx] = stolen;
                    log(`${cpu.name} played Ace! Stole ${stolen.r} from ${targetOpp.name}, swapping it for ${oldCard.r}.`);
                }
                played = true;
            }
        }
        else if (pCard.r === 'K') {
            cpu.hand.splice(patronIdx, 1);
            // Target the player currently in the lead
            let targetOpp = players.filter(p => p.id !== pid && p.hand.length > 0)
                                   .sort((a,b) => calcScore(b.flight) - calcScore(a.flight))[0];
            
            if (targetOpp) {
                let rIdx = Math.floor(Math.random() * targetOpp.hand.length);
                let peekedCard = targetOpp.hand[rIdx];
                
                // Only keep it if it's a solid Brew (7 or higher)
                if (peekedCard.isBrew && peekedCard.val >= 7) {
                    cpu.hand.sort((a,b) => (a.isBrew ? a.val : 0) - (b.isBrew ? b.val : 0));
                    let trash = cpu.hand.shift();
                    targetOpp.hand.splice(rIdx, 1, trash);
                    cpu.hand.push(peekedCard);
                    log(`${cpu.name} played King! Swapped a card with ${targetOpp.name}.`);
                } else {
                    log(`${cpu.name} played King on ${targetOpp.name} but returned the card.`);
                }
            } else {
                log(`${cpu.name} played King but no one had cards to check.`);
            }
            played = true;
        }
    }

    // 4. POUR A BREW (If no attack card was played)
    if (!played) {
        let brewsInHand = cpu.hand.filter(c => c.isBrew).sort((a,b) => b.val - a.val); 
        if (brewsInHand.length > 0) {
            let bestBrew = brewsInHand[0];
            let handIdx = cpu.hand.indexOf(bestBrew);

            if (cpu.flight.length < 4) {
                cpu.hand.splice(handIdx, 1);
                cpu.flight.push(bestBrew);
                log(`${cpu.name} poured ${bestBrew.r}${bestBrew.s}`);
                played = true;
            } 
            else if (worstInFlight && bestBrew.val > worstInFlight.val) { 
                let oldCard = cpu.flight[worstFlightIdx];
                cpu.flight[worstFlightIdx] = bestBrew;
                cpu.hand[handIdx] = oldCard; 
                cpu.hand.splice(handIdx, 1); 
                log(`${cpu.name} SWAPPED ${oldCard.r} for ${bestBrew.r}`);
                played = true;
            }
        }
    }

    // 5. WASTE A CARD (If absolutely nothing else can be done)
    if (!played) {
        cpu.hand.sort((a,b) => {
            let vA = a.isBrew ? a.val : 0;
            let vB = b.isBrew ? b.val : 0;
            return vA - vB;
        });
        let w = cpu.hand.shift();
        log(`${cpu.name} wasted ${w.r}${w.s}`);
        played = true;
    }

    finishTurn();
}

// --- RENDER ---
function renderGame() {
    const human = players[0];
    const oppContainer = document.getElementById('opponents-container');
    oppContainer.innerHTML = '';
    players.forEach(p => {
        if(p.type === 'HUMAN') return;
        let isTarget = (gameState === 'TARGET_PLAYER');
        let html = `
            <div class="opponent-zone ${currentPlayerIndex===p.id?'active-turn':''} ${isTarget?'targetable':''}" 
                 onclick="cardAction('OPP_${p.id}', null)">
                <div style="font-size:0.8em; display:flex; justify-content:space-between;">
                    <span>${p.name}</span>
                    <span style="color:var(--gold)">${calcScore(p.flight)}</span>
                </div>
                <div class="paddle-container" style="transform:scale(${players.length>2?0.85:1}); margin:0;">
                    <div class="paddle">
                        ${p.flight.map(c => renderBeerHTML(c, p.id, true)).join('')}
                    </div>
                    <div class="paddle-handle"><div class="hole"></div></div>
                </div>
            </div>`;
        oppContainer.innerHTML += html;
    });

    document.getElementById('player-flight').innerHTML = human.flight.map(c => renderBeerHTML(c, 0, false)).join('');
    document.getElementById('player-hand').innerHTML = human.hand.map((c,i) => renderCardHTML(c, true)).join('');
    document.getElementById('player-score-val').innerText = calcScore(human.flight);
}

function renderCardHTML(c, interactive) {
    const isSelected = (gameState==='SWAP_TARGET' && players[0].hand[swapSourceIdx] === c);
    const click = interactive ? `onclick="cardAction('HAND','${c.uid}')"` : '';
    return `<div class="card ${['♥','♦'].includes(c.s)?'red':'black'} ${isSelected?'selected':''}" ${click}>
                <div class="card-corner">${c.r}<br>${c.s}</div>
                <div class="card-corner bottom">${c.r}<br>${c.s}</div>
            </div>`;
}

function renderBeerHTML(c, pid, isOpp) {
    const beerColor = getBeerColor(c.r);
    const isDark = parseInt(c.r) >= 8;
    const isRed = ['♥','♦'].includes(c.s);
    let loc = isOpp ? `OPP_CARD_${pid}_${c.uid}` : 'P_FLIGHT';
    let clickable = false;
    if(isOpp && gameState === 'TARGET_CARD') clickable = true;
    
    // ALLOW CLICKING OWN FLIGHT FOR SWAPPING (HAND) OR ACE UPGRADE
    if(!isOpp && (gameState === 'SWAP_TARGET' || gameState === 'ACE_SWAP_TARGET')) clickable = true;

    return `<div class="beer-glass ${!isOpp?'player-size':''}" 
            style="--beer-color:${beerColor}; 
                   color:${isDark?'white':'black'}; 
                   text-shadow:${isDark?'0 0 2px black':'0 0 2px white'};
                   ${clickable ? 'border-color:cyan; box-shadow:0 0 10px cyan;' : ''}"
            onclick="cardAction('${loc}','${c.uid}')">
            ${c.r}
            <div class="beer-label ${isRed?'suit-red':'suit-black'}">${c.s}</div>
            </div>`;
}

function calcScore(f) {
    if(!f.length) return 0;
    let s = f.reduce((a,b)=>a+b.val,0);
    if(f.length === 4) {
        const ranks = f.map(c => c.r);
        if(new Set(ranks).size === 1) s += 20;
        const suits = f.map(c => c.s);
        if(new Set(suits).size === 1) s += 10;
    }
    return s;
}

function endShift() {
    // BUG FIX: Sort a copy of the array so players[0] remains the human
    let sortedPlayers = [...players].sort((a,b) => calcScore(b.flight) - calcScore(a.flight));
    let winner = sortedPlayers[0];
    
    // INDIVIDUAL WIN UPDATE
    winner.matchWins++;
    updateMatchScoreBoard();

    let msg = `SHIFT OVER\nWinner: ${winner.name} (${calcScore(winner.flight)})\n\n`;
    msg += `MATCH SCORES:\n`;
    players.forEach(p => msg += `${p.name}: ${p.matchWins}\n`);

    // CHECK WIN CONDITION
    if(winner.matchWins >= WIN_TARGET) {
        setTimeout(() => { 
            alert(`🏆 MATCH OVER 🏆\n\n${winner.name} WINS THE MATCH!`); 
            goHome(); 
        }, 500);
    } else {
        // NEXT ROUND
        setTimeout(() => { 
            alert(msg + "\n\nClick OK for next shift."); 
            startShift(); 
        }, 200);
    }
}
