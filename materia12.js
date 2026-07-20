// materia12.js
// ═══════════════════════════════════════════════════════════════
// MATERIA COOKIES — Xenomorph Prime (Unhinged Bio-Synthesis)
// ═══════════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ─── TONAL SYSTEMS ───
    const ROOT = 65.41; // C2 fundamental anchor

    // Gypsy Minor / Double Harmonic Scale: C, Db, E, F, F#, Ab, B
    // Highly dissonant, containing multiple minor second intervals and tritones
    const ALIEN_SCALE = [0, 1, 4, 5, 6, 8, 11];

    function buildScale(rootFreq, octave) {
        return ALIEN_SCALE.map(s => rootFreq * Math.pow(2, (s + octave * 12) / 12));
    }

    // Markov harmony chains for alien chord progressions
    const CHORD_ROOTS = [0, 1, 5, 6, 11]; // C, Db, F, F#, B
    const HARMONIC_MARKOV = [
        // C     Db    F     F#    B
        [0.05, 0.40, 0.25, 0.20, 0.10], // from C
        [0.30, 0.05, 0.35, 0.15, 0.15], // from Db
        [0.20, 0.30, 0.05, 0.35, 0.10], // from F
        [0.15, 0.20, 0.45, 0.05, 0.15], // from F#
        [0.45, 0.15, 0.15, 0.20, 0.05], // from B
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
    const MOVEMENT_DURATIONS = [35, 45, 55, 40, 45]; // Nest, Mutation, Hunt, Acid Blood, Queen
    const TOTAL_CYCLE = MOVEMENT_DURATIONS.reduce((a, b) => a + b, 0);
    const MOVEMENT_NAMES = ['HIVE NEST', 'MUTATION', 'THE HUNT', 'ACID BLOOD', 'QUEEN\'S REIGN'];

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
            case 0: // Hive Nest — silent ticking, breathing
                baseIntensity = 0.08 + p * 0.12;
                break;
            case 1: // Mutation — heartbeats form, warning scrapes
                baseIntensity = 0.20 + p * p * 0.25;
                break;
            case 2: // The Hunt — driving rhythm, screaming lead
                baseIntensity = 0.45 + 0.35 * Math.sin(p * Math.PI * 0.5);
                break;
            case 3: // Acid Blood — absolute noise wall, high feedback
                baseIntensity = 0.90 - p * p * 0.45;
                break;
            case 4: // Queen's Reign — massive, low-frequency domination
                baseIntensity = 0.40 + 0.45 * Math.sin(p * Math.PI);
                break;
            default:
                baseIntensity = 0.5;
        }

        // Add rapid micro-jitter (unhinged shivering)
        const t = elapsed;
        const jitter = 0.04 * Math.sin(t * 1.8) * Math.cos(t * 4.2);
        return Math.max(0, Math.min(1, baseIntensity + jitter));
    }

    // ─── ENGINE STATE ───
    let ctx = null;
    let master = null;
    let compressor = null;
    let limiter = null;
    let isPlaying = false;
    let bpm = 92; // Tense, slow industrial march
    let stepDuration;
    let engineStartTime = 0;

    // Audio Buses
    let droneBus, padBus, scrapeBus, heartbeatBus;
    let acidBus, screamBus, hissBus, percBus;

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
        compressor.threshold.value = -12;
        compressor.knee.value = 8;
        compressor.ratio.value = 8;
        compressor.attack.value = 0.005;
        compressor.release.value = 0.15;

        limiter = ctx.createDynamicsCompressor();
        limiter.threshold.value = -1.5;
        limiter.knee.value = 0;
        limiter.ratio.value = 20;
        limiter.attack.value = 0.001;
        limiter.release.value = 0.04;

        master = ctx.createGain();
        master.gain.value = 0; // start() ramps this up

        // Audio bridge for visual reactivity
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        window.MateriaAnalyser = analyser;

        compressor.connect(limiter);
        limiter.connect(analyser);
        analyser.connect(master);
        master.connect(ctx.destination);

        // Create Buses
        droneBus     = createBus(0.32);
        padBus       = createBus(0.28);
        scrapeBus    = createBus(0.30);
        heartbeatBus = createBus(0.70);
        acidBus      = createBus(0.45);
        screamBus    = createBus(0.40);
        hissBus      = createBus(0.30);
        percBus      = createBus(0.35);

        engineStartTime = ctx.currentTime;
    }

    function createBus(vol) {
        const g = ctx.createGain();
        g.gain.value = vol;
        g.connect(compressor);
        return g;
    }

    // ─── PROCEDURAL GENERATION VOICES ───

    // Drone - Low FM growl with slow detuning
    function playHiveDrone(time, chordRoot, intensity) {
        const baseFreq = ROOT * Math.pow(2, chordRoot / 12) * 0.5; // C1/C2 range
        const dur = stepDuration * 16; // 1 full bar

        const osc1 = ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(baseFreq, time);
        osc1.frequency.linearRampToValueAtTime(baseFreq * 0.98, time + dur);

        const osc2 = ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(baseFreq * 1.015, time);
        osc2.frequency.linearRampToValueAtTime(baseFreq * 1.03, time + dur);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(lerp(80, 220, intensity), time);
        filter.frequency.exponentialRampToValueAtTime(lerp(60, 400, intensity), time + dur);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(0.38, time + 0.5);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(env);
        env.connect(droneBus);

        osc1.start(time);
        osc2.start(time);
        osc1.stop(time + dur + 0.1);
        osc2.stop(time + dur + 0.1);
    }

    // Organic Pad Chord voicings
    function playAlienPad(time, chordRoot, intensity) {
        const rootFreq = ROOT * Math.pow(2, chordRoot / 12);
        const scale = buildScale(rootFreq, 2);
        const dur = stepDuration * 8;

        // voicing offsets
        const notes = [scale[0], scale[2], scale[4], scale[6]];
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time);
            osc.detune.setValueAtTime((Math.random() - 0.5) * 15, time);

            const env = ctx.createGain();
            env.gain.setValueAtTime(0, time);
            env.gain.linearRampToValueAtTime(0.12 / notes.length, time + 1.2);
            env.gain.exponentialRampToValueAtTime(0.001, time + dur);

            const pan = ctx.createStereoPanner();
            pan.pan.setValueAtTime(Math.sin(time * 0.5 + i) * 0.5, time);

            osc.connect(env);
            env.connect(pan);
            pan.connect(padBus);

            osc.start(time);
            osc.stop(time + dur + 0.1);
        });
    }

    // Tuned percussion clicking
    function playClickPerc(time, chordRoot) {
        const baseFreq = ROOT * Math.pow(2, chordRoot / 12);
        const freq = baseFreq * pick([3, 4, 6, 8, 12]);
        const dur = 0.04;

        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = freq;

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.14, time);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        const pan = ctx.createStereoPanner();
        pan.pan.value = (Math.random() - 0.5) * 1.5;

        osc.connect(env);
        env.connect(pan);
        pan.connect(percBus);

        osc.start(time);
        osc.stop(time + dur + 0.05);
    }

    // ─── SEQUENCER LOOP ───
    function* xenoSequencer() {
        let step = 0;
        let bar = 0;

        while (true) {
            const elapsed = ctx.currentTime - engineStartTime;
            const movement = getMovement(elapsed);
            const intensity = calculateNarrativeIntensity(elapsed);

            // Chord changes every 4 bars
            if (step === 0 && bar % 4 === 0) {
                currentChordIdx = markovNext(currentChordIdx, HARMONIC_MARKOV);
            }

            const chordRoot = CHORD_ROOTS[currentChordIdx];

            // Voice activity matrices
            const active = {
                drone:     true,
                pad:       intensity > 0.15 && movement.index >= 1,
                heartbeat: intensity > 0.18,
                scrape:    intensity > 0.25,
                acid:      intensity > 0.12,
                hiss:      true,
                scream:    intensity > 0.48 && (movement.index === 2 || movement.index === 3 || movement.index === 4),
                click:     intensity > 0.22 && movement.index !== 0
            };

            // Rhythmic ticks
            const isDownbeat = (step % 8 === 0);
            const isOffbeat = (step % 4 === 2);
            const isOffbeat16 = (step % 2 === 1);

            // Heartbeat triggers (lub-dub)
            const heartbeatTrigger = active.heartbeat && (step === 0 || step === 8 || (intensity > 0.5 && step === 12));

            // Acid drips (sporadic sizzles)
            const acidTrigger = active.acid && (Math.random() < lerp(0.05, 0.28, intensity));

            // Hiss/Breathing (on bar boundaries)
            const hissTrigger = active.hiss && (step === 4 && bar % 2 === 0);

            // Claw Scrapes
            const scrapeTrigger = active.scrape && (
                (step === 4 && Math.random() < 0.6) || 
                (step === 10 && Math.random() < 0.4) ||
                (intensity > 0.6 && isOffbeat16 && Math.random() < 0.3)
            );

            // Alien screaming
            const screamTrigger = active.scream && (
                (step === 0 && bar % 2 === 1 && Math.random() < 0.5) ||
                (intensity > 0.75 && step === 6 && Math.random() < 0.4)
            );

            // Click triggers
            const clickTrigger = active.click && (
                isOffbeat || 
                (isOffbeat16 && Math.random() < 0.5)
            );

            yield {
                step, bar, intensity, movement, chordRoot,
                active, heartbeatTrigger, acidTrigger, hissTrigger,
                scrapeTrigger, screamTrigger, clickTrigger
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

            // 1. Drone (triggered every bar)
            if (state.active.drone && state.step === 0) {
                playHiveDrone(t, state.chordRoot, state.intensity);
            }

            // 2. Pad (triggered every 2 bars)
            if (state.active.pad && state.step === 0 && state.bar % 2 === 0) {
                playAlienPad(t, state.chordRoot, state.intensity);
            }

            // 3. Heartbeats (lub-dub kick)
            if (state.heartbeatTrigger) {
                window.XenoDSP.createHeartbeat(ctx, t, state.intensity, heartbeatBus);
            }

            // 4. Acid drips (burning sizzle)
            if (state.acidTrigger) {
                window.XenoDSP.createAcidDrip(ctx, t, acidBus);
            }

            // 5. Breathing Hiss
            if (state.hissTrigger) {
                const hissFreq = lerp(400, 850, Math.random());
                const hissDur = stepDuration * lerp(3, 7, Math.random());
                window.XenoDSP.createHissNode(ctx, t, hissDur, hissFreq, 3.5, hissBus);
            }

            // 6. Claw Scrapes (screechy physical model)
            if (state.scrapeTrigger) {
                const scale = buildScale(ROOT * Math.pow(2, state.chordRoot / 12), 3);
                const scrapeFreq = pick(scale);
                const scrapeDur = stepDuration * lerp(2, 6, Math.random());
                window.XenoDSP.createClawScrape(ctx, t, scrapeFreq, scrapeDur, scrapeBus);
            }

            // 7. Alien Screams (Chaotic FM Feedback)
            if (state.screamTrigger) {
                const scale = buildScale(ROOT * Math.pow(2, state.chordRoot / 12), 4);
                const screamFreq = pick(scale);
                const screamDur = stepDuration * lerp(3, 8, Math.random());
                window.XenoDSP.createAlienFMVoice(ctx, t, screamFreq, state.intensity, screamDur, screamBus);
            }

            // 8. Ticking click clicks
            if (state.clickTrigger) {
                playClickPerc(t, state.chordRoot);
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
        master.gain.linearRampToValueAtTime(0.85, ctx.currentTime + 5.0); // Triumphant fade-in

        sequencer = xenoSequencer();
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
    window.MateriaMusic12 = { start, stop };

})();
