const LEVELS = 3;
const ROOM_SIZE = 34; 
const PLAYER_SPEED = 18;
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

// Custom Arcade Physics State
let state = {
    level: 1, isPlaying: false, annoyance: 0,
    patronsTotal: 5, patronsServed: 0, timeLeft: 45,
    player: { x: PLAYER_START.x, z: PLAYER_START.z, vx: 0, vz: 0, radius: 1.5 },
    enemies: [], patrons: [], obstacles: [], particles: [],
    flight: [null, null, null, null]
};

let scene, camera, renderer, clock, playerMesh;
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
        
        const dirLight = new THREE.DirectionalLight(0xffddaa, 1.0);
        dirLight.position.set(15, 40, 20);
        dirLight.castShadow = true;
        dirLight.shadow.camera.left = -40; dirLight.shadow.camera.right = 40;
        dirLight.shadow.camera.top = 40; dirLight.shadow.camera.bottom = -40;
        dirLight.shadow.mapSize.width = 1024; dirLight.shadow.mapSize.height = 1024;
        scene.add(dirLight);

        clock = new THREE.Clock();
        generateNativeCanvasTextures(); 
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

function createTexture(drawFn) {
    const c = document.createElement('canvas'); 
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');
    drawFn(ctx);
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
}

function generateNativeCanvasTextures() {
    textures.player = createTexture((ctx) => {
        ctx.fillStyle = '#b71c1c'; ctx.beginPath(); ctx.arc(128, 180, 70, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#3e2723'; ctx.fillRect(88, 150, 80, 106);
        ctx.fillStyle = '#ffccbc'; ctx.beginPath(); ctx.arc(128, 100, 50, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#4e342e'; ctx.beginPath(); ctx.arc(128, 115, 45, 0, Math.PI); ctx.fill();
        ctx.fillStyle = '#000'; ctx.fillRect(105, 90, 10, 10); ctx.fillRect(141, 90, 10, 10);
    });

    textures.villain = createTexture((ctx) => {
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(128, 180, 70, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#00ffcc'; ctx.beginPath(); ctx.moveTo(108, 60); ctx.lineTo(128, 10); ctx.lineTo(148, 60); ctx.fill();
        ctx.fillStyle = '#e0e0e0'; ctx.beginPath(); ctx.arc(128, 120, 50, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#ff0055'; ctx.fillRect(90, 100, 76, 20);
    });

    textures.table = createTexture((ctx) => {
        ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(60, 128, 25, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(196, 128, 25, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#5d4037'; ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 10;
        ctx.beginPath(); ctx.arc(128, 128, 90, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    });

    textures.tableServed = createTexture((ctx) => {
        ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(60, 128, 25, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(196, 128, 25, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#5d4037'; ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 10;
        ctx.beginPath(); ctx.arc(128, 128, 90, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fbc02d'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
        ctx.fillRect(90, 80, 20, 30); ctx.strokeRect(90, 80, 20, 30);
        ctx.fillRect(146, 120, 20, 30); ctx.strokeRect(146, 120, 20, 30);
    });

    textures.spill = createTexture((ctx) => {
        ctx.fillStyle = 'rgba(251, 192, 45, 0.9)';
        ctx.beginPath(); ctx.arc(128, 128, 80, 0, Math.PI*2); ctx.arc(80, 80, 40, 0, Math.PI*2); ctx.arc(180, 150, 50, 0, Math.PI*2); ctx.fill();
    });

    const fc = document.createElement('canvas'); fc.width=512; fc.height=512; const fctx = fc.getContext('2d');
    fctx.fillStyle = '#6d4c41'; fctx.fillRect(0,0,512,512);
    fctx.strokeStyle = '#4e342e'; fctx.lineWidth = 4;
    for(let i=0; i<512; i+=64) { fctx.strokeRect(i, 0, 64, 512); fctx.strokeRect(0, i, 512, 64); }
    textures.floor = new THREE.CanvasTexture(fc);
    textures.floor.wrapS = textures.floor.wrapT = THREE.RepeatWrapping; textures.floor.repeat.set(ROOM_SIZE/4, ROOM_SIZE/4);

    // MeshBasicMaterial ensures objects are perfectly visible and colored, NEVER black shadows
    materials.player = new THREE.MeshBasicMaterial({ map: textures.player, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide });
    materials.villain = new THREE.MeshBasicMaterial({ map: textures.villain, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide });
    materials.table = new THREE.MeshBasicMaterial({ map: textures.table, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide });
    materials.tableServed = new THREE.MeshBasicMaterial({ map: textures.tableServed, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide });
    
    materials.particleHit = new THREE.MeshBasicMaterial({ color: 0xff0055, side: THREE.DoubleSide });
    materials.particlePour = new THREE.MeshBasicMaterial({ color: 0xfbc02d, side: THREE.DoubleSide });
    geometries.particle = new THREE.BoxGeometry(0.5, 0.5, 0.5);
}

function createBillboard(material, size) {
    const geo = new THREE.PlaneGeometry(size, size);
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

    playerMesh = createBillboard(materials.player, 4);
    scene.add(playerMesh);
}

function spawnLevelEntities() {
    state.patrons.forEach(p => scene.remove(p.mesh));
    state.enemies.forEach(e => scene.remove(e.mesh));
    state.obstacles.forEach(o => scene.remove(o.mesh));

    state.patrons = []; state.enemies = []; state.obstacles = [];
    state.player.x = PLAYER_START.x; state.player.z = PLAYER_START.z;

    const tableGrid = [
        {x: -12, z: -2}, {x: 0, z: -2}, {x: 12, z: -2},
        {x: -12, z: 8},  {x: 0, z: 8},  {x: 12, z: 8},
        {x: -12, z: 18}, {x: 0, z: 18}, {x: 12, z: 18}
    ];

    for(let i=0; i<state.patronsTotal; i++) {
        const pos = tableGrid[i % tableGrid.length];
        const mesh = createBillboard(materials.table, 4.5);
        const x = pos.x + (Math.random()-0.5);
        const z = pos.z + (Math.random()-0.5);
        mesh.position.set(x, 2.25, z);
        scene.add(mesh);
        
        // Push to custom collision array
        state.patrons.push({ mesh, x: x, z: z, radius: 2.5, served: false });
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
        
        state.enemies.push({ 
            mesh, x: x, z: z, vx: 0, vz: 0, radius: 1.5, 
            hp: 3, speed: 6.0 + (state.level * 1.5) 
        });
    }

    const obsCount = state.level * 3;
    for(let i=0; i<obsCount; i++) {
        const mat = new THREE.MeshBasicMaterial({ map: textures.spill, transparent:true, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = 0.05;
        
        const x = (Math.random() - 0.5) * 26;
        const z = (Math.random() - 0.5) * 20;
        mesh.position.x = x; mesh.position.z = z;
        mesh.receiveShadow = true;
        scene.add(mesh);
        state.obstacles.push({ mesh, x: x, z: z, radius: 2.0 });
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
        
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) { clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; } 
        else if (e.changedTouches && e.changedTouches.length > 0) { clientX = e.changedTouches[0].clientX; clientY = e.changedTouches[0].clientY; } 
        else if (e.clientX !== undefined) { clientX = e.clientX; clientY = e.clientY; }
        
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
        let dx = e.x - state.player.x;
        let dz = e.z - state.player.z;
        let dist = Math.sqrt(dx*dx + dz*dz) || 1; 

        if(dist < 7.0) { 
            e.hp--;
            
            // Custom physics knockback! Safe and predictable.
            e.vx = (dx / dist) * 45; 
            e.vz = (dz / dist) * 45;
            
            createParticleSystem(e.x, e.y, 'hit', 12);
            showMessage("BAM!", "#ff0055");
            
            if(e.hp <= 0) {
                scene.remove(e.mesh);
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
        let dx = p.x - state.player.x;
        let dz = p.z - state.player.z;
        let dist = Math.sqrt(dx*dx + dz*dz) || 1;
        
        if(!p.served && dist < 7.0) {
            p.served = true;
            p.mesh.material = materials.tableServed; 
            state.patronsServed++;
            AudioSys.sfxPour();
            createParticleSystem(p.x, p.z, 'pour', 10);
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

// Custom Circle Collision Resolver
function resolveCircleCollision(dynamicObj, staticObj) {
    let dx = dynamicObj.x - staticObj.x;
    let dz = dynamicObj.z - staticObj.z;
    let dist = Math.sqrt(dx*dx + dz*dz);
    let minDist = dynamicObj.radius + staticObj.radius;
    
    if (dist > 0 && dist < minDist) {
        let overlap = minDist - dist;
        dynamicObj.x += (dx / dist) * overlap;
        dynamicObj.z += (dz / dist) * overlap;
    }
}

// Custom Box Collision Resolver (For the Bar and Walls)
function resolveBoxCollision(circle, box) {
    let closestX = Math.max(box.minX, Math.min(circle.x, box.maxX));
    let closestZ = Math.max(box.minZ, Math.min(circle.z, box.maxZ));
    let dx = circle.x - closestX;
    let dz = circle.z - closestZ;
    let dist = Math.sqrt(dx*dx + dz*dz);
    
    if (dist > 0 && dist < circle.radius) {
        let overlap = circle.radius - dist;
        circle.x += (dx / dist) * overlap;
        circle.z += (dz / dist) * overlap;
    }
}

function animate(time) {
    const dt = Math.min(clock.getDelta(), 0.05); 
    
    if (state.isPlaying) {
        state.timeLeft -= dt;
        if(state.timeLeft <= 0) state.annoyance = 100;

        // --- 1. MOVE PLAYER ---
        if (joystick.active) {
            state.player.x += joystick.x * PLAYER_SPEED * dt;
            state.player.z += joystick.y * PLAYER_SPEED * dt;
            playerMesh.position.y = 2.0 + Math.abs(Math.sin(time*0.015))*0.4;
        } else {
            playerMesh.position.y = 2.0;
        }

        // --- 2. MOVE ENEMIES ---
        state.enemies.forEach(e => {
            let dx = state.player.x - e.x;
            let dz = state.player.z - e.z;
            let dist = Math.sqrt(dx*dx + dz*dz) || 1;
            
            // Stalking AI Acceleration
            e.vx += (dx / dist) * e.speed * dt * 10;
            e.vz += (dz / dist) * e.speed * dt * 10;
            
            // Friction (Smooths out movement & slap knockbacks)
            e.vx *= 0.90;
            e.vz *= 0.90;
            
            e.x += e.vx * dt;
            e.z += e.vz * dt;
            
            // Hit Player check
            if(dist < 3.0) {
                state.annoyance += 25 * dt; 
                e.vx = -(dx / dist) * 10; // Bounce off player safely
                e.vz = -(dz / dist) * 10;
                AudioSys.sfxCrash();
            }
        });

        // --- 3. RESOLVE COLLISIONS ---
        const barBox = { minX: -12, maxX: 12, minZ: -15, maxZ: -9 };
        const wallsBox = { minX: -ROOM_SIZE+2, maxX: ROOM_SIZE-2, minZ: -ROOM_SIZE+2, maxZ: ROOM_SIZE-2 };

        // Keep player in bounds and out of the bar
        state.player.x = Math.max(wallsBox.minX, Math.min(wallsBox.maxX, state.player.x));
        state.player.z = Math.max(wallsBox.minZ, Math.min(wallsBox.maxZ, state.player.z));
        resolveBoxCollision(state.player, barBox);
        state.patrons.forEach(p => resolveCircleCollision(state.player, p));

        // Keep enemies in bounds and out of tables
        state.enemies.forEach(e => {
            e.x = Math.max(wallsBox.minX, Math.min(wallsBox.maxX, e.x));
            e.z = Math.max(wallsBox.minZ, Math.min(wallsBox.maxZ, e.z));
            resolveBoxCollision(e, barBox);
            state.patrons.forEach(p => resolveCircleCollision(e, p));
        });

        // --- 4. GAMEPLAY LOGIC (Obstacles & Spills) ---
        state.obstacles.forEach(o => {
            let dx = state.player.x - o.x;
            let dz = state.player.z - o.z;
            if(Math.sqrt(dx*dx + dz*dz) < 3.5) {
                state.annoyance += 8 * dt;
            }
        });

        // --- 5. RENDER SYNC ---
        playerMesh.position.x = state.player.x;
        playerMesh.position.z = state.player.z;

        camera.position.x += (playerMesh.position.x - camera.position.x) * 0.1;
        camera.position.z += ((playerMesh.position.z + 16) - camera.position.z) * 0.1;
        
        camera.lookAt(playerMesh.position);
        playerMesh.lookAt(camera.position); // Always face the camera exactly

        state.patrons.forEach(p => {
            p.mesh.lookAt(camera.position);
        });

        state.enemies.forEach(e => {
            e.mesh.position.x = e.x;
            e.mesh.position.z = e.z;
            e.mesh.position.y = 1.75 + Math.abs(Math.sin(time*0.01 + e.hp))*0.3;
            e.mesh.lookAt(camera.position);
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
                p.scale.setScalar(p.life);
                p.rotation.x += 10 * dt; p.rotation.y += 10 * dt;
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
