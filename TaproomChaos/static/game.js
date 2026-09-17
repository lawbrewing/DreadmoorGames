const LEVELS = 5;
const ROOM_SIZE = 30;
const PLAYER_START = { x: 0, z: 12 };

// Custom Tap List
const BEER_CATALOG = [
    { name: 'nIPLy', type: 'IPA', desc: 'Cold IPA. Crisp and bitter.' },
    { name: 'Hopped Up on Enemy\'s Blood', type: 'IPA', desc: 'Tangerine IPA. Citrus forward.' },
    { name: 'Tangier Management', type: 'IPA', desc: 'Red IPA. Malty backbone.' },
    { name: 'Convicted Melon', type: 'IPA', desc: 'Hazy IPA. Juicy and opaque.' },
    { name: 'NOT Burnt Marshmallow', type: 'Stout', desc: 'Pastry Stout. Decadent and sweet.' },
    { name: 'Stolem', type: 'Stout', desc: 'Baltic Porter. Smooth and robust.' },
    { name: 'Gutless Rusty', type: 'Stout', desc: 'Pumpkin Porter. Seasonal spice.' },
    { name: 'Raspberry Cabana', type: 'Sour', desc: 'Fruited Sour. Tart and refreshing.' },
    { name: 'It Was All a Dreamsicle', type: 'Sour', desc: 'Sour Milkshake IPA. Vanilla notes.' },
    { name: 'subLime', type: 'Milkshake', desc: 'Concepted like Sublime singing 311 songs as if it were real life.' },
    { name: 'The Patient Egret', type: 'Milkshake', desc: 'Pineapple Milkshake Nitro IPA. Velvety.' },
    { name: 'Angels With Filthy Souls', type: 'Other', desc: 'Winter Ale. Complex holiday warmer.' }
];

// --- Custom Arcade Physics State ---
let state = {
    level: 1, isPlaying: false, annoyance: 0,
    patronsTotal: 6, patronsServed: 0, timeLeft: 60, maxTime: 60,
    
    // Physical entities with custom kinematics
    player: { x: PLAYER_START.x, z: PLAYER_START.z, vx: 0, vz: 0, radius: 1.5, speed: 20 },
    enemies: [], patrons: [], obstacles: [], spills: [], particles: [],
    
    flight: [null, null, null, null],
    enemySpawnTimer: 0, animState: { slap: 0, pour: 0 },
    safeSpawnGrid: [], spawnedPositions: []
};

let scene, camera, renderer, clock;
let playerGroup, playerSprite, beerSprite, spoonSprite;
let joystick = { x: 0, y: 0, active: false };
const textures = {};
const materials = {};
const geometries = {};

// --- AUDIO SYSTEM ---
const AudioSys = {
    ctx: null,
    init: function() { try { const AC = window.AudioContext || window.webkitAudioContext; if(AC) this.ctx = new AC(); } catch(e) {} },
    playTone: function(freq, type, duration, vol=0.2) {
        if(!this.ctx || this.ctx.state !== 'running') return;
        try {
            const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
            osc.type = type; osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            osc.connect(gain); gain.connect(this.ctx.destination);
            gain.gain.setValueAtTime(vol, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
            osc.start(); osc.stop(this.ctx.currentTime + duration);
        } catch(e) {}
    },
    sfxPour: () => AudioSys.playTone(700, 'sine', 0.2, 0.1),
    sfxSlap: () => AudioSys.playTone(150, 'sawtooth', 0.15, 0.3),
    sfxCrash: () => AudioSys.playTone(80, 'square', 0.3, 0.4),
    sfxWin: () => { AudioSys.playTone(400, 'triangle', 0.2); setTimeout(()=>AudioSys.playTone(600, 'triangle', 0.4), 200); }
};

window.onload = init;

function init() {
    try {
        const container = document.getElementById('game-container');
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x2a1a14); 

        camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 100);
        camera.position.set(0, 32, 26);
        camera.lookAt(0, 0, 4);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(renderer.domElement);

        const ambient = new THREE.AmbientLight(0xffffff, 0.9);
        scene.add(ambient);
        
        clock = new THREE.Clock();
        generateTokens();
        setupControls();
        setupButtons();

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        renderer.setAnimationLoop(animate);
    } catch (e) {
        document.getElementById('error-log').style.display = 'block';
        document.getElementById('error-log').innerText = e.toString();
    }
}

