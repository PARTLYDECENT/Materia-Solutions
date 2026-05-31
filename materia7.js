// materia7.js
// ═══════════════════════════════════════════════════════════════
// MATERIA SOLUTIONS — Nebula Solstice (Cinematic Synthwave)
// A high-fidelity procedural synthwave engine using Web Audio API.
// Features detuned LFO-swept pads, crystalline FM chimes, 
// saturated analog sub-bass, gliding portamento lead, and a 
// stochastic drum sequencer with physical modeling.
// Pure math, pure soul.
// ═══════════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ─── COSMIC MODAL FRAMEWORKS ───
    const MODES = {
        lydian:         [0, 2, 4, 6, 7, 9, 11],     // Bright, celestial
        dorian:         [0, 2, 3, 5, 7, 9, 10],     // Space-heroic minor
        mixolydian:     [0, 2, 4, 5, 7, 9, 10],     // Majestic, driving
        phrygianDom:    [0, 1, 4, 5, 7, 8, 10],     // Exotic, dark, tense
        aeolian:        [0, 2, 3, 5, 7, 8, 10],     // Sweeping, nostalgic minor
    };

    const ROOT = 65.41; // C2 (Base frequency)

    function buildScale(mode, rootFreq, octave) {
        return mode.map(s => rootFreq * Math.pow(2, (s + octave * 12) / 12));
    }

    // ─── MARKOV CHAIN — HARMONIC PROGRESSION ───
    // Chord progression roots (semitone offsets from C)
    // Progression steps: i (C) -> v (G) -> VI (Ab) -> IV (F) -> i (C) -> bII (Db) -> etc.
    const CHORD_ROOTS = [0, 7, 8, 5, 1]; // C, G, Ab, F, Db
    const CHORD_NAMES = ['i', 'v', 'VI', 'IV', 'bII'];

    const MARKOV_MATRIX = [
        //  i      v     VI     IV    bII
        [0.05, 0.35, 0.25, 0.25, 0.10],  // from i
        [0.30, 0.05, 0.15, 0.40, 0.10],  // from v
        [0.20, 0.15, 0.05, 0.40, 0.20],  // from VI
        [0.40, 0.20, 0.20, 0.05, 0.15],  // from IV
        [0.50, 0.10, 0.20, 0.10, 0.10],  // from bII
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

    // ─── DYNAMIC INTENSITY CURVE ───
    function calculateIntensity(timeSeconds) {
        const t = timeSeconds;
        const a = 0.5 + 0.2 * Math.sin(t * 0.012);
        const b = 0.15 * Math.sin(t * 0.027 + 1.5);
        const c = 0.1 * Math.sin(t * 0.006 + 3.8);
        return Math.max(0, Math.min(1, a + b + c));
    }

    function getActiveMode(intensity) {
        if (intensity < 0.22) return MODES.aeolian;
        if (intensity < 0.45) return MODES.dorian;
        if (intensity < 0.68) return MODES.mixolydian;
        if (intensity < 0.85) return MODES.lydian;
        return MODES.phrygianDom;
    }

    // ─── WAVESHAPING DISTORTION CURVES ───
    function makeHardClipCurve(n, threshold) {
        const curve = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            const x = (i * 2) / n - 1;
            curve[i] = 0.5 * (Math.abs(x + threshold) - Math.abs(x - threshold));
        }
        return curve;
    }

    function makeDistortionCurve(k) {
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < n_samples; ++i) {
            const x = (i * 2) / n_samples - 1;
            curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
        }
        return curve;
    }

    // ─── GENERATE NEBULA CONVOLUTION IMPULSE RESPONSE ───
    function generateNebulaIR(audioCtx, duration, decay) {
        const sr = audioCtx.sampleRate;
        const len = sr * duration;
        const buf = audioCtx.createBuffer(2, len, sr);
        // Create an expansive, bright spatial tail
        for (let ch = 0; ch < 2; ch++) {
            const data = buf.getChannelData(ch);
            for (let i = 0; i < len; i++) {
                const mul = Math.pow(1 - i / len, decay);
                // Introduce some early sparse reflections
                const reflection = (i < sr * 0.08) && (Math.random() < 0.06) ? 2.5 : 1.0;
                data[i] = (Math.random() * 2 - 1) * mul * reflection;
            }
            // Double-pass lowpass filter simulation to make the reverb warm and huge
            let prev1 = 0, prev2 = 0;
            for (let i = 0; i < len; i++) {
                prev1 += (data[i] - prev1) / 3.8;
                prev2 += (prev1 - prev2) / 3.8;
                data[i] = prev2;
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
    let driveNode = null;
    let isPlaying = false;
    let bpm = 118; // Classic driving synthwave tempo
    let stepDuration;
    let noiseBuffer = null;
    let engineStartTime = 0;

    let padBus, bassBus, chimeBus, pluckBus, leadBus, drumBus, shimmerBus;

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

        // Master Chain: Compressor -> Drive (subtle glue) -> Master Gain -> Destination
        compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -18;
        compressor.knee.value = 15;
        compressor.ratio.value = 4.5;
        compressor.attack.value = 0.008; // Punchy transients
        compressor.release.value = 0.22;

        driveNode = ctx.createWaveShaper();
        driveNode.curve = makeDistortionCurve(10); // Very mild master warming
        driveNode.oversample = '4x';

        master = ctx.createGain();
        master.gain.setValueAtTime(0, ctx.currentTime);
        master.gain.linearRampToValueAtTime(0.38, ctx.currentTime + 5); // Smooth fade-in

        // --- Audio Bridge for Reactivity ---
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        window.MateriaAnalyser = analyser;

        compressor.connect(driveNode);
        driveNode.connect(analyser);
        analyser.connect(master);
        master.connect(ctx.destination);

        // ── Nebula Reverb ──
        reverbSend = ctx.createGain();
        reverbSend.gain.value = 0.40;

        convolver = ctx.createConvolver();
        convolver.buffer = generateNebulaIR(ctx, 6.5, 3.2);

        const reverbReturn = ctx.createGain();
        reverbReturn.gain.value = 0.45;
        
        const reverbFilter = ctx.createBiquadFilter();
        reverbFilter.type = 'highpass';
        reverbFilter.frequency.value = 250; // Cut low mud

        const reverbLpf = ctx.createBiquadFilter();
        reverbLpf.type = 'lowpass';
        reverbLpf.frequency.value = 4500; // Ethereal highs but not piercing

        reverbSend.connect(convolver);
        convolver.connect(reverbFilter);
        reverbFilter.connect(reverbLpf);
        reverbLpf.connect(reverbReturn);
        reverbReturn.connect(compressor);

        // ── Multi-Tap Ping-Pong Delay ──
        delayNode = ctx.createDelay(2.0);
        delayNode.delayTime.value = stepDuration * 3; // Dotted 8th delay

        delayFeedback = ctx.createGain();
        delayFeedback.gain.value = 0.45;

        const delayFilter = ctx.createBiquadFilter();
        delayFilter.type = 'bandpass';
        delayFilter.frequency.value = 1600;
        delayFilter.Q.value = 1.0;

        delayNode.connect(delayFeedback);
        delayFeedback.connect(delayFilter);
        delayFilter.connect(delayNode);
        
        // Route delay to reverb send & compressor
        delayNode.connect(reverbSend);
        delayNode.connect(compressor);

        // ── Saturation Stage for Bass & Drums ──
        const drumSat = ctx.createWaveShaper();
        drumSat.curve = makeHardClipCurve(4096, 0.82);
        drumSat.oversample = '2x';
        
        const drumSatGain = ctx.createGain();
        drumSatGain.gain.value = 0.85;
        drumSat.connect(drumSatGain);
        drumSatGain.connect(compressor);

        // ── Buses ──
        padBus      = createBus(0.24, true);
        bassBus     = createBus(0.38, false, drumSat); // Distort bass
        chimeBus    = createBus(0.12, true, null, true); // delay
        pluckBus    = createBus(0.15, true, null, true); // delay
        leadBus     = createBus(0.18, true, null, true); // delay
        drumBus     = createBus(0.42, true, drumSat); // Distort drums slightly
        shimmerBus  = createBus(0.08, true);

        noiseBuffer = createNoiseBuffer(2);
        engineStartTime = ctx.currentTime;
    }

    function createBus(vol, toReverb = true, destinationNode = null, toDelay = false) {
        const g = ctx.createGain();
        g.gain.value = vol;

        const dest = destinationNode || compressor;
        g.connect(dest);

        if (toReverb) g.connect(reverbSend);
        if (toDelay) g.connect(delayNode);

        return g;
    }

    function createNoiseBuffer(seconds) {
        const len = ctx.sampleRate * seconds;
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        return buf;
    }

    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    function lerp(a, b, t) { return a + (b - a) * t; }

    // ═══════════════════════════════════════════════════════════════
    // ─── INSTRUMENTS ───
    // ═══════════════════════════════════════════════════════════════

    // ▸ NEBULA SWEEPING PAD — Detuned sawtooth pad with stereo swirling LFO
    function playNebulaPad(time, mode, chordRoot, intensity) {
        const rootFreq = ROOT * Math.pow(2, chordRoot / 12);
        const scale = buildScale(mode, rootFreq, 2);
        const duration = stepDuration * 16; // One full bar
        const notes = [scale[0], scale[2], scale[4], scale[6 % scale.length]];

        notes.forEach((freq, noteIdx) => {
            [-8, 0, 8].forEach((detune, voiceIdx) => {
                const osc = ctx.createOscillator();
                osc.type = 'sawtooth';
                osc.frequency.value = freq;
                osc.detune.value = detune;

                // LFO Swept lowpass filter
                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                
                const baseCutoff = lerp(350, 800, intensity);
                const peakCutoff = lerp(1200, 2600, intensity);
                filter.frequency.setValueAtTime(baseCutoff, time);
                filter.frequency.exponentialRampToValueAtTime(peakCutoff, time + duration * 0.4);
                filter.frequency.exponentialRampToValueAtTime(baseCutoff * 0.8, time + duration);
                filter.Q.value = lerp(1.0, 3.5, intensity);

                const env = ctx.createGain();
                env.gain.setValueAtTime(0, time);
                env.gain.linearRampToValueAtTime(0.06 / notes.length, time + duration * 0.25);
                env.gain.setValueAtTime(0.05 / notes.length, time + duration * 0.7);
                env.gain.linearRampToValueAtTime(0, time + duration);

                // Auto-Panner using a slow desynchronized LFO
                const panner = ctx.createStereoPanner();
                const panLfo = ctx.createOscillator();
                panLfo.type = 'sine';
                panLfo.frequency.value = 0.08 + (noteIdx * 0.03) + (voiceIdx * 0.01);
                
                panLfo.connect(panner.pan);
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

    // ▸ ANALOG SUB BASS — Heavy pitch-sliding C1 sub-bass
    function playSubBass(time, chordRoot, step, intensity) {
        const rootFreq = ROOT * Math.pow(2, chordRoot / 12) * 0.5; // C1/C2 range
        const dur = stepDuration * 1.5;

        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(rootFreq * 1.08, time); // Pitch slide attack
        osc.frequency.exponentialRampToValueAtTime(rootFreq, time + 0.035);

        // Warm sub lowpass
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(lerp(180, 450, intensity), time);
        filter.Q.value = 2.0;

        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(0.7, time + 0.01);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        osc.connect(filter);
        filter.connect(env);
        env.connect(bassBus);

        osc.start(time);
        osc.stop(time + dur + 0.1);
    }

    // ▸ COSMIC FM CHIMES — Pristine inharmonic bell pings
    function playCosmicChime(time, mode, chordRoot, intensity) {
        const rootFreq = ROOT * Math.pow(2, chordRoot / 12);
        const scale = buildScale(mode, rootFreq, 5); // High octave 5
        const freq = pick(scale);
        const dur = 2.2;

        const carrier = ctx.createOscillator();
        carrier.type = 'sine';
        carrier.frequency.value = freq;

        const modulator = ctx.createOscillator();
        modulator.type = 'sine';
        modulator.frequency.value = freq * 3.1415; // Golden/inharmoic ratio for bell tone

        const modGain = ctx.createGain();
        modGain.gain.setValueAtTime(freq * lerp(2, 6, intensity), time);
        modGain.gain.exponentialRampToValueAtTime(10, time + dur * 0.4);

        modulator.connect(modGain);
        modGain.connect(carrier.frequency);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(0.18, time + 0.004);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        const pan = ctx.createStereoPanner();
        pan.pan.value = (Math.random() - 0.5) * 1.6;

        carrier.connect(env);
        env.connect(pan);
        pan.connect(chimeBus);

        carrier.start(time);
        carrier.stop(time + dur + 0.1);
        modulator.start(time);
        modulator.stop(time + dur + 0.1);
    }

    // ▸ RYTHMIC SYNTH PLUCKS — Driving arpeggiator notes
    function playArpPluck(time, mode, chordRoot, step, intensity) {
        const rootFreq = ROOT * Math.pow(2, chordRoot / 12);
        const scale = buildScale(mode, rootFreq, 3);
        
        // Sequence movement: upward arpeggiation with octave jumps
        const octaveOffset = step % 8 >= 4 ? 12 : 0;
        const baseNote = scale[step % scale.length];
        const freq = baseNote * Math.pow(2, octaveOffset / 12);
        const dur = stepDuration * 1.8;

        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = freq;

        // Dissonant secondary oscillator for vintage 80s grit
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = freq * 2;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(freq * 3, time);
        filter.Q.value = 2.5;

        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(0.22, time + 0.005);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        const pan = ctx.createStereoPanner();
        pan.pan.value = Math.sin(step * 0.6) * 0.7; // Stereo ping-pong panning

        osc.connect(filter);
        osc2.connect(filter);
        filter.connect(env);
        env.connect(pan);
        pan.connect(pluckBus);

        osc.start(time);
        osc2.start(time);
        osc.stop(time + dur + 0.1);
        osc2.stop(time + dur + 0.1);
    }

    // ▸ SOARING PORTAMENTO LEAD — Gliding square wave with vibrato
    let lastLeadFreq = 0;
    function playSoaringLead(time, mode, chordRoot, step, intensity) {
        const rootFreq = ROOT * Math.pow(2, chordRoot / 12);
        const scale = buildScale(mode, rootFreq, 4); // Octave 4
        const freq = pick(scale);
        const dur = stepDuration * 6.5;

        const osc = ctx.createOscillator();
        osc.type = 'square';

        // High quality Portamento / Glide from the previous note
        if (lastLeadFreq > 0) {
            osc.frequency.setValueAtTime(lastLeadFreq, time);
            osc.frequency.exponentialRampToValueAtTime(freq, time + 0.12);
        } else {
            osc.frequency.setValueAtTime(freq, time);
        }
        lastLeadFreq = freq;

        // Pitch vibrato via LFO
        const vibratoLfo = ctx.createOscillator();
        vibratoLfo.type = 'sine';
        vibratoLfo.frequency.value = 6.2; // 6.2 Hz wobble
        
        const vibratoGain = ctx.createGain();
        vibratoGain.gain.value = 5.5; // detuning depth in Hz
        vibratoLfo.connect(vibratoGain);
        vibratoGain.connect(osc.frequency);

        // Creamy bandpass filter
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1400, time);
        filter.frequency.exponentialRampToValueAtTime(3200, time + dur * 0.3);
        filter.frequency.exponentialRampToValueAtTime(1000, time + dur);
        filter.Q.value = 2.0;

        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(0.12, time + dur * 0.1);
        env.gain.setValueAtTime(0.09, time + dur * 0.6);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        const pan = ctx.createStereoPanner();
        pan.pan.value = (Math.random() - 0.5) * 0.6;

        osc.connect(filter);
        filter.connect(env);
        env.connect(pan);
        pan.connect(leadBus);

        osc.start(time);
        vibratoLfo.start(time);
        osc.stop(time + dur + 0.1);
        vibratoLfo.stop(time + dur + 0.1);
    }

    // ▸ CELESTIAL SHIMMER — High ethereal pings that drift
    function playShimmer(time, mode, chordRoot) {
        const rootFreq = ROOT * Math.pow(2, chordRoot / 12);
        const scale = buildScale(mode, rootFreq, 6);
        const freq = pick(scale);
        const dur = 4.0 + Math.random() * 3.0;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.detune.value = (Math.random() - 0.5) * 15;

        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(0.05, time + 0.8);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        const pan = ctx.createStereoPanner();
        pan.pan.value = (Math.random() - 0.5) * 1.8;

        osc.connect(env);
        env.connect(pan);
        pan.connect(shimmerBus);

        osc.start(time);
        osc.stop(time + dur + 0.1);
    }

    // ═══════════════════════════════════════════════════════════════
    // ─── STOCHASTIC DRUMS ───
    // ═══════════════════════════════════════════════════════════════

    // ▸ GEARED KICK — Sine body + noise transient sweep + saturation
    function playKick(time, intensity) {
        const body = ctx.createOscillator();
        body.type = 'sine';
        body.frequency.setValueAtTime(160, time);
        body.frequency.exponentialRampToValueAtTime(42, time + 0.13); // Punchy sub drop

        const bodyEnv = ctx.createGain();
        bodyEnv.gain.setValueAtTime(0.85, time);
        bodyEnv.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

        // Attack click
        const click = ctx.createOscillator();
        click.type = 'square';
        click.frequency.value = 900;
        
        const clickEnv = ctx.createGain();
        clickEnv.gain.setValueAtTime(0.18, time);
        clickEnv.gain.exponentialRampToValueAtTime(0.001, time + 0.012);

        body.connect(bodyEnv);
        bodyEnv.connect(drumBus);
        click.connect(clickEnv);
        clickEnv.connect(drumBus);

        body.start(time);
        body.stop(time + 0.4);
        click.start(time);
        click.stop(time + 0.02);
    }

    // ▸ RESONANT HIGH-PASS SNARE — Noise + parallel modal shell resonances
    function playSnare(time, intensity) {
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const nFilter = ctx.createBiquadFilter();
        nFilter.type = 'highpass';
        nFilter.frequency.value = 1600;

        const nEnv = ctx.createGain();
        nEnv.gain.setValueAtTime(0.25, time);
        nEnv.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

        // Acoustic Shell Resonance (Tonal Snare body)
        const shell = ctx.createOscillator();
        shell.type = 'triangle';
        shell.frequency.setValueAtTime(180, time);

        const shellEnv = ctx.createGain();
        shellEnv.gain.setValueAtTime(0.25, time);
        shellEnv.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

        noise.connect(nFilter);
        nFilter.connect(nEnv);
        nEnv.connect(drumBus);

        shell.connect(shellEnv);
        shellEnv.connect(drumBus);

        noise.start(time);
        noise.stop(time + 0.25);
        shell.start(time);
        shell.stop(time + 0.1);
    }

    // ▸ MICRO-RANDOMIZED HI-HATS — highpassed noise sweeps with velocity changes
    function playHiHat(time, isOpen, intensity) {
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = lerp(7500, 10000, Math.random()); // Random frequency sweep

        const dur = isOpen ? 0.14 : 0.045;
        const velocity = (isOpen ? 0.07 : 0.04) * (0.85 + Math.random() * 0.3); // randomized velocities

        const env = ctx.createGain();
        env.gain.setValueAtTime(velocity, time);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        const pan = ctx.createStereoPanner();
        pan.pan.value = (Math.random() - 0.5) * 0.45;

        noise.connect(filter);
        filter.connect(env);
        env.connect(pan);
        pan.connect(drumBus);

        noise.start(time);
        noise.stop(time + dur + 0.01);
    }

    // ═══════════════════════════════════════════════════════════════
    // ─── GENERATOR SEQUENCER ───
    // ═══════════════════════════════════════════════════════════════

    function* synthwaveSequencer() {
        let step = 0;
        let bar = 0;

        while (true) {
            const elapsed = ctx.currentTime - engineStartTime;
            const intensity = calculateIntensity(elapsed);
            const mode = getActiveMode(intensity);

            // Shift chords via Markov on bar boundaries
            if (step === 0 && bar % 2 === 0) {
                currentChordIdx = markovNext(currentChordIdx);
            }

            const chordRoot = CHORD_ROOTS[currentChordIdx];

            // Define layer activation based on dynamic intensity curve
            const layers = {
                pad:        intensity > 0.0,
                bass:       intensity > 0.1,
                plucks:     intensity > 0.22,
                drums:      intensity > 0.28,
                chimes:     intensity > 0.45,
                lead:       intensity > 0.60,
                shimmer:    intensity > 0.30
            };

            // Rhythmic Patterns
            const kickTrigger = layers.drums && (step === 0 || step === 8 || step === 10 || (step === 15 && Math.random() < 0.25));
            const snareTrigger = layers.drums && (step === 4 || step === 12);
            
            // Driving 8th note hi-hat groove with micro-rolls
            const hatTrigger = layers.drums && (step % 2 === 0 || (step % 4 === 1 && Math.random() < 0.35));
            const hatOpen = hatTrigger && (step === 2 || step === 6 || step === 10 || step === 14);

            // Bass runs driving 16th rhythms (cyberpunk-ish sequence)
            const bassPatterns = [
                [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,1,0,0],
                [1,0,0,1, 0,1,0,1, 1,0,0,1, 0,1,0,0],
                [1,1,0,1, 1,0,1,1, 1,1,0,1, 1,0,1,0]
            ];
            const activeBassPattern = bassPatterns[bar % bassPatterns.length];
            const bassTrigger = layers.bass && activeBassPattern[step] === 1;

            // Plucks play driving syncopated 16ths
            const pluckTrigger = layers.plucks && (step % 4 !== 0 || Math.random() < 0.4);

            // Chimes and shimmers are atmospheric
            const chimeTrigger = layers.chimes && Math.random() < 0.15;
            const shimmerTrigger = layers.shimmer && Math.random() < 0.12;

            // Lead triggers on key melodic intervals
            const leadTrigger = layers.lead && (step === 0 || step === 6 || step === 12) && Math.random() < 0.7;

            yield {
                step, bar, intensity, mode, chordRoot, layers,
                kickTrigger, snareTrigger, hatTrigger, hatOpen,
                bassTrigger, pluckTrigger, chimeTrigger, shimmerTrigger, leadTrigger
            };

            step = (step + 1) % 16;
            if (step === 0) bar++;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // ─── PRECISION SCHEDULER ───
    // ═══════════════════════════════════════════════════════════════

    function scheduleNotes() {
        // Prevent drift if page starts laggy or gets throttled in tab background
        if (nextStepTime < ctx.currentTime - scheduleAheadTime) {
            nextStepTime = ctx.currentTime + 0.05;
        }

        while (nextStepTime < ctx.currentTime + scheduleAheadTime) {
            const state = sequencer.next().value;
            const t = Math.max(nextStepTime, ctx.currentTime);

            // ── Pad sweep once per bar ──
            if (state.layers.pad && state.step === 0 && state.bar % 2 === 0) {
                playNebulaPad(t, state.mode, state.chordRoot, state.intensity);
            }

            // ── Bass Hits ──
            if (state.bassTrigger) {
                playSubBass(t, state.chordRoot, state.step, state.intensity);
            }

            // ── Arp Plucks ──
            if (state.pluckTrigger) {
                playArpPluck(t, state.mode, state.chordRoot, state.step, state.intensity);
            }

            // ── Gliding Portamento Lead ──
            if (state.leadTrigger) {
                playSoaringLead(t, state.mode, state.chordRoot, state.step, state.intensity);
            }

            // ── Chimes ──
            if (state.chimeTrigger) {
                playCosmicChime(t, state.mode, state.chordRoot, state.intensity);
            }

            // ── Shimmers ──
            if (state.shimmerTrigger) {
                playShimmer(t, state.mode, state.chordRoot);
            }

            // ── Drums ──
            if (state.kickTrigger) playKick(t, state.intensity);
            if (state.snareTrigger) playSnare(t, state.intensity);
            if (state.hatTrigger) playHiHat(t, state.hatOpen, state.intensity);

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
        lastLeadFreq = 0;
        engineStartTime = ctx.currentTime;
        nextStepTime = ctx.currentTime;
        sequencer = synthwaveSequencer();
        schedulerLoop();
    }

    function stop() {
        isPlaying = false;
        if (schedulerTimerID) clearTimeout(schedulerTimerID);
        schedulerTimerID = null;
        if (master) {
            master.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.5); // Smooth master fade-out
        }
    }

    // Expose public API
    window.MateriaMusic7 = { start, stop };

})();
