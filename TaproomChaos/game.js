import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const LEVELS = 5;
const ROOM_SIZE = 30;
const PLAYER_START = { x: 0, z: 12 };

const RESTRICTED_ZONES = [
    { minX: 6, maxX: 14, minZ: 4, maxZ: 12 },   
    { minX: -16, maxX: -6, minZ: 3, maxZ: 14 }, 
    { minX: -16, maxX: 16, minZ: -16, maxZ: -9 }, 
    { minX: -4, maxX: 4, minZ: 10, maxZ: 16 }, 
    { minX: -3, maxX: 3, minZ: -12, maxZ: 12 }, 
    { minX: -16, maxX: 16, minZ: -1, maxZ: 2 }   
];

const BEERS = [
    'nIPLy Cold IPA', 'subLime Milkshake IPA', 
    'Stolem Baltic Porter', 'Gutless Rusty Pumpkin',
    'Kaszubian Sour', 'German Pilsner', 
    'Peach Cider', 'Lime Lager'
];
const BEER_MAP = {
    'nIPLy Cold IPA': 'IPA', 'subLime Milkshake IPA': 'IPA',
    'Stolem Baltic Porter': 'Stout', 'Gutless Rusty Pumpkin': 'Stout',
    'Kaszubian Sour': 'Sour', 'German Pilsner': 'Pilsner', 
    'Peach Cider': 'Cider', 'Lime Lager': 'Lager'
};

let state = {
    level: 1, isPlaying: false, annoyance: 0,
    patronsTotal: 6, patronsServed: 0, timeLeft: 60, maxTime: 60, 
    enemies: [], patrons: [], npcs: [], notes: [], 
    obstacles: [], spills: [], flight: [null, null, null, null],
    enemySpawnTimer: 0, animState: { slap: 0, pour: 0 },
    safeSpawnGrid: [], spawnedPositions: [], particles: []
};

let scene, camera, renderer, clock, composer;
let playerGroup, playerBeerModel, playerSpoonModel;
let joystick = { x: 0, y: 0, active: false };
const textures = {};

const AudioSys = {
    ctx: null,
    init: function() { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} },
    playSFX: function(type) {
        if(!this.ctx) return;
        try {
            const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
            osc.connect(gain); gain.connect(this.ctx.destination);
            const now = this.ctx.currentTime;
            if (type === 'slap') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, now); gain.gain.setValueAtTime(0.5, now); osc.start(now); osc.stop(now + 0.1); } 
            else if (type === 'pour') { osc.type = 'sine'; osc.frequency.setValueAtTime(400, now); gain.gain.setValueAtTime(0.2, now); osc.start(now); osc.stop(now + 0.3); } 
            else if (type === 'win') { osc.type = 'triangle'; osc.frequency.setValueAtTime(440, now); gain.gain.setValueAtTime(0.3, now); osc.start(now); osc.stop(now + 0.5); } 
            else if (type === 'lose') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, now); gain.gain.setValueAtTime(0.5, now); osc.start(now); osc.stop(now + 0.5); }
        } catch(e) {}
    }
};

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111); 
    scene.fog = new THREE.Fog(0x111111, 15, 50);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 100);
    camera.position.set(0, 32, 26); camera.lookAt(0, 0, 4);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ReinhardToneMapping;
    document.getElementById('game-container').appendChild(renderer.domElement);

    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0.3;  
    bloomPass.strength = 1.6;   
    bloomPass.radius = 0.5;     
    composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    clock = new THREE.Clock();
    generateTextures(); setupControls(); setupButtons();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
    });

    renderer.setAnimationLoop(animate);
}

function setupButtons() {
    const bind = (id, fn) => { const el = document.getElementById(id); if(el) { el.onclick = null; el.addEventListener('click', fn); el.addEventListener('touchend', (e) => { e.preventDefault(); fn(); }); } };
    bind('btn-start', () => { 
        AudioSys.init(); if(AudioSys.ctx && AudioSys.ctx.state === 'suspended') AudioSys.ctx.resume(); 
        document.getElementById('start-screen').classList.add('hidden'); 
        state.level=1; state.isPlaying=true; clock.getDelta(); loadLevel(1); 
    });
    bind('btn-next-level', () => { 
        document.getElementById('level-screen').classList.add('hidden'); 
        if(state.level>=LEVELS){ document.getElementById('flight-screen').classList.remove('hidden'); setupFlightUI(); state.isPlaying=false; }
        else { state.level++; state.isPlaying=true; clock.getDelta(); loadLevel(state.level); }
    });
    bind('btn-restart', () => location.reload()); bind('btn-play-again', () => location.reload()); bind('btn-clear-flight', clearFlight); bind('btn-submit-flight', submitFlight);
}

