const LEVELS = 3;
const ROOM_SIZE = 34; 
const PLAYER_SPEED = 18;
const ENEMY_SPEED = 0.0003; 
const HIT_FORCE = 0.08; 
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

let state = {
    level: 1, isPlaying: false, annoyance: 0,
    patronsTotal: 5, patronsServed: 0, timeLeft: 45,
    enemies: [], patrons: [], obstacles: [], particles: [],
    flight: [null, null, null, null]
};

// Three & Matter Globals
let scene, camera, renderer, clock;
let engine, world;
let playerBody, playerMesh;
let joystick = { x: 0, y: 0, active: false };
const textures = {};
const materials = {};

// Simple web audio syntesizer
const AudioSys = {
    ctx: null,
    init: function() { try { const AC = window.AudioContext || window.webkitAudioContext; if(AC) this.ctx = new AC(); } catch(e) { console.warn("Audio disabled"); } },
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
        
        // --- Matter.js Setup ---
        engine = Matter.Engine.create();
        world = engine.world;
        engine.gravity.y = 0; 

        // --- Three.js Setup ---
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x2a1a14); // Brighter background

        camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 100);
        camera.position.set(0, 26, 32);
        camera.lookAt(0, 0, 0); 

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);

        // Max out ambient light so nothing is ever pitch black
        const ambient = new THREE.AmbientLight(0xffffff, 1.0);
        scene.add(ambient);
        
        const dirLight = new THREE.DirectionalLight(0xffddaa, 1.0);
        dirLight.position.set(15, 40, 20);
        dirLight.castShadow = true;
        
        dirLight.shadow.camera.left = -40;
        dirLight.shadow.camera.right = 40;
        dirLight.shadow.camera.top = 40;
        dirLight.shadow.camera.bottom = -40;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        scene.add(dirLight);

        clock = new THREE.Clock();
        generateDetailedTextures();
        setupControls();
        setupButtons();
        buildEnvironment();

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

// Bulletproof SVG loading via Data URIs
function createSVGTexture(svgString) {
    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);
    const tex = new THREE.TextureLoader().load(url);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
}

