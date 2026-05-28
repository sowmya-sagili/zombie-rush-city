const vm = require('vm');
const fs = require('fs');
const path = require('path');

const mockAudioContext = function() {
    this.currentTime = Date.now() / 1000;
    this.destination = {};
    this.createGain = () => ({
        connect: () => {},
        disconnect: () => {},
        gain: {
            setValueAtTime: () => {},
            exponentialRampToValueAtTime: () => {}
        }
    });
    this.createOscillator = () => ({
        connect: () => {},
        start: () => {},
        stop: () => {},
        type: 'sine',
        frequency: {
            setValueAtTime: () => {},
            exponentialRampToValueAtTime: () => {}
        }
    });
    this.createBuffer = () => ({
        getChannelData: () => new Float32Array(100)
    });
    this.createBufferSource = () => ({
        connect: () => {},
        start: () => {},
        stop: () => {},
        buffer: null
    });
    this.createBiquadFilter = () => ({
        connect: () => {},
        type: 'lowpass',
        frequency: {
            setValueAtTime: () => {},
            exponentialRampToValueAtTime: () => {}
        },
        Q: {
            setValueAtTime: () => {}
        }
    });
};

let loopCount = 0;
const sandbox = {
    window: null,
    addEventListener: () => {},
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    console: console,
    performance: { now: () => Date.now() },
    requestAnimationFrame: (cb) => {
        if (loopCount < 10) {
            loopCount++;
            setTimeout(() => cb(Date.now()), 16);
        } else {
            console.log("Mock test completed successfully after 10 loop cycles!");
            process.exit(0);
        }
    },
    document: {
        addEventListener: () => {},
        getElementById: () => ({
            addEventListener: () => {},
            classList: { add: () => {}, remove: () => {} },
            style: {},
            getContext: () => ({}),
            appendChild: () => {}
        }),
        createElement: () => ({ style: {}, appendChild: () => {} }),
        body: { appendChild: () => {} }
    },
    localStorage: {
        getItem: () => "16",
        setItem: () => {}
    },
    webkitAudioContext: mockAudioContext,
    AudioContext: mockAudioContext,
    THREE: null
};

sandbox.THREE = {
    Vector3: function() {
        this.x = 0; this.y = 0; this.z = 0;
        this.set = (x,y,z) => { this.x = x; this.y = y; this.z = z; };
        this.copy = (v) => { this.x = v.x; this.y = v.y; this.z = v.z; };
        this.clone = () => { const r = new sandbox.THREE.Vector3(); r.copy(this); return r; };
        this.addScaledVector = (v, s) => { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; };
        this.multiplyScalar = (s) => { this.x *= s; this.y *= s; this.z *= s; };
        this.addScalar = (s) => { this.x += s; this.y += s; this.z += s; };
        this.add = (v) => { this.x += v.x; this.y += v.y; this.z += v.z; };
        this.distanceTo = (v) => Math.sqrt((this.x - v.x) ** 2 + (this.y - v.y) ** 2 + (this.z - v.z) ** 2);
    },
    Object3D: function() {
        this.position = new sandbox.THREE.Vector3();
        this.rotation = new sandbox.THREE.Vector3();
        this.scale = new sandbox.THREE.Vector3();
        this.scale.set(1, 1, 1);
        this.clone = () => new sandbox.THREE.Object3D();
    },
    Group: function() {
        this.children = [];
        this.position = new sandbox.THREE.Vector3();
        this.rotation = new sandbox.THREE.Vector3();
        this.scale = new sandbox.THREE.Vector3();
        this.scale.set(1, 1, 1);
        this.add = (child) => { this.children.push(child); };
        this.remove = (child) => {
            const idx = this.children.indexOf(child);
            if (idx !== -1) this.children.splice(idx, 1);
        };
        this.clone = () => new sandbox.THREE.Group();
        this.getObjectByName = () => new sandbox.THREE.Mesh();
    },
    Scene: function() {
        this.children = [];
        this.add = (child) => { this.children.push(child); };
        this.remove = (child) => {
            const idx = this.children.indexOf(child);
            if (idx !== -1) this.children.splice(idx, 1);
        };
    },
    Color: function() {},
    FogExp2: function() {},
    PerspectiveCamera: function() {
        this.position = new sandbox.THREE.Vector3();
        this.lookAt = () => {};
        this.aspect = 1.0;
        this.updateProjectionMatrix = () => {};
        this.updateMatrixWorld = () => {};
    },
    WebGLRenderer: function() {
        this.setSize = () => {};
        this.setPixelRatio = () => {};
        this.shadowMap = {};
        this.domElement = {};
        this.render = () => {};
    },
    AmbientLight: function() {},
    DirectionalLight: function() {
        this.position = new sandbox.THREE.Vector3();
        this.target = { position: new sandbox.THREE.Vector3() };
        this.shadow = { mapSize: { width: 0, height: 0 }, camera: { near: 0, far: 0 } };
    },
    SpotLight: function() {
        this.position = new sandbox.THREE.Vector3();
        this.target = { position: new sandbox.THREE.Vector3() };
        this.shadow = { mapSize: { width: 0, height: 0 }, camera: { near: 0, far: 0 } };
    },
    PointLight: function() {
        this.position = new sandbox.THREE.Vector3();
    },
    BoxGeometry: function() {},
    CylinderGeometry: function() {},
    PlaneGeometry: function() {},
    RingGeometry: function() {},
    OctahedronGeometry: function() {},
    SphereGeometry: function() {},
    MeshStandardMaterial: function() {
        this.color = { setHex: () => {} };
        this.emissive = { setHex: () => {} };
    },
    MeshBasicMaterial: function() {
        this.color = { setHex: () => {} };
        this.opacity = 1.0;
    },
    Mesh: function() {
        this.children = [];
        this.position = new sandbox.THREE.Vector3();
        this.rotation = new sandbox.THREE.Vector3();
        this.scale = new sandbox.THREE.Vector3();
        this.scale.set(1, 1, 1);
        this.material = { color: { setHex: () => {} }, opacity: 1.0 };
        this.add = (child) => { this.children.push(child); };
        this.remove = (child) => {
            const idx = this.children.indexOf(child);
            if (idx !== -1) this.children.splice(idx, 1);
        };
        this.userData = {};
        this.clone = () => new sandbox.THREE.Mesh();
    },
    Box3: function() {
        this.setFromObject = () => this;
        this.intersectsBox = () => false;
    },
    DoubleSide: {}
};

sandbox.window = sandbox;
vm.createContext(sandbox);

function loadScript(filePath) {
    const code = fs.readFileSync(path.join(__dirname, '..', filePath), 'utf-8');
    try {
        vm.runInContext(code, sandbox, { filename: filePath });
        console.log(`Successfully loaded: ${filePath}`);
    } catch (e) {
        console.error(`CRITICAL ERROR in ${filePath}:`, e);
        process.exit(1);
    }
}

loadScript('js/Sound.js');
loadScript('js/FX.js');
loadScript('js/Player.js');
loadScript('js/Zombie.js');
loadScript('js/World.js');
loadScript('js/UI.js');
loadScript('js/Game.js');

// Test instantiate and start
try {
    vm.runInContext(`
        const coordinator = new GameCoordinator();
        console.log("GameCoordinator successfully instantiated!");
        coordinator.startGame();
        console.log("startGame() executed successfully!");
    `, sandbox);
} catch (e) {
    console.error("CRITICAL ERROR during execution:", e);
}