// --- UPGRADED MAX-DETAIL MEEPLE GENERATOR ---
function createCharacterModel(type) {
    const group = new THREE.Group();
    let bodyColor = 0x555555; let headColor = 0xffccaa; 
    let isSlim = false; let isBurly = false;

    // Archetype Base Rules
    if(type === 'player') { bodyColor = 0x2980b9; }
    if(type === 'brewmaster') { bodyColor = 0x2c3e50; isBurly = true; }
    if(type === 'vip_hottie') { bodyColor = 0x000000; isSlim = true; }
    if(type === 'hippie') { bodyColor = 0x8e44ad; }
    if(type === 'beer_snob') { bodyColor = 0x2c3e50; }
    if(type === 'old_timer') { bodyColor = 0x7f8c8d; }
    if(type === 'douche') { bodyColor = 0xffffff; } 
    if(type === 'annoying_girl') { bodyColor = 0xff69b4; isSlim = true; }
    if(type === 'karen') { bodyColor = 0xe74c3c; headColor = 0xff9999; } // Angry red flush
    if(type === 'viking') { bodyColor = 0x8b4513; isBurly = true; }
    if(type === 'served') { bodyColor = 0x27ae60; headColor = 0xa9dfbf; }
    if(type === 'alien') { bodyColor = 0x2ecc71; headColor = 0x00ff00; }
    
    if (type === 'dog') { 
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 1.2), new THREE.MeshStandardMaterial({color: 0x8d6e63})); b.position.y = 0.5;
        const h = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshStandardMaterial({color: 0x5d4037})); h.position.set(0, 0.8, 0.6);
        group.add(b); group.add(h); return group;
    }

    // Dynamic Proportions
    let bTop = isSlim ? 0.2 : (isBurly ? 0.35 : 0.25);
    let bBot = isSlim ? 0.25 : (isBurly ? 0.5 : 0.4);

    const body = new THREE.Mesh(new THREE.CylinderGeometry(bTop, bBot, 1.2, 16), new THREE.MeshStandardMaterial({color: bodyColor, roughness: 0.8}));
    body.position.y = 0.6;
    
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), new THREE.MeshStandardMaterial({color: headColor, roughness: 0.5}));
    head.position.y = 1.45;
    
    group.add(body); group.add(head);

    // --- ACCESSORY ATTACHMENT HELPER ---
    const addMesh = (geo, color, x, y, z, rotX=0, rotY=0, rotZ=0) => {
        const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({color: color, roughness: 0.7}));
        m.position.set(x, y, z); m.rotation.set(rotX, rotY, rotZ); group.add(m); return m;
    };

    // --- ARCHETYPE DETAILING ---
    if(type === 'brewmaster') {
        addMesh(new THREE.BoxGeometry(0.55, 0.8, 0.05), 0x3e2723, 0, 0.7, 0.36); // Leather apron
        addMesh(new THREE.BoxGeometry(0.45, 0.5, 0.4), 0x5d4037, 0, 1.2, 0.25); // Majestic Beard
        addMesh(new THREE.CylinderGeometry(0.36, 0.36, 0.15), 0x111111, 0, 1.6, 0); // Beanie/Cap
    }
    else if(type === 'beer_snob') {
        addMesh(new THREE.SphereGeometry(0.36, 16, 16, 0, Math.PI*2, 0, Math.PI/2), 0x7f8c8d, 0, 1.45, 0); // Beanie
        addMesh(new THREE.BoxGeometry(0.6, 0.15, 0.1), 0x111111, 0, 1.48, 0.31); // Thick hipster glasses
        addMesh(new THREE.BoxGeometry(0.3, 0.2, 0.2), 0x5d4037, 0, 1.3, 0.3); // Neat beard
        addMesh(new THREE.CylinderGeometry(0.08, 0.05, 0.2), 0xffffff, 0.3, 0.9, 0.3); // Tasting snifter
    }
    else if(type === 'vip_hottie') {
        addMesh(new THREE.BoxGeometry(0.5, 0.8, 0.3), 0xf1c40f, 0, 1.3, -0.2); // Long blonde hair
        addMesh(new THREE.BoxGeometry(0.55, 0.12, 0.1), 0x111111, 0, 1.5, 0.31); // Designer shades
        addMesh(new THREE.TorusGeometry(0.18, 0.03, 8, 16), 0xffffff, 0, 1.25, 0, Math.PI/2, 0, 0); // Pearl Choker
    }
    else if(type === 'hippie') {
        addMesh(new THREE.TorusGeometry(0.36, 0.04, 8, 16), 0xc0392b, 0, 1.5, 0, Math.PI/2, 0, 0); // Headband
        addMesh(new THREE.TorusGeometry(0.1, 0.03, 8, 16), 0x222222, 0.15, 1.45, 0.3); // Round glasses L
        addMesh(new THREE.TorusGeometry(0.1, 0.03, 8, 16), 0x222222, -0.15, 1.45, 0.3); // Round glasses R
        addMesh(new THREE.CylinderGeometry(0.38, 0.45, 0.6, 16), 0x795548, 0, 1.2, -0.1); // Long hair
    }
    else if(type === 'old_timer') {
        addMesh(new THREE.TorusGeometry(0.32, 0.08, 8, 16), 0xbdc3c7, 0, 1.45, 0, Math.PI/2, 0, 0); // Bald rim
        addMesh(new THREE.BoxGeometry(0.05, 1.2, 0.45), 0x111111, 0.15, 0.6, 0); // Suspenders
        addMesh(new THREE.BoxGeometry(0.05, 1.2, 0.45), 0x111111, -0.15, 0.6, 0);
    }
    else if(type === 'douche') {
        addMesh(new THREE.BoxGeometry(0.1, 0.3, 0.3), 0xffffff, 0.25, 1.2, -0.1, 0, 0, -0.5); // Popped collar L
        addMesh(new THREE.BoxGeometry(0.1, 0.3, 0.3), 0xffffff, -0.25, 1.2, -0.1, 0, 0, 0.5); // Popped collar R
        addMesh(new THREE.TorusGeometry(0.22, 0.03, 8, 16), 0xf1c40f, 0, 1.15, 0.15, Math.PI/4, 0, 0); // Gold Chain
        addMesh(new THREE.CylinderGeometry(0.36, 0.36, 0.1), 0x222222, 0, 1.6, 0); // Backwards visor
        addMesh(new THREE.BoxGeometry(0.3, 0.05, 0.4), 0x222222, 0, 1.58, -0.2); 
    }
    else if(type === 'annoying_girl') {
        addMesh(new THREE.CylinderGeometry(0.08, 0.05, 0.5), 0x111111, 0, 1.7, -0.3, Math.PI/4, 0, 0); // High ponytail
        const phone = addMesh(new THREE.BoxGeometry(0.15, 0.25, 0.02), 0xffffff, 0, 1.4, 0.5); // Selfie pose
        phone.material.emissive.setHex(0xffffff); // Glowing screen
    }
    else if(type === 'karen') {
        addMesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), 0xf1c40f, 0.1, 1.55, 0.1, 0, 0, -0.2); // Asymmetrical haircut
        const phone = addMesh(new THREE.BoxGeometry(0.15, 0.25, 0.02), 0x222, 0, 1.0, 0.4); // Demanding manager on phone
    }
    else if(type === 'viking') {
        addMesh(new THREE.SphereGeometry(0.36, 16, 16, 0, Math.PI*2, 0, Math.PI/2), 0x95a5a6, 0, 1.45, 0); // Iron helmet
        addMesh(new THREE.ConeGeometry(0.08, 0.4, 8), 0xecf0f1, 0.35, 1.6, 0, 0, 0, -Math.PI/4); // Horn L
        addMesh(new THREE.ConeGeometry(0.08, 0.4, 8), 0xecf0f1, -0.35, 1.6, 0, 0, 0, Math.PI/4); // Horn R
        addMesh(new THREE.BoxGeometry(0.55, 0.5, 0.35), 0xd35400, 0, 1.25, 0.25); // Massive red beard
    }
    
    return group;
}