function generateDetailedTextures() {
    // 1. Player
    const svgPlayer = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
        <defs><radialGradient id="gradPlayer" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#fff"/><stop offset="100%" stop-color="#ddd"/></radialGradient></defs>
        <circle cx="128" cy="128" r="110" fill="url(#gradPlayer)" stroke="#333" stroke-width="8"/>
        <path d="M 40 180 Q 128 260 216 180 L 230 256 L 26 256 Z" fill="#c62828"/>
        <path d="M 60 180 L 60 256 M 100 200 L 100 256 M 156 200 L 156 256 M 196 180 L 196 256" stroke="#000" stroke-width="6" opacity="0.4"/>
        <rect x="88" y="190" width="80" height="70" fill="#4e342e" rx="10"/>
        <circle cx="128" cy="110" r="50" fill="#ffccbc"/>
        <path d="M 78 110 Q 128 200 178 110 Q 170 170 128 170 Q 86 170 78 110" fill="#5d4037"/>
        <rect x="100" y="90" width="15" height="15" fill="#333" rx="5"/>
        <rect x="140" y="90" width="15" height="15" fill="#333" rx="5"/>
        <path d="M 115 130 Q 128 145 141 130" stroke="#fff" stroke-width="4" fill="none"/>
    </svg>`;
    
    // 2. Villain
    const svgVillain = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
        <defs><radialGradient id="gradV" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#333"/><stop offset="100%" stop-color="#111"/></radialGradient></defs>
        <circle cx="128" cy="128" r="110" fill="url(#gradV)" stroke="#ff0055" stroke-width="8"/>
        <path d="M 108 40 L 128 10 L 148 40 Z M 98 60 L 128 20 L 158 60 Z" fill="#00ffcc"/>
        <circle cx="128" cy="130" r="55" fill="#e0e0e0"/>
        <path d="M 90 110 L 115 125 M 166 110 L 141 125" stroke="#ff0055" stroke-width="8" stroke-linecap="round"/>
        <circle cx="105" cy="135" r="8" fill="#ff0055"/>
        <circle cx="151" cy="135" r="8" fill="#ff0055"/>
        <path d="M 110 160 Q 128 145 146 160" stroke="#333" stroke-width="6" fill="none" stroke-linecap="round"/>
    </svg>`;

    // 3. Table
    const svgTable = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
        <circle cx="128" cy="128" r="120" fill="#5d4037" stroke="#3e2723" stroke-width="12"/>
        <circle cx="128" cy="128" r="100" fill="none" stroke="#4e342e" stroke-width="4"/>
        <circle cx="80" cy="80" r="15" fill="#e0e0e0"/>
        <circle cx="176" cy="100" r="15" fill="#e0e0e0"/>
        <circle cx="128" cy="176" r="15" fill="#e0e0e0"/>
        <circle cx="40" cy="128" r="25" fill="#222" stroke="#111" stroke-width="4"/>
        <circle cx="216" cy="128" r="25" fill="#222" stroke="#111" stroke-width="4"/>
    </svg>`;

    // 4. Table Served
    const svgTableServed = svgTable.replace('</svg>', `
        <rect x="70" y="60" width="20" height="30" fill="#fbc02d" rx="2" stroke="#fff" stroke-width="3"/>
        <rect x="166" y="80" width="20" height="30" fill="#fbc02d" rx="2" stroke="#fff" stroke-width="3"/>
        <rect x="118" y="156" width="20" height="30" fill="#fbc02d" rx="2" stroke="#fff" stroke-width="3"/>
        <circle cx="80" cy="60" r="12" fill="#fff"/><circle cx="176" cy="80" r="12" fill="#fff"/><circle cx="128" cy="156" r="12" fill="#fff"/>
    </svg>`);

    // 5. Spill
    const svgSpill = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
        <path d="M 128 30 C 180 30 220 80 200 140 C 180 200 150 230 100 210 C 50 190 30 140 60 90 C 80 50 90 30 128 30 Z" fill="rgba(251, 192, 45, 0.8)"/>
        <circle cx="180" cy="80" r="15" fill="rgba(251, 192, 45, 0.8)"/>
        <circle cx="70" cy="180" r="20" fill="rgba(251, 192, 45, 0.8)"/>
    </svg>`;

    textures.player = createSVGTexture(svgPlayer);
    textures.villain = createSVGTexture(svgVillain);
    textures.table = createSVGTexture(svgTable);
    textures.tableServed = createSVGTexture(svgTableServed);
    textures.spill = createSVGTexture(svgSpill);

    // Brightened Floor Canvas
    const fc = document.createElement('canvas'); fc.width=512; fc.height=512;
    const fctx = fc.getContext('2d');
    fctx.fillStyle = '#6d4c41'; // Light wood
    fctx.fillRect(0,0,512,512);
    fctx.strokeStyle = '#4e342e'; fctx.lineWidth = 4;
    for(let i=0; i<512; i+=64) { fctx.strokeRect(i, 0, 64, 512); fctx.strokeRect(0, i, 512, 64); }
    textures.floor = new THREE.CanvasTexture(fc);
    textures.floor.wrapS = textures.floor.wrapT = THREE.RepeatWrapping;
    textures.floor.repeat.set(ROOM_SIZE/4, ROOM_SIZE/4);

    // CRITICAL FIX: DoubleSide ensures billboards are never invisible from behind
    materials.player = new THREE.MeshLambertMaterial({ map: textures.player, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide });
    materials.villain = new THREE.MeshLambertMaterial({ map: textures.villain, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide });
    materials.table = new THREE.MeshLambertMaterial({ map: textures.table, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide });
    materials.tableServed = new THREE.MeshLambertMaterial({ map: textures.tableServed, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide });
}

function createBillboard(material, size) {
    const geo = new THREE.PlaneGeometry(size, size);
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = true;
    return mesh;
}

