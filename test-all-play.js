const fs = require('fs');

const mockCtx = {
    currentTime: 0,
    state: 'suspended',
    sampleRate: 44100,
    resume() { this.state = 'running'; },
    createDynamicsCompressor() { return { threshold: { value: 0 }, knee: { value: 0 }, ratio: { value: 0 }, attack: { value: 0 }, release: { value: 0 }, connect() {} }; },
    createWaveShaper() { return { connect() {} }; },
    createGain() { return { gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} }, connect() {} }; },
    createAnalyser() { return { connect() {} }; },
    createConvolver() { return { connect() {} }; },
    createDelay() { return { delayTime: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; },
    createStereoPanner() { return { pan: { value: 0, setValueAtTime() {} }, connect() {} }; },
    createBiquadFilter() { return { frequency: { value: 100, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setValueCurveAtTime() {} }, Q: { value: 1, setValueAtTime() {} }, gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} }, connect() {} }; },
    createBuffer() { return { getChannelData() { return new Float32Array(100); } }; },
    createBufferSource() { return { connect() {}, start() {}, stop() {} }; },
    createOscillator() { return { frequency: { value: 100, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, detune: { value: 0, setValueAtTime() {} }, connect() {}, start() {}, stop() {} }; }
};

global.window = {
    AudioContext: function() { return mockCtx; },
    webkitAudioContext: function() { return mockCtx; }
};

try {
    // 1. Test I Got Europa (materia13.js)
    console.log("Loading I Got Europa (materia13.js)...");
    const m13Code = fs.readFileSync('/home/damion/Desktop/Materia-Solutions/materia13.js', 'utf8');
    eval(m13Code);
    console.log("window.MateriaMusic13 keys:", Object.keys(global.window.MateriaMusic13));

    // Override setTimeout
    let timeoutCb = null;
    global.setTimeout = (cb, ms) => {
        timeoutCb = cb;
        return 999;
    };

    console.log("Starting MateriaMusic13...");
    global.window.MateriaMusic13.start();
    for (let i = 0; i < 40; i++) {
        mockCtx.currentTime += 0.05;
        if (timeoutCb) {
            const currentCb = timeoutCb;
            timeoutCb = null;
            currentCb();
        }
    }
    global.window.MateriaMusic13.stop();
    console.log("MateriaMusic13 verified successfully.");

    // Reset state
    timeoutCb = null;

    // 2. Test plugin2.js
    console.log("Loading plugin2.js...");
    const pluginCode = fs.readFileSync('/home/damion/Desktop/Materia-Solutions/plugin2.js', 'utf8');
    eval(pluginCode);
    console.log("window.EuropaDSP keys:", Object.keys(global.window.EuropaDSP));

    // 3. Test Materia XIV (materia14.js)
    console.log("Loading Materia XIV (materia14.js)...");
    const m14Code = fs.readFileSync('/home/damion/Desktop/Materia-Solutions/materia14.js', 'utf8');
    eval(m14Code);
    console.log("window.MateriaMusic14 keys:", Object.keys(global.window.MateriaMusic14));

    console.log("Starting MateriaMusic14...");
    global.window.MateriaMusic14.start();
    for (let i = 0; i < 40; i++) {
        mockCtx.currentTime += 0.05;
        if (timeoutCb) {
            const currentCb = timeoutCb;
            timeoutCb = null;
            currentCb();
        }
    }
    global.window.MateriaMusic14.stop();
    console.log("MateriaMusic14 verified successfully.");

    console.log("All simulations finished successfully. No runtime errors or exceptions found!");
} catch (e) {
    console.error("Error during simulation:", e);
    process.exit(1);
}