function createPlantModel() {
    const group = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 0.6), new THREE.MeshStandardMaterial({color: 0x222222})); pot.position.y = 0.3;
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 8), new THREE.MeshStandardMaterial({color: 0x1e8449, flatShading: true})); leaves.position.y = 1.1;
    group.add(pot); group.add(leaves); return group;
}

function createTapModel() {
    const group = new THREE.Group();
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.8, 16), new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.8, roughness: 0.2 })); spout.rotation.x = Math.PI / 2;
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.6, 0.15), new THREE.MeshStandardMaterial({ color: 0x111111 })); handle.position.set(0.2, 0.3, 0); handle.rotation.z = -Math.PI / 8; 
    group.add(spout); group.add(handle); return group;
}

function createBeerGlassModel() {
    const group = new THREE.Group();
    const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.35, 0.8, 16), new THREE.MeshStandardMaterial({ color: 0xff5e00, emissive: 0xaa2200, transparent: true, opacity: 0.9 }));
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.4, 1.0, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, metalness: 0.8, roughness: 0.1 }));
    const foam = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 16), new THREE.MeshStandardMaterial({ color: 0xffffff })); foam.position.y = 0.45; foam.scale.y = 0.5;
    group.add(liquid); group.add(cup); group.add(foam); return group;
}

