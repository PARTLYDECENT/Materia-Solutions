// materia9.js
// ═══════════════════════════════════════════════════════════════
// MATERIA SOLUTIONS — Acoustic Singularity (Resonant Ambient)
// Generative audio engine running at 80 BPM. Powered by a custom
// physical modeling waveguide Comb Resonator sound shader that
// resonates dry inputs into massive bowed-string drone soundscapes.
// ═══════════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ─── HARMONIC SCALE — LYDIAN ───
    const SCALE = [0, 2, 4, 6, 7, 9, 11]; // C Lydian
    const ROOT = 65.41; // C2

    function getScaleFreq(index, octave = 3) {
        const degree = index % SCALE.length;
        const octOffset = Math.floor(index / SCALE.length) + octave;
        return ROOT * Math.pow(2, (SCALE[degree] + octOffset * 12) / 12);
    }

    const CHORD_ROOTS = [0, 2, 7, 5]; // C, D, G, F

    // ─── ENGINE STATE ───
    let ctx = null;
    let master = null;
    let shaderNode = null;
    let isPlaying = false;
    let bpm = 80;
    let stepDuration;
    let engineStartTime = 0;

    let dryBus;

    let sequencer = null;
    const scheduleAheadTime = 0.15;
    const schedulerInterval = 30; // ms
    let nextStepTime = 0;
    let schedulerTimerID = null;
    let currentChordIdx = 0;

    // ─── INIT ───
    function init() {
        if (ctx) return;
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        stepDuration = 60 / bpm / 4; // 16th note

        // Master Gain
        master = ctx.createGain();
        master.gain.setValueAtTime(0, ctx.currentTime);
        master.gain.linearRampToValueAtTime(0.42, ctx.currentTime + 4);

        // --- Custom Comb Resonator DSP Sound Shader Node ---
        const resonator = window.MateriaDSP.createCombResonator(4096);
        shaderNode = window.MateriaDSP.createAudioShaderNode(ctx, 1024, function (sampleL, sampleR, time, index) {
            const elapsed = time - engineStartTime;
            
            // Sweep the delay time (tube length) using a very slow LFO
            const lfo = 0.5 + 0.5 * Math.sin(elapsed * 0.11);
            
            // Delay time from 150 to 390 samples resonates at G2 to E3 pitch range
            const delaySamples = 150 + 240 * lfo;
            const feedback = 0.945 + 0.02 * Math.sin(elapsed * 0.19); // High feedback

            const [resL, resR] = resonator(sampleL, sampleR, delaySamples, feedback);

            // Mix dry click and resonant wet string
            const dry = 0.08;
            const wet = 0.92;
            return [
                sampleL * dry + resL * wet,
                sampleR * dry + resR * wet
            ];
        });

        // Routing: Buses -> Shader Node -> Master -> Destination
        shaderNode.connect(master);
        master.connect(ctx.destination);

        // Dry Input Bus
        dryBus = ctx.createGain();
        dryBus.gain.value = 0.28;
        dryBus.connect(shaderNode);

        engineStartTime = ctx.currentTime;
    }

    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    // ═══════════════════════════════════════════════════════════════
    // ─── SYNTHESIS MODULES ───
    // ═══════════════════════════════════════════════════════════════

    // ▸ DRY PLUCK TRIGGERS (Excitation source for the Resonator)
    function playDryPluck(time, chordRoot, step) {
        const baseFreq = ROOT * Math.pow(2, chordRoot / 12);
        const scaleIdx = (step * 3) % SCALE.length;
        const freq = baseFreq * Math.pow(2, (SCALE[scaleIdx] + 24) / 12); // High register
        const dur = 0.06; // Dry short pluck

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(0.8, time + 0.002);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        const panner = ctx.createStereoPanner();
        panner.pan.value = Math.sin(step * 0.45) * 0.8;

        osc.connect(env);
        env.connect(panner);
        panner.connect(dryBus);

        osc.start(time);
        osc.stop(time + dur + 0.05);
    }

    // ▸ WHITE NOISE DUST (Excitation crackle simulating vinyl dust)
    function playNoiseDust(time) {
        const dur = 0.005 + Math.random() * 0.015; // Extremely short spikes

        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = 12000; // Super high click

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.08, time);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        const panner = ctx.createStereoPanner();
        panner.pan.value = (Math.random() - 0.5) * 1.8;

        osc.connect(env);
        env.connect(panner);
        panner.connect(dryBus);

        osc.start(time);
        osc.stop(time + dur + 0.05);
    }

    // ═══════════════════════════════════════════════════════════════
    // ─── SEQUENCER LOOP ───
    // ═══════════════════════════════════════════════════════════════

    function* ambientSequencer() {
        let step = 0;
        let bar = 0;

        while (true) {
            if (step === 0 && bar % 4 === 0) {
                currentChordIdx = (currentChordIdx + 1) % CHORD_ROOTS.length;
            }

            const chordRoot = CHORD_ROOTS[currentChordIdx];

            // Sparse rhythmic triggers to excite the comb filters
            const pluckTrigger = (step === 0 || step === 4 || step === 10 || step === 12);
            // Random dust crackles to add beautiful organic noise sweeps
            const dustTrigger = (Math.random() < 0.35);

            yield { chordRoot, pluckTrigger, dustTrigger, step };

            step = (step + 1) % 16;
            if (step === 0) bar++;
        }
    }

    function scheduleNotes() {
        if (nextStepTime < ctx.currentTime - scheduleAheadTime) {
            nextStepTime = ctx.currentTime + 0.05;
        }

        while (nextStepTime < ctx.currentTime + scheduleAheadTime) {
            const state = sequencer.next().value;
            const t = Math.max(nextStepTime, ctx.currentTime);

            if (state.pluckTrigger) playDryPluck(t, state.chordRoot, state.step);
            if (state.dustTrigger) playNoiseDust(t);

            nextStepTime += stepDuration;
        }
    }

    function schedulerLoop() {
        scheduleNotes();
        schedulerTimerID = setTimeout(schedulerLoop, schedulerInterval);
    }

    // ─── CONTROLS ───
    function start() {
        if (isPlaying) return;
        init();
        if (ctx.state === 'suspended') ctx.resume();
        isPlaying = true;
        engineStartTime = ctx.currentTime;
        nextStepTime = ctx.currentTime;
        sequencer = ambientSequencer();
        schedulerLoop();
    }

    function stop() {
        isPlaying = false;
        if (schedulerTimerID) clearTimeout(schedulerTimerID);
        schedulerTimerID = null;
        if (master) {
            master.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.5);
        }
    }

    window.MateriaMusic9 = { start, stop };

})();