function createParticleSystem(x, z, color, count=10) {
    const geo = new THREE.PlaneGeometry(0.5, 0.5);
    const mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, side: THREE.DoubleSide });
    for(let i=0; i<count; i++) {
        const p = new THREE.Mesh(geo, mat);
        p.position.set(x + (Math.random()-0.5), 1.5, z + (Math.random()-0.5));
        p.velocity = new THREE.Vector3((Math.random()-0.5)*15, (Math.random()*10)+5, (Math.random()-0.5)*15);
        p.life = 1.0;
        scene.add(p);
        state.particles.push(p);
    }
}

function buildEnvironment() {
    const floorGeo = new THREE.PlaneGeometry(ROOM_SIZE*2, ROOM_SIZE*2);
    const floorMat = new THREE.MeshLambertMaterial({ map: textures.floor });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const barW = 24, barH = 4, barD = 6, barZ = -12;
    const barGeo = new THREE.BoxGeometry(barW, barH, barD);
    const barMat = new THREE.MeshLambertMaterial({ color: 0x5d4037 });
    const bar = new THREE.Mesh(barGeo, barMat);
    bar.position.set(0, barH/2, barZ);
    bar.castShadow = true; bar.receiveShadow = true;
    scene.add(bar);
    
    Matter.World.add(world, Matter.Bodies.rectangle(0, barZ, barW, barD, { isStatic: true }));

    const wOpts = { isStatic: true };
    Matter.World.add(world, [
        Matter.Bodies.rectangle(0, -ROOM_SIZE, ROOM_SIZE*2, 2, wOpts),
        Matter.Bodies.rectangle(0, ROOM_SIZE, ROOM_SIZE*2, 2, wOpts),
        Matter.Bodies.rectangle(-ROOM_SIZE, 0, 2, ROOM_SIZE*2, wOpts),
        Matter.Bodies.rectangle(ROOM_SIZE, 0, 2, ROOM_SIZE*2, wOpts)
    ]);

    playerMesh = createBillboard(materials.player, 4);
    playerMesh.position.set(PLAYER_START.x, 2, PLAYER_START.z);
    scene.add(playerMesh);

    playerBody = Matter.Bodies.circle(PLAYER_START.x, PLAYER_START.z, 1.5, { 
        frictionAir: 0.2, restitution: 0.2, mass: 10 
    });
    Matter.World.add(world, playerBody);
}