function createSpoonModel() {
    // Upgraded proper spoon geometry
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({color: 0xcccccc, metalness: 0.9, roughness: 0.2});
    
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 8), mat);
    handle.position.y = 0.8;
    
    // Half-sphere for a concave spoon bowl
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16, 0, Math.PI*2, 0, Math.PI/2), mat); 
    bowl.scale.set(1.2, 0.2, 1.6); 
    bowl.position.y = 1.7; 
    bowl.rotation.x = Math.PI / 8; 
    
    group.add(handle); group.add(bowl); 
    group.position.y = -0.8; // Pivot at base
    
    const pivot = new THREE.Group();
    pivot.add(group);
    return pivot;
}

function createParticleBurst(pos, colorHex) {
    const particleCount = 30; const geometry = new THREE.BufferGeometry(); const positions = new Float32Array(particleCount * 3); const velocities = [];
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = pos.x; positions[i * 3 + 1] = pos.y + 1.5; positions[i * 3 + 2] = pos.z;
        velocities.push({ x: (Math.random() - 0.5) * 8, y: (Math.random() * 5) + 2, z: (Math.random() - 0.5) * 8 });
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color: colorHex, size: 0.3, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
    const particleSystem = new THREE.Points(geometry, material); scene.add(particleSystem);
    state.particles.push({ mesh: particleSystem, velocities: velocities, life: 1.0 });
}

function generateTextures() {
    const sc = document.createElement('canvas'); sc.width=128; sc.height=128; const sctx = sc.getContext('2d');
    sctx.fillStyle = "#d35400"; sctx.beginPath(); sctx.arc(64, 64, 60, 0, Math.PI*2); sctx.fill(); textures.spill = new THREE.CanvasTexture(sc);

    const nc = document.createElement('canvas'); nc.width=1024; nc.height=128; const nctx = nc.getContext('2d');
    nctx.shadowColor = "#ff7b00"; nctx.shadowBlur = 50; 
    nctx.fillStyle = "#ffffff"; nctx.font = "bold 80px Courier New"; nctx.textAlign = "center"; nctx.textBaseline = "middle";
    nctx.fillText("LAW BREWING TAPROOM", 512, 64); textures.neon = new THREE.CanvasTexture(nc);

    const dc = document.createElement('canvas'); dc.width=256; dc.height=256; const dctx = dc.getContext('2d');
    dctx.fillStyle = '#111111'; dctx.fillRect(0,0,256,256); dctx.fillStyle = '#181818'; dctx.fillRect(0,0,128,128); dctx.fillRect(128,128,128,128);
    textures.danceFloor = new THREE.CanvasTexture(dc); textures.danceFloor.wrapS = THREE.RepeatWrapping; textures.danceFloor.wrapT = THREE.RepeatWrapping; textures.danceFloor.repeat.set(4, 4);
}

function createPlayer(pos) {
    playerGroup = new THREE.Group(); playerGroup.position.copy(pos); scene.add(playerGroup);
    const pl = new THREE.PointLight(0xffe0b2, 0.6, 15); pl.position.set(0, 5, 0); playerGroup.add(pl);
    const pModel = createCharacterModel('player'); playerGroup.add(pModel);
    playerBeerModel = createBeerGlassModel(); playerBeerModel.position.set(-0.8, 0.2, 0.5); playerGroup.add(playerBeerModel);
    playerSpoonModel = createSpoonModel(); playerSpoonModel.position.set(0.8, 0.5, 0.5); playerSpoonModel.rotation.z = Math.PI / 4; playerGroup.add(playerSpoonModel);
}

