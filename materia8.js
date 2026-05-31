// materia8.js
// ═══════════════════════════════════════════════════════════════
// MATERIA SOLUTIONS — Supernova Fractal (Glitch Synthwave)
// Generative audio engine running at 138 BPM. Powered by a
// dynamic sample-level Web Audio DSP Master Sound Shader
// combining Buchla Wavefolding and Quantum Decimating (Bitcrush).
// ═══════════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ─── HARMONIC SCALE — PHRYGIAN DOMINANT ───
    const SCALE = [0, 1, 4, 5, 7, 8, 10]; // C Phrygian Dominant
    const ROOT = 65.41; // C2

    function getScaleFreq(index, octave = 3) {
        const degree = index % SCALE.length;
        const octOffset = Math.floor(index / SCALE.length) + octave;
        return ROOT * Math.pow(2, (SCALE[degree] + octOffset * 12) / 12);
    }

    const CHORD_ROOTS = [0, 8, 5, 7]; // C, Ab, F, G

    // ─── ENGINE STATE ───
    let ctx = null;
    let master = null;
    let shaderNode = null;
    let isPlaying = false;
    let bpm = 138; // Intense Glitch-Hop/Synthwave tempo
    let stepDuration;
    let engineStartTime = 0;

    let bassBus, leadBus, drumBus;

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
        master.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 3);

        // --- Custom DSP Sound Shader Node ---
        const decimator = window.MateriaDSP.createDecimator();
        shaderNode = window.MateriaDSP.createAudioShaderNode(ctx, 1024, function (sampleL, sampleR, time, index) {
            const elapsed = time - engineStartTime;
            
            // Sweep modulation parameters using desynchronized LFOs
            const folderLfo = 0.5 + 0.5 * Math.sin(elapsed * 0.28);
            const crushLfo = 0.5 + 0.5 * Math.sin(elapsed * 0.45 + 1.8);
            
            // 1. Apply wavefold (0.8 to 3.8 drive sweep, 2 fold stages)
            const drive = 1.0 + 3.2 * folderLfo;
            const foldedL = window.MateriaDSP.wavefold(sampleL, drive, 2);
            const foldedR = window.MateriaDSP.wavefold(sampleR, drive, 2);
            
            // 2. Apply decimation (downsampling step 1-6, bit-depth 4-10 bits)
            const bits = 4.5 + 5.5 * (1 - crushLfo);
            const downsample = Math.floor(1 + 3.8 * crushLfo);
            const [crushedL, crushedR] = decimator(foldedL, foldedR, bits, downsample);

            return [crushedL, crushedR];
        });

        // Routing: Buses -> Shader Node -> Master -> Destination
        shaderNode.connect(master);
        master.connect(ctx.destination);

        // Buses
        bassBus = ctx.createGain(); bassBus.gain.value = 0.42; bassBus.connect(shaderNode);
        leadBus = ctx.createGain(); leadBus.gain.value = 0.24; leadBus.connect(shaderNode);
        drumBus = ctx.createGain(); drumBus.gain.value = 0.55; drumBus.connect(shaderNode);

        engineStartTime = ctx.currentTime;
    }

    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    // ═══════════════════════════════════════════════════════════════
    // ─── SYNTHESIS MODULES ───
    // ═══════════════════════════════════════════════════════════════

    // ▸ HEAVY WAVEFOLDED BASS
    function playBass(time, chordRoot, step) {
        const baseFreq = ROOT * Math.pow(2, chordRoot / 12) * 0.5; // Octave 1
        const freq = step % 8 === 0 ? baseFreq * 1.5 : baseFreq;
        const dur = stepDuration * 1.5;

        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq * 1.1, time);
        osc.frequency.exponentialRampToValueAtTime(freq, time + 0.04);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, time);
        filter.frequency.exponentialRampToValueAtTime(180, time + dur);
        filter.Q.value = 4.0;

        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(0.75, time + 0.008);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        osc.connect(filter);
        filter.connect(env);
        env.connect(bassBus);

        osc.start(time);
        osc.stop(time + dur + 0.1);
    }

    // ▸ GLITCH FRACTAL LEAD
    function playGlitchLead(time, chordRoot, step) {
        const baseFreq = ROOT * Math.pow(2, chordRoot / 12);
        // Pentatonic upward arpeggiation with occasional pitch multipliers
        const scaleNotes = [0, 2, 4, 7, 9];
        const noteIdx = scaleNotes[step % scaleNotes.length];
        const freq = baseFreq * Math.pow(2, (noteIdx + 24) / 12); // Octave 4
        const dur = stepDuration * 1.1;

        const osc1 = ctx.createOscillator();
        osc1.type = 'square';
        osc1.frequency.setValueAtTime(freq, time);

        // Rapid frequency pitch modulation
        if (step % 4 === 3) {
            osc1.frequency.setValueAtTime(freq * 1.5, time + 0.05);
        }

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(freq * 2, time);
        filter.Q.value = 3.5;

        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(0.3, time + 0.002);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        osc1.connect(filter);
        filter.connect(env);
        env.connect(leadBus);

        osc1.start(time);
        osc1.stop(time + dur + 0.1);
    }

    // ▸ GLITCH DRUM SEQUENCER
    function playDrums(time, type) {
        if (type === 'kick') {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(150, time);
            osc.frequency.exponentialRampToValueAtTime(46, time + 0.12);

            const env = ctx.createGain();
            env.gain.setValueAtTime(0.9, time);
            env.gain.exponentialRampToValueAtTime(0.001, time + 0.28);

            osc.connect(env);
            env.connect(drumBus);
            osc.start(time);
            osc.stop(time + 0.3);
        } else if (type === 'snare') {
            // White noise burst
            const bufSize = ctx.sampleRate * 0.18;
            const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

            const src = ctx.createBufferSource();
            src.buffer = buf;

            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 1100;
            filter.Q.value = 1.5;

            const env = ctx.createGain();
            env.gain.setValueAtTime(0.35, time);
            env.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

            src.connect(filter);
            filter.connect(env);
            env.connect(drumBus);
            src.start(time);
            src.stop(time + 0.2);
        } else if (type === 'hat') {
            // Hi-hat frequency peak click
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.value = 9000;

            const env = ctx.createGain();
            env.gain.setValueAtTime(0.06, time);
            env.gain.exponentialRampToValueAtTime(0.001, time + 0.03);

            osc.connect(env);
            env.connect(drumBus);
            osc.start(time);
            osc.stop(time + 0.05);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // ─── SEQUENCER LOOP ───
    // ═══════════════════════════════════════════════════════════════

    function* glitchSequencer() {
        let step = 0;
        let bar = 0;

        while (true) {
            if (step === 0 && bar % 2 === 0) {
                currentChordIdx = (currentChordIdx + 1) % CHORD_ROOTS.length;
            }

            const chordRoot = CHORD_ROOTS[currentChordIdx];

            // Glitch Hop Syncopated Patterns
            const kickTrigger = (step === 0 || step === 10 || (step === 6 && Math.random() < 0.25));
            const snareTrigger = (step === 4 || step === 12);
            const hatTrigger = (step % 2 === 0 || Math.random() < 0.3);

            const bassTrigger = (step % 4 !== 1); // 16th driving bassline
            const leadTrigger = (step % 4 === 0 || (step % 6 === 2 && Math.random() < 0.45));

            yield { step, bar, chordRoot, kickTrigger, snareTrigger, hatTrigger, bassTrigger, leadTrigger };

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

            // Play Instruments
            if (state.kickTrigger) playDrums(t, 'kick');
            if (state.snareTrigger) playDrums(t, 'snare');
            if (state.hatTrigger) playDrums(t, 'hat');
            if (state.bassTrigger) playBass(t, state.chordRoot, state.step);
            if (state.leadTrigger) playGlitchLead(t, state.chordRoot, state.step);

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
        sequencer = glitchSequencer();
        schedulerLoop();
    }

    function stop() {
        isPlaying = false;
        if (schedulerTimerID) clearTimeout(schedulerTimerID);
        schedulerTimerID = null;
        if (master) {
            master.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
        }
    }

    window.MateriaMusic8 = { start, stop };

})();