// Generates Canvas "Tokens" so we don't rely on raw emojis or external assets
function generateTokens() {
    function createTokenTexture(emoji, bgColor) {
        const c = document.createElement('canvas'); c.width=256; c.height=256;
        const ctx = c.getContext('2d');
        
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath(); ctx.arc(128, 135, 110, 0, Math.PI*2); ctx.fill();
        
        ctx.fillStyle = bgColor;
        ctx.beginPath(); ctx.arc(128, 120, 110, 0, Math.PI*2); ctx.fill();
        
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 10;
        ctx.beginPath(); ctx.arc(128, 120, 105, 0, Math.PI*2); ctx.stroke();
        
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '120px Arial'; ctx.fillText(emoji, 128, 130);
        
        const tex = new THREE.CanvasTexture(c);
        tex.minFilter = THREE.LinearFilter;
        return tex;
    }

    textures.player = createTokenTexture('🧔🏼‍♂️', '#c62828'); 
    textures.beer = createTokenTexture('🍺', '#fbc02d');
    textures.spoon = createTokenTexture('🥄', '#9e9e9e');
    textures.patron = createTokenTexture('😐', '#cfd8dc');
    textures.patronServed = createTokenTexture('😋', '#81c784');
    textures.villain = createTokenTexture('😠', '#ff0055');
    textures.plant = createTokenTexture('🪴', '#4caf50');

    // Spills and Floor
    const sc = document.createElement('canvas'); sc.width=128; sc.height=128;
    const sctx = sc.getContext('2d');
    sctx.fillStyle = "rgba(255, 235, 59, 0.8)"; sctx.beginPath(); sctx.arc(64, 64, 60, 0, Math.PI*2); sctx.fill();
    textures.spill = new THREE.CanvasTexture(sc);

    const fc = document.createElement('canvas'); fc.width=512; fc.height=512; const fctx = fc.getContext('2d');
    fctx.fillStyle = '#4e342e'; fctx.fillRect(0,0,512,512);
    fctx.strokeStyle = '#3e2723'; fctx.lineWidth = 4;
    for(let i=0; i<512; i+=64) { fctx.strokeRect(i, 0, 64, 512); fctx.strokeRect(0, i, 512, 64); }
    textures.floor = new THREE.CanvasTexture(fc);
    textures.floor.wrapS = textures.floor.wrapT = THREE.RepeatWrapping; textures.floor.repeat.set(4, 4);

    // Reusable Materials
    materials.particleHit = new THREE.MeshBasicMaterial({ color: 0xff0055 });
    materials.particlePour = new THREE.MeshBasicMaterial({ color: 0xfbc02d });
    geometries.particle = new THREE.PlaneGeometry(0.8, 0.8);
}

function spawnParticleBurst(x, z, type, count=12) {
    const mat = type === 'hit' ? materials.particleHit : materials.particlePour;
    for(let i=0; i<count; i++) {
        const p = new THREE.Mesh(geometries.particle, mat);
        p.position.set(x + (Math.random()-0.5), 1.5, z + (Math.random()-0.5));
        p.velocity = new THREE.Vector3((Math.random()-0.5)*15, (Math.random()*10)+5, (Math.random()-0.5)*15);
        p.life = 1.0;
        scene.add(p);
        state.particles.push(p);
    }
}

function setupButtons() {
    const bind = (id, fn) => {
        const el = document.getElementById(id);
        if(el) { el.addEventListener('click', fn); el.addEventListener('touchstart', (e) => { e.preventDefault(); fn(); }, {passive:false}); }
    };
    bind('btn-start', startGame);
    bind('btn-next-level', nextLevel);
    bind('btn-restart', () => location.reload());
    bind('btn-play-again', () => location.reload());
    bind('btn-clear-flight', clearFlight);
    bind('btn-submit-flight', submitFlight);
}

