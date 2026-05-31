// materia10.js
// ═══════════════════════════════════════════════════════════════
// MATERIA SOLUTIONS — Cybernetic Hivemind (Industrial Rave)
// Generative audio engine running at 135 BPM. Powered by a combined
// Master Wavefolder and Dynamic Ring Modulator sound shader,
// shaping intense mechanical robot bass sweeps and heavy grit.
// ═══════════════════════════════════════════════════════════════

(function () {
    'use strict';

    const ROOT = 65.41; // C2
    const CHORD_ROOTS = [0, 1, 0, 4]; // C, Db, C, E (Tense industrial minor progression)

    // ─── ENGINE STATE ───
    let ctx = null;
    let master = null;
    let shaderNode = null;
    let isPlaying = false;
    let bpm = 135;
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
        master.gain.linearRampToValueAtTime(0.38, ctx.currentTime + 3);

        // --- Wavefolder + Ring Modulator DSP Sound Shader Node ---
        shaderNode = window.MateriaDSP.createAudioShaderNode(ctx, 1024, function (sampleL, sampleR, time, index) {
            const elapsed = time - engineStartTime;
            
            // Modulation carrier frequency swept between 150 Hz and 980 Hz
            const carrierFreq = 150 + 830 * (0.5 + 0.5 * Math.sin(elapsed * 0.35));

            // Ring modulate a portion of the signals (creates robotic vowel sweeps)
            const ringL = window.MateriaDSP.ringModulate(sampleL, carrierFreq, time);
            const ringR = window.MateriaDSP.ringModulate(sampleR, carrierFreq, time);
            
            // Mix dry output and ring modulated output
            const mixL = sampleL * 0.45 + ringL * 0.55;
            const mixR = sampleR * 0.45 + ringR * 0.55;

            // Wavefold for massive industrial overdrive (drive between 1.2 and 2.5)
            const drive = 1.2 + 1.3 * (0.5 + 0.5 * Math.sin(elapsed * 0.5));
            const foldedL = window.MateriaDSP.wavefold(mixL, drive, 2);
            const foldedR = window.MateriaDSP.wavefold(mixR, drive, 2);

            return [foldedL, foldedR];
        });

        // Routing: Buses -> Shader Node -> Master -> Destination
        shaderNode.connect(master);
        master.connect(ctx.destination);

        // Buses
        bassBus = ctx.createGain(); bassBus.gain.value = 0.45; bassBus.connect(shaderNode);
        leadBus = ctx.createGain(); leadBus.gain.value = 0.28; leadBus.connect(shaderNode);
        drumBus = ctx.createGain(); drumBus.gain.value = 0.62; drumBus.connect(shaderNode);

        engineStartTime = ctx.currentTime;
    }

    // ═══════════════════════════════════════════════════════════════
    // ─── SYNTHESIS MODULES ───
    // ═══════════════════════════════════════════════════════════════

    // ▸ RAW SAWTOOTH BASS
    function playBass(time, chordRoot, step) {
        const baseFreq = ROOT * Math.pow(2, chordRoot / 12) * 0.5; // C1 range
        const dur = stepDuration * 1.5;

        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(baseFreq, time);

        // Heavy lowpass envelope sweep
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, time);
        filter.frequency.exponentialRampToValueAtTime(150, time + dur);
        filter.Q.value = 6.0;

        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(0.7, time + 0.005);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        osc.connect(filter);
        filter.connect(env);
        env.connect(bassBus);

        osc.start(time);
        osc.stop(time + dur + 0.05);
    }

    // ▸ CYBERNETIC LEAD SWEEPS
    function playLead(time, chordRoot, step) {
        const baseFreq = ROOT * Math.pow(2, chordRoot / 12);
        // Tense minor arps
        const offsets = [0, 3, 6, 7];
        const freq = baseFreq * Math.pow(2, (offsets[step % offsets.length] + 24) / 12);
        const dur = stepDuration * 2.5;

        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(0.25, time + 0.01);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        osc.connect(env);
        env.connect(leadBus);

        osc.start(time);
        osc.stop(time + dur + 0.05);
    }

    // ▸ HARD INDUSTRIAL 4X4 KICK & METALLIC SHOTS
    function playDrums(time, type) {
        if (type === 'kick') {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(140, time);
            osc.frequency.exponentialRampToValueAtTime(45, time + 0.15);

            const env = ctx.createGain();
            env.gain.setValueAtTime(0.95, time);
            env.gain.exponentialRampToValueAtTime(0.001, time + 0.32);

            osc.connect(env);
            env.connect(drumBus);
            osc.start(time);
            osc.stop(time + 0.35);
        } else if (type === 'snare') {
            // Noise metallic snare
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.value = 240;

            const env = ctx.createGain();
            env.gain.setValueAtTime(0.4, time);
            env.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

            osc.connect(env);
            env.connect(drumBus);
            osc.start(time);
            osc.stop(time + 0.15);
        } else if (type === 'hat') {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = 10000;

            const env = ctx.createGain();
            env.gain.setValueAtTime(0.08, time);
            env.gain.exponentialRampToValueAtTime(0.001, time + 0.035);

            osc.connect(env);
            env.connect(drumBus);
            osc.start(time);
            osc.stop(time + 0.05);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // ─── SEQUENCER LOOP ───
    // ═══════════════════════════════════════════════════════════════

    function* industrialSequencer() {
        let step = 0;
        let bar = 0;

        while (true) {
            if (step === 0 && bar % 2 === 0) {
                currentChordIdx = (currentChordIdx + 1) % CHORD_ROOTS.length;
            }

            const chordRoot = CHORD_ROOTS[currentChordIdx];

            // Driving industrial techno patterns
            const kickTrigger = (step === 0 || step === 4 || step === 8 || step === 12);
            const snareTrigger = (step === 4 || step === 12);
            const hatTrigger = (step % 2 === 1); // Up-beat hi-hats

            const bassTrigger = (step % 4 !== 0); // Steady bassline
            const leadTrigger = (step % 4 === 2 && Math.random() < 0.6);

            yield { chordRoot, kickTrigger, snareTrigger, hatTrigger, bassTrigger, leadTrigger };

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

            if (state.kickTrigger) playDrums(t, 'kick');
            if (state.snareTrigger && state.step !== 4) playDrums(t, 'snare'); // Snare ghost hits
            if (state.hatTrigger) playDrums(t, 'hat');
            if (state.bassTrigger) playBass(t, state.chordRoot, state.step);
            if (state.leadTrigger) playLead(t, state.chordRoot, state.step);

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
        sequencer = industrialSequencer();
        schedulerLoop();
    }

    function stop() {
        isPlaying = false;
        if (schedulerTimerID) clearTimeout(schedulerTimerID);
        schedulerTimerID = null;
        if (master) {
            master.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.8);
        }
    }

    window.MateriaMusic10 = { start, stop };

})();