function spawnLevelEntities() {
    state.patrons.forEach(p => scene.remove(p.mesh));
    state.enemies.forEach(e => scene.remove(e.mesh));
    state.obstacles.forEach(o => scene.remove(o.mesh));
    
    state.patrons.forEach(p => Matter.World.remove(world, p.body));
    state.enemies.forEach(e => Matter.World.remove(world, e.body));

    state.patrons = []; state.enemies = []; state.obstacles = [];

    for(let i=0; i<state.patronsTotal; i++) {
        const mesh = createBillboard(materials.table, 4.5);
        const x = (Math.random() - 0.5) * 24;
        const z = (Math.random() - 0.2) * 20; 
        
        mesh.position.set(x, 2.25, z);
        scene.add(mesh);
        
        const body = Matter.Bodies.circle(x, z, 2.0, { 
            mass: 50, frictionAir: 0.8, restitution: 0.1 
        });
        Matter.World.add(world, body);

        state.patrons.push({ mesh, body, served: false });
    }

    const enemyCount = state.level * 2;
    for(let i=0; i<enemyCount; i++) {
        const mesh = createBillboard(materials.villain, 3.5);
        const x = (Math.random() - 0.5) * 28;
        const z = (Math.random() - 0.5) * 24;
        mesh.position.set(x, 1.75, z);
        scene.add(mesh);
        
        const body = Matter.Bodies.circle(x, z, 1.5, {
            mass: 5, frictionAir: 0.1, restitution: 0.5
        });
        Matter.World.add(world, body);

        state.enemies.push({ mesh, body, hp: 3, speed: ENEMY_SPEED + (state.level*0.0001) });
    }

    const obsCount = state.level * 3;
    for(let i=0; i<obsCount; i++) {
        const mat = new THREE.MeshBasicMaterial({ map: textures.spill, transparent:true, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = 0.05;
        mesh.position.x = (Math.random() - 0.5) * 28;
        mesh.position.z = (Math.random() - 0.5) * 24;
        mesh.receiveShadow = true;
        scene.add(mesh);
        state.obstacles.push({ mesh });
    }
}

function setupButtons() {
    const bind = (id, fn) => {
        const el = document.getElementById(id);
        if(el) { el.addEventListener('click', fn); el.addEventListener('touchstart', (e)=>{e.preventDefault(); fn();}, {passive:false}); }
    };
    bind('btn-start', startGame);
    bind('btn-next-level', nextLevel);
    bind('btn-restart', () => location.reload());
    bind('btn-play-again', () => location.reload());
    bind('btn-pour', performPour);
    bind('btn-slap', performSlap);
    bind('btn-clear-flight', clearFlight);
    bind('btn-submit-flight', submitFlight);
}

function setupControls() {
    const zone = document.getElementById('joystick-zone');
    const knob = document.getElementById('joystick-knob');
    
    const handleTouch = (e) => {
        e.preventDefault();
        const touch = e.touches ? e.touches[0] : e;
        if (!touch) return;
        
        const rect = zone.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        let dx = touch.clientX - centerX;
        let dy = touch.clientY - centerY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const maxDist = rect.width / 2;
        
        if (dist > maxDist) { dx = (dx / dist) * maxDist; dy = (dy / dist) * maxDist; }
        
        knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        joystick.x = dx / maxDist;
        joystick.y = dy / maxDist;
        joystick.active = true;
    };

    const resetJoystick = () => {
        knob.style.transform = `translate(-50%, -50%)`;
        joystick.x = 0; joystick.y = 0; joystick.active = false;
    };

    zone.addEventListener('touchstart', handleTouch, {passive: false});
    zone.addEventListener('touchmove', handleTouch, {passive: false});
    zone.addEventListener('touchend', resetJoystick);
    
    let isDragging = false;
    zone.addEventListener('mousedown', (e)=>{ isDragging=true; handleTouch(e); });
    window.addEventListener('mousemove', (e)=>{ if(isDragging) handleTouch(e); });
    window.addEventListener('mouseup', ()=>{ isDragging=false; resetJoystick(); });
}

function startGame() {
    AudioSys.init();
    if(AudioSys.ctx && AudioSys.ctx.state === 'suspended') AudioSys.ctx.resume();
    document.getElementById('start-screen').classList.add('hidden');
    loadLevel(1);
}

function loadLevel(level) {
    state.level = level;
    state.patronsTotal = 3 + (level * 2);
    state.patronsServed = 0;
    state.timeLeft = 40 + (level * 10);
    state.annoyance = 0;
    state.isPlaying = true;
    
    Matter.Body.setPosition(playerBody, { x: PLAYER_START.x, y: PLAYER_START.z });
    Matter.Body.setVelocity(playerBody, { x: 0, y: 0 });
    
    spawnLevelEntities();
    updateUI();
}

function nextLevel() {
    document.getElementById('level-screen').classList.add('hidden');
    if (state.level >= LEVELS) {
        setupFlightUI();
        document.getElementById('flight-screen').classList.remove('hidden');
        state.isPlaying = false;
    } else {
        loadLevel(state.level + 1);
    }
}

function showMessage(txt, color='#fff') {
    const el = document.createElement('div');
    el.className = 'floating-text';
    el.innerText = txt;
    el.style.color = color;
    
    const pos = playerMesh.position.clone();
    pos.y += 3;
    pos.project(camera);
    const x = (pos.x * .5 + .5) * window.innerWidth;
    const y = (pos.y * -.5 + .5) * window.innerHeight;
    
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 800);
}

function performSlap() {
    if(!state.isPlaying) return;
    AudioSys.sfxSlap();
    
    playerMesh.scale.x = 4.5;
    setTimeout(()=>playerMesh.scale.x = 4.0, 150);

    for(let i=state.enemies.length-1; i>=0; i--) {
        const e = state.enemies[i];
        const dist = Matter.Vector.magnitude(Matter.Vector.sub(e.body.position, playerBody.position));
        
        if(dist < 6.0) { 
            e.hp--;
            const forceDir = Matter.Vector.normalise(Matter.Vector.sub(e.body.position, playerBody.position));
            Matter.Body.applyForce(e.body, e.body.position, Matter.Vector.mult(forceDir, HIT_FORCE));
            
            createParticleSystem(e.body.position.x, e.body.position.y, 0xff0055, 15);
            showMessage("BAM!", "#ff0055");
            
            if(e.hp <= 0) {
                scene.remove(e.mesh);
                Matter.World.remove(world, e.body);
                state.enemies.splice(i, 1);
                state.annoyance = Math.max(0, state.annoyance - 20); 
            }
            break; 
        }
    }
    updateUI();
}

function performPour() {
    if(!state.isPlaying) return;
    for(let p of state.patrons) {
        const dist = Matter.Vector.magnitude(Matter.Vector.sub(p.body.position, playerBody.position));
        if(!p.served && dist < 6.0) {
            p.served = true;
            p.mesh.material = materials.tableServed; 
            state.patronsServed++;
            AudioSys.sfxPour();
            createParticleSystem(p.body.position.x, p.body.position.y, 0xfbc02d, 10);
            showMessage("+SERVED", "#4caf50");
            updateUI();
            checkLevelClear();
            return;
        }
    }
}

function checkLevelClear() {
    if(state.patronsServed >= state.patronsTotal) {
        state.isPlaying = false;
        AudioSys.sfxWin();
        document.getElementById('level-screen').classList.remove('hidden');
    }
}

function updateUI() {
    document.getElementById('patron-counter').innerText = `SERVED: ${state.patronsServed}/${state.patronsTotal}`;
    document.getElementById('level-indicator').innerText = `LEVEL ${state.level}`;
    
    const fill = document.getElementById('meter-fill');
    fill.style.width = `${Math.min(100, state.annoyance)}%`;
    document.getElementById('meter-label').innerText = `ANNOYANCE: ${Math.floor(state.annoyance)}%`;
    
    document.getElementById('timer-display').innerText = `00:${Math.max(0, Math.ceil(state.timeLeft)).toString().padStart(2, '0')}`;
    if(state.timeLeft <= 10) document.getElementById('timer-display').classList.add('timer-low');
    else document.getElementById('timer-display').classList.remove('timer-low');
}

function animate(time) {
    const dt = clock.getDelta();
    
    if (state.isPlaying) {
        state.timeLeft -= dt;
        if(state.timeLeft <= 0) state.annoyance = 100;

        Matter.Engine.update(engine, dt * 1000);

        if (joystick.active) {
            Matter.Body.setVelocity(playerBody, {
                x: joystick.x * PLAYER_SPEED,
                y: joystick.y * PLAYER_SPEED
            });
            playerMesh.position.y = 2.0 + Math.abs(Math.sin(time*0.015))*0.4;
        } else {
            Matter.Body.setVelocity(playerBody, { x: 0, y: 0 }); 
            playerMesh.position.y = 2.0;
        }

        playerMesh.position.x = playerBody.position.x;
        playerMesh.position.z = playerBody.position.y;

        camera.position.x += (playerMesh.position.x - camera.position.x) * 0.1;
        camera.position.z += ((playerMesh.position.z + 14) - camera.position.z) * 0.1;
        
        camera.lookAt(playerMesh.position);

        // CRITICAL FIX: Make sure the sprite faces the camera so it is never backface-culled
        playerMesh.lookAt(camera.position);

        state.patrons.forEach(p => {
            p.mesh.position.x = p.body.position.x;
            p.mesh.position.z = p.body.position.y;
            p.mesh.lookAt(camera.position);
            
            if(Matter.Vector.magnitude(p.body.velocity) > 2) {
                state.annoyance += 5 * dt;
                if(Math.random() < 0.1) AudioSys.sfxCrash();
            }
        });

        state.enemies.forEach(e => {
            const dir = Matter.Vector.normalise(Matter.Vector.sub(playerBody.position, e.body.position));
            Matter.Body.applyForce(e.body, e.body.position, Matter.Vector.mult(dir, e.speed));
            
            e.mesh.position.x = e.body.position.x;
            e.mesh.position.z = e.body.position.y;
            e.mesh.position.y = 1.75 + Math.abs(Math.sin(time*0.01 + e.hp))*0.3;
            e.mesh.lookAt(camera.position);

            if(Matter.Vector.magnitude(Matter.Vector.sub(playerBody.position, e.body.position)) < 3.0) {
                state.annoyance += 25 * dt; 
                Matter.Body.setVelocity(e.body, Matter.Vector.mult(dir, -5));
                AudioSys.sfxCrash();
            }
        });

        state.obstacles.forEach(o => {
            if(playerMesh.position.distanceTo(o.mesh.position) < 3.5) {
                state.annoyance += 8 * dt;
            }
        });

        for(let i=state.particles.length-1; i>=0; i--) {
            let p = state.particles[i];
            p.life -= dt * 2;
            if(p.life <= 0) {
                scene.remove(p);
                state.particles.splice(i, 1);
            } else {
                p.position.addScaledVector(p.velocity, dt);
                p.velocity.y -= 30 * dt; 
                p.material.opacity = p.life;
                p.lookAt(camera.position);
            }
        }

        state.annoyance += 2.5 * dt;
        updateUI();

        if(state.annoyance >= 100) {
            state.annoyance = 100;
            state.isPlaying = false;
            AudioSys.sfxCrash();
            document.getElementById('game-over-screen').classList.remove('hidden');
        }
    }

    renderer.render(scene, camera);
}

// --- FLIGHT PUZZLE LOGIC ---
function setupFlightUI() {
    const choices = document.getElementById('beer-choices');
    const infoBox = document.getElementById('beer-info-box');
    choices.innerHTML = '';
    
    BEER_CATALOG.forEach(beer => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.innerText = beer.name;
        btn.onmouseover = () => infoBox.innerHTML = `<strong>${beer.name}</strong> - ${beer.desc}`;
        btn.onclick = () => { infoBox.innerHTML = `<strong>${beer.name}</strong> - ${beer.desc}`; addBeerToFlight(beer); };
        choices.appendChild(btn);
    });

    const slots = document.querySelectorAll('.slot');
    slots.forEach(slot => {
        slot.onclick = () => {
            const idx = slot.getAttribute('data-index');
            if (state.flight[idx]) { state.flight[idx] = null; renderFlight(); }
        };
    });
    renderFlight();
}