function startGame() {
    AudioSys.init();
    if(AudioSys.ctx && AudioSys.ctx.state === 'suspended') AudioSys.ctx.resume();
    document.getElementById('start-screen').classList.add('hidden');
    state.level = 1;
    loadLevel(1);
}

function nextLevel() {
    document.getElementById('level-screen').classList.add('hidden');
    if (state.level >= LEVELS) {
        document.getElementById('flight-screen').classList.remove('hidden');
        setupFlightUI();
        state.isPlaying = false;
    } else {
        state.level++;
        loadLevel(state.level);
    }
}

// --- SAFE GRID SPAWNER ---
function getSafeSpawns() {
    let points = [];
    for(let x = -14; x <= 14; x += 4.5) {
        for(let z = -8; z <= 18; z += 4.5) {
            // Keep center aisle somewhat clear
            if(Math.abs(x) < 4 && z < 10) continue;
            points.push(new THREE.Vector3(x, 0, z));
        }
    }
    return points.sort(() => Math.random() - 0.5); 
}

function loadLevel(lvl) {
    while(scene.children.length > 0){ scene.remove(scene.children[0]); }
    const ambient = new THREE.AmbientLight(0xffffff, 0.9); scene.add(ambient);
    
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_SIZE+15, ROOM_SIZE+15), new THREE.MeshBasicMaterial({map: textures.floor}));
    floor.rotation.x = -Math.PI/2; scene.add(floor);

    const barGeo = new THREE.BoxGeometry(24, 4, 4);
    const barMat = new THREE.MeshBasicMaterial({ color: 0x3e2723 });
    const bar = new THREE.Mesh(barGeo, barMat); bar.position.set(0, 2, -12); scene.add(bar);

    state.obstacles = [
        { x: 0, z: -12, radius: 12, isBox: true, w: 24, d: 4 }, // Bar Collision
    ]; 
    state.spills = []; state.particles = [];
    
    // Player Setup
    state.player.x = PLAYER_START.x; state.player.z = PLAYER_START.z;
    state.player.vx = 0; state.player.vz = 0;

    playerGroup = new THREE.Group();
    scene.add(playerGroup);
    
    playerSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: textures.player })); 
    playerSprite.position.set(0, 1.5, 0); playerSprite.scale.set(3.5, 3.5, 1);
    playerGroup.add(playerSprite);
    
    beerSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: textures.beer })); 
    beerSprite.position.set(-1.2, 1.2, 0.5); beerSprite.scale.set(1.5,1.5,1);
    playerGroup.add(beerSprite);
    
    spoonSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: textures.spoon })); 
    spoonSprite.position.set(1.2, 1.2, 0.5); spoonSprite.scale.set(1.5,1.5,1);
    playerGroup.add(spoonSprite);

    camera.position.set(0, 32, 26); camera.lookAt(0, 0, 4);
    state.timeLeft = 50 + (lvl * 10); 
    state.maxTime = state.timeLeft;

    state.safeSpawnGrid = getSafeSpawns();
    state.patrons = []; state.enemies = []; state.annoyance = 0; 
    state.patronsServed = 0; state.patronsTotal = 4 + lvl; updateUI();

    // Spawn Tables
    for(let i=0; i<state.patronsTotal; i++) {
        let pos = state.safeSpawnGrid.pop();
        if(!pos) break;
        
        const t = new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.5,2,16), new THREE.MeshBasicMaterial({color:0x5d4037}));
        t.position.set(pos.x, 1, pos.z); scene.add(t);
        
        const p = new THREE.Sprite(new THREE.SpriteMaterial({map:textures.patron}));
        p.position.set(pos.x, 2.8, pos.z); p.scale.set(3,3,1);
        scene.add(p); 

        state.patrons.push({ mesh: p, tableMesh: t, x: pos.x, z: pos.z, radius: 2.2, served: false });
    }

    // Spawn Decor/Obstacles
    for(let i=0; i<2+lvl; i++) {
        let pos = state.safeSpawnGrid.pop();
        if(pos) {
            const p = new THREE.Sprite(new THREE.SpriteMaterial({map:textures.plant}));
            p.position.set(pos.x, 2.5, pos.z); p.scale.set(4,4,1); scene.add(p);
            state.obstacles.push({ x: pos.x, z: pos.z, radius: 1.5 });
        }
    }
    
    // Spills
    for(let i=0; i<2+lvl; i++) {
        let pos = state.safeSpawnGrid.pop();
        if(pos) {
            const s = new THREE.Mesh(new THREE.PlaneGeometry(4,4), new THREE.MeshBasicMaterial({map:textures.spill, transparent:true}));
            s.rotation.x = -Math.PI/2; s.position.copy(pos); s.position.y = 0.05; scene.add(s); 
            state.spills.push({ x: pos.x, z: pos.z });
        }
    }

    state.enemySpawnTimer = 3.0;
    document.getElementById('level-indicator').innerText = `LEVEL ${lvl}`;
    showMessage(`TAPROOM OPEN!`);
    
    clock.start();
    state.isPlaying = true;
}

