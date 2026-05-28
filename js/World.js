class WorldGenerator {
    constructor(scene) {
        this.scene = scene;
        
        // Endless road constants
        this.tileLength = 32.0;
        this.tilesOnScreen = 8;
        this.spawnZ = 0.0;
        
        // Active Lists (read by Game.js for collision)
        this.obstacles = [];
        this.capsules = [];
        this.activeTiles = [];

        // Building colors/neon variants
        this.buildingColors = [0x080812, 0x0c0c1b, 0x050814, 0x0f0b18];
        this.neonColors = [0x00ffcc, 0xff007f, 0x00ff00, 0xffff00, 0x0088ff];

        // Shared geometries & materials
        this.roadGeo = new THREE.PlaneGeometry(8, this.tileLength);
        this.roadMat = new THREE.MeshStandardMaterial({ color: 0x09090f, roughness: 0.9, metalness: 0.1 });
        this.sidewalkGeo = new THREE.BoxGeometry(2, 0.2, this.tileLength);
        this.sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x181822, roughness: 0.8 });
        
        this.capsuleGeo = new THREE.OctahedronGeometry(0.28);
        this.capsuleMat = new THREE.MeshBasicMaterial({ color: 0xff007f });

        // Pools
        this.tilePool = [];
        this.capsulePool = [];
        this.obstaclePool = [];
    }

    init() {
        // 1. Pre-allocate Capsule Pool (60 capsules)
        for (let i = 0; i < 60; i++) {
            const cap = new THREE.Mesh(this.capsuleGeo, this.capsuleMat);
            cap.visible = false;
            cap.userData = { active: false };
            
            // Neon pointlight glow
            const glow = new THREE.PointLight(0xff007f, 0.4, 3);
            cap.add(glow);
            
            this.scene.add(cap);
            this.capsulePool.push(cap);
        }

        // 2. Pre-allocate Obstacle Pool (8 Fences, 6 Lasers, 4 Cars, 5 Drones, 5 Cargo Containers)
        // A: Fences
        for (let i = 0; i < 8; i++) {
            const group = this.createFenceMesh();
            group.visible = false;
            group.userData = { active: false, type: 'fence', subtype: 'fence_normal', height: 0.75 };
            this.scene.add(group);
            this.obstaclePool.push(group);
        }
        // B: Lasers
        for (let i = 0; i < 6; i++) {
            const group = this.createLaserMesh();
            group.visible = false;
            group.userData = { active: false, type: 'laser_gate', subtype: 'laser_gate_normal', height: 1.8 };
            this.scene.add(group);
            this.obstaclePool.push(group);
        }
        // C: Cars
        for (let i = 0; i < 4; i++) {
            const group = this.createCarMesh();
            group.visible = false;
            group.userData = { active: false, type: 'car', subtype: 'car', height: 1.1 };
            this.scene.add(group);
            this.obstaclePool.push(group);
        }
        // D: Drones
        for (let i = 0; i < 5; i++) {
            const group = this.createDroneMesh();
            group.visible = false;
            group.userData = { active: false, type: 'laser_gate', subtype: 'drone', height: 1.6 };
            this.scene.add(group);
            this.obstaclePool.push(group);
        }
        // E: Cargo Containers
        for (let i = 0; i < 5; i++) {
            const group = this.createCargoMesh();
            group.visible = false;
            group.userData = { active: false, type: 'fence', subtype: 'cargo_container', height: 1.25 };
            this.scene.add(group);
            this.obstaclePool.push(group);
        }

        // 3. Pre-allocate Road Tiles Pool (8 tiles)
        for (let i = 0; i < this.tilesOnScreen; i++) {
            const tile = this.buildTileMesh();
            tile.visible = false;
            this.tilePool.push(tile);
        }

        // Layout initial safe track tiles
        for (let i = 0; i < this.tilesOnScreen; i++) {
            const tile = this.tilePool[i];
            tile.position.z = this.spawnZ;
            tile.visible = true;
            this.activeTiles.push(tile);

            // Shuffles skyscraper scales right away to randomize the initial track visual
            this.randomizeSkyscrapersOnTile(tile);

            if (i >= 2) {
                // Spawn items only after tile 2 to give player a safe start zone
                this.spawnGameplayElements(this.spawnZ);
            }

            this.spawnZ -= this.tileLength;
        }
    }

    buildTileMesh() {
        const tile = new THREE.Group();
        
        // Road Plane
        const road = new THREE.Mesh(this.roadGeo, this.roadMat);
        road.rotation.x = -Math.PI / 2;
        road.receiveShadow = true;
        tile.add(road);

        // Lane divider stripes
        const stripeGeo = new THREE.BoxGeometry(0.08, 0.01, 2);
        const stripeMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
        for (let zOffset = -this.tileLength/2; zOffset < this.tileLength/2; zOffset += 6.0) {
            const stripeL = new THREE.Mesh(stripeGeo, stripeMat);
            stripeL.position.set(-1.1, 0.005, zOffset);
            const stripeR = stripeL.clone();
            stripeR.position.x = 1.1;
            tile.add(stripeL);
            tile.add(stripeR);
        }

        // Sidewalks
        const sidewalkL = new THREE.Mesh(this.sidewalkGeo, this.sidewalkMat);
        sidewalkL.position.set(-5, 0.1, 0);
        sidewalkL.receiveShadow = true;
        const sidewalkR = sidewalkL.clone();
        sidewalkR.position.x = 5;
        tile.add(sidewalkL);
        tile.add(sidewalkR);

        // Neon curb lines
        const curbLGeo = new THREE.BoxGeometry(0.1, 0.1, this.tileLength);
        const curbL = new THREE.Mesh(curbLGeo, new THREE.MeshBasicMaterial({ color: 0xff007f }));
        curbL.position.set(-4.0, 0.22, 0);
        const curbR = curbL.clone();
        curbR.position.x = 4.0;
        curbR.material = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
        tile.add(curbL);
        tile.add(curbR);

        // Side Skyscrapers
        for (let side = -1; side <= 1; side += 2) {
            const xPos = side * (6.5 + Math.random() * 2.0);
            for (let zOffset = -this.tileLength/2 + 4; zOffset < this.tileLength/2; zOffset += 10.0) {
                const bWidth = 5.0 + Math.random() * 3.0;
                const bHeight = 15.0 + Math.random() * 25.0;
                const bDepth = 8.0 + Math.random() * 2.0;

                const bGeo = new THREE.BoxGeometry(bWidth, bHeight, bDepth);
                const bMat = new THREE.MeshStandardMaterial({
                    color: this.buildingColors[Math.floor(Math.random() * this.buildingColors.length)],
                    roughness: 0.7,
                    metalness: 0.3
                });

                const building = new THREE.Mesh(bGeo, bMat);
                // Position so base is on sidewalk floor
                building.position.set(xPos + (side * bWidth/2), bHeight/2, zOffset);
                building.castShadow = true;
                
                // Store base metadata for dynamic scaling
                building.userData = { isBuilding: true, baseHeight: bHeight, side: side, width: bWidth, depth: bDepth };
                
                tile.add(building);
                this.addWindowsToBuilding(building, bWidth, bHeight, bDepth, side);
            }
        }

        // Streetlights
        const sides = [-4.0, 4.0];
        sides.forEach((x, idx) => {
            const lightGroup = new THREE.Group();
            lightGroup.position.set(x, 0, (idx === 0) ? -8 : 8);

            const poleGeo = new THREE.CylinderGeometry(0.06, 0.08, 4.5);
            const poleMat = new THREE.MeshStandardMaterial({ color: 0x333344, metalness: 0.9 });
            const pole = new THREE.Mesh(poleGeo, poleMat);
            pole.position.y = 2.25;
            pole.castShadow = true;
            lightGroup.add(pole);

            const armGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2);
            const arm = new THREE.Mesh(armGeo, poleMat);
            arm.rotation.z = Math.PI / 2;
            const direction = (x < 0) ? 1 : -1;
            arm.position.set(direction * 0.5, 4.5, 0);
            lightGroup.add(arm);

            const headGeo = new THREE.BoxGeometry(0.2, 0.1, 0.4);
            const bulbColor = (idx === 0) ? 0x00ffcc : 0xffaa00;
            const head = new THREE.Mesh(headGeo, new THREE.MeshBasicMaterial({ color: bulbColor }));
            head.position.set(direction * 1.0, 4.5, 0);
            lightGroup.add(head);

            const spotLight = new THREE.SpotLight(bulbColor, 1.2, 12, Math.PI/4, 0.5, 1.0);
            spotLight.position.set(direction * 1.0, 4.4, 0);
            spotLight.target.position.set(direction * 1.0, 0, 0);
            
            lightGroup.add(spotLight);
            lightGroup.add(spotLight.target);
            tile.add(lightGroup);
        });

        this.scene.add(tile);
        return tile;
    }

    addWindowsToBuilding(building, w, h, d, side) {
        const rows = Math.floor(h / 2.2);
        const cols = Math.floor(d / 1.8);
        const windowColor = this.neonColors[Math.floor(Math.random() * this.neonColors.length)];
        const winMat = new THREE.MeshBasicMaterial({ color: windowColor });

        const windowGeo = new THREE.BoxGeometry(0.02, 0.4, 0.4);
        for (let r = 2; r < rows - 1; r++) {
            for (let c = 1; c < cols - 1; c++) {
                if (Math.random() < 0.35) continue;
                const win = new THREE.Mesh(windowGeo, winMat);
                win.position.set(-side * (w / 2 + 0.02), -h/2 + r * 2.0, -d/2 + c * 1.5);
                building.add(win);
            }
        }

        // Glowing billboard
        if (h > 24 && Math.random() < 0.4) {
            const billGeo = new THREE.BoxGeometry(0.04, 3.5, 6.0);
            const billboard = new THREE.Mesh(billGeo, new THREE.MeshBasicMaterial({ 
                color: this.neonColors[Math.floor(Math.random() * this.neonColors.length)] 
            }));
            billboard.position.set(-side * (w / 2 + 0.1), h/2 - 4, 0);
            building.add(billboard);
        }
    }

    randomizeSkyscrapersOnTile(tile) {
        tile.children.forEach(child => {
            if (child.userData && child.userData.isBuilding) {
                // Apply randomized scale and relocate center height
                const newScaleY = 0.45 + Math.random() * 1.8;
                child.scale.y = newScaleY;
                child.position.y = (child.userData.baseHeight * newScaleY) / 2;

                // Randomize window glowing colors
                child.children.forEach(win => {
                    if (win.material) {
                        win.material.color.setHex(this.neonColors[Math.floor(Math.random() * this.neonColors.length)]);
                    }
                });
            }
        });
    }

    // --- Mesh Creation utilities for Obstacles Pool ---
    createFenceMesh() {
        const group = new THREE.Group();
        const baseGeo = new THREE.BoxGeometry(2.0, 0.75, 0.25);
        const base = new THREE.Mesh(baseGeo, new THREE.MeshStandardMaterial({ color: 0x22222b, roughness: 0.9 }));
        base.position.y = 0.375;
        base.castShadow = true;
        group.add(base);

        const stripeGeo = new THREE.BoxGeometry(0.15, 0.8, 0.27);
        const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        for (let sx = -0.7; sx <= 0.7; sx += 0.35) {
            const stripe = new THREE.Mesh(stripeGeo, stripeMat);
            stripe.rotation.z = Math.PI / 4;
            stripe.position.set(sx, 0.375, 0);
            group.add(stripe);
        }
        return group;
    }

    createLaserMesh() {
        const group = new THREE.Group();
        const frameGeo = new THREE.BoxGeometry(0.12, 2.8, 0.12);
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x33333d });
        
        const postL = new THREE.Mesh(frameGeo, frameMat);
        postL.position.set(-0.95, 1.4, 0);
        const postR = postL.clone();
        postR.position.x = 0.95;
        group.add(postL);
        group.add(postR);

        const laser = new THREE.Mesh(
            new THREE.BoxGeometry(1.9, 0.15, 0.05), 
            new THREE.MeshBasicMaterial({ color: 0xff003c })
        );
        laser.position.set(0, 1.8, 0);
        
        const light = new THREE.PointLight(0xff003c, 0.5, 4);
        light.position.set(0, 1.8, 0.1);
        group.add(laser);
        group.add(light);
        return group;
    }

    createCarMesh() {
        const group = new THREE.Group();
        const chassisGeo = new THREE.BoxGeometry(3.6, 0.75, 1.8);
        const chassisMat = new THREE.MeshStandardMaterial({ color: 0x050510, metalness: 0.7, roughness: 0.2 });
        const chassis = new THREE.Mesh(chassisGeo, chassisMat);
        chassis.position.y = 0.42;
        chassis.castShadow = true;
        group.add(chassis);

        const hood = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 1.76), new THREE.MeshStandardMaterial({ color: 0xffffff }));
        hood.position.set(-0.8, 0.45, 0);
        group.add(hood);

        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 1.5), chassisMat);
        cabin.position.set(0.4, 1.0, 0);
        group.add(cabin);

        const lightbar = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.9), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        lightbar.position.set(0.4, 1.35, 0);
        group.add(lightbar);

        // Siren indicators
        const redSiren = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.35), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
        redSiren.position.set(0.4, 1.38, -0.2);
        redSiren.name = 'redSiren';
        
        const blueSiren = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.35), new THREE.MeshBasicMaterial({ color: 0x0000ff }));
        blueSiren.position.set(0.4, 1.38, 0.2);
        blueSiren.name = 'blueSiren';

        group.add(redSiren);
        group.add(blueSiren);

        const lightR = new THREE.PointLight(0xff0000, 0, 6);
        lightR.position.set(0.4, 1.5, -0.3);
        lightR.name = 'sirenLightR';
        const lightB = new THREE.PointLight(0x0000ff, 0, 6);
        lightB.position.set(0.4, 1.5, 0.3);
        lightB.name = 'sirenLightB';
        group.add(lightR);
        group.add(lightB);

        const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 12);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.9 });
        const positions = [[-1.1, 0.3, 0.95], [1.1, 0.3, 0.95], [-1.1, 0.3, -0.95], [1.1, 0.3, -0.95]];
        positions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.rotation.x = Math.PI / 2;
            wheel.position.set(pos[0], pos[1], pos[2]);
            group.add(wheel);
        });

        return group;
    }

    spawnGameplayElements(tileZ) {
        const lanes = [-2.2, 0, 2.2];
        const scenario = Math.random();
        
        if (scenario < 0.35) {
            // Row of capsules, obstacle on other lane
            const capLane = Math.floor(Math.random() * 3);
            let obsLane = Math.floor(Math.random() * 3);
            while (obsLane === capLane) obsLane = Math.floor(Math.random() * 3);

            // Spawn 5 capsules in a row!
            for (let zVal = -12; zVal <= 12; zVal += 5) {
                this.spawnCapsuleFromPool(lanes[capLane], 0.7, tileZ + zVal);
            }
            const subtype = Math.random() < 0.5 ? 'fence_normal' : 'cargo_container';
            this.spawnObstacleFromPool(obsLane, tileZ, subtype);

        } else if (scenario < 0.7) {
            // Safe capsule rush lane (5 capsules) + obstacle on side lane
            const capLane = Math.floor(Math.random() * 3);
            for (let zVal = -12; zVal <= 12; zVal += 5) {
                this.spawnCapsuleFromPool(lanes[capLane], 0.7, tileZ + zVal);
            }
            
            // Only spawn 1 obstacle
            let obsLane = Math.floor(Math.random() * 3);
            while (obsLane === capLane) obsLane = Math.floor(Math.random() * 3);
            const subtype = Math.random() < 0.5 ? 'laser_gate_normal' : 'fence_normal';
            this.spawnObstacleFromPool(obsLane, tileZ + 4.0, subtype);

        } else {
            // Simple obstacle block + safe lane with 4 capsules
            const blockLanes = (Math.random() < 0.5) ? [0, 1] : [1, 2];
            // Only 50% chance of actually blocking two lanes, otherwise block just one to keep it easy!
            if (Math.random() < 0.5) {
                this.spawnObstacleFromPool(blockLanes, tileZ, 'car');
            } else {
                this.spawnObstacleFromPool(blockLanes[0], tileZ, 'cargo_container');
            }
            
            const openLane = (blockLanes[0] === 0) ? 2 : 0;
            for (let zVal = -8; zVal <= 8; zVal += 4) {
                this.spawnCapsuleFromPool(lanes[openLane], 0.7, tileZ + zVal);
            }
        }
    }

    spawnCapsuleFromPool(x, y, z) {
        const cap = this.capsulePool.find(c => !c.userData.active);
        if (cap) {
            cap.position.set(x, y, z);
            cap.visible = true;
            cap.userData.active = true;
            this.capsules.push(cap);
        }
    }

    spawnObstacleFromPool(laneIdx, z, subtype) {
        const obs = this.obstaclePool.find(o => !o.userData.active && o.userData.subtype === subtype);
        if (obs) {
            const lanes = [-2.2, 0, 2.2];
            const type = obs.userData.type;
            if (type === 'car') {
                const posX = (lanes[laneIdx[0]] + lanes[laneIdx[1]]) / 2;
                obs.position.set(posX, 0.05, z);
                obs.userData.lanes = laneIdx;
            } else {
                obs.position.set(lanes[laneIdx], 0, z);
                obs.userData.lane = laneIdx;
            }

            obs.visible = true;
            obs.userData.active = true;
            this.obstacles.push(obs);
        }
    }

    deactivateCapsule(cap) {
        cap.visible = false;
        cap.userData.active = false;
        const idx = this.capsules.indexOf(cap);
        if (idx !== -1) this.capsules.splice(idx, 1);
    }

    deactivateObstacle(obs) {
        obs.visible = false;
        obs.userData.active = false;
        const idx = this.obstacles.indexOf(obs);
        if (idx !== -1) this.obstacles.splice(idx, 1);
    }

    clearActiveGameplayElements() {
        // Return all active items to pools
        for (let i = this.capsules.length - 1; i >= 0; i--) {
            this.deactivateCapsule(this.capsules[i]);
        }
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            this.deactivateObstacle(this.obstacles[i]);
        }
    }

    update(dt, playerZ) {
        // 1. Recycle oldest road tile
        const oldestTile = this.activeTiles[0];
        if (oldestTile && playerZ < oldestTile.position.z - 35.0) {
            this.activeTiles.shift();

            // Teleport tile ahead
            oldestTile.position.z = this.spawnZ;
            
            // Procedurally randomize building layout on reuse
            this.randomizeSkyscrapersOnTile(oldestTile);

            // Spawn obstacles on this recycled segment
            this.spawnGameplayElements(this.spawnZ);

            this.activeTiles.push(oldestTile);
            this.spawnZ -= this.tileLength;
        }

        // 2. Animate blinking emergency car sirens
        const time = Date.now() * 0.008;
        const toggle = Math.sin(time) > 0;
        this.obstacles.forEach(obs => {
            if (obs.userData && obs.userData.type === 'car' && obs.userData.active) {
                const redNode = obs.children.find(c => c.name === 'redSiren');
                const blueNode = obs.children.find(c => c.name === 'blueSiren');
                const lightR = obs.children.find(c => c.name === 'sirenLightR');
                const lightB = obs.children.find(c => c.name === 'sirenLightB');

                if (toggle) {
                    if (redNode) redNode.material.color.setHex(0xff0000);
                    if (blueNode) blueNode.material.color.setHex(0x05051a);
                    if (lightR) lightR.intensity = 2.5;
                    if (lightB) lightB.intensity = 0.0;
                } else {
                    if (redNode) redNode.material.color.setHex(0x05051a);
                    if (blueNode) blueNode.material.color.setHex(0x0000ff);
                    if (lightR) lightR.intensity = 0.0;
                    if (lightB) lightB.intensity = 2.5;
                }
            }
        });

        // 3. Float & rotate bio-capsules
        this.capsules.forEach(cap => {
            if (cap.userData.active) {
                cap.rotation.y += 1.5 * dt;
                cap.rotation.x += 0.8 * dt;
                cap.position.y = 0.7 + Math.sin(Date.now() * 0.003 + cap.position.z) * 0.15;
            }
        });

        // 4. Recycle passed items (Z > playerZ + 15)
        for (let i = this.capsules.length - 1; i >= 0; i--) {
            const cap = this.capsules[i];
            if (cap.position.z > playerZ + 15.0) {
                this.deactivateCapsule(cap);
            }
        }
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            if (obs.position.z > playerZ + 15.0) {
                this.deactivateObstacle(obs);
            }
        }
    }

    createDroneMesh() {
        const group = new THREE.Group();
        
        const bodyGeo = new THREE.SphereGeometry(0.32, 8, 8);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x111125, metalness: 0.8, roughness: 0.2 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 1.6; // Floating hover height
        body.castShadow = true;
        group.add(body);

        // Cyber visor eye
        const eye = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.08, 0.38),
            new THREE.MeshBasicMaterial({ color: 0xff0055 })
        );
        eye.position.set(0, 0, -0.2);
        body.add(eye);

        // Side rotors/wings
        const wingGeo = new THREE.BoxGeometry(0.8, 0.05, 0.15);
        const wingMat = new THREE.MeshStandardMaterial({ color: 0x333344, metalness: 0.9 });
        const wings = new THREE.Mesh(wingGeo, wingMat);
        wings.position.set(0, 0, 0);
        body.add(wings);

        // Thruster glow indicators
        const glowGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.04);
        const glowMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        const glowL = new THREE.Mesh(glowGeo, glowMat);
        glowL.position.set(-0.4, -0.04, 0);
        const glowR = glowL.clone();
        glowR.position.x = 0.4;
        body.add(glowL);
        body.add(glowR);

        // Red laser cylinder scanning beam pointing downward
        const laserGeo = new THREE.CylinderGeometry(0.01, 0.8, 1.6, 16, 1, true);
        const laserMat = new THREE.MeshBasicMaterial({ 
            color: 0xff003c, 
            transparent: true, 
            opacity: 0.38,
            side: THREE.DoubleSide
        });
        const laser = new THREE.Mesh(laserGeo, laserMat);
        laser.position.set(0, -0.8, 0);
        body.add(laser);

        const pointLight = new THREE.PointLight(0xff003c, 0.6, 5);
        pointLight.position.set(0, -1.0, 0);
        body.add(pointLight);

        return group;
    }

    createCargoMesh() {
        const group = new THREE.Group();

        const cargoGeo = new THREE.BoxGeometry(1.9, 1.25, 1.1);
        const cargoMat = new THREE.MeshStandardMaterial({ 
            color: 0xd84b20, 
            roughness: 0.9,
            metalness: 0.2
        });
        const container = new THREE.Mesh(cargoGeo, cargoMat);
        container.position.y = 0.625;
        container.castShadow = true;
        container.receiveShadow = true;
        group.add(container);

        // Neon caution edge glow lines
        const stripeGeo = new THREE.BoxGeometry(1.92, 0.06, 1.12);
        const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.position.set(0, 0.62, 0);
        container.add(stripe);

        // Ribbed low-poly indentation detailing
        const ribGeo = new THREE.BoxGeometry(0.06, 1.1, 1.14);
        const ribMat = new THREE.MeshStandardMaterial({ color: 0x9e3110, roughness: 0.9 });
        for (let x = -0.7; x <= 0.7; x += 0.35) {
            const rib = new THREE.Mesh(ribGeo, ribMat);
            rib.position.set(x, 0, 0);
            container.add(rib);
        }

        return group;
    }
}

