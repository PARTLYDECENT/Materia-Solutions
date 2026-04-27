// materia4.js
// ═══════════════════════════════════════════════════════════════
// MATERIA SOLUTIONS — Cinematic Orchestral Engine
// "Echoes of the Abyss"
// Grand orchestral generative soundtrack: towering brass,
// sweeping string pads, thundering timpani, soaring melodic arcs,
// Dorian/Phrygian modal framework with Markov-driven harmonic
// evolution and cinematic tension curves.
// No samples. No loops. Pure orchestral synthesis.
// ═══════════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ─── ORCHESTRAL MODAL FRAMEWORKS ───
    const MODES = {
        dorian:         [0, 2, 3, 5, 7, 9, 10],      // Noble, heroic minor
        phrygian:       [0, 1, 3, 5, 7, 8, 10],      // Dark, ancient grandeur
        aeolian:        [0, 2, 3, 5, 7, 8, 10],      // Tragic, sweeping
        harmonicMinor:  [0, 2, 3, 5, 7, 8, 11],      // Dramatic, classical tension
        mixolydian:     [0, 2, 4, 5, 7, 9, 10],      // Triumphant, majestic
    };

    const ROOT = 32.70; // C1

    function buildScale(mode, rootFreq, octave) {
        return mode.map(s => rootFreq * Math.pow(2, (s + octave * 12) / 12));
    }

    // ─── MARKOV CHAIN — CINEMATIC PROGRESSION ───
    // States: i, III, iv, V, bVI, bVII
    const CHORD_ROOTS = [0, 3, 5, 7, 8, 10];
    const CHORD_NAMES = ['i', 'III', 'iv', 'V', 'bVI', 'bVII'];

    const MARKOV_MATRIX = [
        // i     III   iv    V     bVI   bVII
        [0.05, 0.15, 0.25, 0.20, 0.25, 0.10],  // from i
        [0.25, 0.05, 0.20, 0.15, 0.15, 0.20],  // from III
        [0.15, 0.10, 0.05, 0.35, 0.20, 0.15],  // from iv
        [0.40, 0.10, 0.10, 0.05, 0.20, 0.15],  // from V
        [0.10, 0.15, 0.30, 0.10, 0.05, 0.30],  // from bVI
        [0.35, 0.15, 0.10, 0.20, 0.15, 0.05],  // from bVII
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

    // ─── CINEMATIC ARC CURVE ───
    // Slower, more dramatic tension evolution
    function calculateArc(timeSeconds) {
        const t = timeSeconds;
        const a = 0.45 + 0.25 * Math.sin(t * 0.008);
        const b = 0.18 * Math.sin(t * 0.019 + 2.1);
        const c = 0.12 * Math.sin(t * 0.004 + 5.0);
        const d = 0.08 * Math.sin(t * 0.041 + 1.3);
        return Math.max(0, Math.min(1, a + b + c + d));
    }

    function getActiveMode(arc) {
        if (arc < 0.20) return MODES.dorian;
        if (arc < 0.40) return MODES.aeolian;
        if (arc < 0.60) return MODES.phrygian;
        if (arc < 0.80) return MODES.harmonicMinor;
        return MODES.mixolydian;
    }

    // ─── SYNTHETIC HALL IMPULSE RESPONSE ───
    function generateConcertHallIR(audioCtx, duration, decay) {
        const sr = audioCtx.sampleRate;
        const len = sr * duration;
        const buf = audioCtx.createBuffer(2, len, sr);
        for (let ch = 0; ch < 2; ch++) {
            const data = buf.getChannelData(ch);
            for (let i = 0; i < len; i++) {
                const mul = Math.pow(1 - i / len, decay);
                // Early reflections for concert hall character
                const reflection = (i < sr * 0.08) && (Math.random() < 0.04) ? 3.0 : 1.0;
                data[i] = (Math.random() * 2 - 1) * mul * reflection;
            }
            // Medium smoothing for warm, non-harsh reverb
            let prev = 0;
            for (let i = 0; i < len; i++) {
                prev += (data[i] - prev) / 5;
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
    let bpm = 60; // Slow, cinematic tempo
    let stepDuration;
    let noiseBuffer = null;
    let engineStartTime = 0;

    let brassBus, stringBus, bassBus, timpaniBus, hornBus, choirBus, shimmerBus;

    let sequencer = null;
    let scheduleAheadTime = 0.15;
    let schedulerInterval = 30;
    let nextStepTime = 0;
    let schedulerTimerID = null;
    let currentChordIdx = 0;

    function init() {
        if (ctx) return;
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        stepDuration = 60 / bpm / 4;

        compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -15;
        compressor.knee.value = 10;
        compressor.ratio.value = 6;
        compressor.attack.value = 0.005;
        compressor.release.value = 0.3;

        master = ctx.createGain();
        master.gain.setValueAtTime(0, ctx.currentTime);
        master.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 6);

        compressor.connect(master);
        master.connect(ctx.destination);

        // ── Concert Hall Reverb ──
        reverbSend = ctx.createGain();
        reverbSend.gain.value = 0.45;

        convolver = ctx.createConvolver();
        convolver.buffer = generateConcertHallIR(ctx, 7, 2.8);

        const reverbReturn = ctx.createGain();
        reverbReturn.gain.value = 0.4;

        const reverbFilter = ctx.createBiquadFilter();
        reverbFilter.type = 'lowpass';
        reverbFilter.frequency.value = 3500;

        reverbSend.connect(convolver);
        convolver.connect(reverbFilter);
        reverbFilter.connect(reverbReturn);
        reverbReturn.connect(compressor);

        // ── Buses ──
        brassBus    = createBus(0.14);
        stringBus   = createBus(0.22);
        bassBus     = createBus(0.30);
        timpaniBus  = createBus(0.35);
        hornBus     = createBus(0.12);
        choirBus    = createBus(0.10);
        shimmerBus  = createBus(0.05);

        noiseBuffer = createNoiseBuffer(2);
        engineStartTime = ctx.currentTime;
    }

    function createBus(vol) {
        const g = ctx.createGain();
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

    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    function lerp(a, b, t) { return a + (b - a) * t; }

    // ═══════════════════════════════════════════════════════════════
    // ─── INSTRUMENTS ───
    // ═══════════════════════════════════════════════════════════════

    // ▸ STRING PAD — Massive detuned sawtooth ensemble with slow filter sweep
    function playStringPad(time, mode, chordRoot, arc) {
        const rootFreq = ROOT * Math.pow(2, chordRoot / 12);
        const scale = buildScale(mode, rootFreq, 3);
        const duration = stepDuration * 32;
        const noteCount = arc > 0.6 ? 5 : 4;

        for (let i = 0; i < noteCount; i++) {
            const freq = scale[i % scale.length];
            // 5-voice unison for massive width
            [-12, -5, 0, 5, 12].forEach(detune => {
                const osc = ctx.createOscillator();
                osc.type = 'sawtooth';
                osc.frequency.value = freq;
                osc.detune.value = detune;

                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(lerp(300, 800, arc), time);
                filter.frequency.linearRampToValueAtTime(lerp(1200, 3500, arc), time + duration * 0.4);
                filter.frequency.linearRampToValueAtTime(lerp(400, 1000, arc), time + duration);
                filter.Q.value = lerp(0.7, 2, arc);

                const env = ctx.createGain();
                env.gain.setValueAtTime(0, time);
                env.gain.linearRampToValueAtTime(0.04 / noteCount, time + duration * 0.35);
                env.gain.setValueAtTime(0.03 / noteCount, time + duration * 0.7);
                env.gain.linearRampToValueAtTime(0, time + duration);

                const pan = ctx.createStereoPanner();
                pan.pan.value = ((i / noteCount) * 2 - 1) * 0.7;

                osc.connect(filter);
                filter.connect(env);
                env.connect(pan);
                pan.connect(stringBus);
                osc.start(time);
                osc.stop(time + duration + 0.1);
            });
        }
    }

    // ▸ BRASS FANFARE — Layered square/saw with filter swell for heroic brass
    function playBrass(time, mode, chordRoot, arc) {
        const rootFreq = ROOT * Math.pow(2, chordRoot / 12);
        const scale = buildScale(mode, rootFreq, 3);
        const duration = stepDuration * lerp(8, 16, arc);
        const noteCount = 3;

        for (let i = 0; i < noteCount; i++) {
            const freq = scale[(i * 2) % scale.length];

            [-8, 0, 8].forEach(detune => {
                const osc = ctx.createOscillator();
                osc.type = i === 0 ? 'sawtooth' : 'square';
                osc.frequency.value = freq;
                osc.detune.value = detune;

                // Brass attack: aggressive filter swell
                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(lerp(200, 400, arc), time);
                filter.frequency.linearRampToValueAtTime(lerp(1500, 5000, arc), time + duration * 0.15);
                filter.frequency.linearRampToValueAtTime(lerp(800, 2500, arc), time + duration * 0.5);
                filter.frequency.linearRampToValueAtTime(300, time + duration);
                filter.Q.value = lerp(1, 3, arc);

                const env = ctx.createGain();
                env.gain.setValueAtTime(0, time);
                env.gain.linearRampToValueAtTime(lerp(0.04, 0.08, arc), time + duration * 0.12);
                env.gain.setValueAtTime(lerp(0.03, 0.06, arc), time + duration * 0.6);
                env.gain.linearRampToValueAtTime(0, time + duration);

                osc.connect(filter);
                filter.connect(env);
                env.connect(brassBus);
                osc.start(time);
                osc.stop(time + duration + 0.1);
            });
        }
    }

    // ▸ FRENCH HORN — Warm, round tone via filtered square + vibrato
    function playHorn(time, mode, chordRoot, arc) {
        const rootFreq = ROOT * Math.pow(2, chordRoot / 12);
        const scale = buildScale(mode, rootFreq, 3);
        const freq = pick(scale);
        const dur = stepDuration * (4 + Math.random() * 8);

        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = freq;

        // Vibrato
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = lerp(3, 5.5, arc);
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = lerp(2, 6, arc);
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);

        // Warm filter — cuts the harshness of square
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(lerp(500, 1200, arc), time);
        filter.Q.value = 1.5;

        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(lerp(0.05, 0.12, arc), time + dur * 0.15);
        env.gain.setValueAtTime(lerp(0.04, 0.08, arc), time + dur * 0.6);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        const pan = ctx.createStereoPanner();
        pan.pan.value = (Math.random() - 0.5) * 0.8;

        osc.connect(filter);
        filter.connect(env);
        env.connect(pan);
        pan.connect(hornBus);

        osc.start(time);
        osc.stop(time + dur + 0.1);
        lfo.start(time);
        lfo.stop(time + dur + 0.1);
    }

    // ▸ CHOIR — Synthesized vowel formants via parallel bandpass filters on noise + sine
    function playChoir(time, mode, chordRoot, arc) {
        const rootFreq = ROOT * Math.pow(2, chordRoot / 12);
        const scale = buildScale(mode, rootFreq, 4);
        const duration = stepDuration * 16;

        // "Ah" vowel formants
        const formants = [730, 1090, 2440];

        const noteCount = 3;
        for (let n = 0; n < noteCount; n++) {
            const freq = scale[n % scale.length];

            const osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = freq;
            osc.detune.value = (Math.random() - 0.5) * 8;

            const merger = ctx.createGain();
            merger.gain.value = 0.06;

            formants.forEach(fFreq => {
                const bp = ctx.createBiquadFilter();
                bp.type = 'bandpass';
                bp.frequency.value = fFreq;
                bp.Q.value = 8;
                osc.connect(bp);
                bp.connect(merger);
            });

            const env = ctx.createGain();
            env.gain.setValueAtTime(0, time);
            env.gain.linearRampToValueAtTime(0.06, time + duration * 0.3);
            env.gain.setValueAtTime(0.04, time + duration * 0.7);
            env.gain.linearRampToValueAtTime(0, time + duration);

            const pan = ctx.createStereoPanner();
            pan.pan.value = (n / noteCount) * 2 - 1;

            merger.connect(env);
            env.connect(pan);
            pan.connect(choirBus);

            osc.start(time);
            osc.stop(time + duration + 0.1);
        }
    }

    // ▸ DEEP SUB — Cinematic sub-bass rumble
    function playSub(time, chordRoot, arc) {
        const rootFreq = ROOT * Math.pow(2, chordRoot / 12) * 2;
        const dur = stepDuration * 8;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = rootFreq;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(180, time);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(0.5, time + 0.08);
        env.gain.linearRampToValueAtTime(0, time + dur);

        osc.connect(filter);
        filter.connect(env);
        env.connect(bassBus);

        osc.start(time);
        osc.stop(time + dur + 0.1);
    }

    // ▸ TIMPANI — Pitched drum with massive body
    function playTimpani(time, chordRoot, arc) {
        const rootFreq = ROOT * Math.pow(2, chordRoot / 12) * 2;
        const dur = lerp(0.8, 2.0, arc);

        // Pitched body
        const body = ctx.createOscillator();
        body.type = 'sine';
        body.frequency.setValueAtTime(rootFreq * 1.5, time);
        body.frequency.exponentialRampToValueAtTime(rootFreq, time + 0.05);

        const bodyEnv = ctx.createGain();
        bodyEnv.gain.setValueAtTime(0, time);
        bodyEnv.gain.linearRampToValueAtTime(0.6, time + 0.008);
        bodyEnv.gain.exponentialRampToValueAtTime(0.001, time + dur);

        // Noise "skin" transient
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        const nFilter = ctx.createBiquadFilter();
        nFilter.type = 'lowpass';
        nFilter.frequency.value = lerp(400, 800, arc);
        const nEnv = ctx.createGain();
        nEnv.gain.setValueAtTime(lerp(0.15, 0.30, arc), time);
        nEnv.gain.exponentialRampToValueAtTime(0.001, time + 0.06);

        body.connect(bodyEnv);
        bodyEnv.connect(timpaniBus);
        noise.connect(nFilter);
        nFilter.connect(nEnv);
        nEnv.connect(timpaniBus);

        body.start(time);
        body.stop(time + dur + 0.1);
        noise.start(time);
        noise.stop(time + 0.1);
    }

    // ▸ ORCHESTRAL CYMBAL SWELL — Noise filtered for a slow, cinematic rise
    function playCymbalSwell(time, arc) {
        const dur = stepDuration * 16;
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        noise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(8000, time);
        filter.frequency.linearRampToValueAtTime(lerp(4000, 2000, arc), time + dur * 0.6);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(lerp(0.03, 0.10, arc), time + dur * 0.7);
        env.gain.linearRampToValueAtTime(0, time + dur);

        noise.connect(filter);
        filter.connect(env);
        env.connect(shimmerBus);

        noise.start(time);
        noise.stop(time + dur + 0.1);
    }

    // ▸ ORCHESTRAL SHIMMER — High ethereal sine pings
    function playShimmer(time, mode, chordRoot) {
        const rootFreq = ROOT * Math.pow(2, chordRoot / 12);
        const scale = buildScale(mode, rootFreq, 6);
        const freq = pick(scale);
        const dur = 3 + Math.random() * 4;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(0.06, time + 0.3);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        const pan = ctx.createStereoPanner();
        pan.pan.value = (Math.random() - 0.5) * 1.6;

        osc.connect(env);
        env.connect(pan);
        pan.connect(shimmerBus);
        osc.start(time);
        osc.stop(time + dur + 0.1);
    }

    // ═══════════════════════════════════════════════════════════════
    // ─── GENERATOR SEQUENCER ───
    // ═══════════════════════════════════════════════════════════════

    function* orchestralSequencer() {
        let step = 0;
        let bar = 0;

        while (true) {
            const elapsed = ctx.currentTime - engineStartTime;
            const arc = calculateArc(elapsed);
            const mode = getActiveMode(arc);

            if (step === 0 && bar % 2 === 0) {
                currentChordIdx = markovNext(currentChordIdx);
            }

            const chordRoot = CHORD_ROOTS[currentChordIdx];

            const layers = {
                strings: true,
                brass: arc > 0.35,
                horn: arc > 0.25,
                choir: arc > 0.55,
                sub: step === 0 && bar % 2 === 0,
                timpani: arc > 0.30,
                cymbal: step === 0 && bar % 8 === 0 && arc > 0.4,
                shimmer: arc > 0.2,
            };

            const brassTrigger = layers.brass && step === 0 && bar % 4 === 0;
            const hornTrigger = layers.horn
                && (step === 0 || step === 8)
                && Math.random() < lerp(0.2, 0.5, arc);
            const timpaniTrigger = layers.timpani
                && (step === 0 || step === 12)
                && Math.random() < lerp(0.3, 0.7, arc);
            const choirTrigger = layers.choir && step === 0 && bar % 4 === 2;
            const shimmerTrigger = layers.shimmer && Math.random() < 0.12;

            yield {
                step, bar, arc, mode, chordRoot, layers,
                brassTrigger, hornTrigger, timpaniTrigger,
                choirTrigger, shimmerTrigger,
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

            // Strings + Sub every 2 bars
            if (state.step === 0 && state.bar % 2 === 0) {
                playStringPad(t, state.mode, state.chordRoot, state.arc);
                if (state.layers.sub) playSub(t, state.chordRoot, state.arc);
            }

            // Brass fanfares
            if (state.brassTrigger) {
                playBrass(t, state.mode, state.chordRoot, state.arc);
            }

            // French Horn
            if (state.hornTrigger) {
                playHorn(t, state.mode, state.chordRoot, state.arc);
            }

            // Timpani hits
            if (state.timpaniTrigger) {
                playTimpani(t, state.chordRoot, state.arc);
            }

            // Choir
            if (state.choirTrigger) {
                playChoir(t, state.mode, state.chordRoot, state.arc);
            }

            // Cymbal swells
            if (state.layers.cymbal && state.step === 0) {
                playCymbalSwell(t, state.arc);
            }

            // Shimmer
            if (state.shimmerTrigger) {
                playShimmer(t, state.mode, state.chordRoot);
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
        sequencer = orchestralSequencer();
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

    // ─── NO UI — Controlled by dropdown ───

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        // No UI to build
    }

    window.MateriaMusic4 = { start, stop };

})();