function spawnEnemy() {
    let edgeX = Math.random() > 0.5 ? -18 : 18;
    let edgeZ = (Math.random() * 20) - 5;

    const eMesh = new THREE.Sprite(new THREE.SpriteMaterial({map:textures.villain}));
    eMesh.position.set(edgeX, 2, edgeZ); eMesh.scale.set(3.5,3.5,1);
    scene.add(eMesh); 

    state.enemies.push({ 
        mesh: eMesh, x: edgeX, z: edgeZ, vx: 0, vz: 0, 
        radius: 1.5, hp: 3, speed: 6.0 + state.level*1.0 
    });
}

// --- CUSTOM ARCADE COLLISION RESOLVER ---
// Pushes circle A away from circle B if they overlap
function resolveCollision(a, b) {
    let dx = a.x - b.x;
    let dz = a.z - b.z;
    let dist = Math.sqrt(dx*dx + dz*dz);
    let minDist = a.radius + b.radius;
    
    if (dist > 0 && dist < minDist) {
        let overlap = minDist - dist;
        a.x += (dx / dist) * overlap;
        a.z += (dz / dist) * overlap;
    }
}

function animate() {
    if(!state.isPlaying) { renderer.render(scene, camera); return; }
    
    // Clamp delta time to prevent physics explosions if tab is backgrounded
    const dt = Math.min(clock.getDelta(), 0.05); 
    const time = clock.getElapsedTime();

    state.timeLeft -= dt;
    if(state.timeLeft <= 0) {
        state.isPlaying = false; AudioSys.playSFX('lose');
        document.getElementById('game-over-title').innerText = "TIME'S UP!";
        document.getElementById('game-over-screen').classList.remove('hidden');
    }

    // Determine target speed based on spills
    let currentSpeed = state.player.speed;
    for(let s of state.spills) {
        let dx = state.player.x - s.x; let dz = state.player.z - s.z;
        if(Math.sqrt(dx*dx + dz*dz) < 2.5) currentSpeed = 6.0; // Slow down in spill
    }

    // --- 1. PLAYER MOVEMENT & KINEMATICS ---
    if(joystick.active) {
        state.player.vx += joystick.x * currentSpeed * dt * 10;
        state.player.vz += joystick.y * currentSpeed * dt * 10;
    }
    
    // Friction
    state.player.vx *= 0.85;
    state.player.vz *= 0.85;
    
    state.player.x += state.player.vx * dt;
    state.player.z += state.player.vz * dt;

    // --- 2. ENEMY AI & KINEMATICS ---
    state.enemySpawnTimer -= dt;
    if(state.enemySpawnTimer <= 0 && state.enemies.length < 2) { spawnEnemy(); state.enemySpawnTimer = 4.0; }

    for(let i=state.enemies.length-1; i>=0; i--) {
        const e = state.enemies[i];
        
        let dx = state.player.x - e.x;
        let dz = state.player.z - e.z;
        let dist = Math.sqrt(dx*dx + dz*dz) || 0.001;
        
        // Chase Acceleration
        e.vx += (dx / dist) * e.speed * dt * 10;
        e.vz += (dz / dist) * e.speed * dt * 10;
        
        // Friction (allows smooth sliding after knockback)
        e.vx *= 0.90;
        e.vz *= 0.90;
        
        e.x += e.vx * dt;
        e.z += e.vz * dt;
        
        // Hit Player Check
        if(dist < 3.0) {
            state.annoyance += 30 * dt;
            // Bounce enemy off player
            e.vx = -(dx / dist) * 15; 
            e.vz = -(dz / dist) * 15;
            AudioSys.sfxCrash();
            updateUI();
        }
    }

    // --- 3. RESOLVE ALL COLLISIONS ---
    // Boundaries
    const limit = ROOM_SIZE/2 - 2;
    state.player.x = Math.max(-limit, Math.min(limit, state.player.x));
    state.player.z = Math.max(-limit, Math.min(limit, state.player.z));

    // Player vs Tables & Obstacles
    state.patrons.forEach(p => resolveCollision(state.player, p));
    state.obstacles.forEach(o => {
        if(o.isBox) { // Bar Box logic
            if(state.player.z < -8) { state.player.z = -8; state.player.vz = 0; }
        } else resolveCollision(state.player, o);
    });

    // Enemies vs Everything
    state.enemies.forEach(e => {
        e.x = Math.max(-limit, Math.min(limit, e.x));
        e.z = Math.max(-limit, Math.min(limit, e.z));
        if(e.z < -8) e.z = -8; // Bar boundary
        
        state.patrons.forEach(p => resolveCollision(e, p));
        state.obstacles.forEach(o => { if(!o.isBox) resolveCollision(e, o); });
        
        // Enemies against each other
        state.enemies.forEach(otherE => {
            if(e !== otherE) resolveCollision(e, otherE);
        });
    });

    // --- 4. VISUAL RENDER SYNC ---
    playerGroup.position.set(state.player.x, 2.0 + (joystick.active ? Math.abs(Math.sin(time*10))*0.3 : 0), state.player.z);
    
    // Smooth camera follow
    camera.position.x += (state.player.x * 0.5 - camera.position.x) * 0.1;
    camera.position.z += ((state.player.z + 18) - camera.position.z) * 0.1;

    // Sprite Animations (No scale ballooning!)
    if(state.animState.slap > 0) {
        state.animState.slap -= dt*5;
        spoonSprite.material.rotation = Math.sin(state.animState.slap*10)*1.5;
    } else spoonSprite.material.rotation = 0;

    if(state.animState.pour > 0) {
        state.animState.pour -= dt*3;
        beerSprite.material.rotation = -0.5;
    } else beerSprite.material.rotation = 0;

    // Sync Enemies
    state.enemies.forEach(e => {
        e.mesh.position.set(e.x, 2 + Math.abs(Math.sin(time*10 + e.hp))*0.2, e.z);
    });

    // Sync Particles
    for(let i=state.particles.length-1; i>=0; i--) {
        let p = state.particles[i];
        p.life -= dt * 2;
        if(p.life <= 0) {
            scene.remove(p);
            state.particles.splice(i, 1);
        } else {
            p.position.addScaledVector(p.velocity, dt);
            p.velocity.y -= 25 * dt; // Gravity
            p.scale.setScalar(Math.max(0.01, p.life)); // Shrink safely
            p.lookAt(camera.position); // Always face camera
        }
    }

    state.annoyance += 2 * dt;
    updateUI();

    if(state.annoyance >= 100) {
        state.isPlaying = false; AudioSys.playSFX('lose');
        document.getElementById('game-over-screen').classList.remove('hidden');
    }

    renderer.render(scene, camera);
}

