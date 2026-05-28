class SoundEngine {
    constructor() {
        this.ctx = null;
        this.bgmOsc = null;
        this.bgmNode = null;
        this.isBgmPlaying = false;
        this.isMuted = false;
    }

    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    resume() {
        this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // 👻 1. HORROR BACKGROUND MUSIC (Low, Creepy Cinematic Drone)
    startHorrorBGM() {
        this.init();
        this.resume();
        if (!this.ctx || this.isBgmPlaying || this.isMuted) return;
        this.isBgmPlaying = true;

        // Main dark drone oscillator
        this.bgmOsc = this.ctx.createOscillator();
        this.bgmNode = this.ctx.createGain();
        
        // Detuned sawtooth wave creates an eerie, tense horror atmosphere
        this.bgmOsc.type = "sawtooth";
        this.bgmOsc.frequency.setValueAtTime(55, this.ctx.currentTime); // Super low bass note (A1)
        
        // Low-pass filter to remove the "tinny" high pitch and leave a scary, heavy rumble
        let filter = this.ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(180, this.ctx.currentTime);

        // Subtly modulate the volume over time to simulate breathing/pulsing fear
        this.bgmNode.gain.setValueAtTime(0.18, this.ctx.currentTime);
        
        // Connect the nodes together
        this.bgmOsc.connect(filter);
        filter.connect(this.bgmNode);
        this.bgmNode.connect(this.ctx.destination);
        
        this.bgmOsc.start();
    }

    startBGM() {
        this.startHorrorBGM();
    }

    stopBGM() {
        this.isBgmPlaying = false;
        if (this.bgmOsc) {
            try {
                this.bgmOsc.stop();
                this.bgmOsc.disconnect();
            } catch (e) {}
            this.bgmOsc = null;
        }
        if (this.bgmNode) {
            try {
                this.bgmNode.disconnect();
            } catch (e) {}
            this.bgmNode = null;
        }
    }

    setMute(state) {
        this.isMuted = state;
        if (state) {
            this.stopBGM();
        } else if (this.isBgmPlaying) {
            this.isBgmPlaying = false;
            this.startHorrorBGM();
        }
    }

    // 🏏 2. REALISTIC ZOMBIE HITTING SOUND (Flesh Splat + Bone Crunch)
    playZombieSmashSound(isHammer = false) {
        this.init();
        this.resume();
        if (!this.ctx || this.isMuted) return;

        const now = this.ctx.currentTime;

        // --- LAYER A: The Deep Flesh Impact Thud ---
        let thudOsc = this.ctx.createOscillator();
        let thudGain = this.ctx.createGain();
        thudOsc.type = "triangle";
        thudOsc.frequency.setValueAtTime(120, now);
        thudOsc.frequency.exponentialRampToValueAtTime(10, now + 0.15); // Quick deep drop
        thudGain.gain.setValueAtTime(0.6, now);
        thudGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        thudOsc.connect(thudGain);
        thudGain.connect(this.ctx.destination);
        thudOsc.start();
        thudOsc.stop(now + 0.15);

        // --- LAYER B: The Wet/Crunchy Splat (Using Audio Distortion) ---
        let bufferSize = this.ctx.sampleRate * 0.12; // Short 0.12 second burst
        let buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        let data = buffer.getChannelData(0);
        
        // Generate raw White Noise (Simulates squishing/breaking friction textures)
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        let noiseNode = this.ctx.createBufferSource();
        noiseNode.buffer = buffer;

        // Filter the noise so it sounds like cracking bones rather than static static hiss
        let crunchFilter = this.ctx.createBiquadFilter();
        crunchFilter.type = "bandpass";
        crunchFilter.frequency.setValueAtTime(isHammer ? 300 : 600, now);
        crunchFilter.Q.setValueAtTime(4, now);

        let noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(isHammer ? 0.5 : 0.35, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        noiseNode.connect(crunchFilter);
        crunchFilter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        
        noiseNode.start();
        noiseNode.stop(now + 0.12);
    }

    playHitWeapon(tier) {
        this.playZombieSmashSound(tier === 2);
    }

    playHit() {
        this.playHitWeapon(0);
    }

    // 💨 3. REALISTIC LANE SWIPE (Heavy Wind Whoosh)
    playLaneDashSound() {
        this.init();
        this.resume();
        if (!this.ctx || this.isMuted) return;

        const now = this.ctx.currentTime;
        let bufferSize = this.ctx.sampleRate * 0.15;
        let buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        let data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        let noiseNode = this.ctx.createBufferSource();
        noiseNode.buffer = buffer;

        // Dynamic Sweeping Lowpass Filter to make it sound like a passing gust of air
        let swoopFilter = this.ctx.createBiquadFilter();
        swoopFilter.type = "lowpass";
        swoopFilter.frequency.setValueAtTime(400, now);
        swoopFilter.frequency.exponentialRampToValueAtTime(80, now + 0.15);

        let gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(0.25, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        noiseNode.connect(swoopFilter);
        swoopFilter.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        noiseNode.start();
        noiseNode.stop(now + 0.15);
    }

    playLaneChange(dir) {
        this.playLaneDashSound();
    }

    // 🏃♂️ 4. HEAVY JUMP EXERTION (Low Grunt/Air Burst)
    playJumpSound() {
        this.init();
        this.resume();
        if (!this.ctx || this.isMuted) return;

        const now = this.ctx.currentTime;
        let osc = this.ctx.createOscillator();
        let gain = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(90, now);
        osc.frequency.linearRampToValueAtTime(40, now + 0.18);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(now + 0.18);
    }

    playJump() {
        this.playJumpSound();
    }

    // 💨 5. WEAPON SWING WHOOSH
    playSwing() {
        this.resume();
        if (!this.ctx || this.isMuted) return;

        const now = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * 0.18; // 180ms
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(400, now);
        filter.frequency.exponentialRampToValueAtTime(1600, now + 0.15);
        filter.Q.setValueAtTime(3.0, now);

        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        noise.start(now);
        noise.stop(now + 0.2);
    }

    // 🔔 6. DIGITAL CHIME FOR BIO-CAPSULES
    playChime() {
        this.resume();
        if (!this.ctx || this.isMuted) return;

        const time = this.ctx.currentTime;
        
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        
        osc1.type = 'sine';
        osc2.type = 'sine';
        
        // High crystalline digital bells (harmonious chords)
        osc1.frequency.setValueAtTime(1200, time);
        osc1.frequency.exponentialRampToValueAtTime(1800, time + 0.15);
        
        osc2.frequency.setValueAtTime(1500, time);
        osc2.frequency.exponentialRampToValueAtTime(2200, time + 0.18);

        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(0.2, time);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        osc1.start(time);
        osc2.start(time);
        osc1.stop(time + 0.3);
        osc2.stop(time + 0.3);
    }

    // 💥 7. HURT / SYSTEM CRASH WARNING
    playHurt() {
        this.resume();
        if (!this.ctx || this.isMuted) return;

        const time = this.ctx.currentTime;
        
        // Deep warning explosion
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.linearRampToValueAtTime(40, time + 0.4);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, time);

        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(0.8, time);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.45);

        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        osc.start(time);
        osc.stop(time + 0.5);
    }

    // 🆙 8. UPGRADE PURCHASE CONFIRMATION
    playUpgrade() {
        this.resume();
        if (!this.ctx || this.isMuted) return;

        const time = this.ctx.currentTime;
        
        // Positive arpeggio synth trigger
        const notes = [440, 554.37, 659.25, 880];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, time + idx * 0.08);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.12, time + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, time + idx * 0.08 + 0.15);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(time + idx * 0.08);
            osc.stop(time + idx * 0.08 + 0.2);
        });
    }
}

// Global single instance export
const Sound = new SoundEngine();
const audioEngine = Sound;
window.audioEngine = Sound;
