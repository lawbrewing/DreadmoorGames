const LEVELS = 3;
const ROOM_SIZE = 34; 
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
    flight: [null, null, null, null],
    physicsAccumulator: 0
};

// Three & Matter Globals
let scene, camera, renderer, clock;
let engine, world;
let playerBody, playerMesh;
let joystick = { x: 0, y: 0, active: false };
const textures = {};
const materials = {};
const geometries = {};

// Simple Web Audio Synthesizer
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
        engine.gravity.y = 0; // Top down 2D physics

        // --- Three.js Setup ---
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x2a1a14);

        camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 100);
        camera.position.set(0, 26, 32);
        camera.lookAt(0, 0, 0); 

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);

        const ambient = new THREE.AmbientLight(0xffffff, 1.0);
        scene.add(ambient);
        
        const dirLight = new THREE.DirectionalLight(0xffddaa, 1.2);
        dirLight.position.set(15, 40, 20);
        dirLight.castShadow = true;
        
        // Ensure the shadow map covers the whole room
        dirLight.shadow.camera.left = -40;
        dirLight.shadow.camera.right = 40;
        dirLight.shadow.camera.top = 40;
        dirLight.shadow.camera.bottom = -40;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        scene.add(dirLight);

        clock = new THREE.Clock();
        generateNativeCanvasTextures(); // Swapped to native Canvas for 100% stability
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

// 100% Synchronous, crash-proof texture generation
function createTexture(drawFn) {
    const c = document.createElement('canvas'); 
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');
    drawFn(ctx);
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    return tex;
}