function setupControls() {
    const joy = document.getElementById('joystick-zone');
    const knob = document.getElementById('joystick-knob');
    
    const handleTouch = (e) => {
        if(e.cancelable) e.preventDefault();
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) { clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; } 
        else if (e.changedTouches && e.changedTouches.length > 0) { clientX = e.changedTouches[0].clientX; clientY = e.changedTouches[0].clientY; } 
        else if (e.clientX !== undefined) { clientX = e.clientX; clientY = e.clientY; }
        if (clientX === undefined) return;
        
        const rect = joy.getBoundingClientRect();
        const cx = rect.left + rect.width/2; const cy = rect.top + rect.height/2;
        let dx = clientX - cx; let dy = clientY - cy;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if(dist > 50) { dx = (dx/dist)*50; dy = (dy/dist)*50; }
        
        knob.style.transform = `translate(-50%, -50%) translate(${dx}px, ${dy}px)`;
        joystick.x = dx/50; joystick.y = dy/50;
        joystick.active = true;
    };
    const end = () => { joystick.active=false; joystick.x=0; joystick.y=0; knob.style.transform=`translate(-50%, -50%)`; };

    joy.addEventListener('mousedown', e => { joystick.active=true; handleTouch(e); });
    window.addEventListener('mousemove', e => { if(joystick.active) handleTouch(e); });
    window.addEventListener('mouseup', end);
    
    joy.addEventListener('touchstart', handleTouch, {passive: false});
    joy.addEventListener('touchmove', handleTouch, {passive: false});
    joy.addEventListener('touchend', end);

    document.getElementById('btn-slap').addEventListener('mousedown', ()=>performAction('slap'));
    document.getElementById('btn-pour').addEventListener('mousedown', ()=>performAction('pour'));
    document.getElementById('btn-slap').addEventListener('touchstart', (e)=>{ e.preventDefault(); performAction('slap'); }, {passive:false});
    document.getElementById('btn-pour').addEventListener('touchstart', (e)=>{ e.preventDefault(); performAction('pour'); }, {passive:false});

    window.addEventListener('keydown', e => {
        if(['w','a','s','d'].includes(e.key)) {
            joystick.active=true;
            if(e.key==='w') joystick.y=-1; if(e.key==='s') joystick.y=1;
            if(e.key==='a') joystick.x=-1; if(e.key==='d') joystick.x=1;
        }
        if(e.key===' ') performAction('slap');
        if(e.key==='e') performAction('pour');
    });
    window.addEventListener('keyup', () => { joystick.active=false; joystick.x=0; joystick.y=0; });
}