function createDecorations() {
    const barMat = new THREE.MeshStandardMaterial({ color: 0x2c1e16, roughness: 0.6 }); 
    const bar = new THREE.Mesh(new THREE.BoxGeometry(24, 2, 2), barMat); bar.position.set(0, 1, -12); scene.add(bar); state.obstacles.push(bar);
    const backBar = new THREE.Mesh(new THREE.BoxGeometry(24, 4, 1), barMat); backBar.position.set(0, 2, -15.5); scene.add(backBar);
    
    const neonMat = new THREE.SpriteMaterial({ map: textures.neon, color: 0xffffff });
    const neon = new THREE.Sprite(neonMat); neon.position.set(0, 6, -15.2); neon.scale.set(16, 2, 1); scene.add(neon);
    
    for(let i=0; i<10; i++) { const tap = createTapModel(); tap.position.set(-8 + (i*1.8), 2.5, -15); scene.add(tap); }
    
    // Spawn Brewmaster Bartender
    const bartender = createCharacterModel('brewmaster'); bartender.position.set(0, 0, -13.5); scene.add(bartender);

    const poolGeo = new THREE.BoxGeometry(5, 2, 8); const poolMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50 });
    const poolTable = new THREE.Mesh(poolGeo, [barMat, barMat, poolMat, barMat, barMat, barMat]); poolTable.position.set(-12, 1, 8); scene.add(poolTable); state.obstacles.push(poolTable);
    const pocketGeo = new THREE.CylinderGeometry(0.25, 0.25, 2.1); const pocketMat = new THREE.MeshBasicMaterial({color:0x000000});
    for(let x of [-14.3, -9.7]) for(let z of [4.2, 8, 11.8]) { const p = new THREE.Mesh(pocketGeo, pocketMat); p.position.set(x, 1, z); scene.add(p); }
    const ballGeo = new THREE.SphereGeometry(0.15, 8, 8);
    for(let i=0; i<10; i++) { const b = new THREE.Mesh(ballGeo, new THREE.MeshStandardMaterial({color:Math.random()*0xffffff})); b.position.set(-12+(Math.random()-0.5)*4, 2.15, 8+(Math.random()-0.5)*7); scene.add(b); }
    
    const df = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshBasicMaterial({ map: textures.danceFloor })); df.rotation.x = -Math.PI/2; df.position.set(10, 0.02, 8); scene.add(df);
}

function calculateSafeGrid() {
    let points = [];
    for(let x = -16; x <= 16; x += 2.5) {
        for(let z = -12; z <= 14; z += 2.5) {
            let pos = new THREE.Vector3(x, 0, z); let safe = true;
            for(let zone of RESTRICTED_ZONES) if(x > zone.minX && x < zone.maxX && z > zone.minZ && z < zone.maxZ) safe = false;
            if(safe) for(let obs of state.obstacles) if(pos.distanceTo(obs.position) < 3.5) safe = false;
            if(safe) points.push(pos);
        }
    } return points.sort(() => Math.random() - 0.5); 
}

function getSafeSpot(spacing) {
    for(let i=state.safeSpawnGrid.length-1; i>=0; i--) {
        let pos = state.safeSpawnGrid[i]; let clear = true;
        if(pos.distanceTo(new THREE.Vector3(PLAYER_START.x,0,PLAYER_START.z)) < 8.0) clear = false;
        if(clear) for(let spawned of state.spawnedPositions) if(pos.distanceTo(spawned) < spacing) { clear = false; break; } 
        if(clear) { state.safeSpawnGrid.splice(i, 1); state.spawnedPositions.push(pos); return pos; }
    } return null;
}

function loadLevel(lvl) {
    while(scene.children.length > 0){ scene.remove(scene.children[0]); }
    const ambient = new THREE.AmbientLight(0xffe0b2, 0.5); scene.add(ambient);
    const spotLight = new THREE.SpotLight(0xffb300, 0.8); spotLight.position.set(0, 40, 0); spotLight.castShadow = true; scene.add(spotLight);
    
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_SIZE+10, ROOM_SIZE+10), new THREE.MeshStandardMaterial({color:0x221a15, roughness:0.8})); floor.rotation.x = -Math.PI/2; scene.add(floor);

    state.obstacles = []; state.spills = []; state.npcs = []; state.spawnedPositions = []; state.particles = []; state.enemies = [];
    createPlayer(new THREE.Vector3(PLAYER_START.x, 0, PLAYER_START.z)); createDecorations();
    camera.position.set(0, 32, 26); camera.lookAt(0, 0, 4);
    state.timeLeft = 60; state.maxTime = 60; state.safeSpawnGrid = calculateSafeGrid();

    for(let i=0; i<3+lvl; i++) {
        let pos = getSafeSpot(4.0);
        if(pos) { const s = new THREE.Mesh(new THREE.PlaneGeometry(4,4), new THREE.MeshBasicMaterial({map:textures.spill, transparent:true})); s.rotation.x = -Math.PI/2; s.position.copy(pos); s.position.y = 0.05; scene.add(s); state.spills.push(s); }
    }

    state.patrons = []; state.annoyance = 0; state.patronsServed = 0; state.patronsTotal = 6; updateUI();

    const patronTypes = ['vip_hottie', 'hippie', 'beer_snob', 'douche', 'old_timer', 'annoying_girl'];

    let tablesSpawned = 0; let spacing = 4.5; let loop = 0;
    while(tablesSpawned < 6 && loop < 500) {
        let pos = getSafeSpot(spacing);
        if(pos) {
            const t = new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.5,1,16), new THREE.MeshLambertMaterial({color:0x2c1e16})); t.position.set(pos.x, 0.5, pos.z); scene.add(t); state.obstacles.push(t);
            const pType = patronTypes[Math.floor(Math.random() * patronTypes.length)];
            const p = createCharacterModel(pType); p.position.set(pos.x, 0, pos.z); p.userData = { isServed: false, type: pType, tablePos: t.position.clone() }; scene.add(p); state.patrons.push(p);
            tablesSpawned++;
        } else { spacing -= 0.5; if(spacing < 2.0) spacing = 2.0; state.safeSpawnGrid = calculateSafeGrid(); }
        loop++;
    }

    for(let i=0; i<2+lvl; i++) {
        let pos = getSafeSpot(3.0);
        if(pos) { const p = createPlantModel(); p.position.set(pos.x, 0, pos.z); scene.add(p); const obs = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshBasicMaterial({visible:false})); obs.position.set(pos.x, 0, pos.z); state.obstacles.push(obs); }
    }

    state.enemySpawnTimer = 3.0; 
    document.getElementById('level-indicator').innerText = `LEVEL ${lvl}`; 
    showMessage(`TAPROOM OPEN!`);
}

