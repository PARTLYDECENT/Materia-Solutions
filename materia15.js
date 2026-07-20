// materia15.js
// ═══════════════════════════════════════════════════════════════
// MATERIA COOKIES — Materia XV (Golden Crunch)
// Generative audio engine representing the warm rise of the ovens
// and the golden success of the cookie startup.
// ═══════════════════════════════════════════════════════════════

(function () {
    'use strict';

    const SCALE = [0, 2, 4, 7, 9, 12]; // C Major Pentatonic
    const ROOT = 65.41; // C2

    function getScaleFreq(index, octave = 3) {
        const degree = index % SCALE.length;
        const octOffset = Math.floor(index / SCALE.length) + octave;
        return ROOT * Math.pow(2, (SCALE[degree] + octOffset * 12) / 12);
    }

    const CHORD_ROOTS = [0, 5, 7, 4]; // C, F, G, Em (I - IV - V - iii)

    // ENGINE STATE
    let ctx = null;
    let master = null;
    let isPlaying = false;
    const bpm = 100;
    let stepDuration;
    let engineStartTime = 0;

    let sequencer = null;
    const scheduleAheadTime = 0.15;
    const schedulerInterval = 30; // ms
    let nextStepTime = 0;
    let schedulerTimerID = null;
    let currentChordIdx = 0;
    let noiseBuf = null;

    function init() {
        if (ctx) return;
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        stepDuration = 60 / bpm / 4; // 16th note

        // Master FX Chain
        master = ctx.createGain();
        master.gain.setValueAtTime(0, ctx.currentTime);
        master.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 3.0);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 3500;

        master.connect(filter);
        filter.connect(ctx.destination);

        // Pre-generate noise buffer for drums
        const bufferSize = ctx.sampleRate * 2;
        noiseBuf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = noiseBuf.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        engineStartTime = ctx.currentTime;
    }

    // INSTRUMENTS

    // Sub Bass
    function playBass(time, rootSemi) {
        const rf = ROOT * Math.pow(2, rootSemi / 12) * 0.5; // Deep octave
        const dur = stepDuration * 3.5;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(rf * 2, time);
        osc.frequency.exponentialRampToValueAtTime(rf, time + 0.05);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(0.55, time + 0.01);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        osc.connect(env);
        env.connect(master);
        osc.start(time);
        osc.stop(time + dur + 0.05);
    }

    // Golden Chime (Sine wave with delayed echo)
    function playChime(time, scaleIdx) {
        const freq = getScaleFreq(scaleIdx, 4);
        const dur = stepDuration * 6;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(0.18, time + 0.005);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        // Delay effect
        const delay = ctx.createDelay(0.5);
        delay.delayTime.value = stepDuration * 3;
        const delayGain = ctx.createGain();
        delayGain.gain.value = 0.35;

        osc.connect(env);
        env.connect(master);
        
        // Feed into delay
        env.connect(delay);
        delay.connect(delayGain);
        delayGain.connect(master);

        osc.start(time);
        osc.stop(time + dur + 1.0);
    }

    // Baker's Pluck (Triangle wave)
    function playPluck(time, scaleIdx, step) {
        const freq = getScaleFreq(scaleIdx, 3);
        const dur = stepDuration * 1.5;

        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = freq;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, time);
        filter.frequency.exponentialRampToValueAtTime(500, time + dur);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(0.25, time + 0.003);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        const panner = ctx.createStereoPanner();
        panner.pan.value = Math.sin(step * 0.5) * 0.6;

        osc.connect(filter);
        filter.connect(env);
        env.connect(panner);
        panner.connect(master);

        osc.start(time);
        osc.stop(time + dur + 0.05);
    }

    // Drum kick
    function playKick(time) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, time);
        osc.frequency.exponentialRampToValueAtTime(45, time + 0.1);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(0.8, time + 0.005);
        env.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

        osc.connect(env);
        env.connect(master);
        osc.start(time);
        osc.stop(time + 0.3);
    }

    // Drum snare (White noise + sine shell)
    function playSnare(time) {
        // Noise crack
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuf;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1000;
        filter.Q.value = 1.5;

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.22, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(master);

        // Sine body
        const body = ctx.createOscillator();
        body.type = 'sine';
        body.frequency.setValueAtTime(180, time);
        body.frequency.exponentialRampToValueAtTime(100, time + 0.08);

        const bodyGain = ctx.createGain();
        bodyGain.gain.setValueAtTime(0.3, time);
        bodyGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

        body.connect(bodyGain);
        bodyGain.connect(master);

        noise.start(time);
        body.start(time);
        noise.stop(time + 0.15);
        body.stop(time + 0.15);
    }

    // Closed hi-hat
    function playHat(time) {
        const source = ctx.createBufferSource();
        source.buffer = noiseBuf;

        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 8000;

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.06, time);
        env.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

        source.connect(filter);
        filter.connect(env);
        env.connect(master);

        source.start(time);
        source.stop(time + 0.06);
    }

    // SEQUENCER
    function* runSequencer() {
        let step = 0;
        let bar = 0;

        while (true) {
            if (step === 0 && bar % 4 === 0) {
                currentChordIdx = (currentChordIdx + 1) % CHORD_ROOTS.length;
            }

            const chordRoot = CHORD_ROOTS[currentChordIdx];

            // Rhythmic triggers
            const kick = (step === 0 || step === 8 || step === 14);
            const snare = (step === 4 || step === 12);
            const hat = (step % 2 === 0);

            // Melody and plucks patterns
            const bass = (step === 0 || step === 6 || step === 10);
            
            // Plucks: pentatonic arpeggio
            let pluck = false;
            let pluckIdx = 0;
            if (step === 2 || step === 6 || step === 10 || step === 14) {
                pluck = true;
                pluckIdx = (step + currentChordIdx) % SCALE.length;
            }

            // Chime highlight: stochastic chime
            let chime = false;
            let chimeIdx = 0;
            if (step === 0 && bar % 2 === 0 && Math.random() < 0.8) {
                chime = true;
                chimeIdx = (currentChordIdx * 2) % SCALE.length;
            }

            yield { step, bar, chordRoot, kick, snare, hat, bass, pluck, pluckIdx, chime, chimeIdx };

            step = (step + 1) % 16;
            if (step === 0) bar++;
        }
    }

    function scheduleNotes() {
        if (nextStepTime < ctx.currentTime - scheduleAheadTime) {
            nextStepTime = ctx.currentTime + 0.05;
        }

        while (nextStepTime < ctx.currentTime + scheduleAheadTime) {
            const s = sequencer.next().value;
            const t = Math.max(nextStepTime, ctx.currentTime);

            // Play drums
            if (s.kick) playKick(t);
            if (s.snare) playSnare(t);
            if (s.hat) playHat(t);

            // Play bass
            if (s.bass) playBass(t, s.chordRoot);

            // Play melodic elements
            if (s.pluck) playPluck(t, s.pluckIdx, s.step);
            if (s.chime) playChime(t, s.chimeIdx);

            nextStepTime += stepDuration;
        }
    }

    function loop() {
        scheduleNotes();
        schedulerTimerID = setTimeout(loop, schedulerInterval);
    }

    function start() {
        if (isPlaying) return;
        init();
        if (ctx.state === 'suspended') ctx.resume();
        isPlaying = true;
        currentChordIdx = 0;
        engineStartTime = ctx.currentTime;
        nextStepTime = ctx.currentTime;

        // Clean ramp
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(0, ctx.currentTime);
        master.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 2.0);

        sequencer = runSequencer();
        loop();
    }

    function stop() {
        isPlaying = false;
        if (schedulerTimerID) clearTimeout(schedulerTimerID);
        schedulerTimerID = null;
        if (master) {
            master.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
        }
    }

    window.MateriaMusic15 = { start, stop };
})();