function performAction(type) {
    if(!state.isPlaying) return;
    
    if(type==='slap') {
        state.animState.slap = 1.0; AudioSys.playSFX('slap'); 
        spawnParticleBurst(state.player.x, state.player.z, 'hit', 5);
        
        for(let i=state.enemies.length-1; i>=0; i--) {
            let e = state.enemies[i];
            let dx = e.x - state.player.x; let dz = e.z - state.player.z;
            let dist = Math.sqrt(dx*dx + dz*dz) || 0.001;

            if(dist < 7.0) { 
                e.hp--;
                // CUSTOM ARCADE KNOCKBACK: Instant velocity spike
                e.vx = (dx / dist) * 40; 
                e.vz = (dz / dist) * 40;
                
                spawnParticleBurst(e.x, e.z, 'hit', 15);
                showMessage("BAM!", "#ff0055");
                
                if(e.hp <= 0) {
                    scene.remove(e.mesh); state.enemies.splice(i, 1);
                    state.annoyance = Math.max(0, state.annoyance - 15); 
                    updateUI();
                }
                break; // Only hit one per slap
            }
        }
    } else if(type==='pour') {
        state.animState.pour = 1.0; AudioSys.playSFX('pour');
        
        for(let p of state.patrons) {
            let dx = p.x - state.player.x; let dz = p.z - state.player.z;
            let dist = Math.sqrt(dx*dx + dz*dz);
            
            if(!p.served && dist < 6.0) {
                p.served = true;
                p.mesh.material.map = textures.patronServed; 
                state.patronsServed++;
                spawnParticleBurst(p.x, p.z, 'pour', 15);
                showMessage("+SERVED", "#4caf50");
                updateUI();
                
                if(state.patronsServed >= state.patronsTotal) {
                    state.isPlaying = false; AudioSys.playSFX('win');
                    setTimeout(() => document.getElementById('level-screen').classList.remove('hidden'), 1000);
                }
                return; // Only pour one per tap
            }
        }
    }
}