function checkCollision(pos) {
    for(let obs of state.obstacles) {
        if (!obs) continue; let colRad = obs.geometry.type === 'BoxGeometry' ? 2.5 : 1.5;
        if(new THREE.Vector2(pos.x, pos.z).distanceTo(new THREE.Vector2(obs.position.x, obs.position.z)) < 0.4 + colRad) return true;
    } return Math.abs(pos.x)>15 || Math.abs(pos.z)>15 || pos.z>14;
}

function spawnEnemy() {
    const types = ['karen', 'viking', 'douche', 'annoying_girl']; 
    const t = types[Math.floor(Math.random()*types.length)]; 
    
    // Edge Spawns to guarantee villains don't get blocked by the internal grid
    const edgeSpawns = [ new THREE.Vector3(-14, 0, 14), new THREE.Vector3(14, 0, 14), new THREE.Vector3(14, 0, -14), new THREE.Vector3(-14, 0, -14) ];
    const pos = edgeSpawns[Math.floor(Math.random() * edgeSpawns.length)];
    
    const e = createCharacterModel(t); e.position.copy(pos); e.userData = { hp: 3, speed: 4.0 + state.level*0.5 }; 
    
    // Give villains an angry red aura
    const angryLight = new THREE.PointLight(0xff0000, 2, 5); angryLight.position.y = 2; e.add(angryLight);
    
    scene.add(e); state.enemies.push(e);
}

function swapModel(targetObj, newType) {
    while(targetObj.children.length > 0) { targetObj.remove(targetObj.children[0]); }
    const newParts = createCharacterModel(newType);
    while(newParts.children.length > 0) { targetObj.add(newParts.children[0]); }
}

