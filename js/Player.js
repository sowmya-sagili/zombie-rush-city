class Player {
    constructor(scene = null, weaponTier = 0, suitTier = 0) {
        this.scene = scene;
        this.mesh = new THREE.Group();
        this.mesh.name = "Player";
        
        // Rigging Nodes
        this.body = null;
        this.head = null;
        this.lLeg = null;
        this.rLeg = null;
        this.lArm = null;
        this.rArm = null;
        this.weaponGroup = new THREE.Group();
        this.activeWeaponMesh = null;

        // Lane & Movement
        this.lanes = [-2.2, 0, 2.2];
        this.currentLane = 1;
        this.targetX = 0;
        this.laneSpeed = 16.0;

        // Jump / Physics
        this.posY = 0;
        this.velY = 0;
        this.gravity = -24.0;
        this.jumpForce = 8.5;
        this.isJumping = false;

        // Slide State
        this.isSliding = false;
        this.slideTimer = 0;
        this.slideDuration = 0.6; // 600ms

        // Swing State
        this.swingCooldown = 0;
        this.hammerShockwavePending = false;

        // Combat Upgrades
        this.weaponTier = weaponTier; // 0: Bat/Stick, 1: Katana/Blade, 2: Doom Hammer
        this.suitTier = suitTier; // 0: Default blue, 1: Glowing pink cyber armor, 2: Glowing gold quantum armor
        this.attackRange = 2.6;
        
        // Runner Stats
        this.runCycle = 0;

        this.buildProceduralModel();

        // Initialize OOP Weapon System
        this.weaponSystem = new WeaponSystem(this.mesh, this.scene);
        const weaponTypes = ["normal", "katana", "hammer"];
        this.weaponSystem.equipWeapon(weaponTypes[this.weaponTier]);

        // Hide original weapon mesh since WeaponSystem will render its own
        this.weaponGroup.visible = false;
    }

    buildProceduralModel() {
        // Futuristic Cyberpunk Runner Design
        let glowColor = 0x00ffcc;
        let torsoColor = 0x0a1530;
        let emissiveIntensity = 0.38;
        let metalness = 0.8;
        let roughness = 0.2;

        if (this.suitTier === 1) {
            glowColor = 0xff007f;
            torsoColor = 0x25051a;
            emissiveIntensity = 0.85;
        } else if (this.suitTier === 2) {
            glowColor = 0xffaa00; // Glowing gold visor/highlights
            torsoColor = 0x5a450a; // Deep golden metallic armor color
            emissiveIntensity = 1.0;
            metalness = 0.95;
            roughness = 0.05;
        }

        // 1. Torso (Low Poly Cyber Armor)
        const torsoGeo = new THREE.BoxGeometry(0.7, 0.9, 0.4);
        const torsoMat = new THREE.MeshStandardMaterial({ 
            color: torsoColor, 
            roughness: roughness, 
            metalness: metalness,
            emissive: glowColor,
            emissiveIntensity: emissiveIntensity
        });
        this.body = new THREE.Mesh(torsoGeo, torsoMat);
        this.body.position.y = 0.95;
        this.body.castShadow = true;
        this.mesh.add(this.body);

        // Cyber Visor / Core Neon Plate
        const coreGeo = new THREE.BoxGeometry(0.5, 0.2, 0.1);
        const coreMat = new THREE.MeshBasicMaterial({ color: glowColor });
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.position.set(0, 0.2, 0.2);
        this.body.add(core);

        // 2. Head
        const headGeo = new THREE.BoxGeometry(0.38, 0.38, 0.38);
        const headMat = new THREE.MeshStandardMaterial({ color: 0x080c16, roughness: 0.4 });
        this.head = new THREE.Mesh(headGeo, headMat);
        this.head.position.y = 0.72; // Relative to torso
        this.head.castShadow = true;
        this.body.add(this.head);

        // Visor glow
        const visorGeo = new THREE.BoxGeometry(0.42, 0.08, 0.2);
        const visorMat = new THREE.MeshBasicMaterial({ color: glowColor });
        const visor = new THREE.Mesh(visorGeo, visorMat);
        visor.position.set(0, 0.05, 0.15);
        this.head.add(visor);

        // Cyber Headlight / Torch pointing forward (negative Z) to illuminate road in dark mode
        const headlight = new THREE.SpotLight(glowColor, 3.5, 30, Math.PI / 4, 0.5, 1.0);
        headlight.position.set(0, 0.05, -0.25);
        if (window.isMobileDevice) {
            headlight.castShadow = false;
        } else {
            headlight.castShadow = true;
            headlight.shadow.mapSize.width = 512;
            headlight.shadow.mapSize.height = 512;
        }
        
        // Target points forward
        const target = new THREE.Object3D();
        target.position.set(0, 0.05, -15); // Points forward in player's running direction
        this.head.add(target);
        headlight.target = target;
        
        this.head.add(headlight);

        // 3. Legs (Rigged from hip pivots)
        const legGeo = new THREE.BoxGeometry(0.24, 0.65, 0.24);
        const legMat = new THREE.MeshStandardMaterial({ color: 0x040812, roughness: 0.6 });

        this.lLeg = new THREE.Group();
        this.lLeg.position.set(-0.22, 0.5, 0);
        const lLegMesh = new THREE.Mesh(legGeo, legMat);
        lLegMesh.position.y = -0.3; // Offset to rotate around hip pivot
        lLegMesh.castShadow = true;
        this.lLeg.add(lLegMesh);
        this.mesh.add(this.lLeg);

        this.rLeg = new THREE.Group();
        this.rLeg.position.set(0.22, 0.5, 0);
        const rLegMesh = new THREE.Mesh(legGeo, legMat);
        rLegMesh.position.y = -0.3;
        rLegMesh.castShadow = true;
        this.rLeg.add(rLegMesh);
        this.mesh.add(this.rLeg);

        // 4. Arms
        const armGeo = new THREE.BoxGeometry(0.2, 0.65, 0.2);
        const armMat = new THREE.MeshStandardMaterial({ color: torsoColor, metalness: 0.5 });

        this.lArm = new THREE.Group();
        this.lArm.position.set(-0.45, 1.3, 0);
        const lArmMesh = new THREE.Mesh(armGeo, armMat);
        lArmMesh.position.y = -0.3;
        lArmMesh.castShadow = true;
        this.lArm.add(lArmMesh);
        this.mesh.add(this.lArm);

        this.rArm = new THREE.Group();
        this.rArm.position.set(0.45, 1.3, 0);
        const rArmMesh = new THREE.Mesh(armGeo, armMat);
        rArmMesh.position.y = -0.3;
        rArmMesh.castShadow = true;
        this.rArm.add(rArmMesh);
        this.mesh.add(this.rArm);

        // Attach Weapon Group to Right Arm hand
        this.weaponGroup.position.set(0, -0.6, 0.1);
        this.weaponGroup.rotation.x = Math.PI / 2.5; // Angle forward
        this.rArm.add(this.weaponGroup);

        this.updateWeaponAttachment();

        // Cyber Katana Swing Arc Visual Mesh
        this.katanaArc = new THREE.Mesh(
            new THREE.RingGeometry(0.8, 1.4, 16, 1, 0, Math.PI * 0.75),
            new THREE.MeshBasicMaterial({ color: 0x00ffff, side: THREE.DoubleSide, transparent: true, opacity: 0 })
        );
        this.katanaArc.position.set(0.1, 0.95, -0.65);
        this.katanaArc.rotation.set(0.4, Math.PI, 0.5);
        this.mesh.add(this.katanaArc);

        // Plasma Hammer Shockwave Ground Ring Visual Mesh
        this.hammerRing = new THREE.Mesh(
            new THREE.RingGeometry(0.1, 1.8, 24),
            new THREE.MeshBasicMaterial({ color: 0xff00ff, side: THREE.DoubleSide, transparent: true, opacity: 0 })
        );
        this.hammerRing.position.set(0, 0.02, -1.5);
        this.hammerRing.rotation.x = -Math.PI / 2;
        this.mesh.add(this.hammerRing);
    }

    updateWeaponAttachment() {
        // Clear current weapon mesh
        if (this.activeWeaponMesh) {
            this.weaponGroup.remove(this.activeWeaponMesh);
        }

        if (this.weaponTier === 0) {
            // BASEBALL BAT
            const batGroup = new THREE.Group();
            const handleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.3);
            const handleMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.8 });
            const handle = new THREE.Mesh(handleGeo, handleMat);
            handle.position.y = 0.15;
            batGroup.add(handle);

            const barrelGeo = new THREE.CylinderGeometry(0.08, 0.05, 0.9);
            const barrelMat = new THREE.MeshStandardMaterial({ color: 0xc4a482, roughness: 0.5 });
            const barrel = new THREE.Mesh(barrelGeo, barrelMat);
            barrel.position.y = 0.75;
            batGroup.add(barrel);

            // Metal tape wrapping
            const tapeGeo = new THREE.CylinderGeometry(0.082, 0.082, 0.1);
            const tapeMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9 });
            const tape = new THREE.Mesh(tapeGeo, tapeMat);
            tape.position.y = 1.1;
            batGroup.add(tape);

            this.activeWeaponMesh = batGroup;
            this.attackRange = 2.6;
        } else if (this.weaponTier === 1) {
            // CYBER KATANA
            const bladeGroup = new THREE.Group();
            
            // Handle
            const gripGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.35);
            const gripMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
            const grip = new THREE.Mesh(gripGeo, gripMat);
            grip.position.y = 0.17;
            bladeGroup.add(grip);

            // Tsuba guard
            const guardGeo = new THREE.BoxGeometry(0.12, 0.03, 0.08);
            const guardMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.8 });
            const guard = new THREE.Mesh(guardGeo, guardMat);
            guard.position.y = 0.35;
            bladeGroup.add(guard);

            // Neon glowing energy blade
            const bladeGeo = new THREE.BoxGeometry(0.02, 1.1, 0.08);
            const bladeMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
            const blade = new THREE.Mesh(bladeGeo, bladeMat);
            blade.position.y = 0.9;
            bladeGroup.add(blade);

            // Subtle outer edge
            const edgeGeo = new THREE.BoxGeometry(0.025, 1.1, 0.01);
            const edgeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const edge = new THREE.Mesh(edgeGeo, edgeMat);
            edge.position.set(0, 0.9, 0.04);
            bladeGroup.add(edge);

            this.activeWeaponMesh = bladeGroup;
            this.attackRange = 3.6;
        } else {
            // PLASMA HAMMER
            const hammerGroup = new THREE.Group();

            // Heavy Shaft
            const shaftGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.0);
            const shaftMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9, roughness: 0.3 });
            const shaft = new THREE.Mesh(shaftGeo, shaftMat);
            shaft.position.y = 0.5;
            hammerGroup.add(shaft);

            // Large glowing hammer head
            const headGeo = new THREE.BoxGeometry(0.4, 0.35, 0.7);
            const headMat = new THREE.MeshStandardMaterial({ 
                color: 0x1a0525, 
                roughness: 0.1, 
                metalness: 0.9,
                emissive: 0xff00ff,
                emissiveIntensity: 0.6
            });
            const head = new THREE.Mesh(headGeo, headMat);
            head.position.y = 1.0;
            hammerGroup.add(head);

            // Neon end-caps
            const glow1Geo = new THREE.BoxGeometry(0.42, 0.3, 0.05);
            const glowMat = new THREE.MeshBasicMaterial({ color: 0xff007f });
            const glow1 = new THREE.Mesh(glow1Geo, glowMat);
            glow1.position.set(0, 1.0, 0.35);
            const glow2 = glow1.clone();
            glow2.position.set(0, 1.0, -0.35);
            hammerGroup.add(glow1);
            hammerGroup.add(glow2);

            this.activeWeaponMesh = hammerGroup;
            this.attackRange = 4.6;
        }

        this.weaponGroup.add(this.activeWeaponMesh);
    }

    upgradeWeapon() {
        if (this.weaponTier < 2) {
            this.weaponTier++;
            this.updateWeaponAttachment();
            if (this.weaponSystem) {
                const weaponTypes = ["normal", "katana", "hammer"];
                this.weaponSystem.equipWeapon(weaponTypes[this.weaponTier]);
            }
            return true;
        }
        return false;
    }

    get isSwinging() {
        return this.weaponSystem ? this.weaponSystem.isSwinging : false;
    }

    set isSwinging(val) {
        if (this.weaponSystem) {
            this.weaponSystem.isSwinging = val;
        }
    }

    get attackRange() {
        return this.weaponSystem ? this.weaponSystem.range : 2.6;
    }

    set attackRange(val) {
        if (this.weaponSystem) {
            this.weaponSystem.range = val;
        }
    }

    changeLane(dir) {
        if (dir === 'left' && this.currentLane > 0) {
            this.currentLane--;
        } else if (dir === 'right' && this.currentLane < 2) {
            this.currentLane++;
        }
        this.targetX = this.lanes[this.currentLane];
    }

    jump() {
        if (!this.isJumping && !this.isSliding) {
            this.velY = this.jumpForce;
            this.isJumping = true;
            Sound.playJump();
        }
    }

    slide() {
        if (!this.isJumping && !this.isSliding) {
            this.isSliding = true;
            this.slideTimer = this.slideDuration;
            // Short squeal/slide pitch synthesis could go here
        }
    }

    swing() {
        if (this.swingCooldown <= 0) {
            // Cooldown scales with weapon: Bat (0.35s), Katana (0.25s), Hammer (0.5s)
            const baseCooldowns = [0.35, 0.25, 0.5];
            this.swingCooldown = baseCooldowns[this.weaponTier];
            if (this.weaponSystem) {
                this.weaponSystem.startSwing();
            }
            Sound.playSwing();
        }
    }

    update(dt, forwardSpeed) {
        // 1. Horizontal lane gliding
        const diffX = this.targetX - this.mesh.position.x;
        if (Math.abs(diffX) > 0.01) {
            this.mesh.position.x += diffX * this.laneSpeed * dt;
        } else {
            this.mesh.position.x = this.targetX;
        }

        // 2. Jump physics
        if (this.isJumping) {
            this.velY += this.gravity * dt;
            this.posY += this.velY * dt;
            if (this.posY <= 0) {
                this.posY = 0;
                this.velY = 0;
                this.isJumping = false;
            }
        }
        this.mesh.position.y = this.posY;

        // 3. Slide timer
        if (this.isSliding) {
            this.slideTimer -= dt;
            if (this.slideTimer <= 0) {
                this.isSliding = false;
            }
        }

        // 4. Attack swing animation
        if (this.swingCooldown > 0) {
            this.swingCooldown -= dt;
        }

        if (this.weaponSystem) {
            const wasSwinging = this.weaponSystem.isSwinging;
            const prevProgress = this.weaponSystem.swingProgress;
            
            this.weaponSystem.update(dt);
            
            if (this.weaponSystem.isSwinging) {
                if (this.weaponSystem.currentWeaponType === "katana") {
                    this.katanaArc.material.opacity = 0.88;
                    this.katanaArc.rotation.z = 0.5 - (this.weaponSystem.swingProgress / Math.PI) * Math.PI * 1.25;
                } else if (this.weaponSystem.currentWeaponType === "hammer") {
                    if (prevProgress < Math.PI / 2 && this.weaponSystem.swingProgress >= Math.PI / 2) {
                        this.hammerRing.material.opacity = 0.92;
                        this.hammerRing.scale.set(0.1, 0.1, 0.1);
                        FX.spawnExplosion(this.mesh.position.x, 0.05, this.mesh.position.z - 1.5, 'dust', 10);
                    }
                }
            }
        }

        // Fade out Katana Arc trail when not active
        if ((!this.weaponSystem || !this.weaponSystem.isSwinging) && this.katanaArc.material.opacity > 0) {
            this.katanaArc.material.opacity = Math.max(0, this.katanaArc.material.opacity - 6 * dt);
        }
        
        // Expand and fade out Hammer Shockwave ring
        if (this.hammerRing.material.opacity > 0) {
            this.hammerRing.scale.addScalar(5.5 * dt);
            this.hammerRing.material.opacity = Math.max(0, this.hammerRing.material.opacity - 3 * dt);
        }

        // 5. Procedural limb skeletal animations (Running cycles)
        if (!this.isJumping && !this.isSliding) {
            // Speed up swing speed depending on movement velocity
            this.runCycle += dt * forwardSpeed * 1.5;
            
            const swingAngle = Math.sin(this.runCycle);
            const counterAngle = -swingAngle;

            // Leg swings
            this.lLeg.rotation.x = swingAngle * 0.65;
            this.rLeg.rotation.x = counterAngle * 0.65;

            // Arm swings (when not attacking)
            if (!this.isSwinging) {
                this.lArm.rotation.x = counterAngle * 0.5;
                this.rArm.rotation.x = swingAngle * 0.5;
            }

            // Head bob
            this.head.rotation.x = (Math.sin(this.runCycle * 2) * 0.05) + 0.05;
            this.body.position.y = 0.95 + (Math.abs(Math.sin(this.runCycle * 2)) * 0.08);

            // Spawn dust particles from back feet on run steps
            if (Math.abs(swingAngle) > 0.85 && Math.random() < 0.3) {
                FX.spawnDustTrail(this.mesh.position.x, 0.05, this.mesh.position.z + 0.35);
            }
        } else if (this.isJumping) {
            // Tuck limbs during jump
            this.lLeg.rotation.x = -0.3;
            this.rLeg.rotation.x = -0.2;
            if (!this.isSwinging) {
                this.lArm.rotation.x = -0.4;
                this.rArm.rotation.x = -0.4;
            }
            this.body.position.y = 0.95 - (this.velY * 0.02);
        } else if (this.isSliding) {
            // Crouch: compress components vertically
            this.body.position.y = 0.55;
            this.head.position.y = 0.55;
            this.lLeg.rotation.x = -1.2;
            this.rLeg.rotation.x = -1.2;
            this.lLeg.position.y = 0.2;
            this.rLeg.position.y = 0.2;
            
            if (!this.isSwinging) {
                this.lArm.rotation.x = -0.8;
                this.rArm.rotation.x = -0.8;
            }
            
            // Spawn continuous slide dust particles
            if (Math.random() < 0.45) {
                FX.spawnDustTrail(this.mesh.position.x + (Math.random()-0.5)*0.3, 0.05, this.mesh.position.z + 0.2);
            }
        }

        // Restore normal positions if done sliding
        if (!this.isSliding) {
            this.lLeg.position.y = 0.5;
            this.rLeg.position.y = 0.5;
            this.head.position.y = 0.72;
        }
    }

    getBoundingBox() {
        // Return custom box collider bounds relative to player state
        const center = this.mesh.position.clone();
        
        let height = 1.8;
        let width = 0.9;
        let depth = 0.6;

        if (this.isSliding) {
            center.y += 0.4;
            height = 0.8;
        } else {
            center.y += 0.9;
        }

        return new THREE.Box3(
            new THREE.Vector3(center.x - width/2, center.y - height/2, center.z - depth/2),
            new THREE.Vector3(center.x + width/2, center.y + height/2, center.z + depth/2)
        );
    }
}