function updateUI() {
    document.getElementById('patron-counter').innerText = `SERVED: ${state.patronsServed}/${state.patronsTotal}`;
    document.getElementById('meter-fill').style.width = Math.min(100, state.annoyance) + '%';
    document.getElementById('meter-label').innerText = `ANNOYANCE: ${Math.floor(state.annoyance)}%`;
    document.getElementById('timer-display').innerText = `TIME: ${Math.max(0, Math.ceil(state.timeLeft))}`;
}

function showMessage(txt) {
    const el = document.getElementById('msg-area'); 
    el.innerText = txt; el.style.opacity = 1;
    setTimeout(()=>el.style.opacity = 0, 1500);
}

// --- CUSTOM LAW BREWING FLIGHT PUZZLE ---
function clearFlight() { state.flight=[null,null,null,null]; setupFlightUI(); document.getElementById('flight-msg').innerText=''; }

function setupFlightUI() {
    const grid = document.getElementById('beer-slots'); grid.innerHTML = '';
    state.flight.forEach(b => {
        const d = document.createElement('div'); d.className = b ? 'slot filled' : 'slot';
        d.innerText = b || 'Empty'; grid.appendChild(d);
    });
    
    const infoBox = document.getElementById('beer-info-box');
    const opts = document.getElementById('beer-choices'); opts.innerHTML='';
    BEERS.forEach(b => {
        const btn = document.createElement('button'); btn.className = 'choice-btn'; btn.innerText = b;
        
        // Find matching catalog entry for description
        const catalogEntry = BEER_CATALOG.find(c => c.name === b);
        
        btn.onmouseover = () => { if(catalogEntry) infoBox.innerHTML = `<strong>${catalogEntry.name}</strong> - ${catalogEntry.desc}`; };
        btn.onclick = () => {
            if(catalogEntry) infoBox.innerHTML = `<strong>${catalogEntry.name}</strong> - ${catalogEntry.desc}`;
            const idx = state.flight.indexOf(null);
            if (idx!==-1) { state.flight[idx]=b; setupFlightUI(); }
        };
        opts.appendChild(btn);
    });
}

function submitFlight() {
    if(state.flight.includes(null)) { document.getElementById('flight-msg').innerText="Fill all slots!"; return; }
    let hasIPA=false, hasSour=false, hasStout=false, hasMilkshake=false, hasOther=false;
    state.flight.forEach(b => {
        const t = BEER_MAP[b];
        if(t==='IPA') hasIPA=true; if(t==='Sour') hasSour=true; 
        if(t==='Stout') hasStout=true; if(t==='Milkshake') hasMilkshake=true;
        if(t==='Other') hasOther=true;
    });
    
    if(hasIPA && hasSour && hasStout && hasMilkshake && !hasOther) {
        AudioSys.playSFX('win');
        document.getElementById('flight-screen').classList.add('hidden');
        document.getElementById('win-screen').classList.remove('hidden');
    } else {
        AudioSys.playSFX('lose');
        document.getElementById('flight-msg').style.color = "#d32f2f";
        document.getElementById('flight-msg').innerText = "Incorrect Flight! Read the prompt.";
        setTimeout(() => { document.getElementById('flight-msg').innerText=""; clearFlight(); }, 1500);
    }
}