function animate() {
    if(!state.isPlaying) { composer.render(); return; }
    const dt = clock.getDelta(); const time = clock.getElapsedTime();

    state.timeLeft -= dt; document.getElementById('timer-display').innerText = `TIME: ${Math.max(0, Math.ceil(state.timeLeft))}`;
    if(state.timeLeft <= 0) { state.isPlaying = false; AudioSys.playSFX('lose'); document.getElementById('game-over-title').innerText = "TIME'S UP!"; document.getElementById('game-over-screen').classList.remove('hidden'); }

    let moveSpeed = 7.0; for(let s of state.spills) if(playerGroup.position.distanceTo(s.position) < 2.5) moveSpeed = 2.0;

    if(joystick.active) {
        let newPos = playerGroup.position.clone(); newPos.x += joystick.x * moveSpeed * dt; newPos.z += joystick.y * moveSpeed * dt;
        if(!checkCollision(newPos)) playerGroup.position.copy(newPos);
        else { let slideX = playerGroup.position.clone(); slideX.x = newPos.x; if(!checkCollision(slideX)) playerGroup.position.x = newPos.x; else { let slideZ = playerGroup.position.clone(); slideZ.z = newPos.z; if(!checkCollision(slideZ)) playerGroup.position.z = newPos.z; } }
    }
    camera.position.x = playerGroup.position.x * 0.3; camera.position.z = playerGroup.position.z + 10;

    if(state.animState.slap > 0) { state.animState.slap -= dt*5; playerSpoonModel.rotation.x = Math.sin(state.animState.slap*10)*1.5; } else playerSpoonModel.rotation.x = 0;
    if(state.animState.pour > 0) { state.animState.pour -= dt*3; playerBeerModel.rotation.z = -0.5; } else playerBeerModel.rotation.z = 0;

    state.enemySpawnTimer -= dt; if(state.enemySpawnTimer <= 0 && state.enemies.length < 2) { spawnEnemy(); state.enemySpawnTimer = 3.0; }

    for(let i=state.enemies.length-1; i>=0; i--) {
        const e = state.enemies[i]; if(!e) continue;
        let dir = new THREE.Vector3().subVectors(playerGroup.position, e.position).normalize();
        state.obstacles.forEach(obs => { let diff = new THREE.Vector3().subVectors(e.position, obs.position); let dist = diff.length(); if(dist < 2.5) { diff.normalize().multiplyScalar(1.5/dist); dir.add(diff); } });
        let nextPos = e.position.clone().addScaledVector(dir, e.userData.speed*dt); if(!checkCollision(nextPos)) e.position.copy(nextPos);
        e.position.y = Math.sin(time*10+i)*0.2;
        if(playerGroup.position.distanceTo(e.position) < 3.0) { state.annoyance += 80 * dt; updateUI(); }
    }

    for (let i = state.particles.length - 1; i >= 0; i--) {
        let pSystem = state.particles[i]; pSystem.life -= dt * 1.5;
        if (pSystem.life <= 0) { scene.remove(pSystem.mesh); pSystem.mesh.geometry.dispose(); pSystem.mesh.material.dispose(); state.particles.splice(i, 1); continue; }
        let positions = pSystem.mesh.geometry.attributes.position.array;
        for (let j = 0; j < pSystem.velocities.length; j++) {
            positions[j * 3] += pSystem.velocities[j].x * dt; positions[j * 3 + 1] += pSystem.velocities[j].y * dt; positions[j * 3 + 2] += pSystem.velocities[j].z * dt; pSystem.velocities[j].y -= 15.0 * dt; 
        }
        pSystem.mesh.geometry.attributes.position.needsUpdate = true; pSystem.mesh.material.opacity = pSystem.life;
    }

    if(state.annoyance >= 100) { state.isPlaying = false; AudioSys.playSFX('lose'); document.getElementById('game-over-screen').classList.remove('hidden'); }

    composer.render();
}

function setupControls() {
    const joy = document.getElementById('joystick-zone'); const knob = document.getElementById('joystick-knob');
    const move = (x, y) => { const rect = joy.getBoundingClientRect(); const cx = rect.left + rect.width/2; const cy = rect.top + rect.height/2; let dx = x - cx; let dy = y - cy; const dist = Math.sqrt(dx*dx + dy*dy); if(dist > 50) { dx = (dx/dist)*50; dy = (dy/dist)*50; } knob.style.transform = `translate(-50%, -50%) translate(${dx}px, ${dy}px)`; joystick.x = dx/50; joystick.y = dy/50; };
    const end = () => { joystick.active=false; joystick.x=0; joystick.y=0; knob.style.transform=`translate(-50%, -50%)`; };
    joy.addEventListener('mousedown', e => { joystick.active=true; move(e.clientX, e.clientY); }); window.addEventListener('mousemove', e => { if(joystick.active) move(e.clientX, e.clientY); }); window.addEventListener('mouseup', end);
    joy.addEventListener('touchstart', e => { e.preventDefault(); joystick.active=true; move(e.touches[0].clientX, e.touches[0].clientY); }); joy.addEventListener('touchmove', e => { e.preventDefault(); if(joystick.active) move(e.touches[0].clientX, e.touches[0].clientY); }); joy.addEventListener('touchend', end);
    document.getElementById('btn-slap').addEventListener('mousedown', ()=>performAction('slap')); document.getElementById('btn-pour').addEventListener('mousedown', ()=>performAction('pour'));
    document.getElementById('btn-slap').addEventListener('touchstart', (e)=>{ e.preventDefault(); performAction('slap'); }); document.getElementById('btn-pour').addEventListener('touchstart', (e)=>{ e.preventDefault(); performAction('pour'); });
    window.addEventListener('keydown', e => { if(['w','a','s','d'].includes(e.key)) { joystick.active=true; if(e.key==='w') joystick.y=-1; if(e.key==='s') joystick.y=1; if(e.key==='a') joystick.x=-1; if(e.key==='d') joystick.x=1; } if(e.key===' ') performAction('slap'); if(e.key==='e') performAction('pour'); });
    window.addEventListener('keyup', () => { joystick.active=false; joystick.x=0; joystick.y=0; });
}

