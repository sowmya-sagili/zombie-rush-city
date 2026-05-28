class Zombie {
    constructor() {
        this.mesh = new THREE.Group();
        this.mesh.name = "Zombie";

        this.lane = 1;
        this.isCrawler = false;
        this.isMutant = false;
        this.active = false;

        // Rigid body state for physics
        this.isHit = false;
        this.velocity = new THREE.Vector3();
        this.gravity = -22.0;
        this.rotSpeed = new THREE.Vector3();

        // Limping Animation cycle
        this.walkCycle = Math.random() * Math.PI * 2;
        this.limpIntensity = 0.5 + Math.random() * 0.5;

        // Pre-create materials per-zombie so they can change colors independently
        this.skinMat = new THREE.MeshStandardMaterial({ color: 0x3d6b35, roughness: 0.8, emissive: 0x3d6b35, emissiveIntensity: 0.15 });
        this.shirtMat = new THREE.MeshStandardMaterial({ color: 0x8a1c1c, roughness: 0.6, emissive: 0x8a1c1c, emissiveIntensity: 0.12 });
        this.pantsMat = new THREE.MeshStandardMaterial({ color: 0x24243a, roughness: 0.7 });
        this.eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });

        // Build base mesh structures
        this.buildProceduralModel();
        
        // Hide initially until spawned from pool
        this.mesh.visible = false;
    }

    buildProceduralModel() {
        // Torso
        const torsoGeo = new THREE.BoxGeometry(0.65, 0.85, 0.35);
        this.body = new THREE.Mesh(torsoGeo, this.shirtMat);
        this.body.castShadow = true;
        this.mesh.add(this.body);

        // Head
        const headGeo = new THREE.BoxGeometry(0.36, 0.36, 0.36);
        this.head = new THREE.Mesh(headGeo, this.skinMat);
        this.head.castShadow = true;
        this.body.add(this.head);

        // Eyes
        const eyeGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
        this.lEye = new THREE.Mesh(eyeGeo, this.eyeMat);
        this.lEye.position.set(-0.1, 0.05, 0.17);
        this.rEye = this.lEye.clone();
        // Point them to the same material instance
        this.rEye.material = this.eyeMat;
        this.rEye.position.x = 0.1;
        this.head.add(this.lEye);
        this.head.add(this.rEye);

        // Left & Right Arms
        const armGeo = new THREE.BoxGeometry(0.18, 0.65, 0.18);
        
        this.lArm = new THREE.Group();
        const lArmMesh = new THREE.Mesh(armGeo, this.skinMat);
        lArmMesh.position.y = -0.28;
        lArmMesh.castShadow = true;
        this.lArm.add(lArmMesh);
        this.mesh.add(this.lArm);

        this.rArm = new THREE.Group();
        const rArmMesh = new THREE.Mesh(armGeo, this.skinMat);
        rArmMesh.position.y = -0.28;
        rArmMesh.castShadow = true;
        this.rArm.add(rArmMesh);
        this.mesh.add(this.rArm);

        // Left & Right Legs
        const legGeo = new THREE.BoxGeometry(0.2, 0.6, 0.2);
        
        this.lLeg = new THREE.Group();
        const lLegMesh = new THREE.Mesh(legGeo, this.pantsMat);
        lLegMesh.position.y = -0.28;
        lLegMesh.castShadow = true;
        this.lLeg.add(lLegMesh);
        this.mesh.add(this.lLeg);

        this.rLeg = new THREE.Group();
        const rLegMesh = new THREE.Mesh(legGeo, this.pantsMat);
        rLegMesh.position.y = -0.28;
        rLegMesh.castShadow = true;
        this.rLeg.add(rLegMesh);
        this.mesh.add(this.rLeg);
    }

    reset(lane, zPos, isCrawler = false, isMutant = false) {
        this.lane = lane;
        this.isCrawler = isCrawler;
        this.isMutant = isMutant;
        
        this.active = true;
        this.mesh.visible = true;
        this.isHit = false;
        
        this.velocity.set(0, 0, 0);
        this.rotSpeed.set(0, 0, 0);
        
        // Reset transform positions & rotations
        this.mesh.position.set(0, 0, 0);
        this.mesh.rotation.set(0, 0, 0);
        this.body.rotation.set(0, 0, 0);
        this.head.rotation.set(0, 0, 0);
        this.lArm.rotation.set(0, 0, 0);
        this.rArm.rotation.set(0, 0, 0);
        this.lLeg.rotation.set(0, 0, 0);
        this.rLeg.rotation.set(0, 0, 0);

        // Position on highway
        const lanes = [-2.2, 0, 2.2];
        this.mesh.position.set(lanes[lane], 0, zPos);

        // Scale & Materials config
        let skinColor = 0x3d6b35; // Decaying green
        let shirtColor = 0x8a1c1c; // Ripped red shirt
        let pantsColor = 0x24243a; // Jeans blue
        let eyeColor = 0xff0000;   // Glowing red
        let scale = 1.0;

        if (this.isMutant) {
            skinColor = 0x6a0dad; // Toxic purple
            shirtColor = 0x00ffcc; // Cyan chem-waste shirt
            eyeColor = 0x00ff00;   // Radioactive green eyes
            scale = 1.25;
        }

        this.skinMat.color.setHex(skinColor);
        this.skinMat.emissive.setHex(skinColor);
        this.shirtMat.color.setHex(shirtColor);
        this.shirtMat.emissive.setHex(shirtColor);
        this.pantsMat.color.setHex(pantsColor);
        this.eyeMat.color.setHex(eyeColor);

        this.mesh.scale.set(scale, scale, scale);

        // Configure Skeletal Rig offsets
        if (this.isCrawler) {
            // Lower Torso to floor, rotate forward
            this.body.position.set(0, 0.3, 0);
            this.body.rotation.x = Math.PI / 2.3;
            
            // Re-aim Head forward/up
            this.head.position.set(0, 0.45, 0.2);
            this.head.rotation.x = -Math.PI / 3;

            // Shoulder adjustments
            this.lArm.position.set(-0.4, 0.35, 0.25);
            this.rArm.position.set(0.4, 0.35, 0.25);
            this.lArm.rotation.x = -Math.PI / 3;
            this.rArm.rotation.x = -Math.PI / 3.4;

            // Dragging legs behind
            this.lLeg.position.set(-0.2, 0.15, -0.45);
            this.rLeg.position.set(0.2, 0.15, -0.45);
            this.lLeg.rotation.x = Math.PI / 2.1;
            this.rLeg.rotation.x = Math.PI / 2.15;
        } else {
            // Standing pose
            this.body.position.set(0, 0.9, 0);
            this.head.position.set(0, 0.65, 0);
            
            this.lArm.position.set(-0.42, 1.25, 0);
            this.rArm.position.set(0.42, 1.25, 0);
            this.lArm.rotation.x = -Math.PI / 2.1;
            this.rArm.rotation.x = -Math.PI / 1.9 + (Math.random() * 0.3 - 0.15); // Uneven reach

            this.lLeg.position.set(-0.2, 0.55, 0);
            this.rLeg.position.set(0.2, 0.55, 0);
        }
    }

    deactivate() {
        this.active = false;
        this.mesh.visible = false;
    }

    applyKnockback(dirX, dirY, dirZ, weaponTier = 0) {
        this.isHit = true;
        this.velocity.set(dirX, dirY, dirZ);
        
        this.rotSpeed.set(
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 20
        );

        const bloodType = this.isMutant ? 'blood_green' : 'blood_red';
        FX.spawnExplosion(
            this.mesh.position.x, 
            this.mesh.position.y + 0.8, 
            this.mesh.position.z, 
            bloodType, 
            22
        );
        Sound.playHitWeapon(weaponTier);
    }

    update(dt) {
        if (!this.active) return;

        if (this.isHit) {
            this.velocity.y += this.gravity * dt;
            this.mesh.position.addScaledVector(this.velocity, dt);

            this.mesh.rotation.x += this.rotSpeed.x * dt;
            this.mesh.rotation.y += this.rotSpeed.y * dt;
            this.mesh.rotation.z += this.rotSpeed.z * dt;

            if (this.mesh.position.y <= 0.1 && this.velocity.y < 0) {
                this.mesh.position.y = 0.1;
                this.velocity.y = -this.velocity.y * 0.4;
                this.rotSpeed.multiplyScalar(0.7);
            }
        } else {
            this.walkCycle += dt * 5.0;

            if (this.isCrawler) {
                const pull = Math.sin(this.walkCycle);
                this.lArm.rotation.x = -Math.PI / 3 + pull * 0.5;
                this.rArm.rotation.x = -Math.PI / 3.4 - pull * 0.5;
                this.mesh.position.z += Math.max(0, pull) * 0.6 * dt; // Drag steps
            } else {
                const swing = Math.sin(this.walkCycle);
                this.lLeg.rotation.x = swing * 0.45 * this.limpIntensity;
                this.rLeg.rotation.x = -swing * 0.45 * (2.0 - this.limpIntensity);

                this.body.rotation.z = Math.sin(this.walkCycle * 0.5) * 0.08;
                this.body.position.y = 0.9 + Math.abs(swing) * 0.05;

                this.lArm.rotation.x = -Math.PI / 2.1 + Math.sin(this.walkCycle) * 0.1;
                this.rArm.rotation.x = -Math.PI / 1.9 - Math.cos(this.walkCycle) * 0.1;
            }
        }
    }

    getBoundingBox() {
        const center = this.mesh.position.clone();
        
        let height = this.isCrawler ? 0.65 : 1.75;
        let width = 0.95;
        let depth = 0.8;

        if (this.isMutant) {
            height *= 1.25;
            width *= 1.25;
            depth *= 1.25;
        }

        center.y += height / 2;

        return new THREE.Box3(
            new THREE.Vector3(center.x - width/2, center.y - height/2, center.z - depth/2),
            new THREE.Vector3(center.x + width/2, center.y + height/2, center.z + depth/2)
        );
    }
}