function generateNativeCanvasTextures() {
    textures.player = createTexture((ctx) => {
        // Flannel Body
        ctx.fillStyle = '#b71c1c'; ctx.beginPath(); ctx.arc(128, 180, 70, 0, Math.PI*2); ctx.fill();
        // Apron
        ctx.fillStyle = '#3e2723'; ctx.fillRect(88, 150, 80, 106);
        // Head
        ctx.fillStyle = '#ffccbc'; ctx.beginPath(); ctx.arc(128, 100, 50, 0, Math.PI*2); ctx.fill();
        // Beard
        ctx.fillStyle = '#4e342e'; ctx.beginPath(); ctx.arc(128, 115, 45, 0, Math.PI); ctx.fill();
        // Eyes
        ctx.fillStyle = '#000'; ctx.fillRect(105, 90, 10, 10); ctx.fillRect(141, 90, 10, 10);
    });

    textures.villain = createTexture((ctx) => {
        // Jacket
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(128, 180, 70, 0, Math.PI*2); ctx.fill();
        // Mohawk
        ctx.fillStyle = '#00ffcc'; ctx.beginPath(); ctx.moveTo(108, 60); ctx.lineTo(128, 10); ctx.lineTo(148, 60); ctx.fill();
        // Head
        ctx.fillStyle = '#e0e0e0'; ctx.beginPath(); ctx.arc(128, 120, 50, 0, Math.PI*2); ctx.fill();
        // Neon Shades
        ctx.fillStyle = '#ff0055'; ctx.fillRect(90, 100, 76, 20);
    });

    textures.table = createTexture((ctx) => {
        // Stools
        ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(60, 128, 25, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(196, 128, 25, 0, Math.PI*2); ctx.fill();
        // Table Top
        ctx.fillStyle = '#5d4037'; ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 10;
        ctx.beginPath(); ctx.arc(128, 128, 90, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    });

    textures.tableServed = createTexture((ctx) => {
        // Base Table
        ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(60, 128, 25, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(196, 128, 25, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#5d4037'; ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 10;
        ctx.beginPath(); ctx.arc(128, 128, 90, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        // Pints
        ctx.fillStyle = '#fbc02d'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
        ctx.fillRect(90, 80, 20, 30); ctx.strokeRect(90, 80, 20, 30);
        ctx.fillRect(146, 120, 20, 30); ctx.strokeRect(146, 120, 20, 30);
    });

    textures.spill = createTexture((ctx) => {
        ctx.fillStyle = 'rgba(251, 192, 45, 0.9)';
        ctx.beginPath(); ctx.arc(128, 128, 80, 0, Math.PI*2); ctx.arc(80, 80, 40, 0, Math.PI*2); ctx.arc(180, 150, 50, 0, Math.PI*2); ctx.fill();
    });

    // Floor
    const fc = document.createElement('canvas'); fc.width=512; fc.height=512; const fctx = fc.getContext('2d');
    fctx.fillStyle = '#6d4c41'; fctx.fillRect(0,0,512,512);
    fctx.strokeStyle = '#4e342e'; fctx.lineWidth = 4;
    for(let i=0; i<512; i+=64) { fctx.strokeRect(i, 0, 64, 512); fctx.strokeRect(0, i, 512, 64); }
    textures.floor = new THREE.CanvasTexture(fc);
    textures.floor.wrapS = textures.floor.wrapT = THREE.RepeatWrapping; textures.floor.repeat.set(ROOM_SIZE/4, ROOM_SIZE/4);

    // Standard Materials
    materials.player = new THREE.MeshLambertMaterial({ map: textures.player, transparent: true, alphaTest: 0.1 });
    materials.villain = new THREE.MeshLambertMaterial({ map: textures.villain, transparent: true, alphaTest: 0.1 });
    materials.table = new THREE.MeshLambertMaterial({ map: textures.table, transparent: true, alphaTest: 0.1 });
    materials.tableServed = new THREE.MeshLambertMaterial({ map: textures.tableServed, transparent: true, alphaTest: 0.1 });
    
    // Shared Particle Materials (Fixes Memory Leak)
    materials.particleHit = new THREE.MeshLambertMaterial({ color: 0xff0055 });
    materials.particlePour = new THREE.MeshLambertMaterial({ color: 0xfbc02d });
    geometries.particle = new THREE.BoxGeometry(0.5, 0.5, 0.5);
}

function createBillboard(material, size) {
    const geo = new THREE.PlaneGeometry(size, size);
    geo.rotateY(Math.PI); // Rotates the plane so it faces the camera perfectly without backface culling issues
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = true;
    return mesh;
}

function createParticleSystem(x, z, type, count=12) {
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

function buildEnvironment() {
    const floorGeo = new THREE.PlaneGeometry(ROOM_SIZE*2, ROOM_SIZE*2);
    const floorMat = new THREE.MeshLambertMaterial({ map: textures.floor });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const barW = 24, barH = 4, barD = 6, barZ = -12;
    const barGeo = new THREE.BoxGeometry(barW, barH, barD);
    const barMat = new THREE.MeshLambertMaterial({ color: 0x4e342e });
    const bar = new THREE.Mesh(barGeo, barMat);
    bar.position.set(0, barH/2, barZ);
    bar.castShadow = true; bar.receiveShadow = true;
    scene.add(bar);
    
    Matter.World.add(world, Matter.Bodies.rectangle(0, barZ, barW, barD, { isStatic: true }));

    // Boundary Walls
    const wOpts = { isStatic: true };
    Matter.World.add(world, [
        Matter.Bodies.rectangle(0, -ROOM_SIZE, ROOM_SIZE*2, 2, wOpts),
        Matter.Bodies.rectangle(0, ROOM_SIZE, ROOM_SIZE*2, 2, wOpts),
        Matter.Bodies.rectangle(-ROOM_SIZE, 0, 2, ROOM_SIZE*2, wOpts),
        Matter.Bodies.rectangle(ROOM_SIZE, 0, 2, ROOM_SIZE*2, wOpts)
    ]);

    playerMesh = createBillboard(materials.player, 4);
    scene.add(playerMesh);

    // High frictionAir creates smooth drag (no jittering)
    playerBody = Matter.Bodies.circle(PLAYER_START.x, PLAYER_START.z, 1.5, { 
        frictionAir: 0.8, restitution: 0.1, mass: 20 
    });
    Matter.World.add(world, playerBody);
}

function spawnLevelEntities() {
    state.patrons.forEach(p => { scene.remove(p.mesh); Matter.World.remove(world, p.body); });
    state.enemies.forEach(e => { scene.remove(e.mesh); Matter.World.remove(world, e.body); });
    state.obstacles.forEach(o => { scene.remove(o.mesh); });

    state.patrons = []; state.enemies = []; state.obstacles = [];

    // CRITICAL FIX: Structured Grid Spawning guarantees tables NEVER spawn inside each other
    const tableGrid = [
        {x: -12, z: -2}, {x: 0, z: -2}, {x: 12, z: -2},
        {x: -12, z: 8},  {x: 0, z: 8},  {x: 12, z: 8},
        {x: -12, z: 18}, {x: 0, z: 18}, {x: 12, z: 18},
        {x: -18, z: 4},  {x: 18, z: 4}, {x: -18, z: 14}, {x: 18, z: 14}
    ];

    for(let i=0; i<state.patronsTotal; i++) {
        const pos = tableGrid[i % tableGrid.length];
        const mesh = createBillboard(materials.table, 4.5);
        
        // Add a tiny visual offset so the grid doesn't look perfectly rigid
        const x = pos.x + (Math.random()-0.5);
        const z = pos.z + (Math.random()-0.5);
        
        mesh.position.set(x, 2.25, z);
        scene.add(mesh);
        
        const body = Matter.Bodies.circle(x, z, 2.0, { 
            mass: 80, frictionAir: 0.9, restitution: 0.1 // Heavy, slides slowly
        });
        Matter.World.add(world, body);
        state.patrons.push({ mesh, body, served: false });
    }

    const enemyCount = state.level * 2;
    const edgeSpawns = [{x: -26, z: 10}, {x: 26, z: 10}, {x: 0, z: 26}];
    for(let i=0; i<enemyCount; i++) {
        const edge = edgeSpawns[i % edgeSpawns.length];
        const x = edge.x + (Math.random()-0.5)*4;
        const z = edge.z + (Math.random()-0.5)*4;
        
        const mesh = createBillboard(materials.villain, 3.5);
        mesh.position.set(x, 1.75, z);
        scene.add(mesh);
        
        const body = Matter.Bodies.circle(x, z, 1.5, {
            mass: 15, frictionAir: 0.8, restitution: 0.3
        });
        Matter.World.add(world, body);

        state.enemies.push({ mesh, body, hp: 3, speed: 0.08 + (state.level * 0.02) });
    }

    const obsCount = state.level * 3;
    for(let i=0; i<obsCount; i++) {
        const mat = new THREE.MeshBasicMaterial({ map: textures.spill, transparent:true });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = 0.05;
        mesh.position.x = (Math.random() - 0.5) * 26;
        mesh.position.z = (Math.random() - 0.5) * 20;
        mesh.receiveShadow = true;
        scene.add(mesh);
        state.obstacles.push({ mesh });
    }
}

function setupButtons() {
    const bind = (id, fn) => {
        const el = document.getElementById(id);
        if(el) { el.addEventListener('click', fn); el.addEventListener('touchstart', (e)=>{ if(e.cancelable) e.preventDefault(); fn();}, {passive:false}); }
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
        if(e.cancelable) e.preventDefault();
        
        // CRITICAL FIX: Bulletproof coordinate extraction prevents NaN Joystick inputs
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX; clientY = e.touches[0].clientY;
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX; clientY = e.changedTouches[0].clientY;
        } else if (e.clientX !== undefined) {
            clientX = e.clientX; clientY = e.clientY;
        }
        
        if (clientX === undefined) return;
        
        const rect = zone.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        let dx = clientX - centerX;
        let dy = clientY - centerY;
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
    state.patronsTotal = 4 + (level * 2);
    state.patronsServed = 0;
    state.timeLeft = 40 + (level * 10);
    state.annoyance = 0;
    state.isPlaying = true;
    state.physicsAccumulator = 0;
    
    Matter.Body.setPosition(playerBody, { x: PLAYER_START.x, y: PLAYER_START.z });
    Matter.Body.setVelocity(playerBody, { x: 0, y: 0 });
    
    clock.start(); 
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
    pos.y += 3; pos.project(camera);
    const x = (pos.x * .5 + .5) * window.innerWidth;
    const y = (pos.y * -.5 + .5) * window.innerHeight;
    
    el.style.left = `${x}px`; el.style.top = `${y}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 800);
}

function performSlap() {
    if(!state.isPlaying) return;
    AudioSys.sfxSlap();
    
    playerMesh.scale.x = 4.8;
    setTimeout(()=>playerMesh.scale.x = 4.0, 150);

    for(let i=state.enemies.length-1; i>=0; i--) {
        const e = state.enemies[i];
        let sub = Matter.Vector.sub(e.body.position, playerBody.position);
        
        // Prevent NaN logic crashes if bodies are exactly perfectly aligned
        if (Matter.Vector.magnitude(sub) < 0.001) { sub = { x: 0.1, y: 0.1 }; } 

        const dist = Matter.Vector.magnitude(sub);
        if(dist < 7.0) { 
            e.hp--;
            const forceDir = Matter.Vector.normalise(sub);
            
            // Send enemy flying smoothly
            Matter.Body.applyForce(e.body, e.body.position, Matter.Vector.mult(forceDir, 2.5));
            
            createParticleSystem(e.body.position.x, e.body.position.y, 'hit', 12);
            showMessage("BAM!", "#ff0055");
            
            if(e.hp <= 0) {
                scene.remove(e.mesh);
                Matter.World.remove(world, e.body);
                state.enemies.splice(i, 1);
                state.annoyance = Math.max(0, state.annoyance - 15); 
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
        if(!p.served && dist < 7.0) {
            p.served = true;
            p.mesh.material = materials.tableServed; 
            state.patronsServed++;
            AudioSys.sfxPour();
            createParticleSystem(p.body.position.x, p.body.position.y, 'pour', 10);
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
    // CRITICAL FIX: Cap max delta to prevent Physics Explosions if the tab is backgrounded
    const dt = Math.min(clock.getDelta(), 0.05); 
    
    if (state.isPlaying) {
        state.timeLeft -= dt;
        if(state.timeLeft <= 0) state.annoyance = 100;
        
        state.annoyance += 2.5 * dt;

        // CRITICAL FIX: Fixed Time Step Physics ensures 100% engine stability
        state.physicsAccumulator += dt;
        const fixedStep = 1 / 60;

        while (state.physicsAccumulator >= fixedStep) {
            // Apply Joystick Forces
            if (joystick.active) {
                Matter.Body.applyForce(playerBody, playerBody.position, {
                    x: joystick.x * 0.08,
                    y: joystick.y * 0.08
                });
            }

            // Apply Enemy AI Forces
            state.enemies.forEach(e => {
                let sub = Matter.Vector.sub(playerBody.position, e.body.position);
                if (Matter.Vector.magnitude(sub) < 0.001) { sub = { x: 0.1, y: 0.1 }; } 
                
                const dir = Matter.Vector.normalise(sub);
                Matter.Body.applyForce(e.body, e.body.position, Matter.Vector.mult(dir, e.speed));
                
                if(Matter.Vector.magnitude(sub) < 3.0) {
                    state.annoyance += 30 * fixedStep; 
                    Matter.Body.applyForce(e.body, e.body.position, Matter.Vector.mult(dir, -0.4));
                    if(Math.random() < 0.1) AudioSys.sfxCrash();
                }
            });

            // Annoyance from moving tables (crashing)
            state.patrons.forEach(p => {
                if(Matter.Vector.magnitude(p.body.velocity) > 0.8) {
                    state.annoyance += 10 * fixedStep;
                    if(Math.random() < 0.05) AudioSys.sfxCrash();
                }
            });

            Matter.Engine.update(engine, fixedStep * 1000);
            state.physicsAccumulator -= fixedStep;
        }

        // --- Render Sync ---
        playerMesh.position.x = playerBody.position.x;
        playerMesh.position.z = playerBody.position.y;
        playerMesh.position.y = 2.0 + (joystick.active ? Math.abs(Math.sin(time*0.015))*0.4 : 0);

        camera.position.x += (playerMesh.position.x - camera.position.x) * 0.1;
        camera.position.z += ((playerMesh.position.z + 16) - camera.position.z) * 0.1;
        
        camera.lookAt(playerMesh.position);
        
        const camQuat = camera.quaternion;
        playerMesh.quaternion.copy(camQuat);

        state.patrons.forEach(p => {
            p.mesh.position.x = p.body.position.x;
            p.mesh.position.z = p.body.position.y;
            p.mesh.quaternion.copy(camQuat);
        });

        state.enemies.forEach(e => {
            e.mesh.position.x = e.body.position.x;
            e.mesh.position.z = e.body.position.y;
            e.mesh.position.y = 1.75 + Math.abs(Math.sin(time*0.01 + e.hp))*0.3;
            e.mesh.quaternion.copy(camQuat);
        });

        state.obstacles.forEach(o => {
            if(playerMesh.position.distanceTo(o.mesh.position) < 3.5) {
                state.annoyance += 8 * dt;
            }
        });

        // 3D Particles
        for(let i=state.particles.length-1; i>=0; i--) {
            let p = state.particles[i];
            p.life -= dt * 2;
            if(p.life <= 0) {
                scene.remove(p);
                state.particles.splice(i, 1);
            } else {
                p.position.addScaledVector(p.velocity, dt);
                p.velocity.y -= 30 * dt; 
                p.scale.setScalar(p.life);
                p.rotation.x += 10 * dt; p.rotation.y += 10 * dt;
            }
        }

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
