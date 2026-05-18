// materia6.js
// ═══════════════════════════════════════════════════════════════
// MATERIA SOLUTIONS — Procedural Ambient Soundtrack Engine
// V2: WICKED SOUNDSCAPE EDITION (Phrygian / Industrial Ambient)
// ═══════════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ─── MUSICAL CONSTANTS ───
    // Key of C Phrygian — Dark, tense, cinematic, unresolved
    const SCALE = {
        bass:    [32.70, 34.65, 38.89, 43.65, 46.25],           // C1 Db1 Eb1 F1 Gb1
        sub:     [65.41, 69.30, 77.78, 87.31, 92.50],           // C2 Db2 Eb2 F2 Gb2
        low:     [130.81, 138.59, 155.56, 174.61, 185.00],      // C3 Db3 Eb3 F3 Gb3
        mid:     [261.63, 277.18, 311.13, 349.23, 369.99],      // C4 Db4 Eb4 F4 Gb4
        high:    [523.25, 554.37, 622.25, 698.46, 739.99],      // C5 Db5 Eb5 F5 Gb5
        shimmer: [1046.50, 1108.73, 1244.51, 1396.91, 1479.98], // C6 Db6 Eb6 F6 Gb6
    };

    // Darker Progression (i - II - v - vi)
    const CHORD_PROG = [
        [0, 1, 4],    // Cm(b5) 
        [1, 3, 0],    // Db 
        [4, 0, 2],    // Gb(aug) 
        [2, 4, 1],    // Eb(dim)
    ];

    const KICK_PATTERN    = [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,1];
    const SNARE_PATTERN   = [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0];
    const HAT_PATTERN     = [1,1,0,1, 1,0,1,1, 1,1,0,1, 1,0,1,0];
    const HAT_OPEN        = [0,0,1,0, 0,1,0,0, 0,0,1,0, 0,1,0,0];
    const BASS_PATTERN    = [1,0,0,0, 1,0,0,0, 1,0,1,0, 0,1,0,0];
    const ARP_PATTERN     = [1,0,1,0, 1,1,0,1, 1,0,1,0, 1,0,0,1];

    const SONG_STRUCTURE = [
        { pad: true, shimmer: true, arp: false, bass: false, drums: false, lead: false, bars: 4 },
        { pad: true, shimmer: true, arp: true,  bass: false, drums: false, lead: false, bars: 4 },
        { pad: true, shimmer: true, arp: true,  bass: true,  drums: true,  lead: false, bars: 8 },
        { pad: true, shimmer: false,arp: false, bass: true,  drums: false, lead: true,  bars: 4 },
        { pad: true, shimmer: true, arp: true,  bass: true,  drums: true,  lead: true,  bars: 8 },
        { pad: true, shimmer: true, arp: false, bass: false, drums: false, lead: false, bars: 4 },
    ];

    let ctx = null;
    let master, compressor, reverbSend, reverbReturn, driveNode;
    let isPlaying = false;
    let bpm = 65; // Slowed down for darker ambience
    let stepDuration, currentStep = 0, currentBar = 0, currentSection = 0, currentChord = 0;
    let schedulerTimer = null;
    let noiseBuffer = null;

    let padBus, bassBus, arpBus, drumBus, leadBus, shimmerBus;

    // ─── API TRICK: Non-Linear Distortion Curve ───
    function makeDistortionCurve(amount) {
        const k = typeof amount === 'number' ? amount : 50;
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < n_samples; ++i) {
            const x = i * 2 / n_samples - 1;
            curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
        }
        return curve;
    }

    function init() {
        if (ctx) return;
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        stepDuration = 60 / bpm / 4; 

        compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -24;
        compressor.knee.value = 30;
        compressor.ratio.value = 12;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.25;

        master = ctx.createGain(); // Fixed from BiquadFilter
        master.gain.value = 0.0;
        master.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 4);

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        window.MateriaAnalyser = analyser;

        compressor.connect(analyser);
        analyser.connect(master);
        master.connect(ctx.destination);

        // API TRICK: Waveshaper for Industrial Grit
        driveNode = ctx.createWaveShaper();
        driveNode.curve = makeDistortionCurve(40);
        driveNode.oversample = '4x';
        const driveGain = ctx.createGain();
        driveGain.gain.value = 0.5; // Tame the output of the distortion
        driveNode.connect(driveGain);
        driveGain.connect(compressor);

        reverbSend = ctx.createGain();
        reverbSend.gain.value = 0.45; // Heavier send for soundscape

        reverbReturn = ctx.createGain();
        reverbReturn.gain.value = 0.5;

        // Dark Cavern FDN Reverb
        const delays = [0.087, 0.111, 0.149, 0.193]; // Longer times
        const feedbacks = [0.75, 0.7, 0.65, 0.6];
        delays.forEach((t, i) => {
            const d = ctx.createDelay(0.5);
            d.delayTime.value = t;
            const fb = ctx.createGain();
            fb.gain.value = feedbacks[i];
            
            const filt = ctx.createBiquadFilter();
            filt.type = 'lowpass';
            filt.frequency.value = 1200 - i * 200; // Much darker tails

            reverbSend.connect(d);
            d.connect(fb);
            fb.connect(filt);
            filt.connect(d);
            d.connect(reverbReturn);
        });
        reverbReturn.connect(compressor);

        padBus = createBus(0.25, true);
        bassBus = createBus(0.4, false, true); // Bass goes to distortion
        arpBus = createBus(0.12, true);
        drumBus = createBus(0.3, true, true);  // Drums go to distortion
        leadBus = createBus(0.15, true);
        shimmerBus = createBus(0.08, true);

        noiseBuffer = createNoiseBuffer(2);
    }

    function createBus(vol, toReverb = false, toDrive = false) {
        const g = ctx.createGain();
        g.gain.value = vol;
        if (toDrive) g.connect(driveNode);
        else g.connect(compressor);
        if (toReverb) g.connect(reverbSend);
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

    // ─── INSTRUMENTS ───

    function playPad(time, chord) {
        const notes = chord.map(i => SCALE.low[i % SCALE.low.length]);
        const duration = stepDuration * 16; 

        notes.forEach(freq => {
            [-12, 0, 12].forEach((detune, index) => {
                const osc = ctx.createOscillator();
                osc.type = 'sawtooth';
                osc.frequency.value = freq;
                osc.detune.value = detune;

                // API TRICK: LFO Auto-Panner for swirling soundscape
                const pan = ctx.createStereoPanner();
                const panLfo = ctx.createOscillator();
                panLfo.type = 'sine';
                panLfo.frequency.value = 0.05 + (index * 0.02); // Slow, desynced swirling
                panLfo.connect(pan.pan);
                panLfo.start(time);
                panLfo.stop(time + duration + 0.1);

                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(100, time);
                filter.frequency.exponentialRampToValueAtTime(1200, time + duration * 0.5);
                filter.frequency.exponentialRampToValueAtTime(150, time + duration);
                filter.Q.value = 1.5;

                const env = ctx.createGain(); // Fixed
                env.gain.setValueAtTime(0, time);
                env.gain.linearRampToValueAtTime(0.08, time + duration * 0.4);
                env.gain.linearRampToValueAtTime(0, time + duration);

                osc.connect(filter);
                filter.connect(pan);
                pan.connect(env);
                env.connect(padBus);
                osc.start(time);
                osc.stop(time + duration + 0.1);
            });
        });
    }

    function playBass(time, step, chord) {
        if (!BASS_PATTERN[step]) return;

        const rootIdx = chord[0];
        const freq = SCALE.sub[rootIdx % SCALE.sub.length];
        const dur = stepDuration * 2.5;

        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = freq;

        // API TRICK: Audio-Rate Filter Modulation (Growl)
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = freq; // Base cutoff
        filter.Q.value = 4;

        const fmOsc = ctx.createOscillator();
        fmOsc.type = 'sawtooth';
        fmOsc.frequency.value = freq * 0.5; // Sub-octave modulator
        
        const fmGain = ctx.createGain();
        fmGain.gain.setValueAtTime(800, time); // Amount of filter sweep
        fmGain.gain.exponentialRampToValueAtTime(10, time + dur * 0.8);

        fmOsc.connect(fmGain);
        fmGain.connect(filter.frequency);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(0.8, time + 0.05);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        osc.connect(filter);
        filter.connect(env);
        env.connect(bassBus);
        
        osc.start(time);
        fmOsc.start(time);
        osc.stop(time + dur + 0.1);
        fmOsc.stop(time + dur + 0.1);
    }

    function playArp(time, step, chord) {
        if (!ARP_PATTERN[step]) return;

        const noteIdx = chord[step % chord.length];
        const freq = SCALE.mid[noteIdx % SCALE.mid.length];
        const dur = stepDuration * 1.8;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        // API TRICK: FM Synthesis for wicked metallic pluck
        const modOsc = ctx.createOscillator();
        modOsc.type = 'square';
        modOsc.frequency.value = freq * 2.41; // Dissonant, non-integer ratio
        
        const modEnv = ctx.createGain();
        modEnv.gain.setValueAtTime(freq * 1.5, time); // High modulation index at attack
        modEnv.gain.exponentialRampToValueAtTime(10, time + dur * 0.5);

        modOsc.connect(modEnv);
        modEnv.connect(osc.frequency);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(0.3, time + 0.01);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        const pan = ctx.createStereoPanner();
        pan.pan.value = (Math.random() - 0.5) * 0.8;

        osc.connect(env);
        env.connect(pan);
        pan.connect(arpBus);
        
        osc.start(time);
        modOsc.start(time);
        osc.stop(time + dur + 0.1);
        modOsc.stop(time + dur + 0.1);
    }

    function playLead(time, step, chord) {
        if (step !== 0 && step !== 4 && step !== 8 && step !== 12) return;
        if (Math.random() < 0.4) return; 

        const noteIdx = pick(chord);
        const freq = SCALE.high[noteIdx % SCALE.high.length];
        const dur = stepDuration * 6;

        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        
        // API TRICK: Portamento / Glide
        osc.frequency.setValueAtTime(freq * 0.8, time); 
        osc.frequency.exponentialRampToValueAtTime(freq, time + 0.15);

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = freq;
        filter.Q.value = 5;

        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(0.15, time + dur * 0.2);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        osc.connect(filter);
        filter.connect(env);
        env.connect(leadBus);
        osc.start(time);
        osc.stop(time + dur + 0.1);
    }

    function playShimmer(time, step) {
        if (Math.random() > 0.15) return; 

        const freq = pick(SCALE.shimmer) * 2; // Extra high
        const dur = 4 + Math.random() * 4; // Longer tails

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        // Amplitude Modulation (AM) for eerie fluttering
        const amOsc = ctx.createOscillator();
        amOsc.type = 'sine';
        amOsc.frequency.value = 12 + Math.random() * 8;
        const amGain = ctx.createGain();
        amGain.gain.value = 0.5; // 50% depth
        amOsc.connect(amGain.gain);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(0.04, time + 1.0);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        const pan = ctx.createStereoPanner();
        pan.pan.value = (Math.random() - 0.5) * 2.0;

        osc.connect(amGain);
        amGain.connect(env);
        env.connect(pan);
        pan.connect(shimmerBus);
        
        osc.start(time);
        amOsc.start(time);
        osc.stop(time + dur + 0.1);
        amOsc.stop(time + dur + 0.1);
    }

    function playKick(time, step) {
        if (!KICK_PATTERN[step]) return;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, time);
        osc.frequency.exponentialRampToValueAtTime(30, time + 0.15);

        const env = ctx.createGain();
        env.gain.setValueAtTime(1.0, time);
        env.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

        osc.connect(env);
        env.connect(drumBus);
        osc.start(time);
        osc.stop(time + 0.5);
    }

    function playSnare(time, step) {
        if (!SNARE_PATTERN[step]) return;

        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        
        const nFilter = ctx.createBiquadFilter();
        nFilter.type = 'bandpass';
        nFilter.frequency.value = 1500;
        nFilter.Q.value = 1.5;

        const nEnv = ctx.createGain();
        nEnv.gain.setValueAtTime(0.5, time);
        nEnv.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

        noise.connect(nFilter);
        nFilter.connect(nEnv);
        nEnv.connect(drumBus);

        noise.start(time);
        noise.stop(time + 0.3);
    }

    function playHiHat(time, step) {
        const isOpen = HAT_OPEN[step];
        if (!HAT_PATTERN[step] && !isOpen) return;

        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 6000;

        const env = ctx.createGain();
        const dur = isOpen ? 0.2 : 0.05;
        const vol = isOpen ? 0.15 : 0.08;
        
        env.gain.setValueAtTime(vol, time);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        noise.connect(filter);
        filter.connect(env);
        env.connect(drumBus);

        noise.start(time);
        noise.stop(time + dur + 0.01);
    }

    // ─── ENGINE ───

    function getActiveSection() {
        let totalBars = 0;
        for (let i = 0; i < SONG_STRUCTURE.length; i++) {
            totalBars += SONG_STRUCTURE[i].bars;
            if (currentBar < totalBars) return i;
        }
        const totalSongBars = SONG_STRUCTURE.reduce((a, s) => a + s.bars, 0);
        currentBar = currentBar % totalSongBars;
        return getActiveSection();
    }

    function scheduleStep() {
        if (!isPlaying) return;

        const now = ctx.currentTime;
        const section = SONG_STRUCTURE[getActiveSection()];
        const chord = CHORD_PROG[currentChord];

        if (section.pad && currentStep === 0) playPad(now, chord);
        if (section.shimmer) playShimmer(now, currentStep);
        if (section.arp) playArp(now, currentStep, chord);
        if (section.bass) playBass(now, currentStep, chord);
        if (section.lead) playLead(now, currentStep, chord);
        if (section.drums) {
            playKick(now, currentStep);
            playSnare(now, currentStep);
            playHiHat(now, currentStep);
        }

        currentStep++;
        if (currentStep >= 16) {
            currentStep = 0;
            currentChord = (currentChord + 1) % CHORD_PROG.length;
            currentBar++;
        }

        schedulerTimer = setTimeout(scheduleStep, stepDuration * 1000);
    }

    function start() {
        if (isPlaying) return;
        init();
        if (ctx.state === 'suspended') ctx.resume();
        isPlaying = true;
        currentStep = 0;
        currentBar = 0;
        currentSection = 0;
        currentChord = 0;
        scheduleStep();
    }

    function stop() {
        isPlaying = false;
        if (schedulerTimer) clearTimeout(schedulerTimer);
        if (master) {
            master.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);
        }
    }

    window.MateriaMusic6 = { start, stop };

})();
