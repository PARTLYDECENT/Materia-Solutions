// materia2.js
// ═══════════════════════════════════════════════════════════════
// MATERIA SOLUTIONS — Dark Industrial Generative Engine
// Next-generation procedural soundtrack: Markov harmonic chains,
// FM synthesis, waveshaping distortion, convolution reverb,
// stochastic drum sequencing, narrative tension curves,
// and precision lookahead scheduling.
// No samples. No loops. Pure generative darkness.
// ═══════════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ─── DARK MODAL FRAMEWORKS ───
    // Frequency ratios relative to root (semitone intervals)
    // Each mode maps 12 chromatic degrees; we pick subsets per mode
    const MODES = {
        aeolian:        [0, 2, 3, 5, 7, 8, 10],      // Natural minor — lowest tension
        phrygian:       [0, 1, 3, 5, 7, 8, 10],      // b2 — driving, dark
        locrian:        [0, 1, 3, 5, 6, 8, 10],      // b2 b5 — unstable, terrifying
        doubleHarmonic: [0, 1, 4, 5, 7, 8, 11],      // b2 3 b6 7 — exotic, severe
        octatonic:      [0, 2, 3, 5, 6, 8, 9, 11],   // Diminished — suspenseful
        phrygianDom:    [0, 1, 4, 5, 7, 8, 10],      // Phrygian dominant — menacing
    };

    // Root frequency C1 = 32.70 Hz
    const ROOT = 32.70;

    // Build frequency tables from semitone intervals
    function buildScale(mode, rootFreq, octave) {
        return mode.map(s => rootFreq * Math.pow(2, (s + octave * 12) / 12));
    }

    // ─── MARKOV CHAIN — HARMONIC PROGRESSION ───
    // States: i, bII, iv, bVI, vii°
    // Semitone offsets from root for chord roots
    const CHORD_ROOTS = [0, 1, 5, 8, 11]; // i, bII, iv, bVI, vii°
    const CHORD_NAMES = ['i', 'bII', 'iv', 'bVI', 'vii°'];

    // Transition probability matrix (row = current, col = next)
    const MARKOV_MATRIX = [
        //  i     bII   iv    bVI   vii°
        [0.08, 0.42, 0.15, 0.22, 0.13],  // from i
        [0.22, 0.08, 0.25, 0.18, 0.27],  // from bII
        [0.13, 0.38, 0.06, 0.33, 0.10],  // from iv
        [0.10, 0.40, 0.22, 0.08, 0.20],  // from bVI
        [0.48, 0.12, 0.10, 0.20, 0.10],  // from vii°
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

    // ─── NARRATIVE TENSION CURVE ───
    // Slow-evolving 1D noise using summed sine waves with irrational period ratios
    function calculateTension(timeSeconds) {
        const t = timeSeconds;
        const a = 0.5 + 0.18 * Math.sin(t * 0.0137);
        const b = 0.22 * Math.sin(t * 0.0291 + 1.7);
        const c = 0.15 * Math.sin(t * 0.0073 + 3.1);
        const d = 0.10 * Math.sin(t * 0.0531 + 0.4);
        const e = 0.08 * Math.sin(t * 0.0019 + 2.2);
        return Math.max(0, Math.min(1, a + b + c + d + e));
    }

    // Select mode based on tension
    function getActiveMode(tension) {
        if (tension < 0.2) return MODES.aeolian;
        if (tension < 0.35) return MODES.phrygian;
        if (tension < 0.5) return MODES.phrygianDom;
        if (tension < 0.65) return MODES.doubleHarmonic;
        if (tension < 0.8) return MODES.octatonic;
        return MODES.locrian;
    }

    // ─── WAVESHAPER CURVES ───
    function makeSoftClipCurve(n) {
        const curve = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            const x = (i * 2) / n - 1;
            curve[i] = x - (x * x * x) / 4;
        }
        return curve;
    }

    function makeSCurveDistortion(n, k) {
        const curve = new Float32Array(n);
        const deg = Math.PI / 180;
        for (let i = 0; i < n; i++) {
            const x = (i * 2) / n - 1;
            curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
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

    // ─── SYNTHETIC IMPULSE RESPONSE ───
    function generateDarkCavernIR(audioCtx, duration, decay) {
        const sr = audioCtx.sampleRate;
        const len = sr * duration;
        const buf = audioCtx.createBuffer(2, len, sr);
        const L = buf.getChannelData(0);
        const R = buf.getChannelData(1);
        for (let i = 0; i < len; i++) {
            const mul = Math.pow(1 - i / len, decay);
            L[i] = (Math.random() * 2 - 1) * mul;
            R[i] = (Math.random() * 2 - 1) * mul;
        }
        // Darken the IR — apply a biquad-style LPF approximation by averaging
        const smoothing = 8;
        for (let ch = 0; ch < 2; ch++) {
            const data = buf.getChannelData(ch);
            let prev = 0;
            for (let i = 0; i < len; i++) {
                prev += (data[i] - prev) / smoothing;
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
    let isPlaying = false;
    let bpm = 128;
    let stepDuration;
    let noiseBuffer = null;
    let engineStartTime = 0;

    // Waveshaper nodes
    let softClipNode = null;
    let hardClipNode = null;
    let sCurveNode = null;

    // Volume buses
    let padBus, bassBus, arpBus, drumBus, leadBus, metalBus, droneBus;

    // Generator state
    let sequencer = null;
    let scheduleAheadTime = 0.1;  // 100ms lookahead window
    let schedulerInterval = 25;    // ms — main thread wakeup
    let nextStepTime = 0;
    let schedulerTimerID = null;

    // Markov state
    let currentChordIdx = 0;

    // ─── INIT ───
    function init() {
        if (ctx) return;
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        stepDuration = 60 / bpm / 4; // 16th note

        // ── Master chain ──
        compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -12;
        compressor.knee.value = 6;
        compressor.ratio.value = 8;
        compressor.attack.value = 0.002;
        compressor.release.value = 0.15;

        master = ctx.createBiquadFilter();
        master.gain.setValueAtTime(0, ctx.currentTime);
        master.gain.linearRampToValueAtTime(0.30, ctx.currentTime + 6);

        compressor.connect(master);
        master.connect(ctx.destination);

        // ── Convolution reverb ──
        reverbSend = ctx.createBiquadFilter();
        reverbSend.gain.value = 0.25;

        convolver = ctx.createConvolver();
        convolver.buffer = generateDarkCavernIR(ctx, 6, 2.5);

        const reverbReturn = ctx.createBiquadFilter();
        reverbReturn.gain.value = 0.35;

        // Darken reverb return — cut highs aggressively
        const reverbFilter = ctx.createBiquadFilter();
        reverbFilter.type = 'lowpass';
        reverbFilter.frequency.value = 1200;
        reverbFilter.Q.value = 0.7;

        reverbSend.connect(convolver);
        convolver.connect(reverbFilter);
        reverbFilter.connect(reverbReturn);
        reverbReturn.connect(compressor);

        // ── Waveshaper curves ──
        softClipNode = ctx.createWaveShaper();
        softClipNode.curve = makeSoftClipCurve(4096);
        softClipNode.oversample = '4x';

        hardClipNode = ctx.createWaveShaper();
        hardClipNode.curve = makeHardClipCurve(4096, 0.85);
        hardClipNode.oversample = '2x';

        sCurveNode = ctx.createWaveShaper();
        sCurveNode.curve = makeSCurveDistortion(4096, 80);
        sCurveNode.oversample = '4x';

        // ── Buses ──
        padBus     = createBus(0.14);
        bassBus    = createBus(0.32);
        arpBus     = createBus(0.08);
        drumBus    = createBus(0.38);
        leadBus    = createBus(0.10);
        metalBus   = createBus(0.07);
        droneBus   = createBus(0.18);

        noiseBuffer = createNoiseBuffer(2);
        engineStartTime = ctx.currentTime;
    }

    function createBus(vol) {
        const g = ctx.createBiquadFilter();
        g.gain.value = vol;
        g.connect(compressor);
        g.connect(reverbSend);
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

    // ▸ FM DRONE — Tearing, evolving sub-bass drone with non-integer FM
    function playFMDrone(time, chordRoot, tension) {
        const rootFreq = ROOT * Math.pow(2, chordRoot / 12);
        const carrierFreq = rootFreq * 2; // C2 range
        const duration = stepDuration * 16;

        // Non-integer ratio for inharmonic metallic quality
        const ratios = [1.414, 2.73, 3.14159, 1.618];
        const ratio = ratios[Math.floor(tension * ratios.length) % ratios.length];
        const modFreq = carrierFreq * ratio;

        // Modulation index evolves with tension
        const modIndex = lerp(30, 400, tension);

        // Carrier
        const carrier = ctx.createOscillator();
        carrier.type = 'sine';
        carrier.frequency.value = carrierFreq;

        // Modulator
        const modulator = ctx.createOscillator();
        modulator.type = 'sine';
        modulator.frequency.value = modFreq;

        // Modulation depth (index * modulator frequency)
        const modGain = ctx.createBiquadFilter();
        modGain.gain.setValueAtTime(modIndex, time);
        modGain.gain.linearRampToValueAtTime(modIndex * 1.5, time + duration * 0.5);
        modGain.gain.linearRampToValueAtTime(modIndex * 0.3, time + duration);

        modulator.connect(modGain);
        modGain.connect(carrier.frequency);

        // Filter — darker at low tension, more open at high
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(lerp(200, 800, tension), time);
        filter.frequency.linearRampToValueAtTime(lerp(400, 2000, tension), time + duration * 0.4);
        filter.frequency.linearRampToValueAtTime(lerp(150, 600, tension), time + duration);
        filter.Q.value = lerp(0.7, 4, tension);

        // Amplitude envelope
        const env = ctx.createBiquadFilter();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(lerp(0.04, 0.10, tension), time + duration * 0.2);
        env.gain.setValueAtTime(lerp(0.04, 0.10, tension), time + duration * 0.7);
        env.gain.linearRampToValueAtTime(0, time + duration);

        carrier.connect(filter);

        // Route through soft clip distortion at higher tension levels
        if (tension > 0.5) {
            const dist = ctx.createWaveShaper();
            dist.curve = makeSCurveDistortion(4096, lerp(20, 200, tension));
            dist.oversample = '4x';
            filter.connect(dist);
            dist.connect(env);
        } else {
            filter.connect(env);
        }

        env.connect(droneBus);

        carrier.start(time);
        carrier.stop(time + duration + 0.1);
        modulator.start(time);
        modulator.stop(time + duration + 0.1);
    }

    // ▸ DARK PAD — Detuned, suffocating pad with filter automation
    function playDarkPad(time, mode, chordRoot, tension) {
        const rootFreq = ROOT * Math.pow(2, chordRoot / 12);
        const scale = buildScale(mode, rootFreq, 3);
        const duration = stepDuration * 16;

        // Select 3-4 notes for the chord voicing
        const noteCount = tension > 0.6 ? 4 : 3;
        const indices = [];
        for (let i = 0; i < noteCount; i++) {
            indices.push(i % scale.length);
        }

        indices.forEach(idx => {
            const freq = scale[idx];
            // 3 detuned oscillators per note — wider detune at higher tension
            const detuneAmt = lerp(5, 18, tension);
            [-detuneAmt, 0, detuneAmt].forEach(detune => {
                const osc = ctx.createOscillator();
                osc.type = 'sawtooth';
                osc.frequency.value = freq;
                osc.detune.value = detune;

                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                const startCutoff = lerp(200, 500, tension);
                const peakCutoff = lerp(600, 2200, tension);
                filter.frequency.setValueAtTime(startCutoff, time);
                filter.frequency.linearRampToValueAtTime(peakCutoff, time + duration * 0.35);
                filter.frequency.linearRampToValueAtTime(Math.max(startCutoff * 0.8, 80), time + duration);
                filter.Q.value = lerp(0.7, 3, tension);

                const env = ctx.createBiquadFilter();
                env.gain.setValueAtTime(0, time);
                env.gain.linearRampToValueAtTime(0.05, time + duration * 0.25);
                env.gain.setValueAtTime(0.04, time + duration * 0.6);
                env.gain.linearRampToValueAtTime(0, time + duration);

                osc.connect(filter);
                filter.connect(env);
                env.connect(padBus);
                osc.start(time);
                osc.stop(time + duration + 0.1);
            });
        });
    }

    // ▸ FM BASS — Aggressive, distorted bass hits with pitch envelope
    function playFMBass(time, chordRoot, tension) {
        const rootFreq = ROOT * Math.pow(2, chordRoot / 12) * 4; // C3 range
        const dur = stepDuration * 2;

        // Carrier
        const carrier = ctx.createOscillator();
        carrier.type = 'sine';
        carrier.frequency.setValueAtTime(rootFreq * 1.04, time);
        carrier.frequency.exponentialRampToValueAtTime(rootFreq, time + 0.04);

        // Modulator — integer ratio for punchy bass, non-integer at high tension
        const modRatio = tension > 0.6 ? 1.414 : 2;
        const modulator = ctx.createOscillator();
        modulator.type = 'sine';
        modulator.frequency.value = rootFreq * modRatio;

        const modGain = ctx.createBiquadFilter();
        const modIndex = lerp(50, 300, tension);
        modGain.gain.setValueAtTime(modIndex, time);
        modGain.gain.exponentialRampToValueAtTime(10, time + dur * 0.8);

        modulator.connect(modGain);
        modGain.connect(carrier.frequency);

        // Distortion stage
        const dist = ctx.createWaveShaper();
        dist.curve = makeHardClipCurve(4096, lerp(0.9, 0.5, tension));
        dist.oversample = '2x';

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        // Avoid Biquad filter frequency ramps on short bass notes to prevent internal audio engine math explosions
        filter.frequency.setValueAtTime(lerp(400, 1500, tension), time);
        filter.Q.value = lerp(1, 3, tension);

        // Envelope
        const env = ctx.createBiquadFilter();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(lerp(0.25, 0.45, tension), time + 0.008);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        carrier.connect(dist);
        dist.connect(filter);
        filter.connect(env);
        env.connect(bassBus);

        carrier.start(time);
        carrier.stop(time + dur + 0.1);
        modulator.start(time);
        modulator.stop(time + dur + 0.1);
    }

    // ▸ METALLIC ARP — Dissonant, razor-sharp plucks using resonant bandpass
    function playMetallicArp(time, mode, chordRoot, tension) {
        const rootFreq = ROOT * Math.pow(2, chordRoot / 12);
        const scale = buildScale(mode, rootFreq, 5); // High octave
        const freq = pick(scale);
        const dur = stepDuration * lerp(0.8, 1.8, Math.random());

        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = freq;
        osc.detune.value = (Math.random() - 0.5) * lerp(5, 40, tension);

        // Sharp resonant filter
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        // Remove fast sweep as it causes BiquadFilterNode blowup in Web Audio. Just set a static high Q frequency.
        filter.frequency.setValueAtTime(freq * 1.5, time);
        filter.Q.value = lerp(2, 6, tension);

        const env = ctx.createBiquadFilter();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(lerp(0.08, 0.18, tension), time + 0.003);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        // Stereo spread
        const pan = ctx.createStereoPanner();
        pan.pan.value = (Math.random() - 0.5) * 1.8;

        osc.connect(filter);
        filter.connect(env);
        env.connect(pan);
        pan.connect(arpBus);
        osc.start(time);
        osc.stop(time + dur + 0.1);
    }

    // ▸ LEAD — Screaming, distorted FM lead with vibrato
    function playLead(time, mode, chordRoot, tension) {
        const rootFreq = ROOT * Math.pow(2, chordRoot / 12);
        const scale = buildScale(mode, rootFreq, 4);
        const freq = pick(scale);
        const dur = stepDuration * (2 + Math.random() * 4);

        // Carrier
        const carrier = ctx.createOscillator();
        carrier.type = 'sawtooth';
        carrier.frequency.value = freq;

        // FM modulator for grit
        const mod = ctx.createOscillator();
        mod.type = 'square';
        mod.frequency.value = freq * lerp(1, 3, tension);
        const modGain = ctx.createBiquadFilter();
        modGain.gain.value = lerp(10, 80, tension);
        mod.connect(modGain);
        modGain.connect(carrier.frequency);

        // Vibrato LFO
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = lerp(4, 7, tension);
        const lfoGain = ctx.createBiquadFilter();
        lfoGain.gain.value = lerp(3, 12, tension);
        lfo.connect(lfoGain);
        lfoGain.connect(carrier.frequency);

        // Distortion
        const dist = ctx.createWaveShaper();
        dist.curve = makeSCurveDistortion(4096, lerp(30, 150, tension));
        dist.oversample = '4x';

        // Filter
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        // Remove fast parameter automation on lead. Static frequency scaled by tension to prevent math blowup.
        filter.frequency.setValueAtTime(lerp(1800, 4000, tension), time);
        filter.Q.value = lerp(1.5, 4, tension);

        // Amplitude envelope handles the articulation
        const env = ctx.createBiquadFilter();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(lerp(0.04, 0.10, tension), time + dur * 0.08);
        env.gain.setValueAtTime(lerp(0.03, 0.07, tension), time + dur * 0.5);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        carrier.connect(dist);
        dist.connect(filter);
        filter.connect(env);
        env.connect(leadBus);

        carrier.start(time);
        carrier.stop(time + dur + 0.1);
        mod.start(time);
        mod.stop(time + dur + 0.1);
        lfo.start(time);
        lfo.stop(time + dur + 0.1);
    }

    // ▸ METALLIC RESONANCE — Physical modeling via comb filter (Karplus-Strong)
    function playMetalHit(time, tension) {
        const dur = lerp(1.5, 4, tension);

        // Exciter: short noise burst
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const exciterEnv = ctx.createBiquadFilter();
        exciterEnv.gain.setValueAtTime(lerp(0.15, 0.35, tension), time);
        exciterEnv.gain.exponentialRampToValueAtTime(0.001, time + 0.008);

        // Resonator: delay with high feedback
        const delay = ctx.createDelay(0.05);
        const pitchHz = lerp(80, 400, Math.random());
        delay.delayTime.value = 1 / pitchHz;

        const feedback = ctx.createBiquadFilter();
        feedback.gain.value = lerp(0.92, 0.99, tension);

        // Material filter — simulates metal type
        const matFilter = ctx.createBiquadFilter();
        matFilter.type = Math.random() > 0.5 ? 'highpass' : 'lowpass';
        matFilter.frequency.value = lerp(500, 3000, Math.random());
        matFilter.Q.value = lerp(0.5, 2.5, tension);

        // Modulate delay time subtly for eerie detuning
        const delayLFO = ctx.createOscillator();
        delayLFO.type = 'sine';
        delayLFO.frequency.value = lerp(0.1, 2, tension);
        const delayLFOGain = ctx.createBiquadFilter();
        delayLFOGain.gain.value = 0.00003; // Very subtle pitch drift
        delayLFO.connect(delayLFOGain);
        delayLFOGain.connect(delay.delayTime);

        // Amplitude envelope on output
        const env = ctx.createBiquadFilter();
        env.gain.setValueAtTime(0.12, time);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        // Stereo
        const pan = ctx.createStereoPanner();
        pan.pan.value = (Math.random() - 0.5) * 1.6;

        // Wire: exciter → delay → feedback loop → output
        noise.connect(exciterEnv);
        exciterEnv.connect(delay);
        delay.connect(matFilter);
        matFilter.connect(feedback);
        feedback.connect(delay); // feedback loop
        delay.connect(env);
        env.connect(pan);
        pan.connect(metalBus);

        noise.start(time);
        noise.stop(time + 0.015);
        delayLFO.start(time);
        delayLFO.stop(time + dur + 0.1);
    }

    // ═══════════════════════════════════════════════════════════════
    // ─── INDUSTRIAL DRUMS ───
    // ═══════════════════════════════════════════════════════════════

    // Stochastic probability tables (16-step)
    const DRUM_PROB = {
        //                  1     2     3     4     5     6     7     8     9     10    11    12    13    14    15    16
        kick:            [1.00, 0.00, 0.00, 0.15, 1.00, 0.00, 0.00, 0.10, 1.00, 0.00, 0.00, 0.15, 1.00, 0.00, 0.10, 0.20],
        snare:           [0.00, 0.00, 0.00, 0.00, 1.00, 0.00, 0.00, 0.05, 0.00, 0.00, 0.00, 0.00, 1.00, 0.00, 0.00, 0.05],
        hat:             [0.85, 0.70, 0.90, 0.60, 0.85, 0.75, 0.90, 0.80, 0.85, 0.70, 0.90, 0.65, 0.85, 0.80, 0.90, 0.85],
        metal:           [0.20, 0.05, 0.10, 0.40, 0.10, 0.05, 0.80, 0.10, 0.20, 0.05, 0.10, 0.40, 0.10, 0.05, 0.60, 0.15],
    };

    // ▸ INDUSTRIAL KICK — Multi-layer: sine body + noise transient + hard clip saturation
    function playIndustrialKick(time, tension) {
        // Sub body — pitch drops from ~250 Hz to ~38 Hz
        const body = ctx.createOscillator();
        body.type = 'sine';
        body.frequency.setValueAtTime(lerp(200, 300, tension), time);
        body.frequency.exponentialRampToValueAtTime(lerp(35, 42, tension), time + 0.15);

        const bodyEnv = ctx.createBiquadFilter();
        bodyEnv.gain.setValueAtTime(0.7, time);
        bodyEnv.gain.exponentialRampToValueAtTime(0.001, time + lerp(0.35, 0.5, tension));

        // Transient — noise burst through highpass
        const click = ctx.createBufferSource();
        click.buffer = noiseBuffer;
        const clickHP = ctx.createBiquadFilter();
        clickHP.type = 'highpass';
        clickHP.frequency.value = lerp(3000, 6000, tension);
        const clickEnv = ctx.createBiquadFilter();
        clickEnv.gain.setValueAtTime(lerp(0.10, 0.22, tension), time);
        clickEnv.gain.exponentialRampToValueAtTime(0.001, time + 0.012);

        // Saturation stage — glue layers together
        const sat = ctx.createWaveShaper();
        sat.curve = makeHardClipCurve(4096, lerp(0.9, 0.6, tension));
        sat.oversample = '2x';

        body.connect(bodyEnv);
        bodyEnv.connect(sat);
        click.connect(clickHP);
        clickHP.connect(clickEnv);
        clickEnv.connect(sat);
        sat.connect(drumBus);

        body.start(time);
        body.stop(time + 0.6);
        click.start(time);
        click.stop(time + 0.02);
    }

    // ▸ METALLIC SNARE — Noise through parallel inharmonic bandpass bank
    function playMetallicSnare(time, tension) {
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        // Parallel metallic resonances — Q capped to prevent filter instability
        const freqs = [312, 749, 1215, 1877, 2543];
        const merger = ctx.createBiquadFilter();
        merger.gain.value = lerp(0.12, 0.25, tension);

        freqs.forEach(f => {
            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.value = f + (Math.random() - 0.5) * 40;
            bp.Q.value = lerp(4, 10, tension);
            noise.connect(bp);
            bp.connect(merger);
        });

        // Distortion
        const dist = ctx.createWaveShaper();
        dist.curve = makeSCurveDistortion(4096, lerp(30, 120, tension));
        dist.oversample = '2x';

        const env = ctx.createBiquadFilter();
        env.gain.setValueAtTime(1, time);
        env.gain.exponentialRampToValueAtTime(0.001, time + lerp(0.15, 0.35, tension));

        merger.connect(dist);
        dist.connect(env);
        env.connect(drumBus);

        noise.start(time);
        noise.stop(time + 0.4);
    }

    // ▸ INDUSTRIAL HAT — Noise through aggressive highpass
    function playIndustrialHat(time, isOpen, tension) {
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = lerp(6000, 8000, tension);
        filter.Q.value = lerp(0.5, 2, tension);

        const dur = isOpen ? lerp(0.10, 0.18, tension) : lerp(0.02, 0.05, tension);
        const vol = isOpen ? lerp(0.06, 0.10, tension) : lerp(0.03, 0.06, tension);

        const env = ctx.createBiquadFilter();
        env.gain.setValueAtTime(vol, time);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        const pan = ctx.createStereoPanner();
        pan.pan.value = (Math.random() - 0.5) * 0.5;

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

    function* industrialSequencer() {
        let step = 0;
        let bar = 0;

        while (true) {
            const elapsed = ctx.currentTime - engineStartTime;
            const tension = calculateTension(elapsed);
            const mode = getActiveMode(tension);

            // Advance chord via Markov at bar boundaries
            if (step === 0) {
                currentChordIdx = markovNext(currentChordIdx);
            }

            const chordRoot = CHORD_ROOTS[currentChordIdx];

            // Determine active layers based on tension
            const layers = {
                drone:  tension > 0.05,
                pad:    tension > 0.10,
                bass:   tension > 0.25,
                drums:  tension > 0.20,
                arp:    tension > 0.35,
                lead:   tension > 0.55,
                metal:  tension > 0.40,
            };

            // Stochastic drum triggers using probability tables scaled by tension
            const drumTriggers = {};
            if (layers.drums) {
                for (const [name, probs] of Object.entries(DRUM_PROB)) {
                    const baseProbability = probs[step];
                    // Scale off-beat probability by tension
                    const scaledProb = step % 4 === 0
                        ? baseProbability
                        : baseProbability * lerp(0.5, 1.5, tension);
                    drumTriggers[name] = Math.random() < Math.min(scaledProb, 1.0);
                }
            }

            // Stochastic arp trigger
            const arpTrigger = layers.arp && Math.random() < lerp(0.3, 0.8, tension);

            // Lead on beats
            const leadTrigger = layers.lead
                && (step === 0 || step === 4 || step === 8 || step === 12)
                && Math.random() < lerp(0.3, 0.7, tension);

            // Metal resonance — sparse, atmospheric
            const metalTrigger = layers.metal
                && Math.random() < lerp(0.03, 0.12, tension);

            yield {
                step, bar, tension, mode, chordRoot, layers,
                drumTriggers, arpTrigger, leadTrigger, metalTrigger,
            };

            step = (step + 1) % 16;
            if (step === 0) bar++;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // ─── PRECISION LOOKAHEAD SCHEDULER ───
    // ═══════════════════════════════════════════════════════════════

    function scheduleNotes() {
        // If main thread blocked and we fell behind, catch up to prevent scheduling in the past
        // which causes filter coefficients to explode (BiquadFilterNode: state is bad)
        if (nextStepTime < ctx.currentTime - scheduleAheadTime) {
            nextStepTime = ctx.currentTime + 0.05;
        }

        while (nextStepTime < ctx.currentTime + scheduleAheadTime) {
            const state = sequencer.next().value;
            // Ensure t is strictly never in the past
            const t = Math.max(nextStepTime, ctx.currentTime);

            // ── Drone & Pad (once per bar) ──
            if (state.step === 0) {
                if (state.layers.drone) {
                    playFMDrone(t, state.chordRoot, state.tension);
                }
                if (state.layers.pad) {
                    playDarkPad(t, state.mode, state.chordRoot, state.tension);
                }
            }

            // ── Bass ──
            if (state.layers.bass) {
                // Bass pattern: probability-based, favoring downbeats
                const bassProb = [1, 0, 0, 0.6, 0, 0, 0.8, 0, 1, 0, 0, 0.5, 0, 0.7, 0, 0];
                if (Math.random() < bassProb[state.step] * lerp(0.6, 1.0, state.tension)) {
                    playFMBass(t, state.chordRoot, state.tension);
                }
            }

            // ── Drums ──
            if (state.drumTriggers.kick) {
                playIndustrialKick(t, state.tension);
            }
            if (state.drumTriggers.snare) {
                playMetallicSnare(t, state.tension);
            }
            if (state.drumTriggers.hat) {
                playIndustrialHat(t, Math.random() < 0.2, state.tension);
            }
            if (state.drumTriggers.metal) {
                playMetalHit(t, state.tension);
            }

            // ── Arp ──
            if (state.arpTrigger) {
                playMetallicArp(t, state.mode, state.chordRoot, state.tension);
            }

            // ── Lead ──
            if (state.leadTrigger) {
                playLead(t, state.mode, state.chordRoot, state.tension);
            }

            // ── Metal resonance ──
            if (state.metalTrigger) {
                playMetalHit(t, state.tension);
            }

            // Advance time
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
        sequencer = industrialSequencer();
        schedulerLoop();
    }

    function stop() {
        isPlaying = false;
        if (schedulerTimerID) clearTimeout(schedulerTimerID);
        schedulerTimerID = null;
        if (master) {
            master.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);
        }
    }

    // ─── BUILD FLOATING PLAY BUTTON ───
    function buildUI() {
        const btn = document.createElement('button');
        btn.id = 'materia2-music-btn';
        btn.innerHTML = '🔊';
        btn.title = 'Toggle Dark Industrial Soundtrack';
        document.body.appendChild(btn);

        const style = document.createElement('style');
        style.textContent = `
            #materia2-music-btn {
                position: fixed;
                top: 18px;
                right: 64px;
                z-index: 99999;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                border: 1px solid rgba(255, 40, 40, 0.3);
                background: rgba(0, 0, 0, 0.35);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                color: rgba(255, 60, 60, 0.8);
                font-size: 14px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                box-shadow: 0 0 20px rgba(255, 30, 30, 0.08);
            }
            #materia2-music-btn:hover {
                background: rgba(255, 30, 30, 0.15);
                border-color: rgba(255, 40, 40, 0.6);
                box-shadow: 0 0 30px rgba(255, 30, 30, 0.25);
                color: #ff3030;
                transform: scale(1.1);
            }
            #materia2-music-btn.playing {
                animation: darkPulse 1.8s ease-in-out infinite;
                border-color: rgba(255, 40, 40, 0.6);
            }
            @keyframes darkPulse {
                0%, 100% { box-shadow: 0 0 15px rgba(255, 30, 30, 0.1); }
                50% { box-shadow: 0 0 35px rgba(255, 30, 30, 0.35); }
            }
        `;
        document.head.appendChild(style);

        let playing = false;
        btn.addEventListener('click', () => {
            // Stop the original materia engine if it's playing
            if (window.MateriaMusic && window.MateriaMusic.stop) {
                try { window.MateriaMusic.stop(); } catch(e) {}
                const origBtn = document.getElementById('materia-music-btn');
                if (origBtn) {
                    origBtn.classList.remove('playing');
                    origBtn.innerHTML = '♫';
                }
            }
            // Stop materia3 engine if it's playing
            if (window.MateriaMusic3 && window.MateriaMusic3.stop) {
                try { window.MateriaMusic3.stop(); } catch(e) {}
                const ambBtn = document.getElementById('materia3-music-btn');
                if (ambBtn) {
                    ambBtn.classList.remove('playing');
                    ambBtn.innerHTML = '✨';
                }
            }

            if (!playing) {
                start();
                btn.classList.add('playing');
                btn.innerHTML = '⏸';
                playing = true;
            } else {
                stop();
                btn.classList.remove('playing');
                btn.innerHTML = '🔊';
                playing = false;
            }
        });
    }

    // ─── BOOT ───
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        buildUI();
    } else {
        window.addEventListener('DOMContentLoaded', buildUI);
    }

    // Expose for external control
    window.MateriaMusic2 = { start, stop };

})();