class ObstaclePoolManager {
    constructor(scene, totalObstacles = 6) {
        this.pool = [];
        this.scene = scene;
        this.lanes = [-2.2, 0, 2.2];
        this.minSpawnDistance = 45; // Spawn distance ahead of player

        for (let i = 0; i < totalObstacles; i++) {
            let obstacle = this.createObstacleContainer();
            obstacle.visible = false;
            obstacle.isActive = false;
            this.scene.add(obstacle);
            this.pool.push(obstacle);
        }
    }

    createObstacleContainer() {
        // Group structure to switch between Low Barriers and High Lasers easily
        const group = new THREE.Group();

        // 1. Low Barrier Mesh (Jump obstacle)
        const lowGeo = new THREE.BoxGeometry(1.8, 0.6, 0.4);
        const lowMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, roughness: 0.7 }); // Warning yellow bar
        const lowMesh = new THREE.Mesh(lowGeo, lowMat);
        lowMesh.position.y = 0.3;
        lowMesh.name = "low";
        group.add(lowMesh);

        // 2. High Laser Mesh (Slide obstacle)
        const laserGeo = new THREE.BoxGeometry(2.0, 0.15, 0.15);
        const laserMat = new THREE.MeshBasicMaterial({ color: 0xff0033 }); // Bright crimson laser line
        const laserMesh = new THREE.Mesh(laserGeo, laserMat);
        laserMesh.position.y = 1.9; // Suspended high in the air
        laserMesh.name = "high";
        group.add(laserMesh);

        group.type = "low"; // Current configuration track
        return group;
    }

    spawnObstacle(playerZ) {
        let obstacle = this.pool.find(o => !o.isActive);
        if (!obstacle) return;

        let randLane = this.lanes[Math.floor(Math.random() * this.lanes.length)];
        let obstacleType = (Math.random() > 0.5) ? "low" : "high";
        
        obstacle.type = obstacleType;
        obstacle.position.set(randLane, 0, playerZ - this.minSpawnDistance - (Math.random() * 20));
        obstacle.isActive = true;
        obstacle.visible = true;

        // Toggle visibility internal items to match selected type
        obstacle.getObjectByName("low").visible = (obstacleType === "low");
        obstacle.getObjectByName("high").visible = (obstacleType === "high");
    }

    update(playerZ, playerObject, deltaTime) {
        // Random check invocation to attempt a spawn frame layout (Reduced to make it easier!)
        if (Math.random() < 0.006) {
            this.spawnObstacle(playerZ);
        }

        for (let i = 0; i < this.pool.length; i++) {
            let obs = this.pool[i];
            if (!obs.isActive) continue;

            // Collision Detection Logic
            const pos = playerObject.position || (playerObject.mesh ? playerObject.mesh.position : null);
            if (!pos) continue;

            let distanceZ = Math.abs(pos.z - obs.position.z);
            let distanceX = Math.abs(pos.x - obs.position.x);

            if (distanceZ < 0.8 && distanceX < 1.0) {
                // Check player state configurations (Is jumping or sliding?)
                let isJumping = pos.y > 0.6;
                let isSliding = playerObject.isSliding === true; // Set inside input triggers

                if (obs.type === "low" && !isJumping) {
                    window.isGameOver = true;
                    if (document.getElementById('gameover')) {
                        document.getElementById('gameover').style.display = 'block';
                    }
                    if (document.getElementById('gameover-overlay')) {
                        document.getElementById('gameover-overlay').style.display = 'block';
                    }
                    if (window.game && window.game.gameState !== 'GAMEOVER') {
                        window.game.gameOver();
                    }
                } else if (obs.type === "high" && !isSliding) {
                    window.isGameOver = true;
                    if (document.getElementById('gameover')) {
                        document.getElementById('gameover').style.display = 'block';
                    }
                    if (document.getElementById('gameover-overlay')) {
                        document.getElementById('gameover-overlay').style.display = 'block';
                    }
                    if (window.game && window.game.gameState !== 'GAMEOVER') {
                        window.game.gameOver();
                    }
                }
            }

            // Recycle trigger check
            if (obs.position.z > playerZ + 15) {
                obs.isActive = false;
                obs.visible = false;
            }
        }
    }
}

// Global declaration and reference
window.ObstaclePoolManager = ObstaclePoolManager;
let obstaclePoolManager = null;
window.obstaclePoolManager = null;