function addBeerToFlight(beerObj) {
    const emptyIdx = state.flight.findIndex(b => b === null);
    if(emptyIdx !== -1) { state.flight[emptyIdx] = beerObj; renderFlight(); }
}

function clearFlight() {
    state.flight = [null, null, null, null];
    document.getElementById('flight-msg').innerText = '';
    renderFlight();
}

function renderFlight() {
    const slots = document.querySelectorAll('.slot');
    slots.forEach((slot, idx) => {
        const b = state.flight[idx];
        if(b) {
            slot.innerHTML = `<span>${b.name}</span>`;
            slot.classList.add('filled');
        } else {
            slot.innerHTML = 'Empty';
            slot.classList.remove('filled');
        }
    });
}

function submitFlight() {
    if(state.flight.includes(null)) {
        document.getElementById('flight-msg').innerText = "Fill all 4 slots!";
        return;
    }

    const types = state.flight.map(b => b.type);
    const required = ['IPA', 'Stout', 'Sour', 'Milkshake'];
    
    let success = true;
    for(let req of required) {
        if(!types.includes(req)) { success = false; break; }
    }

    if(success) {
        document.getElementById('flight-screen').classList.add('hidden');
        document.getElementById('win-screen').classList.remove('hidden');
        AudioSys.sfxWin();
    } else {
        document.getElementById('flight-msg').innerText = "Incorrect Flight! Read the prompt carefully.";
        AudioSys.sfxCrash();
    }
}