class WeaponSystem {
    constructor(playerGroup, scene) {
        this.player = playerGroup;
        this.scene = scene;
        this.currentWeaponType = "normal"; // Options: "normal", "katana", "hammer"
        
        // Create the weapon container mesh
        this.weaponGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.8);
        this.weaponMat = new THREE.MeshStandardMaterial({ 
            color: 0x00ffcc, 
            emissive: 0x00ffcc, 
            emissiveIntensity: 1.5, 
            roughness: 0.2 
        });
        this.weaponMesh = new THREE.Mesh(this.weaponGeo, this.weaponMat);
        
        // Pivot point initialization for clean circular arcs
        this.pivot = new THREE.Group();
        this.pivot.position.set(0.4, 0.8, -0.4); 
        this.weaponMesh.position.y = 0.9; // Shift cylinder up so it rotates from the hilt
        this.pivot.add(this.weaponMesh);
        this.player.add(this.pivot);

        // Weapon stats
        this.range = 2.2;
        this.arcAngle = 0;
        this.isSwinging = false;
        this.swingProgress = 0;
    }

    equipWeapon(type) {
        this.currentWeaponType = type;
        if (type === "katana") {
            this.weaponMat.color.setHex(0x00ffcc); // Cyan
            this.weaponMat.emissive.setHex(0x00ffcc);
            this.weaponMesh.scale.set(0.7, 1.3, 0.7); // Longer, thinner blade
            this.range = 3.2; // Extra reach
        } else if (type === "hammer") {
            this.weaponMat.color.setHex(0xff0055); // Neon Pink
            this.weaponMat.emissive.setHex(0xff0055);
            this.weaponMesh.scale.set(2.5, 1.0, 2.5); // Thick bludgeoning weapon
            this.range = 2.5; // Normal reach, massive impact width
        } else {
            this.weaponMat.color.setHex(0xffaa00); // Yellow Baton
            this.weaponMat.emissive.setHex(0xffaa00);
            this.weaponMesh.scale.set(1, 1, 1);
            this.range = 2.2;
        }
    }

    startSwing() {
        if (this.isSwinging) return;
        this.isSwinging = true;
        this.swingProgress = 0;
    }

    update(deltaTime) {
        if (!this.isSwinging) {
            // Idle weapon posture
            this.pivot.rotation.set(0, 0, -Math.PI / 6);
            return;
        }

        // Handle unique weapon motion arcs depending on selection
        if (this.currentWeaponType === "katana") {
            // Fast Horizontal Slicing Arc
            this.swingProgress += 22 * deltaTime; 
            this.pivot.rotation.y = -Math.sin(this.swingProgress) * 2.8;
            this.pivot.rotation.z = Math.sin(this.swingProgress) * 0.5;
        } else if (this.currentWeaponType === "hammer") {
            // Vertical Brutal Overhead Crushing Arc
            this.swingProgress += 14 * deltaTime; 
            this.pivot.rotation.x = -Math.sin(this.swingProgress) * 2.2;
            this.pivot.rotation.y = 0;
            this.pivot.rotation.z = -Math.PI / 6;
        } else {
            // Standard baseline sweep
            this.swingProgress += 16 * deltaTime;
            this.pivot.rotation.y = -Math.sin(this.swingProgress) * 2.0;
        }

        // Check completion
        if (this.swingProgress >= Math.PI) {
            this.isSwinging = false;
            this.pivot.rotation.set(0, 0, -Math.PI / 6);
        }
    }
}
