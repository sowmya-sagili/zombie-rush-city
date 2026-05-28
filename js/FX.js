class FXEngine {
    constructor() {
        this.scene = null;
        this.camera = null;
        
        // Pools
        this.particles = [];
        this.particlePool = [];
        this.maxParticles = 300;

        // Camera Shake State
        this.shakeIntensity = 0;
        this.shakeDecay = 0.9;
        this.originalCameraPos = new THREE.Vector3(0, 3.5, 6);

        // Flash Light State
        this.flashLight = null;
        this.flashTimer = 0;
    }

    init(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.originalCameraPos.copy(camera.position);

        // Create a pool of reusable meshes to avoid garbage collection hitches
        const particleGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
        for (let i = 0; i < this.maxParticles; i++) {
            const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1 });
            const mesh = new THREE.Mesh(particleGeo, mat);
            mesh.visible = false;
            this.scene.add(mesh);
            this.particlePool.push({
                mesh: mesh,
                velocity: new THREE.Vector3(),
                gravity: 0,
                life: 0,
                maxLife: 0,
                colorType: 'dust',
                rotSpeed: new THREE.Vector3()
            });
        }

        // Dedicated Flash PointLight
        this.flashLight = new THREE.PointLight(0xffffff, 0, 30);
        this.flashLight.position.set(0, 5, 0);
        this.scene.add(this.flashLight);
    }

    spawnParticle(x, y, z, vx, vy, vz, gravity, maxLife, colorType) {
        // Find an inactive particle from the pool
        const p = this.particlePool.find(item => !item.mesh.visible);
        if (!p) return; // Pool full

        p.mesh.position.set(x, y, z);
        p.velocity.set(vx, vy, vz);
        p.gravity = gravity;
        p.life = maxLife;
        p.maxLife = maxLife;
        p.colorType = colorType;
        
        // Random spin
        p.rotSpeed.set(
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 5
        );

        // Color theme assignments
        p.mesh.material.opacity = 1.0;
        p.mesh.visible = true;

        if (colorType === 'dust') {
            p.mesh.material.color.setHex(0xa89f91);
            p.mesh.scale.set(1, 1, 1);
        } else if (colorType === 'blood_green') {
            p.mesh.material.color.setHex(0x39ff14); // Neon green zombie goo
            p.mesh.scale.set(1.5, 1.5, 1.5);
        } else if (colorType === 'blood_red') {
            p.mesh.material.color.setHex(0xff003c); // Retro neon red blood
            p.mesh.scale.set(1.5, 1.5, 1.5);
        } else if (colorType === 'spark_cyan') {
            p.mesh.material.color.setHex(0x00ffff); // Cyberspark melee hit
            p.mesh.scale.set(1.2, 0.4, 1.2); // Elongated sparks
        } else if (colorType === 'spark_pink') {
            p.mesh.material.color.setHex(0xff007f); // Capsule chime sparkles
            p.mesh.scale.set(0.8, 0.8, 0.8);
        }
        
        this.particles.push(p);
    }

    spawnExplosion(x, y, z, type, count = 15) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 4.5;
            const vx = Math.cos(angle) * speed * 0.8;
            const vy = 1.5 + Math.random() * 5.0; // Fly up
            const vz = Math.sin(angle) * speed * 0.8 - 2.0; // Burst slightly backwards

            const maxLife = 0.3 + Math.random() * 0.4;
            const gravity = -9.8;
            this.spawnParticle(x, y, z, vx, vy, vz, gravity, maxLife, type);
        }
    }

    spawnDustTrail(x, y, z) {
        // Subtle runner foot step dust
        const vx = (Math.random() - 0.5) * 0.8;
        const vy = 0.2 + Math.random() * 0.8;
        const vz = 1.0 + Math.random() * 1.5; // Fly backward
        this.spawnParticle(x, y, z, vx, vy, vz, -2, 0.25, 'dust');
    }

    triggerShake(intensity) {
        this.shakeIntensity = Math.min(this.shakeIntensity + intensity, 0.65);
    }

    triggerFlash(colorHex, duration = 0.15) {
        this.flashLight.color.setHex(colorHex);
        this.flashLight.intensity = 5.0;
        this.flashTimer = duration;
    }

    update(dt, playerZ) {
        // 1. Update active particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;

            if (p.life <= 0) {
                p.mesh.visible = false;
                this.particles.splice(i, 1);
                continue;
            }

            // Apply velocity & gravity
            p.velocity.y += p.gravity * dt;
            p.mesh.position.addScaledVector(p.velocity, dt);

            // Apply spin
            p.mesh.rotation.x += p.rotSpeed.x * dt;
            p.mesh.rotation.y += p.rotSpeed.y * dt;
            p.mesh.rotation.z += p.rotSpeed.z * dt;

            // Fade out
            p.mesh.material.opacity = Math.max(0, p.life / p.maxLife);
        }

        // Keep flash light centered on player
        if (this.flashLight) {
            this.flashLight.position.z = playerZ - 2;
            if (this.flashTimer > 0) {
                this.flashTimer -= dt;
                if (this.flashTimer <= 0) {
                    this.flashLight.intensity = 0;
                } else {
                    this.flashLight.intensity = (this.flashTimer / 0.15) * 5.0;
                }
            }
        }

        // 2. Camera shake physics
        if (this.shakeIntensity > 0.01) {
            const dx = (Math.random() - 0.5) * this.shakeIntensity;
            const dy = (Math.random() - 0.5) * this.shakeIntensity;
            const dz = (Math.random() - 0.5) * this.shakeIntensity;
            
            // Adjust camera position relative to player tracking
            this.camera.position.x = dx;
            this.camera.position.y = 3.5 + dy;
            // Z tracking is handled in Game.js, shake adds minor delta
            this.camera.position.z += dz;

            this.shakeIntensity *= this.shakeDecay;
        } else {
            this.camera.position.x = 0;
            this.camera.position.y = 3.5;
        }
    }
}

// Global single instance export
const FX = new FXEngine();
