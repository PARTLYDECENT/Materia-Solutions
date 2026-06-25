// materia14.js
// ═══════════════════════════════════════════════════════════════
// MATERIA SOLUTIONS — Materia XIV (Cryogenic Depths)
// Generative audio engine representing the deep subsurface ocean
// and freezing ice shell of the moon Europa.
// ═══════════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ─── TONAL SYSTEMS ───
    const ROOT = 65.41; // C2 fundamental anchor

    // Modal scales representing cold light and shifting ice
    const MODES = {
        lydianPent: [0, 2, 4, 6, 7, 9],    // Bright, icy reflection
        wholeTone:  [0, 2, 4, 6, 8, 10],   // Eerie, floaty, infinite depth
        locrian:    [0, 1, 3, 5, 6, 8, 10] // Deep trench pressure
    };

    function buildScale(mode, rootFreq, octave) {
        return mode.map(s => rootFreq * Math.pow(2, (s + octave * 12) / 12));
    }

    // Markov harmony roots
    const CHORD_ROOTS = [0, 2, 6, 8, 10]; // C, D, F#, G#, A# (whole-tone based)
    const HARMONIC_MARKOV = [
        // C     D     F#    G#    A#
        [0.05, 0.45, 0.20, 0.20, 0.10], // from C
        [0.30, 0.05, 0.40, 0.15, 0.10], // from D
        [0.20, 0.25, 0.05, 0.35, 0.15], // from F#
        [0.15, 0.20, 0.40, 0.05, 0.20], // from G#
        [0.40, 0.15, 0.15, 0.25, 0.05]  // from A#
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

    // ─── 5-MOVEMENT NARRATIVE ARC ───
    const MOVEMENT_DURATIONS = [40, 50, 60, 45, 50]; // Ice Shell, Subsurface Ocean, Thermal Vents, Abyssal Depth, Fractured Surface
    const TOTAL_CYCLE = MOVEMENT_DURATIONS.reduce((a, b) => a + b, 0);
    const MOVEMENT_NAMES = ['ICE SHELL', 'SUBSURFACE OCEAN', 'THERMAL VENTS', 'ABYSSAL DEPTH', 'FRACTURED SURFACE'];

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

    function calculateNarrativeIntensity(elapsed) {
        const mov = getMovement(elapsed);
        const p = mov.progress;

        let baseIntensity;
        switch (mov.index) {
            case 0: // Ice Shell — cold crackles, howling wind
                baseIntensity = 0.10 + p * 0.15;
                break;
            case 1: // Subsurface Ocean — sonar echoes, bubbles
                baseIntensity = 0.25 + p * 0.20;
                break;
            case 2: // Thermal Vents — dynamic bubbling, dense FM chorus
                baseIntensity = 0.45 + 0.35 * Math.sin(p * Math.PI * 0.5);
                break;
            case 3: // Abyssal Depth — intense sub pressure thumps
                baseIntensity = 0.85 - p * p * 0.40;
                break;
            case 4: // Fractured Surface — culmination, howling winds and ice snaps
                baseIntensity = 0.35 + 0.45 * Math.sin(p * Math.PI);
                break;
            default:
                baseIntensity = 0.5;
        }

        const t = elapsed;
        const waves = 0.05 * Math.sin(t * 0.08) * Math.cos(t * 0.14);
        return Math.max(0, Math.min(1, baseIntensity + waves));
    }

    // Select mode based on movement and intensity
    function getActiveMode(movement, intensity) {
        switch (movement.index) {
            case 0: return MODES.lydianPent;
            case 1: return intensity < 0.35 ? MODES.lydianPent : MODES.wholeTone;
            case 2: return MODES.wholeTone;
            case 3: return MODES.locrian;
            case 4: return intensity > 0.5 ? MODES.wholeTone : MODES.lydianPent;
            default: return MODES.lydianPent;
        }
    }

    // ─── ENGINE STATE ───
    let ctx = null;
    let master = null;
    let compressor = null;
    let limiter = null;
    let isPlaying = false;
    let bpm = 76; // Deep, slow cryogenic pace
    let stepDuration;
    let engineStartTime = 0;

    // Audio Buses
    let windBus, sonarBus, bubbleBus, thumpBus, leadBus, crackBus;

    // Sequencer State
    let sequencer = null;
    const scheduleAheadTime = 0.15;
    const schedulerInterval = 25; // ms
    let nextStepTime = 0;
    let schedulerTimerID = null;
    let currentChordIdx = 0;

    // ─── INITIALIZATION ───
    function init() {
        if (ctx) return;
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        stepDuration = 60 / bpm / 4; // 16th note

        // Master FX Chain
        compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -16;
        compressor.knee.value = 10;
        compressor.ratio.value = 5;
        compressor.attack.value = 0.010;
        compressor.release.value = 0.20;

        limiter = ctx.createDynamicsCompressor();
        limiter.threshold.value = -1.8;
        limiter.knee.value = 0;
        limiter.ratio.value = 20;
        limiter.attack.value = 0.001;
        limiter.release.value = 0.05;

        master = ctx.createGain();
        master.gain.value = 0;

        // Biquad highpass to cut sub rumble explosions
        const hpFilter = ctx.createBiquadFilter();
        hpFilter.type = 'highpass';
        hpFilter.frequency.value = 22;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        window.MateriaAnalyser = analyser;

        compressor.connect(limiter);
        limiter.connect(hpFilter);
        hpFilter.connect(analyser);
        analyser.connect(master);
        master.connect(ctx.destination);

        // Create Buses
        windBus    = createBus(0.35);
        sonarBus   = createBus(0.40);
        bubbleBus  = createBus(0.30);
        thumpBus   = createBus(0.75);
        leadBus    = createBus(0.40);
        crackBus   = createBus(0.28);

        engineStartTime = ctx.currentTime;
    }

    function createBus(vol) {
        const g = ctx.createGain();
        g.gain.value = vol;
        g.connect(compressor);
        return g;
    }

    // ─── PROCEDURAL ATMOSPHERIC VOICES ───

    // Deep sub-aquatic drone pad
    function playAbyssalPad(time, chordRoot, intensity, mode) {
        const baseFreq = ROOT * Math.pow(2, chordRoot / 12) * 0.5; // D1/D2
        const scale = buildScale(mode, baseFreq, 2);
        const dur = stepDuration * 16;

        // Voicing notes
        const notes = [scale[0], scale[2], scale[4]];
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time);

            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(140 + 120 * intensity, time);

            const env = ctx.createGain();
            env.gain.setValueAtTime(0, time);
            env.gain.linearRampToValueAtTime(0.18 / notes.length, time + 1.5);
            env.gain.exponentialRampToValueAtTime(0.001, time + dur);

            osc.connect(filter);
            filter.connect(env);
            env.connect(windBus);

            osc.start(time);
            osc.stop(time + dur + 0.1);
        });
    }

    // ─── SEQUENCER LOOP ───
    function* cryoSequencer() {
        let step = 0;
        let bar = 0;

        while (true) {
            const elapsed = ctx.currentTime - engineStartTime;
            const movement = getMovement(elapsed);
            const intensity = calculateNarrativeIntensity(elapsed);
            const mode = getActiveMode(movement, intensity);

            // Chord changes every 4 bars
            if (step === 0 && bar % 4 === 0) {
                currentChordIdx = markovNext(currentChordIdx, HARMONIC_MARKOV);
            }

            const chordRoot = CHORD_ROOTS[currentChordIdx];

            // Voice configurations
            const active = {
                pad:      true,
                thump:    intensity > 0.15 && movement.index !== 1, // No heavy thumps in subsurface ocean
                sonar:    movement.index === 1 || movement.index === 3 || movement.index === 2,
                bubble:   movement.index === 1 || movement.index === 2,
                wind:     movement.index === 0 || movement.index === 4,
                crack:    intensity > 0.20 && (movement.index === 0 || movement.index === 4),
                shimmer:  intensity > 0.30
            };

            const isDownbeat = (step % 8 === 0);
            const isOffbeat = (step % 4 === 2);

            // Triggers
            const thumpTrigger = active.thump && (step === 0 || step === 8 || (intensity > 0.6 && step === 12));
            const sonarTrigger = active.sonar && (step === 0 && bar % 2 === 0);
            const windTrigger  = active.wind && (step === 0 && bar % 4 === 0);
            const crackTrigger = active.crack && (Math.random() < lerp(0.04, 0.16, intensity));
            
            // Bubbles: clustered random triggers
            const bubbleTrigger = active.bubble && (Math.random() < lerp(0.12, 0.45, intensity));

            // Shimmer leads
            const shimmerTrigger = active.shimmer && (
                (step === 4 || step === 10) && Math.random() < lerp(0.25, 0.65, intensity)
            );

            yield {
                step, bar, intensity, movement, mode, chordRoot,
                thumpTrigger, sonarTrigger, windTrigger, crackTrigger,
                bubbleTrigger, shimmerTrigger
            };

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

            // 1. Abyssal Pad (triggered every bar)
            if (state.step === 0) {
                playAbyssalPad(t, state.chordRoot, state.intensity, state.mode);
            }

            // 2. Cryogenic Wind sweeps
            if (state.windTrigger) {
                const windDur = stepDuration * lerp(6, 12, Math.random());
                window.EuropaDSP.createCryoWind(ctx, t, windDur, windBus);
            }

            // 3. Ice Shell pressure thumps
            if (state.thumpTrigger) {
                window.EuropaDSP.createSubPressureThump(ctx, t, thumpBus);
            }

            // 4. Sub-aquatic Sonar reflections
            if (state.sonarTrigger) {
                const scale = buildScale(state.mode, ROOT * Math.pow(2, state.chordRoot / 12), 4);
                const sonarFreq = pick(scale);
                window.EuropaDSP.createSubAquaticSonar(ctx, t, sonarFreq, sonarBus);
            }

            // 5. Thermal Vent water bubbles
            if (state.bubbleTrigger) {
                window.EuropaDSP.createWaterBubble(ctx, t, bubbleBus);
            }

            // 6. Ice Cracks
            if (state.crackTrigger) {
                window.EuropaDSP.createIceCrack(ctx, t, crackBus);
            }

            // 7. Europa FM Chorus Shimmer Leads
            if (state.shimmerTrigger) {
                const scale = buildScale(state.mode, ROOT * Math.pow(2, state.chordRoot / 12), 3);
                const leadFreq = pick(scale);
                const leadDur = stepDuration * lerp(2, 6, Math.random());
                window.EuropaDSP.createEuropaFMChorus(ctx, t, leadFreq, state.intensity, leadDur, leadBus);
            }

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
        currentChordIdx = 0;
        engineStartTime = ctx.currentTime;
        nextStepTime = ctx.currentTime;

        // Reset and ramp master gain cleanly
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(0, ctx.currentTime);
        master.gain.linearRampToValueAtTime(0.85, ctx.currentTime + 5.0);

        sequencer = cryoSequencer();
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

    // Helpers
    function lerp(a, b, t) { return a + (b - a) * Math.max(0, Math.min(1, t)); }
    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    // Expose public API
    window.MateriaMusic14 = { start, stop };

})();
