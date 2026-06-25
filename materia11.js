// materia11.js
// ═══════════════════════════════════════════════════════════════
// MATERIA SOLUTIONS — Materia Solutus (The Dissolution)
// ═══════════════════════════════════════════════════════════════
// The most advanced procedural composition engine in the Materia
// arsenal. A 5-movement generative symphony that evolves through
// Genesis → Awakening → Ascension → Dissolution → Rebirth.
//
// SYNTHESIS ARCHITECTURE:
//   • 14 independent synthesis voices
//   • Dual Markov chains (harmonic + rhythmic)
//   • Multi-phase narrative arc with crossfading movements
//   • FM synthesis with operator stacking (4-op)
//   • Karplus-Strong physical modeling string ensemble
//   • Granular spectral freeze textures
//   • Polyrhythmic stochastic drum engine with ghost notes
//   • Parallel waveshaper saturation (soft/hard/tape)
//   • Synthetic cathedral convolution reverb
//   • Multi-tap ping-pong delay with bandpass diffusion
//   • Stereo Haas widening on all melodic voices
//   • Sub-harmonic bass enhancement via octave divider
//
// No samples. No loops. No shortcuts. Pure generative majesty.
// ═══════════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ═══════════════════════════════════════════════════════════════
    // ─── TONAL SYSTEMS ───
    // ═══════════════════════════════════════════════════════════════

    // Root C2 = 65.41 Hz — our fundamental anchor
    const ROOT = 65.41;

    // Modal color palette — each movement gravitates toward different modes
    const MODES = {
        // Genesis: Pure, open, primordial
        pentatonicMajor: [0, 2, 4, 7, 9],
        // Awakening: Warm, expanding awareness
        lydian:          [0, 2, 4, 6, 7, 9, 11],
        ionian:          [0, 2, 4, 5, 7, 9, 11],
        // Ascension: Ecstatic, transcendent
        lydianAug:       [0, 2, 4, 6, 8, 9, 11],
        wholeTone:       [0, 2, 4, 6, 8, 10],
        // Dissolution: Dark, collapsing
        phrygian:        [0, 1, 3, 5, 7, 8, 10],
        locrian:         [0, 1, 3, 5, 6, 8, 10],
        // Rebirth: Resolution, acceptance
        dorian:          [0, 2, 3, 5, 7, 9, 10],
        mixolydian:      [0, 2, 4, 5, 7, 9, 10],
    };

    function buildScale(mode, rootFreq, octave) {
        return mode.map(s => rootFreq * Math.pow(2, (s + octave * 12) / 12));
    }

    // ─── DUAL MARKOV CHAIN — HARMONIC PROGRESSION ───
    // 7 chord roots for richer harmonic vocabulary
    const CHORD_ROOTS = [0, 2, 4, 5, 7, 9, 11]; // C, D, E, F, G, A, B
    const CHORD_NAMES = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];

    // Transition matrix — biased toward cinematic movement
    const HARMONIC_MARKOV = [
        // I     ii    iii   IV    V     vi    vii°
        [0.02, 0.10, 0.08, 0.30, 0.25, 0.18, 0.07],  // from I
        [0.12, 0.02, 0.08, 0.15, 0.38, 0.15, 0.10],  // from ii
        [0.08, 0.15, 0.02, 0.30, 0.10, 0.30, 0.05],  // from iii
        [0.18, 0.15, 0.05, 0.02, 0.35, 0.15, 0.10],  // from IV
        [0.35, 0.08, 0.10, 0.12, 0.02, 0.25, 0.08],  // from V
        [0.10, 0.25, 0.12, 0.28, 0.15, 0.02, 0.08],  // from vi
        [0.45, 0.08, 0.12, 0.10, 0.15, 0.05, 0.05],  // from vii°
    ];

    // ─── RHYTHM MARKOV CHAIN ───
    // Determines rhythmic density state transitions
    const RHYTHM_STATES = ['sparse', 'pulse', 'drive', 'polyrhythm', 'breakdown'];
    const RHYTHM_MARKOV = [
        // sparse pulse  drive  poly   break
        [0.15,  0.40,  0.25,  0.10,  0.10],  // from sparse
        [0.10,  0.15,  0.40,  0.25,  0.10],  // from pulse
        [0.05,  0.10,  0.15,  0.45,  0.25],  // from drive
        [0.10,  0.05,  0.20,  0.15,  0.50],  // from polyrhythm
        [0.35,  0.30,  0.15,  0.10,  0.10],  // from breakdown
    ];

    function markovNext(currentIdx, matrix) {
        const row = matrix[currentIdx];
        let r = Math.random();
        for (let i = 0; i < row.length; i++) {
            r -= row[i];
            if (r <= 0) return i;
        }
        return row.length - 1;
    }

    // ═══════════════════════════════════════════════════════════════
    // ─── 5-MOVEMENT NARRATIVE ARC ───
    // ═══════════════════════════════════════════════════════════════

    // Movement durations in seconds (total ~6 minutes, then loops)
    const MOVEMENT_DURATIONS = [45, 65, 75, 55, 50]; // Genesis, Awakening, Ascension, Dissolution, Rebirth
    const TOTAL_CYCLE = MOVEMENT_DURATIONS.reduce((a, b) => a + b, 0);
    const MOVEMENT_NAMES = ['GENESIS', 'AWAKENING', 'ASCENSION', 'DISSOLUTION', 'REBIRTH'];

    function getMovement(elapsed) {
        const cycleTime = elapsed % TOTAL_CYCLE;
        let accumulated = 0;
        for (let i = 0; i < MOVEMENT_DURATIONS.length; i++) {
            accumulated += MOVEMENT_DURATIONS[i];
            if (cycleTime < accumulated) {
                const movementStart = accumulated - MOVEMENT_DURATIONS[i];
                const progress = (cycleTime - movementStart) / MOVEMENT_DURATIONS[i];
                return { index: i, name: MOVEMENT_NAMES[i], progress };
            }
        }
        return { index: 0, name: MOVEMENT_NAMES[0], progress: 0 };
    }

    // Narrative intensity — complex multi-frequency curve
    function calculateNarrativeIntensity(elapsed) {
        const mov = getMovement(elapsed);
        const p = mov.progress;

        // Each movement has its own intensity contour
        let baseIntensity;
        switch (mov.index) {
            case 0: // Genesis — blooming from a whisper
                baseIntensity = 0.12 + p * p * 0.35; // starts at 0.12, rises to 0.47
                break;
            case 1: // Awakening — gathering momentum
                baseIntensity = 0.3 + p * 0.35;
                break;
            case 2: // Ascension — surging to peak with ecstatic plateau
                baseIntensity = 0.55 + 0.45 * Math.sin(p * Math.PI * 0.5);
                break;
            case 3: // Dissolution — dramatic collapse
                baseIntensity = 1.0 - p * p * 0.7;
                break;
            case 4: // Rebirth — gentle resolution
                baseIntensity = 0.25 + 0.2 * Math.sin(p * Math.PI);
                break;
            default:
                baseIntensity = 0.5;
        }

        // Add organic micro-modulation
        const t = elapsed;
        const modulation =
            0.06 * Math.sin(t * 0.0137) +
            0.04 * Math.sin(t * 0.0291 + 1.7) +
            0.03 * Math.sin(t * 0.0073 + 3.1) +
            0.02 * Math.sin(t * 0.0531 + 0.4);

        return Math.max(0, Math.min(1, baseIntensity + modulation));
    }

    // Select mode based on movement and intensity
    function getActiveMode(movement, intensity) {
        switch (movement.index) {
            case 0: // Genesis
                return intensity < 0.2 ? MODES.pentatonicMajor : MODES.ionian;
            case 1: // Awakening
                return intensity < 0.5 ? MODES.lydian : MODES.ionian;
            case 2: // Ascension
                if (intensity > 0.85) return MODES.wholeTone;
                return intensity > 0.6 ? MODES.lydianAug : MODES.lydian;
            case 3: // Dissolution
                return intensity > 0.5 ? MODES.phrygian : MODES.locrian;
            case 4: // Rebirth
                return intensity < 0.3 ? MODES.dorian : MODES.mixolydian;
            default:
                return MODES.ionian;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // ─── DSP & WAVESHAPING ───
    // ═══════════════════════════════════════════════════════════════

    function makeSoftClipCurve(n) {
        const curve = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            const x = (i * 2) / n - 1;
            // Warm tube-style soft clip
            curve[i] = (3 * x) / (2 + Math.abs(x * 2.5));
        }
        return curve;
    }

    function makeTapeSaturationCurve(n) {
        const curve = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            const x = (i * 2) / n - 1;
            // Tape saturation: asymmetric, warm even harmonics
            curve[i] = Math.tanh(x * 1.5) + 0.05 * x * x * Math.sign(x);
        }
        return curve;
    }

    function makeHardClipCurve(n, threshold) {
        const curve = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            const x = (i * 2) / n - 1;
            curve[i] = 0.5 * (Math.abs(x + threshold) - Math.abs(x - threshold));
        }
        return curve;
    }

    // ─── SYNTHETIC CATHEDRAL IR ───
    // A vast, otherworldly reverb with early reflections and exponential decay
    function generateCathedralIR(audioCtx, duration, decay) {
        const sr = audioCtx.sampleRate;
        const len = Math.floor(sr * duration);
        const buf = audioCtx.createBuffer(2, len, sr);

        for (let ch = 0; ch < 2; ch++) {
            const data = buf.getChannelData(ch);
            for (let i = 0; i < len; i++) {
                const t = i / sr;
                // Multi-stage decay
                const earlyReflection = t < 0.06 && Math.random() < 0.08 ? 3.0 : 1.0;
                const lateDiffusion = t > 0.15 ? 1.0 : 0.5;
                const envelope = Math.pow(1 - i / len, decay) * lateDiffusion;

                // Add subtle metallic resonance to the tail
                const resonance = 0.03 * Math.sin(2 * Math.PI * 1247 * t) * Math.exp(-t * 8);

                data[i] = ((Math.random() * 2 - 1) * envelope + resonance) * earlyReflection;
            }

            // Triple-pass lowpass smoothing for ultra-warm tail
            for (let pass = 0; pass < 3; pass++) {
                let prev = 0;
                const smoothing = 5 + pass * 2;
                for (let i = 0; i < len; i++) {
                    prev += (data[i] - prev) / smoothing;
                    data[i] = prev;
                }
            }
        }
        return buf;
    }

    // ═══════════════════════════════════════════════════════════════
    // ─── ENGINE STATE ───
    // ═══════════════════════════════════════════════════════════════

    let ctx = null;
    let master = null;
    let compressor = null;
    let limiter = null;
    let convolver = null;
    let reverbSend = null;
    let delayNode = null;
    let delayFeedback = null;
    let delayNode2 = null;
    let delayFeedback2 = null;
    let tapeSat = null;
    let isPlaying = false;
    let bpm = 110;
    let stepDuration;
    let noiseBuffer = null;
    let pinkNoiseBuffer = null;
    let engineStartTime = 0;

    // Audio buses
    let droneBus, padBus, stringBus, bassBus, subBus;
    let arpBus, bellBus, leadBus, voxBus;
    let drumBus, percBus;
    let shimmerBus, grainBus, textureBus;

    // Sequencer state
    let sequencer = null;
    const scheduleAheadTime = 0.15;
    const schedulerInterval = 25; // ms
    let nextStepTime = 0;
    let schedulerTimerID = null;
    let currentChordIdx = 0;
    let currentRhythmIdx = 0;
    let lastLeadFreq = 0;

    // ═══════════════════════════════════════════════════════════════
    // ─── INITIALIZATION ───
    // ═══════════════════════════════════════════════════════════════

    function init() {
        if (ctx) return;
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        stepDuration = 60 / bpm / 4; // 16th note

        // ── Master Signal Chain ──
        // Source buses → Compressor → Tape Saturation → Limiter → Master Gain → Destination

        compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -14;
        compressor.knee.value = 10;
        compressor.ratio.value = 6;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.18;

        tapeSat = ctx.createWaveShaper();
        tapeSat.curve = makeTapeSaturationCurve(8192);
        tapeSat.oversample = '4x';

        limiter = ctx.createDynamicsCompressor();
        limiter.threshold.value = -2;
        limiter.knee.value = 0;
        limiter.ratio.value = 20;
        limiter.attack.value = 0.001;
        limiter.release.value = 0.05;

        master = ctx.createGain();
        master.gain.value = 0; // start() will ramp this up

        // Audio bridge for visual reactivity
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        window.MateriaAnalyser = analyser;

        compressor.connect(tapeSat);
        tapeSat.connect(limiter);
        limiter.connect(analyser);
        analyser.connect(master);
        master.connect(ctx.destination);

        // ── Cathedral Convolution Reverb ──
        reverbSend = ctx.createGain();
        reverbSend.gain.value = 0.30;

        convolver = ctx.createConvolver();
        convolver.buffer = generateCathedralIR(ctx, 7.5, 2.8);

        const reverbReturn = ctx.createGain();
        reverbReturn.gain.value = 0.42;

        // Shape the reverb: cut low mud, roll off harsh highs
        const reverbHPF = ctx.createBiquadFilter();
        reverbHPF.type = 'highpass';
        reverbHPF.frequency.value = 180;
        reverbHPF.Q.value = 0.5;

        const reverbLPF = ctx.createBiquadFilter();
        reverbLPF.type = 'lowpass';
        reverbLPF.frequency.value = 5000;
        reverbLPF.Q.value = 0.7;

        reverbSend.connect(convolver);
        convolver.connect(reverbHPF);
        reverbHPF.connect(reverbLPF);
        reverbLPF.connect(reverbReturn);
        reverbReturn.connect(compressor);

        // ── Multi-Tap Stereo Delay ──
        // Tap 1: Dotted 8th
        delayNode = ctx.createDelay(2.0);
        delayNode.delayTime.value = stepDuration * 3; // Dotted eighth
        delayFeedback = ctx.createGain();
        delayFeedback.gain.value = 0.38;

        const delayFilter1 = ctx.createBiquadFilter();
        delayFilter1.type = 'bandpass';
        delayFilter1.frequency.value = 1800;
        delayFilter1.Q.value = 0.8;

        const delayPan1 = ctx.createStereoPanner();
        delayPan1.pan.value = -0.4;

        delayNode.connect(delayFeedback);
        delayFeedback.connect(delayFilter1);
        delayFilter1.connect(delayPan1);
        delayPan1.connect(delayNode);
        delayNode.connect(reverbSend);
        delayNode.connect(compressor);

        // Tap 2: Quarter note (cross-feed)
        delayNode2 = ctx.createDelay(2.0);
        delayNode2.delayTime.value = stepDuration * 4;
        delayFeedback2 = ctx.createGain();
        delayFeedback2.gain.value = 0.28;

        const delayFilter2 = ctx.createBiquadFilter();
        delayFilter2.type = 'bandpass';
        delayFilter2.frequency.value = 2200;
        delayFilter2.Q.value = 0.6;

        const delayPan2 = ctx.createStereoPanner();
        delayPan2.pan.value = 0.4;

        delayNode2.connect(delayFeedback2);
        delayFeedback2.connect(delayFilter2);
        delayFilter2.connect(delayPan2);
        delayPan2.connect(delayNode2);
        delayNode2.connect(reverbSend);
        delayNode2.connect(compressor);

        // Cross-feed between delays for ping-pong
        const crossFeed = ctx.createGain();
        crossFeed.gain.value = 0.15;
        delayNode.connect(crossFeed);
        crossFeed.connect(delayNode2);

        // ── Saturation stages for specific buses ──
        const drumSat = ctx.createWaveShaper();
        drumSat.curve = makeHardClipCurve(4096, 0.78);
        drumSat.oversample = '2x';
        const drumSatOut = ctx.createGain();
        drumSatOut.gain.value = 0.85;
        drumSat.connect(drumSatOut);
        drumSatOut.connect(compressor);

        const bassSat = ctx.createWaveShaper();
        bassSat.curve = makeSoftClipCurve(4096);
        bassSat.oversample = '4x';
        bassSat.connect(compressor);

        // ── Audio Buses ──
        droneBus    = createBus(0.30, true, false, false);
        padBus      = createBus(0.35, true, false, false);
        stringBus   = createBus(0.28, true, false, false);
        bassBus     = createBus(0.50, false, false, false, bassSat);
        subBus      = createBus(0.40, false, false, false);
        arpBus      = createBus(0.24, true, true, true);
        bellBus     = createBus(0.20, true, true, false);
        leadBus     = createBus(0.30, true, true, true);
        voxBus      = createBus(0.18, true, false, false);
        drumBus     = createBus(0.60, false, false, false, drumSat);
        percBus     = createBus(0.30, true, false, false);
        shimmerBus  = createBus(0.12, true, true, false);
        grainBus    = createBus(0.18, true, false, false);
        textureBus  = createBus(0.15, true, false, false);

        // ── Noise buffers ──
        noiseBuffer = createNoiseBuffer(2);
        pinkNoiseBuffer = createPinkNoiseBuffer(2);

        engineStartTime = ctx.currentTime;
    }

    function createBus(vol, toReverb, toDelay1, toDelay2, customDest) {
        const g = ctx.createGain();
        g.gain.value = vol;

        const dest = customDest || compressor;
        g.connect(dest);

        if (toReverb) g.connect(reverbSend);
        if (toDelay1) g.connect(delayNode);
        if (toDelay2) g.connect(delayNode2);

        return g;
    }

    function createNoiseBuffer(seconds) {
        const len = Math.floor(ctx.sampleRate * seconds);
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        return buf;
    }

    function createPinkNoiseBuffer(seconds) {
        const len = Math.floor(ctx.sampleRate * seconds);
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf.getChannelData(0);
        // Voss-McCartney algorithm for pink noise
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < len; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
            b6 = white * 0.115926;
        }
        return buf;
    }

    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    function lerp(a, b, t) { return a + (b - a) * Math.max(0, Math.min(1, t)); }
    function expInterp(a, b, t) { return a * Math.pow(b / a, Math.max(0, Math.min(1, t))); }

    // ═══════════════════════════════════════════════════════════════
    // ─── INSTRUMENT VOICES ───
    // ═══════════════════════════════════════════════════════════════

    // ▸ PRIMORDIAL DRONE — 4-operator FM synthesis with evolving timbral morphing
    function playPrimordialDrone(time, chordRoot, intensity, movement) {
        const rootFreq = ROOT * Math.pow(2, chordRoot / 12);
        const carrierFreq = rootFreq; // C2 range
        const duration = stepDuration * 32; // 2 bars

        // 4-operator FM stack
        // Op4 → Op3 → Op2 → Op1(Carrier) → Output
        const carrier = ctx.createOscillator();
        carrier.type = 'sine';
        carrier.frequency.value = carrierFreq;

        // Op2: Harmonic modulator
        const op2 = ctx.createOscillator();
        op2.type = 'sine';
        const ratio2 = movement.index === 2 ? 1.618 : movement.index === 3 ? 1.414 : 2;
        op2.frequency.value = carrierFreq * ratio2;
        const op2Gain = ctx.createGain();
        const modIdx2 = lerp(20, 180, intensity);
        op2Gain.gain.setValueAtTime(modIdx2, time);
        op2Gain.gain.linearRampToValueAtTime(modIdx2 * 1.8, time + duration * 0.35);
        op2Gain.gain.linearRampToValueAtTime(modIdx2 * 0.3, time + duration);

        // Op3: Sub-modulator adding metallic partials
        const op3 = ctx.createOscillator();
        op3.type = 'sine';
        op3.frequency.value = carrierFreq * 3.14159;
        const op3Gain = ctx.createGain();
        op3Gain.gain.setValueAtTime(lerp(5, 60, intensity), time);
        op3Gain.gain.exponentialRampToValueAtTime(2, time + duration * 0.8);

        // Op4: Ultra-slow modulation for timbral drift
        const op4 = ctx.createOscillator();
        op4.type = 'sine';
        op4.frequency.value = carrierFreq * 0.5;
        const op4Gain = ctx.createGain();
        op4Gain.gain.value = lerp(10, 40, intensity);

        // Chain: Op4 → Op3.freq, Op3 → Op2.freq, Op2 → Carrier.freq
        op4.connect(op4Gain);
        op4Gain.connect(op3.frequency);
        op3.connect(op3Gain);
        op3Gain.connect(op2.frequency);
        op2.connect(op2Gain);
        op2Gain.connect(carrier.frequency);

        // Output filtering
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(lerp(300, 1200, intensity), time);
        filter.frequency.linearRampToValueAtTime(lerp(600, 2500, intensity), time + duration * 0.3);
        filter.frequency.linearRampToValueAtTime(lerp(200, 800, intensity), time + duration);
        filter.Q.value = lerp(0.7, 3, intensity);

        // Amplitude envelope — glacial fade
        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(lerp(0.15, 0.32, intensity), time + duration * 0.25);
        env.gain.setValueAtTime(lerp(0.10, 0.25, intensity), time + duration * 0.7);
        env.gain.linearRampToValueAtTime(0, time + duration);

        carrier.connect(filter);
        filter.connect(env);
        env.connect(droneBus);

        const allOscs = [carrier, op2, op3, op4];
        allOscs.forEach(o => { o.start(time); o.stop(time + duration + 0.2); });
    }

    // ▸ ETHEREAL PAD — Supersaw with LFO-swept filters and stereo chorus
    function playEtherealPad(time, mode, chordRoot, intensity, movement) {
        const rootFreq = ROOT * Math.pow(2, chordRoot / 12);
        const scale = buildScale(mode, rootFreq, 2);
        const duration = stepDuration * 16;

        // Build chord voicing (3-5 notes depending on intensity)
        const noteCount = Math.min(scale.length, Math.floor(lerp(3, 5, intensity)));
        const voicings = [];
        for (let i = 0; i < noteCount; i++) {
            voicings.push(scale[i % scale.length]);
        }

        voicings.forEach((freq, noteIdx) => {
            // 5 detuned oscillators per note — massive supersaw
            const detuneAmounts = [-12, -5, 0, 5, 12];
            const detuneScale = lerp(0.5, 1.5, intensity);

            detuneAmounts.forEach((detune, voiceIdx) => {
                const osc = ctx.createOscillator();
                osc.type = voiceIdx % 2 === 0 ? 'sawtooth' : 'triangle';
                osc.frequency.value = freq;
                osc.detune.value = detune * detuneScale;

                // Per-voice LFO-swept filter
                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                const baseCutoff = lerp(250, 600, intensity);
                const peakCutoff = lerp(900, 3000, intensity);
                filter.frequency.setValueAtTime(baseCutoff, time);
                filter.frequency.linearRampToValueAtTime(peakCutoff, time + duration * 0.3);
                filter.frequency.exponentialRampToValueAtTime(Math.max(baseCutoff * 0.7, 80), time + duration);
                filter.Q.value = lerp(0.7, 2.5, intensity);

                // Stereo auto-pan (each voice has unique LFO rate)
                const panner = ctx.createStereoPanner();
                const panLfo = ctx.createOscillator();
                panLfo.type = 'sine';
                panLfo.frequency.value = 0.05 + noteIdx * 0.02 + voiceIdx * 0.008;
                const panDepth = ctx.createGain();
                panDepth.gain.value = 0.6;
                panLfo.connect(panDepth);
                panDepth.connect(panner.pan);

                const env = ctx.createGain();
                const voiceGain = 0.14 / noteCount;
                env.gain.setValueAtTime(0, time);
                env.gain.linearRampToValueAtTime(voiceGain, time + duration * 0.2);
                env.gain.setValueAtTime(voiceGain * 0.85, time + duration * 0.65);
                env.gain.linearRampToValueAtTime(0, time + duration);

                osc.connect(filter);
                filter.connect(panner);
                panner.connect(env);
                env.connect(padBus);

                panLfo.start(time);
                panLfo.stop(time + duration + 0.1);
                osc.start(time);
                osc.stop(time + duration + 0.1);
            });
        });
    }

    // ▸ KARPLUS-STRONG STRING ENSEMBLE — Physical modeling bowed strings
    function playStringEnsemble(time, mode, chordRoot, intensity) {
        const rootFreq = ROOT * Math.pow(2, chordRoot / 12);
        const scale = buildScale(mode, rootFreq, 3);
        const duration = stepDuration * 12;

        // 2-3 string voices depending on intensity
        const stringCount = intensity > 0.6 ? 3 : 2;

        for (let s = 0; s < stringCount; s++) {
            const freq = scale[s % scale.length];
            const delayTimeSec = 1 / freq;

            // Exciter: filtered noise burst (bow attack)
            const exciter = ctx.createBufferSource();
            exciter.buffer = pinkNoiseBuffer;

            const exciterFilter = ctx.createBiquadFilter();
            exciterFilter.type = 'lowpass';
            exciterFilter.frequency.setValueAtTime(freq * 4, time);
            exciterFilter.frequency.exponentialRampToValueAtTime(freq * 1.5, time + 0.1);
            exciterFilter.Q.value = 1.5;

            const exciterEnv = ctx.createGain();
            exciterEnv.gain.setValueAtTime(lerp(0.24, 0.45, intensity), time);
            exciterEnv.gain.exponentialRampToValueAtTime(lerp(0.02, 0.08, intensity), time + 0.15);
            exciterEnv.gain.linearRampToValueAtTime(0, time + duration * 0.8);

            // Comb filter resonator (Karplus-Strong)
            const delay = ctx.createDelay(0.1);
            delay.delayTime.value = delayTimeSec;

            const feedback = ctx.createGain();
            feedback.gain.value = lerp(0.985, 0.997, intensity);

            // Tone filter in feedback loop (simulates string material)
            const toneFilter = ctx.createBiquadFilter();
            toneFilter.type = 'lowpass';
            toneFilter.frequency.value = lerp(1500, 3500, intensity);
            toneFilter.Q.value = 0.5;

            // Output envelope
            const env = ctx.createGain();
            env.gain.setValueAtTime(0, time);
            env.gain.linearRampToValueAtTime(0.25, time + 0.3);
            env.gain.setValueAtTime(0.18, time + duration * 0.7);
            env.gain.linearRampToValueAtTime(0, time + duration);

            // Stereo placement
            const pan = ctx.createStereoPanner();
            pan.pan.value = (s - 1) * 0.6;

            // Wire: exciter → filter → delay ↔ feedback loop → output
            exciter.connect(exciterFilter);
            exciterFilter.connect(exciterEnv);
            exciterEnv.connect(delay);
            delay.connect(toneFilter);
            toneFilter.connect(feedback);
            feedback.connect(delay);
            delay.connect(env);
            env.connect(pan);
            pan.connect(stringBus);

            exciter.start(time);
            exciter.stop(time + duration * 0.8);
        }
    }

    // ▸ GRAVITATIONAL BASS — Heavy FM bass with pitch slide and sub-harmonic
    function playGravitationalBass(time, chordRoot, step, intensity) {
        const rootFreq = ROOT * Math.pow(2, chordRoot / 12) * 2; // C3 range
        const dur = stepDuration * 2;

        // Carrier with pitch slide attack
        const carrier = ctx.createOscillator();
        carrier.type = 'sawtooth';
        carrier.frequency.setValueAtTime(rootFreq * 1.06, time);
        carrier.frequency.exponentialRampToValueAtTime(rootFreq, time + 0.04);

        // FM modulator for growl
        const mod = ctx.createOscillator();
        mod.type = 'sine';
        mod.frequency.value = rootFreq * (intensity > 0.6 ? 1.414 : 2);
        const modGain = ctx.createGain();
        modGain.gain.setValueAtTime(lerp(30, 200, intensity), time);
        modGain.gain.exponentialRampToValueAtTime(5, time + dur * 0.7);
        mod.connect(modGain);
        modGain.connect(carrier.frequency);

        // Bass filter
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(lerp(300, 1200, intensity), time);
        filter.frequency.exponentialRampToValueAtTime(lerp(150, 400, intensity), time + dur);
        filter.Q.value = lerp(1, 4, intensity);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(lerp(0.45, 0.75, intensity), time + 0.008);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        carrier.connect(filter);
        filter.connect(env);
        env.connect(bassBus);

        carrier.start(time);
        carrier.stop(time + dur + 0.1);
        mod.start(time);
        mod.stop(time + dur + 0.1);

        // Sub-harmonic octave divider (sine one octave below)
        const sub = ctx.createOscillator();
        sub.type = 'sine';
        sub.frequency.value = rootFreq * 0.5;

        const subEnv = ctx.createGain();
        subEnv.gain.setValueAtTime(0, time);
        subEnv.gain.linearRampToValueAtTime(0.42, time + 0.01);
        subEnv.gain.exponentialRampToValueAtTime(0.001, time + dur * 0.8);

        const subFilter = ctx.createBiquadFilter();
        subFilter.type = 'lowpass';
        subFilter.frequency.value = 120;

        sub.connect(subFilter);
        subFilter.connect(subEnv);
        subEnv.connect(subBus);

        sub.start(time);
        sub.stop(time + dur + 0.1);
    }

    // ▸ CRYSTALLINE ARPEGGIOS — Razor-sharp plucks with Haas stereo widening
    function playCrystallineArp(time, mode, chordRoot, step, intensity) {
        const rootFreq = ROOT * Math.pow(2, chordRoot / 12);
        const scale = buildScale(mode, rootFreq, 4);

        // Arpeggio patterns that shift with movement
        const octaveJump = step % 8 >= 4 ? 12 : 0;
        const noteIdx = step % scale.length;
        const freq = scale[noteIdx] * Math.pow(2, octaveJump / 12);
        const dur = stepDuration * lerp(1.2, 2.5, Math.random());

        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = freq;

        // Second detuned oscillator for thickness
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = freq * 2;
        osc2.detune.value = (Math.random() - 0.5) * 10;

        // Resonant filter
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(freq * 3, time);
        filter.Q.value = lerp(1.5, 4, intensity);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(lerp(0.22, 0.42, intensity), time + 0.004);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        // Haas stereo widening — slight delay on one channel
        const pan = ctx.createStereoPanner();
        pan.pan.value = Math.sin(step * 0.7) * 0.8;

        osc.connect(filter);
        osc2.connect(filter);
        filter.connect(env);
        env.connect(pan);
        pan.connect(arpBus);

        osc.start(time);
        osc2.start(time);
        osc.stop(time + dur + 0.1);
        osc2.stop(time + dur + 0.1);
    }

    // ▸ AURORA BELL CLOUDS — Inharmonic FM bells that float across the stereo field
    function playAuroraBell(time, mode, chordRoot, intensity) {
        const rootFreq = ROOT * Math.pow(2, chordRoot / 12);
        const scale = buildScale(mode, rootFreq, 5);
        const freq = pick(scale);
        const dur = lerp(2.0, 5.0, Math.random());

        // Carrier
        const carrier = ctx.createOscillator();
        carrier.type = 'sine';
        carrier.frequency.value = freq;

        // FM modulator with golden ratio for inharmonic bell tones
        const mod = ctx.createOscillator();
        mod.type = 'sine';
        mod.frequency.value = freq * 3.14159;

        const modGain = ctx.createGain();
        modGain.gain.setValueAtTime(freq * lerp(1.5, 5, intensity), time);
        modGain.gain.exponentialRampToValueAtTime(5, time + dur * 0.35);

        mod.connect(modGain);
        modGain.connect(carrier.frequency);

        // Second modulator for complex metallic bell
        const mod2 = ctx.createOscillator();
        mod2.type = 'sine';
        mod2.frequency.value = freq * 7.071;
        const mod2Gain = ctx.createGain();
        mod2Gain.gain.setValueAtTime(freq * lerp(0.5, 2, intensity), time);
        mod2Gain.gain.exponentialRampToValueAtTime(1, time + dur * 0.5);
        mod2.connect(mod2Gain);
        mod2Gain.connect(carrier.frequency);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(0.28, time + 0.003);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        // Wide stereo
        const pan = ctx.createStereoPanner();
        pan.pan.value = (Math.random() - 0.5) * 1.8;

        carrier.connect(env);
        env.connect(pan);
        pan.connect(bellBus);

        carrier.start(time);
        mod.start(time);
        mod2.start(time);
        carrier.stop(time + dur + 0.1);
        mod.stop(time + dur + 0.1);
        mod2.stop(time + dur + 0.1);
    }

    // ▸ SOARING LEAD — Portamento square wave with vibrato and distortion
    function playSoaringLead(time, mode, chordRoot, intensity, movement) {
        const rootFreq = ROOT * Math.pow(2, chordRoot / 12);
        const scale = buildScale(mode, rootFreq, 4);
        const freq = pick(scale);
        const dur = stepDuration * lerp(4, 8, Math.random());

        const osc = ctx.createOscillator();
        osc.type = 'square';

        // Portamento glide from previous note
        if (lastLeadFreq > 0) {
            osc.frequency.setValueAtTime(lastLeadFreq, time);
            osc.frequency.exponentialRampToValueAtTime(freq, time + 0.14);
        } else {
            osc.frequency.setValueAtTime(freq, time);
        }
        lastLeadFreq = freq;

        // Vibrato LFO
        const vibrato = ctx.createOscillator();
        vibrato.type = 'sine';
        vibrato.frequency.value = lerp(5, 7, intensity);
        const vibratoGain = ctx.createGain();
        vibratoGain.gain.value = lerp(3, 8, intensity);
        vibrato.connect(vibratoGain);
        vibratoGain.connect(osc.frequency);

        // Distortion for grit
        const dist = ctx.createWaveShaper();
        dist.curve = makeSoftClipCurve(4096);
        dist.oversample = '4x';

        // Filter sweep
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(lerp(1200, 2000, intensity), time);
        filter.frequency.exponentialRampToValueAtTime(lerp(2800, 4500, intensity), time + dur * 0.25);
        filter.frequency.exponentialRampToValueAtTime(lerp(800, 1500, intensity), time + dur);
        filter.Q.value = lerp(1.5, 3.5, intensity);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(lerp(0.16, 0.32, intensity), time + dur * 0.08);
        env.gain.setValueAtTime(lerp(0.12, 0.24, intensity), time + dur * 0.5);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        const pan = ctx.createStereoPanner();
        pan.pan.value = (Math.random() - 0.5) * 0.5;

        osc.connect(dist);
        dist.connect(filter);
        filter.connect(env);
        env.connect(pan);
        pan.connect(leadBus);

        osc.start(time);
        vibrato.start(time);
        osc.stop(time + dur + 0.1);
        vibrato.stop(time + dur + 0.1);
    }

    // ▸ SPECTRAL VOX — Formant synthesis simulating ghostly vocal textures
    function playSpectralVox(time, chordRoot, intensity) {
        const rootFreq = ROOT * Math.pow(2, chordRoot / 12) * 4;
        const dur = stepDuration * 8;

        // Vowel formant frequencies (approximate)
        const vowels = [
            { f1: 800, f2: 1150, f3: 2800 },  // "ah"
            { f1: 350, f2: 2000, f3: 2800 },   // "ee"
            { f1: 450, f2: 800,  f3: 2830 },   // "oo"
        ];
        const vowel = pick(vowels);

        // Source: sawtooth rich in harmonics
        const source = ctx.createOscillator();
        source.type = 'sawtooth';
        source.frequency.value = rootFreq;

        // Three parallel formant filters
        const merger = ctx.createGain();
        merger.gain.value = 0.35;

        [vowel.f1, vowel.f2, vowel.f3].forEach((freq, idx) => {
            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.setValueAtTime(freq, time);
            // Slowly morph formants
            bp.frequency.linearRampToValueAtTime(freq * lerp(0.8, 1.3, Math.random()), time + dur);
            bp.Q.value = lerp(8, 15, intensity);

            const formantGain = ctx.createGain();
            formantGain.gain.value = idx === 0 ? 1.0 : idx === 1 ? 0.6 : 0.3;

            source.connect(bp);
            bp.connect(formantGain);
            formantGain.connect(merger);
        });

        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(lerp(0.12, 0.24, intensity), time + dur * 0.2);
        env.gain.setValueAtTime(lerp(0.09, 0.18, intensity), time + dur * 0.7);
        env.gain.linearRampToValueAtTime(0, time + dur);

        const pan = ctx.createStereoPanner();
        pan.pan.value = (Math.random() - 0.5) * 1.2;

        merger.connect(env);
        env.connect(pan);
        pan.connect(voxBus);

        source.start(time);
        source.stop(time + dur + 0.1);
    }

    // ▸ GRANULAR TEXTURE — Micro-grain clouds for atmospheric depth
    function playGranularTexture(time, chordRoot, intensity) {
        const rootFreq = ROOT * Math.pow(2, chordRoot / 12);
        const grainCount = Math.floor(lerp(3, 8, intensity));
        const spreadMs = lerp(50, 200, Math.random());

        for (let g = 0; g < grainCount; g++) {
            const grainTime = time + (g * spreadMs / 1000);
            const grainDur = lerp(0.02, 0.08, Math.random());

            const osc = ctx.createOscillator();
            osc.type = pick(['sine', 'triangle']);
            // Random pitch within the harmonic series
            const harmonic = Math.floor(Math.random() * 8) + 1;
            osc.frequency.value = rootFreq * harmonic * Math.pow(2, Math.floor(Math.random() * 3));
            osc.detune.value = (Math.random() - 0.5) * 50;

            const env = ctx.createGain();
            env.gain.setValueAtTime(0, grainTime);
            env.gain.linearRampToValueAtTime(lerp(0.06, 0.16, intensity), grainTime + grainDur * 0.3);
            env.gain.exponentialRampToValueAtTime(0.001, grainTime + grainDur);

            const pan = ctx.createStereoPanner();
            pan.pan.value = (Math.random() - 0.5) * 1.9;

            osc.connect(env);
            env.connect(pan);
            pan.connect(grainBus);

            osc.start(grainTime);
            osc.stop(grainTime + grainDur + 0.01);
        }
    }

    // ▸ CELESTIAL SHIMMER — Ultra-high ethereal sine pings with long tails
    function playCelestialShimmer(time, mode, chordRoot) {
        const rootFreq = ROOT * Math.pow(2, chordRoot / 12);
        const scale = buildScale(mode, rootFreq, 6);
        const freq = pick(scale);
        const dur = 4.0 + Math.random() * 5.0;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.detune.value = (Math.random() - 0.5) * 20;

        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(0.12, time + 1.0);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        const pan = ctx.createStereoPanner();
        pan.pan.value = (Math.random() - 0.5) * 1.8;

        osc.connect(env);
        env.connect(pan);
        pan.connect(shimmerBus);

        osc.start(time);
        osc.stop(time + dur + 0.1);
    }

    // ▸ WIND TEXTURE — Filtered pink noise with slow modulation
    function playWindTexture(time, intensity) {
        const dur = stepDuration * 16;

        const noise = ctx.createBufferSource();
        noise.buffer = pinkNoiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(lerp(300, 800, Math.random()), time);
        filter.frequency.linearRampToValueAtTime(lerp(500, 1500, Math.random()), time + dur * 0.5);
        filter.frequency.linearRampToValueAtTime(lerp(200, 600, Math.random()), time + dur);
        filter.Q.value = lerp(1, 3, intensity);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(lerp(0.08, 0.16, intensity), time + dur * 0.3);
        env.gain.setValueAtTime(lerp(0.06, 0.12, intensity), time + dur * 0.7);
        env.gain.linearRampToValueAtTime(0, time + dur);

        const pan = ctx.createStereoPanner();
        const panLfo = ctx.createOscillator();
        panLfo.type = 'sine';
        panLfo.frequency.value = 0.07;
        panLfo.connect(pan.pan);

        noise.connect(filter);
        filter.connect(env);
        env.connect(pan);
        pan.connect(textureBus);

        noise.start(time);
        noise.stop(time + dur + 0.1);
        panLfo.start(time);
        panLfo.stop(time + dur + 0.1);
    }

    // ═══════════════════════════════════════════════════════════════
    // ─── POLYRHYTHMIC DRUM ENGINE ───
    // ═══════════════════════════════════════════════════════════════

    // Stochastic probability tables per rhythm state
    const DRUM_PATTERNS = {
        sparse: {
            kick:    [0.80, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.60, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
            snare:   [0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
            hat:     [0.30, 0.00, 0.20, 0.00, 0.30, 0.00, 0.20, 0.00, 0.30, 0.00, 0.20, 0.00, 0.30, 0.00, 0.20, 0.00],
            perc:    [0.05, 0.00, 0.00, 0.08, 0.00, 0.00, 0.10, 0.00, 0.05, 0.00, 0.00, 0.08, 0.00, 0.00, 0.10, 0.00],
        },
        pulse: {
            kick:    [1.00, 0.00, 0.00, 0.00, 1.00, 0.00, 0.00, 0.00, 1.00, 0.00, 0.00, 0.00, 1.00, 0.00, 0.00, 0.00],
            snare:   [0.00, 0.00, 0.00, 0.00, 1.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 1.00, 0.00, 0.00, 0.00],
            hat:     [0.70, 0.50, 0.70, 0.50, 0.70, 0.50, 0.70, 0.50, 0.70, 0.50, 0.70, 0.50, 0.70, 0.50, 0.70, 0.50],
            perc:    [0.00, 0.00, 0.15, 0.00, 0.00, 0.00, 0.15, 0.00, 0.00, 0.00, 0.15, 0.00, 0.00, 0.00, 0.15, 0.00],
        },
        drive: {
            kick:    [1.00, 0.00, 0.00, 0.15, 1.00, 0.00, 0.00, 0.10, 1.00, 0.00, 0.00, 0.15, 1.00, 0.00, 0.15, 0.20],
            snare:   [0.00, 0.00, 0.00, 0.00, 1.00, 0.00, 0.00, 0.08, 0.00, 0.00, 0.00, 0.00, 1.00, 0.00, 0.00, 0.08],
            hat:     [0.90, 0.75, 0.90, 0.70, 0.90, 0.75, 0.90, 0.80, 0.90, 0.75, 0.90, 0.70, 0.90, 0.80, 0.90, 0.85],
            perc:    [0.10, 0.00, 0.20, 0.30, 0.05, 0.00, 0.60, 0.00, 0.10, 0.00, 0.20, 0.30, 0.05, 0.00, 0.50, 0.10],
        },
        polyrhythm: {
            // 3-over-4 polyrhythm kick
            kick:    [1.00, 0.00, 0.00, 0.00, 0.00, 0.70, 0.00, 0.00, 0.00, 0.00, 0.80, 0.00, 0.00, 0.00, 0.00, 0.60],
            snare:   [0.00, 0.00, 0.00, 0.00, 1.00, 0.00, 0.00, 0.15, 0.00, 0.00, 0.00, 0.00, 1.00, 0.00, 0.00, 0.20],
            hat:     [0.90, 0.60, 0.80, 0.65, 0.90, 0.60, 0.80, 0.70, 0.90, 0.65, 0.80, 0.60, 0.90, 0.70, 0.80, 0.75],
            perc:    [0.20, 0.10, 0.30, 0.40, 0.15, 0.10, 0.70, 0.15, 0.20, 0.10, 0.30, 0.50, 0.15, 0.10, 0.60, 0.20],
        },
        breakdown: {
            kick:    [0.40, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.30, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
            snare:   [0.00, 0.00, 0.00, 0.00, 0.20, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.15, 0.00, 0.00, 0.00],
            hat:     [0.15, 0.00, 0.10, 0.00, 0.15, 0.00, 0.10, 0.00, 0.15, 0.00, 0.10, 0.00, 0.15, 0.00, 0.10, 0.00],
            perc:    [0.10, 0.05, 0.05, 0.15, 0.05, 0.05, 0.25, 0.05, 0.10, 0.05, 0.05, 0.15, 0.05, 0.05, 0.20, 0.05],
        },
    };

    // ▸ MASSIVE KICK — Layered sine body + transient + sub thump
    function playKick(time, intensity) {
        // Pitched sine body
        const body = ctx.createOscillator();
        body.type = 'sine';
        body.frequency.setValueAtTime(lerp(180, 260, intensity), time);
        body.frequency.exponentialRampToValueAtTime(lerp(38, 48, intensity), time + 0.14);

        const bodyEnv = ctx.createGain();
        bodyEnv.gain.setValueAtTime(0.8, time);
        bodyEnv.gain.exponentialRampToValueAtTime(0.001, time + lerp(0.3, 0.45, intensity));

        // Transient click
        const click = ctx.createBufferSource();
        click.buffer = noiseBuffer;
        const clickHP = ctx.createBiquadFilter();
        clickHP.type = 'highpass';
        clickHP.frequency.value = lerp(4000, 7000, intensity);

        const clickEnv = ctx.createGain();
        clickEnv.gain.setValueAtTime(lerp(0.08, 0.18, intensity), time);
        clickEnv.gain.exponentialRampToValueAtTime(0.001, time + 0.01);

        body.connect(bodyEnv);
        bodyEnv.connect(drumBus);
        click.connect(clickHP);
        clickHP.connect(clickEnv);
        clickEnv.connect(drumBus);

        body.start(time);
        body.stop(time + 0.5);
        click.start(time);
        click.stop(time + 0.02);
    }

    // ▸ METALLIC SNARE — Noise through parallel resonant bandpass bank
    function playSnare(time, intensity) {
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        // Shell body
        const shell = ctx.createOscillator();
        shell.type = 'triangle';
        shell.frequency.setValueAtTime(lerp(170, 200, intensity), time);

        const shellEnv = ctx.createGain();
        shellEnv.gain.setValueAtTime(0.22, time);
        shellEnv.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

        // Noise through highpass
        const nFilter = ctx.createBiquadFilter();
        nFilter.type = 'highpass';
        nFilter.frequency.value = 1400;

        const nEnv = ctx.createGain();
        nEnv.gain.setValueAtTime(lerp(0.15, 0.28, intensity), time);
        nEnv.gain.exponentialRampToValueAtTime(0.001, time + lerp(0.12, 0.25, intensity));

        noise.connect(nFilter);
        nFilter.connect(nEnv);
        nEnv.connect(drumBus);
        shell.connect(shellEnv);
        shellEnv.connect(drumBus);

        noise.start(time);
        noise.stop(time + 0.3);
        shell.start(time);
        shell.stop(time + 0.1);
    }

    // ▸ HI-HAT — Noise with randomized velocity and filter
    function playHiHat(time, isOpen, intensity) {
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = lerp(7000, 10500, Math.random());

        const dur = isOpen ? lerp(0.10, 0.18, intensity) : lerp(0.02, 0.05, intensity);
        const velocity = (isOpen ? 0.06 : 0.035) * (0.8 + Math.random() * 0.4);

        const env = ctx.createGain();
        env.gain.setValueAtTime(velocity, time);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        const pan = ctx.createStereoPanner();
        pan.pan.value = (Math.random() - 0.5) * 0.4;

        noise.connect(filter);
        filter.connect(env);
        env.connect(pan);
        pan.connect(drumBus);

        noise.start(time);
        noise.stop(time + dur + 0.01);
    }

    // ▸ TUNED PERCUSSION — Metallic resonant plonks
    function playTunedPerc(time, chordRoot, intensity) {
        const baseFreq = ROOT * Math.pow(2, chordRoot / 12);
        const freq = baseFreq * pick([2, 3, 4, 5, 6, 8]);
        const dur = lerp(0.8, 2.5, Math.random());

        // Exciter: short noise
        const exciter = ctx.createBufferSource();
        exciter.buffer = noiseBuffer;
        const excEnv = ctx.createGain();
        excEnv.gain.setValueAtTime(lerp(0.08, 0.15, intensity), time);
        excEnv.gain.exponentialRampToValueAtTime(0.001, time + 0.006);

        // Resonator
        const delay = ctx.createDelay(0.05);
        delay.delayTime.value = 1 / freq;
        const fb = ctx.createGain();
        fb.gain.value = lerp(0.93, 0.985, intensity);

        const toneFilter = ctx.createBiquadFilter();
        toneFilter.type = 'lowpass';
        toneFilter.frequency.value = lerp(2000, 5000, Math.random());

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.08, time);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        const pan = ctx.createStereoPanner();
        pan.pan.value = (Math.random() - 0.5) * 1.5;

        exciter.connect(excEnv);
        excEnv.connect(delay);
        delay.connect(toneFilter);
        toneFilter.connect(fb);
        fb.connect(delay);
        delay.connect(env);
        env.connect(pan);
        pan.connect(percBus);

        exciter.start(time);
        exciter.stop(time + 0.01);
    }

    // ═══════════════════════════════════════════════════════════════
    // ─── GENERATOR SEQUENCER ───
    // ═══════════════════════════════════════════════════════════════

    function* solutusSequencer() {
        let step = 0;
        let bar = 0;

        while (true) {
            const elapsed = ctx.currentTime - engineStartTime;
            const movement = getMovement(elapsed);
            const intensity = calculateNarrativeIntensity(elapsed);
            const mode = getActiveMode(movement, intensity);

            // Advance harmony via Markov every 2 bars
            if (step === 0 && bar % 2 === 0) {
                currentChordIdx = markovNext(currentChordIdx, HARMONIC_MARKOV);
            }

            // Advance rhythm state every 4 bars
            if (step === 0 && bar % 4 === 0) {
                currentRhythmIdx = markovNext(currentRhythmIdx, RHYTHM_MARKOV);
            }

            const chordRoot = CHORD_ROOTS[currentChordIdx];
            const rhythmState = RHYTHM_STATES[currentRhythmIdx];

            // ── Layer activation based on movement + intensity ──
            const layers = {
                drone:      true, // Always active, volume scales with intensity
                pad:        intensity > 0.08,
                strings:    intensity > 0.35 && (movement.index >= 1),
                bass:       intensity > 0.20,
                arp:        intensity > 0.30,
                bells:      intensity > 0.40,
                lead:       intensity > 0.55,
                vox:        intensity > 0.65 && (movement.index === 2 || movement.index === 3),
                drums:      intensity > 0.15 && movement.index !== 0, // No drums in Genesis
                perc:       intensity > 0.25,
                shimmer:    intensity > 0.20,
                grains:     intensity > 0.45 && (movement.index === 2 || movement.index === 3),
                texture:    movement.index === 0 || movement.index === 4, // Wind in bookend movements
            };

            // ── Stochastic drum triggers ──
            const drumTriggers = {};
            if (layers.drums) {
                const pattern = DRUM_PATTERNS[rhythmState] || DRUM_PATTERNS.pulse;
                for (const [name, probs] of Object.entries(pattern)) {
                    const baseProb = probs[step];
                    const scaledProb = step % 4 === 0
                        ? baseProb
                        : baseProb * lerp(0.5, 1.4, intensity);
                    drumTriggers[name] = Math.random() < Math.min(scaledProb, 1.0);
                }
            }

            // ── Melodic triggers ──
            const arpTrigger = layers.arp && (step % 2 === 0 || (Math.random() < lerp(0.1, 0.4, intensity)));
            const bellTrigger = layers.bells && Math.random() < lerp(0.08, 0.20, intensity);
            const leadTrigger = layers.lead
                && (step === 0 || step === 6 || step === 10)
                && Math.random() < lerp(0.3, 0.7, intensity);
            const voxTrigger = layers.vox && step === 0 && bar % 4 === 0 && Math.random() < 0.6;
            const grainTrigger = layers.grains && Math.random() < lerp(0.05, 0.18, intensity);
            const shimmerTrigger = layers.shimmer && Math.random() < lerp(0.06, 0.15, intensity);

            yield {
                step, bar, intensity, movement, mode, chordRoot, rhythmState,
                layers, drumTriggers,
                arpTrigger, bellTrigger, leadTrigger, voxTrigger,
                grainTrigger, shimmerTrigger,
            };

            step = (step + 1) % 16;
            if (step === 0) bar++;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // ─── PRECISION LOOKAHEAD SCHEDULER ───
    // ═══════════════════════════════════════════════════════════════

    function scheduleNotes() {
        if (nextStepTime < ctx.currentTime - scheduleAheadTime) {
            nextStepTime = ctx.currentTime + 0.05;
        }

        while (nextStepTime < ctx.currentTime + scheduleAheadTime) {
            const state = sequencer.next().value;
            const t = Math.max(nextStepTime, ctx.currentTime);

            // ── Drone — once per 2 bars ──
            if (state.layers.drone && state.step === 0 && state.bar % 2 === 0) {
                playPrimordialDrone(t, state.chordRoot, state.intensity, state.movement);
            }

            // ── Pad — once per bar ──
            if (state.layers.pad && state.step === 0) {
                playEtherealPad(t, state.mode, state.chordRoot, state.intensity, state.movement);
            }

            // ── Strings — once per 2 bars ──
            if (state.layers.strings && state.step === 0 && state.bar % 2 === 0) {
                playStringEnsemble(t, state.mode, state.chordRoot, state.intensity);
            }

            // ── Bass ──
            if (state.layers.bass) {
                const bassPattern = [1, 0, 0, 0.5, 0, 0, 0.7, 0, 1, 0, 0, 0.4, 0, 0.6, 0, 0];
                if (Math.random() < bassPattern[state.step] * lerp(0.6, 1.0, state.intensity)) {
                    playGravitationalBass(t, state.chordRoot, state.step, state.intensity);
                }
            }

            // ── Arpeggios ──
            if (state.arpTrigger) {
                playCrystallineArp(t, state.mode, state.chordRoot, state.step, state.intensity);
            }

            // ── Bells ──
            if (state.bellTrigger) {
                playAuroraBell(t, state.mode, state.chordRoot, state.intensity);
            }

            // ── Lead ──
            if (state.leadTrigger) {
                playSoaringLead(t, state.mode, state.chordRoot, state.intensity, state.movement);
            }

            // ── Spectral Vox ──
            if (state.voxTrigger) {
                playSpectralVox(t, state.chordRoot, state.intensity);
            }

            // ── Granular Clouds ──
            if (state.grainTrigger) {
                playGranularTexture(t, state.chordRoot, state.intensity);
            }

            // ── Shimmer ──
            if (state.shimmerTrigger) {
                playCelestialShimmer(t, state.mode, state.chordRoot);
            }

            // ── Wind/Texture — in Genesis and Rebirth ──
            if (state.layers.texture && state.step === 0 && state.bar % 4 === 0) {
                playWindTexture(t, state.intensity);
            }

            // ── Drums ──
            if (state.drumTriggers.kick) playKick(t, state.intensity);
            if (state.drumTriggers.snare) playSnare(t, state.intensity);
            if (state.drumTriggers.hat) {
                const isOpen = Math.random() < 0.2;
                playHiHat(t, isOpen, state.intensity);
            }
            if (state.drumTriggers.perc) {
                playTunedPerc(t, state.chordRoot, state.intensity);
            }

            nextStepTime += stepDuration;
        }
    }

    function schedulerLoop() {
        scheduleNotes();
        schedulerTimerID = setTimeout(schedulerLoop, schedulerInterval);
    }

    // ═══════════════════════════════════════════════════════════════
    // ─── CONTROLS ───
    // ═══════════════════════════════════════════════════════════════

    function start() {
        if (isPlaying) return;
        init();
        if (ctx.state === 'suspended') ctx.resume();
        isPlaying = true;
        currentChordIdx = 0;
        currentRhythmIdx = 0;
        lastLeadFreq = 0;
        engineStartTime = ctx.currentTime;
        nextStepTime = ctx.currentTime;
        // Always re-ramp master gain (critical after a stop() fade-out)
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(0, ctx.currentTime);
        master.gain.linearRampToValueAtTime(0.80, ctx.currentTime + 6);
        sequencer = solutusSequencer();
        schedulerLoop();
    }

    function stop() {
        isPlaying = false;
        if (schedulerTimerID) clearTimeout(schedulerTimerID);
        schedulerTimerID = null;
        if (master) {
            master.gain.linearRampToValueAtTime(0, ctx.currentTime + 3.0);
        }
    }

    // Expose public API
    window.MateriaMusic11 = { start, stop };

})();