function performAction(type) {
    if(!state.isPlaying) return;
    if(type==='slap') {
        state.animState.slap = 1.0; AudioSys.playSFX('slap'); createParticleBurst(playerGroup.position, 0xff5500); 
        
        for(let i=state.enemies.length-1; i>=0; i--) {
            if(playerGroup.position.distanceTo(state.enemies[i].position) < 6.0) {
                state.enemies[i].userData.hp--; createParticleBurst(state.enemies[i].position, 0xff0000); 
                if(state.enemies[i].userData.hp <= 0) { scene.remove(state.enemies[i]); state.enemies.splice(i, 1); state.annoyance = Math.max(0, state.annoyance - 10); createEffect(state.enemies[i].position, '💀'); updateUI(); }
            }
        }
    } else if(type==='pour') {
        state.animState.pour = 1.0; AudioSys.playSFX('pour'); createParticleBurst(playerGroup.position, 0xffb300); 
        
        state.patrons.forEach(p => {
            if(!p.userData.isServed && playerGroup.position.distanceTo(p.userData.tablePos) < 5.0) {
                p.userData.isServed = true; swapModel(p, 'served'); createParticleBurst(p.position, 0x00ff55); 
                state.patronsServed++; createEffect(p.position, '🍻'); updateUI();
                if(state.patronsServed >= state.patronsTotal) { state.isPlaying = false; AudioSys.playSFX('win'); setTimeout(() => document.getElementById('level-screen').classList.remove('hidden'), 1000); }
            }
        });
    }
}

function createEffect(pos, emoji) {
    const d = document.createElement('div'); d.innerText=emoji;
    d.style.position='absolute'; d.style.left='50%'; d.style.top='50%'; d.style.fontSize='40px'; d.style.color='white'; d.style.textShadow = '0 0 15px rgba(255,100,0,1)';
    document.getElementById('ui-layer').appendChild(d);
    let start = Date.now(); let t = setInterval(() => { let p = (Date.now()-start)/500; if(p>=1) { clearInterval(t); d.remove(); } d.style.top = (50-p*10)+'%'; d.style.opacity = 1-p; }, 16);
}

function updateUI() { document.getElementById('patron-counter').innerText = `SERVED: ${state.patronsServed}/${state.patronsTotal}`; document.getElementById('meter-fill').style.width = Math.min(100, state.annoyance) + '%'; document.getElementById('meter-label').innerText = `ANNOYANCE: ${Math.floor(state.annoyance)}%`; }
function showMessage(txt) { const el = document.getElementById('msg-area'); el.innerText = txt; el.style.opacity = 1; setTimeout(()=>el.innerText='', 1500); }
function clearFlight() { state.flight=[null,null,null,null]; setupFlightUI(); document.getElementById('flight-msg').innerText=''; }
function setupFlightUI() {
    const grid = document.getElementById('beer-slots'); grid.innerHTML = ''; state.flight.forEach(b => { const d = document.createElement('div'); d.className = b ? 'slot filled' : 'slot'; d.innerText = b || 'Empty'; grid.appendChild(d); });
    const opts = document.getElementById('beer-choices'); opts.innerHTML=''; BEERS.forEach(b => { const btn = document.createElement('button'); btn.className = 'choice-btn'; btn.innerText = b; btn.onclick = () => { const idx = state.flight.indexOf(null); if (idx!==-1) { state.flight[idx]=b; setupFlightUI(); } }; opts.appendChild(btn); });
}
function submitFlight() {
    if(state.flight.includes(null)) { document.getElementById('flight-msg').innerText="Fill all slots!"; return; }
    let hasIPA=false, hasSour=false, hasStout=false, hasForbidden=false;
    state.flight.forEach(b => { const t = BEER_MAP[b]; if(t==='IPA') hasIPA=true; if(t==='Sour') hasSour=true; if(t==='Stout') hasStout=true; if(t==='Pilsner'||t==='Cider'||t==='Lager') hasForbidden=true; });
    if(hasIPA && hasSour && hasStout && !hasForbidden) { AudioSys.playSFX('win'); document.getElementById('flight-screen').classList.add('hidden'); document.getElementById('win-screen').classList.remove('hidden'); } 
    else { AudioSys.playSFX('lose'); document.getElementById('flight-msg').style.color = "#c0392b"; document.getElementById('flight-msg').innerText = "Trash! Loser!"; setTimeout(() => { document.getElementById('flight-msg').innerText=""; clearFlight(); }, 1500); }
}

init();
