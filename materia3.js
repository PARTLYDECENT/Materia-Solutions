// materia3.js
// ═══════════════════════════════════════════════════════════════
// MATERIA SOLUTIONS — Luminous Ambient Engine
// Procedural ethereal soundtrack: Lydian/Ionian harmonic shifts,
// crystalline FM synthesis, massive cathedral convolution reverb,
// granular-like delays, and angelic sustained pads.
// Pure generative light.
// ═══════════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ─── ETHEREAL MODAL FRAMEWORKS ───
    const MODES = {
        lydian:         [0, 2, 4, 6, 7, 9, 11],     // Bright, dreamy, floating
        ionian:         [0, 2, 4, 5, 7, 9, 11],     // Major - pure
        mixolydian:     [0, 2, 4, 5, 7, 9, 10],     // Majestic
        lydianAug:      [0, 2, 4, 6, 8, 9, 11],     // Ethereal, mysterious
        dorian:         [0, 2, 3, 5, 7, 9, 10],     // Melancholic but bright
    };

    // Root frequency C2 = 65.41 Hz
    const ROOT = 65.41;

    function buildScale(mode, rootFreq, octave) {
        return mode.map(s => rootFreq * Math.pow(2, (s + octave * 12) / 12));
    }

    // ─── MARKOV CHAIN — HARMONIC PROGRESSION ───
    // States: I, ii, IV, V, vi
    const CHORD_ROOTS = [0, 2, 5, 7, 9]; 
    const CHORD_NAMES = ['I', 'ii', 'IV', 'V', 'vi'];

    // Transition matrix for uplifting / ethereal progressions
    const MARKOV_MATRIX = [
        //  I     ii    IV    V     vi
        [0.10, 0.20, 0.40, 0.10, 0.20],  // from I
        [0.30, 0.10, 0.20, 0.30, 0.10],  // from ii
        [0.40, 0.10, 0.10, 0.30, 0.10],  // from IV
        [0.40, 0.10, 0.10, 0.10, 0.30],  // from V
        [0.20, 0.20, 0.40, 0.10, 0.10],  // from vi
    ];

    function markovNext(currentIdx) {
        const row = MARKOV_MATRIX[currentIdx];
        let r = Math.random();
        for (let i = 0; i < row.length; i++) {
            r -= row[i];
            if (r <= 0) return i;
        }
        return row.length - 1;
    }

    // ─── ELEVATION CURVE (Replaces Tension) ───
    function calculateElevation(timeSeconds) {
        const t = timeSeconds;
        const a = 0.5 + 0.2 * Math.sin(t * 0.011);
        const b = 0.15 * Math.sin(t * 0.023 + 1.2);
        const c = 0.1 * Math.sin(t * 0.005 + 4.1);
        return Math.max(0, Math.min(1, a + b + c));
    }

    function getActiveMode(elevation) {
        if (elevation < 0.25) return MODES.dorian;
        if (elevation < 0.50) return MODES.mixolydian;
        if (elevation < 0.75) return MODES.ionian;
        if (elevation < 0.90) return MODES.lydian;
        return MODES.lydianAug;
    }

    // ─── SYNTHETIC CATHEDRAL IMPULSE RESPONSE ───
    function generateCathedralIR(audioCtx, duration, decay) {
        const sr = audioCtx.sampleRate;
        const len = sr * duration;
        const buf = audioCtx.createBuffer(2, len, sr);
        // Create an expansive, bright tail
        for (let ch = 0; ch < 2; ch++) {
            const data = buf.getChannelData(ch);
            for (let i = 0; i < len; i++) {
                const mul = Math.pow(1 - i / len, decay);
                // Introduce some sparse reflections early on
                const reflection = (i < sr * 0.1) && (Math.random() < 0.05) ? 2.0 : 1.0;
                data[i] = (Math.random() * 2 - 1) * mul * reflection;
            }
            // Light smoothing to prevent ultimate harshness, but brighter than dark cavern
            let prev = 0; 
            for (let i = 0; i < len; i++) {
                prev += (data[i] - prev) / 3; 
                data[i] = prev;
            }
        }
        return buf;
    }

    // ─── ENGINE STATE ───
    let ctx = null;
    let master = null;
    let compressor = null;
    let convolver = null;
    let reverbSend = null;
    let delayNode = null;
    let delayFeedback = null;
    let isPlaying = false;
    let bpm = 75; // Slower, ambient pace
    let stepDuration;
    let noiseBuffer = null;
    let engineStartTime = 0;

    let padBus, bassBus, chimeBus, pluckBus, droneBus, heartBus, shimmerBus, breathBus;

    let sequencer = null;
    let scheduleAheadTime = 0.15;
    let schedulerInterval = 30;
    let nextStepTime = 0;
    let schedulerTimerID = null;
    let currentChordIdx = 0;

    // ─── INIT ───
    function init() {
        if (ctx) return;
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        stepDuration = 60 / bpm / 4; 

        compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -18;
        compressor.knee.value = 12;
        compressor.ratio.value = 4;
        compressor.attack.value = 0.05;
        compressor.release.value = 0.5;

        master = ctx.createBiquadFilter();
        master.gain.setValueAtTime(0, ctx.currentTime);
        master.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 8); // Gentle fade in

        // --- Audio Bridge for Reactivity ---
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        window.MateriaAnalyser = analyser;

        compressor.connect(analyser);
        analyser.connect(master);
        master.connect(ctx.destination);

        // ── Cathedral Reverb ──
        reverbSend = ctx.createBiquadFilter();
        reverbSend.gain.value = 0.6; // High wet mix

        convolver = ctx.createConvolver();
        convolver.buffer = generateCathedralIR(ctx, 8, 3.5);

        const reverbReturn = ctx.createBiquadFilter();
        reverbReturn.gain.value = 0.5;
        
        const reverbFilter = ctx.createBiquadFilter();
        reverbFilter.type = 'highpass';
        reverbFilter.frequency.value = 400; // Let it be bright and ethereal

        reverbSend.connect(convolver);
        convolver.connect(reverbFilter);
        reverbFilter.connect(reverbReturn);
        reverbReturn.connect(compressor);

        // ── Ping-Pong Delay for Plucks/Chimes ──
        delayNode = ctx.createDelay(2.0);
        delayNode.delayTime.value = stepDuration * 3; // Dotted 8th
        
        delayFeedback = ctx.createGain();
        delayFeedback.gain.value = 0.5;
        
        const delayFilter = ctx.createBiquadFilter();
        delayFilter.type = 'bandpass';
        delayFilter.frequency.value = 1500;
        delayFilter.Q.value = 1;

        delayNode.connect(delayFeedback);
        delayFeedback.connect(delayFilter);
        delayFilter.connect(delayNode);
        delayNode.connect(reverbSend); // Send delay to reverb
        delayNode.connect(compressor);

        // ── Buses ──
        padBus      = createBus(0.20, true);
        bassBus     = createBus(0.35, false);       // Less reverb on bass
        chimeBus    = createBus(0.12, true, true);  // Send to delay
        pluckBus    = createBus(0.15, true, true);
        droneBus    = createBus(0.15, true);
        heartBus    = createBus(0.22, false);        // Heartbeat: dry, intimate
        shimmerBus  = createBus(0.06, true, true);   // High harmonic ghosts
        breathBus   = createBus(0.08, true);         // Wind/breath texture

        noiseBuffer = createNoiseBuffer(2);
        engineStartTime = ctx.currentTime;
    }

    function createBus(vol, useReverb = true, useDelay = false) {
        const g = ctx.createGain();
        g.gain.value = vol;
        g.connect(compressor);
        if (useReverb) g.connect(reverbSend);
        if (useDelay) g.connect(delayNode);
        return g;
    }

    function createNoiseBuffer(seconds) {
        const len = ctx.sampleRate * seconds;
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        return buf;
    }

    function pick(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    // ═══════════════════════════════════════════════════════════════
    // ─── INSTRUMENTS ───
    // ═══════════════════════════════════════════════════════════════

    // ▸ CRYSTAL DRONE — Smooth sine FM, evolving slowly
    function playCrystalDrone(time, chordRoot, elevation) {
        const rootFreq = ROOT * Math.pow(2, chordRoot / 12);
        const carrierFreq = rootFreq; 
        const duration = stepDuration * 32;

        const ratio = 2.0; // Perfect integer for harmony
        const modFreq = carrierFreq * ratio;
        const modIndex = lerp(50, 150, elevation);

        const carrier = ctx.createOscillator();
        carrier.type = 'sine';
        carrier.frequency.value = carrierFreq;

        const modulator = ctx.createOscillator();
        modulator.type = 'sine';
        modulator.frequency.value = modFreq;

        const modGain = ctx.createGain();
        modGain.gain.setValueAtTime(modIndex * 0.2, time);
        modGain.gain.linearRampToValueAtTime(modIndex, time + duration * 0.5);
        modGain.gain.linearRampToValueAtTime(modIndex * 0.2, time + duration);

        modulator.connect(modGain);
        modGain.connect(carrier.frequency);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(lerp(300, 800, elevation), time);
        filter.frequency.linearRampToValueAtTime(lerp(800, 1500, elevation), time + duration * 0.5);
        filter.frequency.linearRampToValueAtTime(lerp(300, 600, elevation), time + duration);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(0.3, time + duration * 0.3);
        env.gain.setValueAtTime(0.3, time + duration * 0.7);
        env.gain.linearRampToValueAtTime(0, time + duration);

        carrier.connect(filter);
        filter.connect(env);
        env.connect(droneBus);

        carrier.start(time);
        carrier.stop(time + duration + 0.1);
        modulator.start(time);
        modulator.stop(time + duration + 0.1);
    }

    // ▸ ANGELIC PAD — Warm, lush chords using sine/triangle mix
    function playAngelicPad(time, mode, chordRoot, elevation) {
        const rootFreq = ROOT * Math.pow(2, chordRoot / 12);
        const scale = buildScale(mode, rootFreq, 2);
        const duration = stepDuration * 32;
        const noteCount = 4;

        for (let i = 0; i < noteCount; i++) {
            const freq = scale[i % scale.length];
            
            [-3, 3].forEach(detune => {
                const osc = ctx.createOscillator();
                osc.type = 'triangle';
                osc.frequency.value = freq;
                osc.detune.value = detune;

                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(lerp(400, 1200, elevation), time);
                filter.frequency.linearRampToValueAtTime(lerp(800, 2400, elevation), time + duration * 0.5);
                filter.frequency.linearRampToValueAtTime(400, time + duration);

                const env = ctx.createGain();
                env.gain.setValueAtTime(0, time);
                env.gain.linearRampToValueAtTime(0.1 / noteCount, time + duration * 0.4);
                env.gain.linearRampToValueAtTime(0, time + duration);

                osc.connect(filter);
                filter.connect(env);
                
                // Stereo spread
                const pan = ctx.createStereoPanner();
                pan.pan.value = (i / noteCount) * 2 - 1;
                env.connect(pan);
                pan.connect(padBus);
                
                osc.start(time);
                osc.stop(time + duration + 0.1);
            });
        }
    }

    // ▸ DEEP WARM SUB — Sine sub bass
    function playWarmSub(time, chordRoot, elevation) {
        const rootFreq = ROOT * Math.pow(2, chordRoot / 12) * 0.5; // C1 range
        const dur = stepDuration * 8; // Half note

        const osc = ctx.createOscillator();
        osc.type = 'triangle'; // Bit of harmonics
        osc.frequency.value = rootFreq;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(150, time);
        
        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(0.6, time + 0.1);
        env.gain.linearRampToValueAtTime(0, time + dur);

        osc.connect(filter);
        filter.connect(env);
        env.connect(bassBus);

        osc.start(time);
        osc.stop(time + dur + 0.1);
    }

    // ▸ LIGHT CHIMES — Sine waves with high FM index
    function playChime(time, mode, chordRoot, elevation) {
        const rootFreq = ROOT * Math.pow(2, chordRoot / 12);
        const scale = buildScale(mode, rootFreq, 6); // Very high
        const freq = pick(scale);
        const dur = 1.5;

        const carrier = ctx.createOscillator();
        carrier.type = 'sine';
        carrier.frequency.value = freq;

        const mod = ctx.createOscillator();
        mod.type = 'sine';
        mod.frequency.value = freq * 3.14; // Inharmonic for bell tone
        
        const modGain = ctx.createGain();
        modGain.gain.setValueAtTime(freq * 2, time);
        modGain.gain.exponentialRampToValueAtTime(10, time + dur * 0.5);
        mod.connect(modGain);
        modGain.connect(carrier.frequency);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(0.2, time + 0.01);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        const pan = ctx.createStereoPanner();
        pan.pan.value = (Math.random() - 0.5) * 1.5;

        carrier.connect(env);
        env.connect(pan);
        pan.connect(chimeBus);

        carrier.start(time);
        carrier.stop(time + dur + 0.1);
        mod.start(time);
        mod.stop(time + dur + 0.1);
    }

    // ▸ AMBIENT PLUCKS — Simple, sweet sine plucks with delay
    function playPluck(time, mode, chordRoot, elevation) {
        const rootFreq = ROOT * Math.pow(2, chordRoot / 12);
        const scale = buildScale(mode, rootFreq, 4);
        const freq = pick(scale);
        const dur = stepDuration * 2;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(0.3, time + 0.02);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        const pan = ctx.createStereoPanner();
        pan.pan.value = (Math.random() - 0.5);

        osc.connect(env);
        env.connect(pan);
        pan.connect(pluckBus);

        osc.start(time);
        osc.stop(time + dur + 0.1);
    }

    // ▸ HEARTBEAT — Deep, soft, slow thud like a sleeping giant
    function playHeartbeat(time) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(80, time);
        osc.frequency.exponentialRampToValueAtTime(30, time + 0.2);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(0.35, time + 0.02);
        env.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

        osc.connect(env);
        env.connect(heartBus);

        osc.start(time);
        osc.stop(time + 0.6);
    }

    // ▸ SHIMMER — Extremely high, ghostly sine pings with slow decay
    function playShimmer(time, mode, chordRoot) {
        const rootFreq = ROOT * Math.pow(2, chordRoot / 12);
        const scale = buildScale(mode, rootFreq, 7); // Very high octave
        const freq = pick(scale);
        const dur = 3 + Math.random() * 4;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.detune.value = (Math.random() - 0.5) * 15;

        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(0.08, time + 0.4);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        const pan = ctx.createStereoPanner();
        pan.pan.value = (Math.random() - 0.5) * 1.8;

        osc.connect(env);
        env.connect(pan);
        pan.connect(shimmerBus);
        osc.start(time);
        osc.stop(time + dur + 0.1);
    }

    // ▸ BREATH TEXTURE — Filtered noise that rises and falls like wind
    function playBreath(time, elevation) {
        const dur = stepDuration * 16;
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(lerp(600, 1200, elevation), time);
        filter.frequency.linearRampToValueAtTime(lerp(1200, 3000, elevation), time + dur * 0.5);
        filter.frequency.linearRampToValueAtTime(lerp(600, 1000, elevation), time + dur);
        filter.Q.value = 3;

        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(lerp(0.02, 0.06, elevation), time + dur * 0.4);
        env.gain.linearRampToValueAtTime(0, time + dur);

        noise.connect(filter);
        filter.connect(env);
        env.connect(breathBus);

        noise.start(time);
        noise.stop(time + dur + 0.1);
    }

    // ▸ HARMONIC GHOST — Octave-doubled sine ghost note that trails behind plucks
    function playGhost(time, mode, chordRoot) {
        const rootFreq = ROOT * Math.pow(2, chordRoot / 12);
        const scale = buildScale(mode, rootFreq, 5);
        const freq = pick(scale);
        const dur = 2 + Math.random() * 2;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(0.04, time + 0.1);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        const pan = ctx.createStereoPanner();
        pan.pan.value = (Math.random() - 0.5) * 1.2;

        osc.connect(env);
        env.connect(pan);
        pan.connect(pluckBus);

        osc.start(time);
        osc.stop(time + dur + 0.1);
    }

    // ═══════════════════════════════════════════════════════════════
    // ─── GENERATOR SEQUENCER ───
    // ═══════════════════════════════════════════════════════════════

    function* ambientSequencer() {
        let step = 0;
        let bar = 0;

        while (true) {
            const elapsed = ctx.currentTime - engineStartTime;
            const elevation = calculateElevation(elapsed);
            const mode = getActiveMode(elevation);

            if (step === 0 && bar % 2 === 0) {
                currentChordIdx = markovNext(currentChordIdx);
            }

            const chordRoot = CHORD_ROOTS[currentChordIdx];

            const layers = {
                drone: true,
                pad: elevation > 0.1,
                bass: bar % 2 === 0 && step === 0,
                plucks: elevation > 0.2,
                chimes: elevation > 0.45,
                heartbeat: step === 0 || step === 8,
                shimmer: elevation > 0.3,
                breath: step === 0 && bar % 4 === 0,
                ghost: elevation > 0.5,
            };

            const pluckTrigger = layers.plucks && Math.random() < lerp(0.2, 0.6, elevation);
            const chimeTrigger = layers.chimes && Math.random() < 0.12;
            const heartbeatTrigger = layers.heartbeat && (Math.random() < 0.85);
            const shimmerTrigger = layers.shimmer && Math.random() < 0.15;
            const breathTrigger = layers.breath;
            const ghostTrigger = layers.ghost && Math.random() < 0.1;

            yield {
                step, bar, elevation, mode, chordRoot, layers,
                pluckTrigger, chimeTrigger, heartbeatTrigger,
                shimmerTrigger, breathTrigger, ghostTrigger
            };

            step = (step + 1) % 16;
            if (step === 0) bar++;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // ─── LOOKAHEAD SCHEDULER ───
    // ═══════════════════════════════════════════════════════════════

    function scheduleNotes() {
        if (nextStepTime < ctx.currentTime - scheduleAheadTime) {
            nextStepTime = ctx.currentTime + 0.05;
        }

        while (nextStepTime < ctx.currentTime + scheduleAheadTime) {
            const state = sequencer.next().value;
            const t = Math.max(nextStepTime, ctx.currentTime);

            if (state.step === 0 && state.bar % 2 === 0) {
                if (state.layers.drone) playCrystalDrone(t, state.chordRoot, state.elevation);
                if (state.layers.pad) playAngelicPad(t, state.mode, state.chordRoot, state.elevation);
            }

            if (state.layers.bass && state.step === 0 && state.bar % 2 === 0) {
                playWarmSub(t, state.chordRoot, state.elevation);
            }

            if (state.heartbeatTrigger) {
                playHeartbeat(t);
            }

            if (state.pluckTrigger) {
                playPluck(t, state.mode, state.chordRoot, state.elevation);
            }

            if (state.chimeTrigger) {
                playChime(t, state.mode, state.chordRoot, state.elevation);
            }

            if (state.shimmerTrigger) {
                playShimmer(t, state.mode, state.chordRoot);
            }

            if (state.breathTrigger) {
                playBreath(t, state.elevation);
            }

            if (state.ghostTrigger) {
                playGhost(t, state.mode, state.chordRoot);
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
        isPlaying = true;
        currentChordIdx = 0;
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
            master.gain.linearRampToValueAtTime(0, ctx.currentTime + 3);
        }
    }

    // ─── NO UI — Controlled by unified dropdown ───

    window.MateriaMusic3 = { start, stop };

})();
