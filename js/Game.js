class GameCoordinator {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;

        // Entities
        this.player = null;
        this.world = null;
        this.zombies = [];      // Active zombies currently running
        this.zombiePool = [];  // Fixed pre-allocated pool
        
        // Gameplay Variables
        this.score = 0;
        this.highscore = parseInt(localStorage.getItem('zombie_highscore') || '0');
        this.capsules = parseInt(localStorage.getItem('zombie_capsules') || '0');
        this.capsulesCollectedThisRun = 0;
        this.weaponTier = parseInt(localStorage.getItem('zombie_weapon_tier') || '0');
        this.suitTier = parseInt(localStorage.getItem('zombie_suit_tier') || '0');
        this.magnetUnlocked = parseInt(localStorage.getItem('zombie_magnet_unlocked') || '0');
        
        this.combo = 1;
        this.comboTimer = 0;
        this.comboDuration = 3.5; // seconds to chain hits
        
        this.kills = 0;
        
        this.baseSpeed = 9.5;
        this.currentSpeed = 9.5;
        this.maxSpeed = 16.0;
        
        this.gameState = 'START'; // START, PLAYING, SHOP, GAMEOVER
        this.lastTime = 0;
        this.gameTimeElapsed = 0;

        // Zombie Spawning
        this.spawnTimer = 0;
        this.spawnDelay = 3.5;

        this.initThreeJS();
        this.initInput();
        this.initUI();
    }

    initThreeJS() {
        const container = document.getElementById('canvas-container');
        
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x05050c);
        this.scene.fog = new THREE.FogExp2(0x05050c, 0.022);

        // Camera setup
        this.camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 3.5, 6);

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.45); // Brighter ambient glow (like daytime base)
        this.scene.add(ambientLight);

        this.dirLight = new THREE.DirectionalLight(0xa5b5e8, 1.25);
        this.dirLight.position.set(10, 25, -15);
        this.dirLight.castShadow = true;
        this.dirLight.shadow.mapSize.width = 1024;
        this.dirLight.shadow.mapSize.height = 1024;
        this.dirLight.shadow.camera.near = 0.5;
        this.dirLight.shadow.camera.far = 80;
        const d = 15;
        this.dirLight.shadow.camera.left = -d;
        this.dirLight.shadow.camera.right = d;
        this.dirLight.shadow.camera.top = d;
        this.dirLight.shadow.camera.bottom = -d;
        this.scene.add(this.dirLight);
        this.scene.add(this.dirLight.target); // Make sure target is in scene for updating position

        // Initialize FX engine
        FX.init(this.scene, this.camera);

        window.addEventListener('resize', () => this.onWindowResize());
    }

    initInput() {
        window.addEventListener('keydown', (e) => {
            if (this.gameState !== 'PLAYING') return;

            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                this.player.changeLane('left');
                audioEngine.playLaneDashSound();
            }
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                this.player.changeLane('right');
                audioEngine.playLaneDashSound();
            }
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') {
                this.player.jump();
            }
            if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
                this.player.slide();
            }
        });

        window.addEventListener('mousedown', (e) => {
            if (this.gameState === 'PLAYING' && e.button === 0) {
                this.player.swing();
            }
        });
    }

    initUI() {
        UI.init(
            () => this.startGame(),
            (type) => this.buyUpgrade(type),
            () => this.restartGame()
        );

        UI.updateHUD(0, this.highscore, this.capsules, 1);
        UI.showStart(true);
    }

    startGame() {
        this.gameState = 'PLAYING';
        this.score = 0;
        this.combo = 1;
        this.kills = 0;
        this.capsulesCollectedThisRun = 0;
        this.gameTimeElapsed = 0;
        this.currentSpeed = this.baseSpeed;
        
        // Spawn/Reset player
        if (this.player) {
            this.scene.remove(this.player.mesh);
        }
        this.player = new Player(this.scene, this.weaponTier, this.suitTier);
        this.scene.add(this.player.mesh);

        // Initialize dynamic road obstacles
        window.obstaclePoolManager = new ObstaclePoolManager(this.scene);
        window.isGameOver = false;

        // Persistent World Setup (avoids GC reallocation)
        if (!this.world) {
            this.world = new WorldGenerator(this.scene);
            this.world.init();
        } else {
            // Reset existing world structures
            this.world.clearActiveGameplayElements();
            this.world.spawnZ = 0.0;
            this.world.activeTiles = [];
            for (let i = 0; i < this.world.tilesOnScreen; i++) {
                const tile = this.world.tilePool[i];
                tile.position.z = this.world.spawnZ;
                tile.visible = true;
                this.world.activeTiles.push(tile);
                this.world.randomizeSkyscrapersOnTile(tile);
                
                if (i >= 2) {
                    this.world.spawnGameplayElements(this.world.spawnZ);
                }
                this.world.spawnZ -= this.world.tileLength;
            }
        }

        // Initialize/Reset Zombie Pool
        if (this.zombiePool.length === 0) {
            for (let i = 0; i < 15; i++) {
                const z = new Zombie();
                this.scene.add(z.mesh);
                this.zombiePool.push(z);
            }
        } else {
            this.zombiePool.forEach(z => z.deactivate());
        }
        this.zombies = []; // Clear active zombies tracker

        this.lastTime = performance.now();
        Sound.startBGM();
        UI.updateHUD(0, this.highscore, 0, 1);

        requestAnimationFrame((t) => this.loop(t));
    }

    restartGame() {
        this.startGame();
    }

    buyUpgrade(type) {
        if (type === 'weapon') {
            if (this.weaponTier === 0 && this.capsules >= 25) {
                this.capsules -= 25;
                this.weaponTier = 1;
                localStorage.setItem('zombie_weapon_tier', '1');
                localStorage.setItem('zombie_capsules', this.capsules.toString());
                
                if (this.player) {
                    this.player.weaponTier = 1;
                    this.player.updateWeaponAttachment();
                    if (this.player.weaponSystem) {
                        this.player.weaponSystem.equipWeapon("katana");
                    }
                }
                
                Sound.playUpgrade();
                UI.updateShopButtons(this.capsules, this.weaponTier, this.suitTier, this.magnetUnlocked);
                UI.updateHUD(Math.floor(this.score), this.highscore, this.capsules, this.combo);
            }
        } else if (type === 'suit') {
            if (this.suitTier === 0 && this.capsules >= 60) {
                this.capsules -= 60;
                this.suitTier = 1;
                localStorage.setItem('zombie_suit_tier', '1');
                localStorage.setItem('zombie_capsules', this.capsules.toString());
                
                if (this.player) {
                    this.scene.remove(this.player.mesh);
                    this.player = new Player(this.scene, this.weaponTier, this.suitTier);
                    this.scene.add(this.player.mesh);
                }
                
                Sound.playUpgrade();
                UI.updateShopButtons(this.capsules, this.weaponTier, this.suitTier, this.magnetUnlocked);
                UI.updateHUD(Math.floor(this.score), this.highscore, this.capsules, this.combo);
            }
        } else if (type === 'hammer') {
            if (this.weaponTier === 1 && this.capsules >= 500) {
                this.capsules -= 500;
                this.weaponTier = 2;
                localStorage.setItem('zombie_weapon_tier', '2');
                localStorage.setItem('zombie_capsules', this.capsules.toString());
                
                if (this.player) {
                    this.player.weaponTier = 2;
                    this.player.updateWeaponAttachment();
                    if (this.player.weaponSystem) {
                        this.player.weaponSystem.equipWeapon("hammer");
                    }
                }
                
                Sound.playUpgrade();
                UI.updateShopButtons(this.capsules, this.weaponTier, this.suitTier, this.magnetUnlocked);
                UI.updateHUD(Math.floor(this.score), this.highscore, this.capsules, this.combo);
            }
        } else if (type === 'gold') {
            if (this.suitTier === 1 && this.capsules >= 1000) {
                this.capsules -= 1000;
                this.suitTier = 2;
                localStorage.setItem('zombie_suit_tier', '2');
                localStorage.setItem('zombie_capsules', this.capsules.toString());
                
                if (this.player) {
                    this.scene.remove(this.player.mesh);
                    this.player = new Player(this.scene, this.weaponTier, this.suitTier);
                    this.scene.add(this.player.mesh);
                }
                
                Sound.playUpgrade();
                UI.updateShopButtons(this.capsules, this.weaponTier, this.suitTier, this.magnetUnlocked);
                UI.updateHUD(Math.floor(this.score), this.highscore, this.capsules, this.combo);
            }
        } else if (type === 'magnet') {
            if (this.magnetUnlocked === 0 && this.capsules >= 5000) {
                this.capsules -= 5000;
                this.magnetUnlocked = 1;
                localStorage.setItem('zombie_magnet_unlocked', '1');
                localStorage.setItem('zombie_capsules', this.capsules.toString());
                
                Sound.playUpgrade();
                UI.updateShopButtons(this.capsules, this.weaponTier, this.suitTier, this.magnetUnlocked);
                UI.updateHUD(Math.floor(this.score), this.highscore, this.capsules, this.combo);
            }
        } else if (type === 'reset') {
            this.capsules = 0;
            this.weaponTier = 0;
            this.suitTier = 0;
            this.magnetUnlocked = 0;
            localStorage.setItem('zombie_capsules', '0');
            localStorage.setItem('zombie_weapon_tier', '0');
            localStorage.setItem('zombie_suit_tier', '0');
            localStorage.setItem('zombie_magnet_unlocked', '0');
            
            if (this.player) {
                this.scene.remove(this.player.mesh);
                this.player = new Player(this.scene, 0, 0);
                this.scene.add(this.player.mesh);
            }
            
            Sound.playUpgrade();
            UI.updateShopButtons(this.capsules, this.weaponTier, this.suitTier, this.magnetUnlocked);
            UI.updateHUD(0, this.highscore, this.capsules, this.combo);
        }
    }

    loop(time) {
        if (this.gameState !== 'PLAYING') return;

        let dt = (time - this.lastTime) / 1000.0;
        this.lastTime = time;

        if (dt > 0.1) dt = 0.1;

        // 1. Progress speed scaling
        this.currentSpeed = Math.min(this.baseSpeed + (this.score * 0.0006), this.maxSpeed);

        // 2. Continuous forward running (Z moves in negative direction)
        const runDelta = this.currentSpeed * dt;
        this.player.mesh.position.z -= runDelta;

        // 3. Update Entities
        this.player.update(dt, this.currentSpeed);
        this.world.update(dt, this.player.mesh.position.z);
        if (window.obstaclePoolManager) {
            window.obstaclePoolManager.update(this.player.mesh.position.z, this.player, dt);
        }
        
        // Spawn new zombies from pool
        this.spawnTimer += dt;
        const currentSpawnDelay = Math.max(2.2, this.spawnDelay - (this.currentSpeed * 0.05));
        if (this.spawnTimer >= currentSpawnDelay) {
            this.spawnZombie();
            this.spawnTimer = 0;
        }

        // Update active zombies
        for (let i = this.zombies.length - 1; i >= 0; i--) {
            const zombie = this.zombies[i];
            zombie.update(dt);

            // Recycle zombies that went off-screen behind player OR flew too far ahead
            if (zombie.mesh.position.z > this.player.mesh.position.z + 12.0 ||
                zombie.mesh.position.z < this.player.mesh.position.z - 75.0) {
                zombie.deactivate();
                this.zombies.splice(i, 1);
            }
        }

        // Update FX
        FX.update(dt, this.player.mesh.position.z);

        // 4. Handle Collisions
        this.checkCollisions(dt);

        // 5. Update Combo timer
        if (this.combo > 1) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) {
                this.combo = 1;
                UI.updateHUD(Math.floor(this.score), this.highscore, this.capsulesCollectedThisRun, this.combo);
            }
        }

        // 6. Score Increments (Time-based steps)
        this.gameTimeElapsed += dt;
        let pointsPerSecond = 2;
        if (this.gameTimeElapsed > 30) {
            pointsPerSecond = 8;
        } else if (this.gameTimeElapsed > 15) {
            pointsPerSecond = 4;
        }

        const oldFlooredScore = Math.floor(this.score);
        this.score += pointsPerSecond * dt;
        const newFlooredScore = Math.floor(this.score);

        if (newFlooredScore !== oldFlooredScore) {
            UI.updateHUD(newFlooredScore, this.highscore, this.capsulesCollectedThisRun, this.combo);
        }

        // 7. Track Camera and directional light (Moonlight follows player)
        this.camera.position.z = this.player.mesh.position.z + 5.5;
        this.camera.lookAt(0, 1.25, this.player.mesh.position.z - 3.8);

        if (this.dirLight) {
            this.dirLight.position.set(10, 25, this.player.mesh.position.z - 15);
            this.dirLight.target.position.set(0, 0, this.player.mesh.position.z - 25);
        }

        // Render Frame
        this.renderer.render(this.scene, this.camera);

        requestAnimationFrame((t) => this.loop(t));
    }

    spawnZombie() {
        const lane = Math.floor(Math.random() * 3);
        const zPos = this.player.mesh.position.z - 50 - (Math.random() * 12);
        
        const isMutant = (this.score > 2500) && (Math.random() < 0.28);
        const isCrawler = !isMutant && (Math.random() < 0.25);

        // Pull inactive zombie from pool
        const zombie = this.zombiePool.find(z => !z.active);
        if (zombie) {
            zombie.reset(lane, zPos, isCrawler, isMutant);
            this.zombies.push(zombie);
        }
    }

    checkCollisions(dt) {
        const playerBox = this.player.getBoundingBox();

        // --- 1. Obstacles Collision ---
        for (let i = 0; i < this.world.obstacles.length; i++) {
            const obs = this.world.obstacles[i];
            const type = obs.userData.type;

            const obsBox = new THREE.Box3().setFromObject(obs);
            if (playerBox.intersectsBox(obsBox)) {
                if (type === 'laser_gate' && this.player.isSliding) {
                    continue;
                }
                this.gameOver();
                return;
            }
        }

        // --- 2. Bio-Capsules Collection ---
        for (let i = this.world.capsules.length - 1; i >= 0; i--) {
            const cap = this.world.capsules[i];
            
            // Vortex Magnet attraction effect: drags capsules close to the player
            if (this.magnetUnlocked === 1) {
                const magnetRange = 6.0;
                const distToPlayer = this.player.mesh.position.distanceTo(cap.position);
                if (distToPlayer < magnetRange) {
                    const dx = this.player.mesh.position.x - cap.position.x;
                    const dy = this.player.mesh.position.y - cap.position.y;
                    const dz = this.player.mesh.position.z - cap.position.z;
                    cap.position.x += dx * dt * 8.0;
                    cap.position.y += dy * dt * 8.0;
                    cap.position.z += dz * dt * 8.0;
                }
            }
            
            const dist = this.player.mesh.position.distanceTo(cap.position);
            if (dist < 1.15) {
                this.capsules++;
                this.capsulesCollectedThisRun++;
                localStorage.setItem('zombie_capsules', this.capsules.toString());
                
                Sound.playChime();
                FX.spawnExplosion(cap.position.x, cap.position.y, cap.position.z, 'spark_pink', 6);
                
                // Return to pool
                this.world.deactivateCapsule(cap);

                UI.updateHUD(Math.floor(this.score), this.highscore, this.capsulesCollectedThisRun, this.combo);
            }
        }

        // --- 3. Zombie Combat / Crash Collision ---
        for (let i = this.zombies.length - 1; i >= 0; i--) {
            const zombie = this.zombies[i];
            if (zombie.isHit) continue; 

            const distZ = zombie.mesh.position.z - this.player.mesh.position.z;
            const dist = this.player.mesh.position.distanceTo(zombie.mesh.position);

            // A: Melee Hit Swing
            if (this.player.isSwinging && dist < this.player.attackRange && distZ < 0) {
                const laneDiff = Math.abs(this.player.currentLane - zombie.lane);
                const canHit = (this.player.weaponTier === 0 && laneDiff === 0) ||
                               (this.player.weaponTier === 1 && laneDiff <= 1) ||
                               (this.player.weaponTier === 2);

                if (canHit) {
                    const forceZ = -14.0 - (this.player.weaponTier * 5.0);
                    const forceY = 6.0 + (this.player.weaponTier * 3.0);
                    const forceX = (Math.random() - 0.5) * 10;
                    
                    zombie.applyKnockback(forceX, forceY, forceZ, this.player.weaponTier);

                    this.kills++;
                    this.combo = Math.min(this.combo + 1, 8);
                    this.comboTimer = this.comboDuration;

                    this.score += 150 * this.combo;

                    FX.triggerShake(0.18 + this.player.weaponTier * 0.12);
                    FX.triggerFlash(0x00ffcc, 0.08);

                    const screenPos = this.getScreenCoords(zombie.mesh.position);
                    UI.spawnFloatingText(`+${150*this.combo} (x${this.combo})`, screenPos.x, screenPos.y, '#00ffcc');

                    UI.updateHUD(Math.floor(this.score), this.highscore, this.capsulesCollectedThisRun, this.combo);
                    continue;
                }
            }

            // B: Bitten Crash
            const zombieBox = zombie.getBoundingBox();
            if (playerBox.intersectsBox(zombieBox)) {
                this.gameOver();
                return;
            }
        }
    }

    getScreenCoords(pos) {
        const vector = pos.clone();
        this.camera.updateMatrixWorld(); // Ensure camera matrices are updated before projecting
        vector.project(this.camera);

        const x = (vector.x * .5 + .5) * window.innerWidth;
        const y = (-(vector.y * .5) + .5) * window.innerHeight;
        return { x, y };
    }

    gameOver() {
        this.gameState = 'GAMEOVER';
        Sound.stopBGM();
        Sound.playHurt();

        FX.triggerShake(0.55);
        FX.triggerFlash(0xff003c, 0.25);

        const finalScore = Math.floor(this.score);
        if (finalScore > this.highscore) {
            this.highscore = finalScore;
            localStorage.setItem('zombie_highscore', this.highscore.toString());
        }

        UI.showGameOver(true, finalScore, this.highscore, this.capsulesCollectedThisRun, this.kills, this.capsules);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
