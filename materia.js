// materia.js
// ═══════════════════════════════════════════════════════════════
// MATERIA SOLUTIONS — Procedural Ambient Soundtrack Engine
// A fully codified generative song using pure Web Audio API
// No samples. No libraries. Just math, oscillators, and soul.
// ═══════════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ─── MUSICAL CONSTANTS ───
    // Key of C Minor — melancholic, cinematic, ethereal
    const SCALE = {
        // C minor pentatonic extended across octaves
        bass:    [32.70, 36.71, 41.20, 49.00, 55.00],           // C1 Eb1 F1 G1 Ab1
        sub:     [65.41, 73.42, 82.41, 98.00, 110.00],          // C2 Eb2 F2 G2 Ab2
        low:     [130.81, 146.83, 164.81, 196.00, 220.00],      // C3 Eb3 F3 G3 Ab3
        mid:     [261.63, 293.66, 311.13, 392.00, 440.00],      // C4 D4 Eb4 G4 Ab4
        high:    [523.25, 587.33, 622.25, 783.99, 880.00],      // C5 D5 Eb5 G5 Ab5
        shimmer: [1046.50, 1174.66, 1244.51, 1567.98, 1760.00], // C6 D6 Eb6 G6 Ab6
    };

    // Chord progressions (indices into scale arrays)
    // i - VI - III - VII  (Cm - Ab - Eb - Bb vibe)
    const CHORD_PROG = [
        [0, 2, 4],    // Cm   (C, Eb, G... index 0,2,3 in our scale)
        [4, 1, 3],    // Ab   
        [2, 4, 1],    // Eb   
        [3, 0, 2],    // Gm   
    ];

    // Rhythmic patterns (1 = hit, 0 = rest) — 16 steps per bar
    const KICK_PATTERN    = [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,1];
    const SNARE_PATTERN   = [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0];
    const HAT_PATTERN     = [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1];
    const HAT_OPEN        = [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,1,1,0];
    const BASS_PATTERN    = [1,0,0,1, 0,0,1,0, 1,0,0,1, 0,1,0,0];
    const ARP_PATTERN     = [1,0,1,0, 1,0,1,1, 1,0,1,0, 1,1,0,1];

    // Song structure — which layers are active per section (each section = 4 bars)
    const SONG_STRUCTURE = [
        // Intro: just pads and shimmer
        { pad: true, shimmer: true, arp: false, bass: false, drums: false, lead: false, bars: 4 },
        // Build: add arp
        { pad: true, shimmer: true, arp: true,  bass: false, drums: false, lead: false, bars: 4 },
        // Drop 1: everything
        { pad: true, shimmer: true, arp: true,  bass: true,  drums: true,  lead: false, bars: 8 },
        // Bridge: strip back
        { pad: true, shimmer: true, arp: false, bass: true,  drums: false, lead: true,  bars: 4 },
        // Drop 2: full force
        { pad: true, shimmer: true, arp: true,  bass: true,  drums: true,  lead: true,  bars: 8 },
        // Outro: fade
        { pad: true, shimmer: true, arp: false, bass: false, drums: false, lead: false, bars: 4 },
    ];

    // ─── ENGINE STATE ───
    let ctx = null;
    let master = null;
    let compressor = null;
    let reverbSend = null;
    let reverbReturn = null;
    let isPlaying = false;
    let bpm = 72;
    let stepDuration;
    let currentStep = 0;
    let currentBar = 0;
    let currentSection = 0;
    let currentChord = 0;
    let schedulerTimer = null;
    let noiseBuffer = null;

    // Volume buses
    let padBus, bassBus, arpBus, drumBus, leadBus, shimmerBus;

    // ─── INIT ───
    function init() {
        if (ctx) return;
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        stepDuration = 60 / bpm / 4; // 16th note duration

        // Master chain: Compressor → Master Gain → Destination
        compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -18;
        compressor.knee.value = 12;
        compressor.ratio.value = 4;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.25;

        master = ctx.createGain();
        master.gain.value = 0.0; // Start silent, fade in
        master.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 4);

        compressor.connect(master);
        master.connect(ctx.destination);

        // Reverb send/return via convolution-like feedback delay network
        reverbSend = ctx.createGain();
        reverbSend.gain.value = 0.3;

        reverbReturn = ctx.createGain();
        reverbReturn.gain.value = 0.4;

        // 4-tap feedback delay network for lush reverb
        const delays = [0.037, 0.061, 0.089, 0.113];
        const feedbacks = [0.7, 0.65, 0.6, 0.55];
        delays.forEach((t, i) => {
            const d = ctx.createDelay(0.2);
            d.delayTime.value = t;
            const fb = ctx.createGain();
            fb.gain.value = feedbacks[i];
            const filt = ctx.createBiquadFilter();
            filt.type = 'lowpass';
            filt.frequency.value = 2500 - i * 400;

            reverbSend.connect(d);
            d.connect(fb);
            fb.connect(filt);
            filt.connect(d);
            d.connect(reverbReturn);
        });
        reverbReturn.connect(compressor);

        // Create bus gains
        padBus = createBus(0.22);
        bassBus = createBus(0.35);
        arpBus = createBus(0.12);
        drumBus = createBus(0.28);
        leadBus = createBus(0.15);
        shimmerBus = createBus(0.06);

        // Noise buffer for drums
        noiseBuffer = createNoiseBuffer(2);
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

    function pick(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    // ─── INSTRUMENTS ───

    // ▸ PAD SYNTH — Lush detuned sawtooth pad with filter sweep
    function playPad(time, chord) {
        const notes = chord.map(i => SCALE.low[i % SCALE.low.length]);
        const duration = stepDuration * 16; // whole bar

        notes.forEach(freq => {
            // 3 detuned oscillators per note
            [-7, 0, 7].forEach(detune => {
                const osc = ctx.createOscillator();
                osc.type = 'sawtooth';
                osc.frequency.value = freq;
                osc.detune.value = detune;

                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(400, time);
                filter.frequency.linearRampToValueAtTime(1800, time + duration * 0.4);
                filter.frequency.linearRampToValueAtTime(600, time + duration);
                filter.Q.value = 2;

                const env = ctx.createGain();
                env.gain.setValueAtTime(0, time);
                env.gain.linearRampToValueAtTime(0.08, time + duration * 0.3);
                env.gain.linearRampToValueAtTime(0.06, time + duration * 0.7);
                env.gain.linearRampToValueAtTime(0, time + duration);

                osc.connect(filter);
                filter.connect(env);
                env.connect(padBus);
                osc.start(time);
                osc.stop(time + duration + 0.1);
            });
        });
    }

    // ▸ SUB BASS — Deep sine with subtle harmonics
    function playBass(time, step, chord) {
        if (!BASS_PATTERN[step]) return;

        const rootIdx = chord[0];
        const freq = SCALE.sub[rootIdx % SCALE.sub.length];
        const dur = stepDuration * 2;

        // Fundamental
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        // Saturation harmonic
        const osc2 = ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.value = freq * 2;

        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(0.4, time + 0.02);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        const env2 = ctx.createGain();
        env2.gain.setValueAtTime(0, time);
        env2.gain.linearRampToValueAtTime(0.08, time + 0.02);
        env2.gain.exponentialRampToValueAtTime(0.001, time + dur);

        // Slight pitch slide for groove
        osc.frequency.setValueAtTime(freq * 1.02, time);
        osc.frequency.exponentialRampToValueAtTime(freq, time + 0.05);

        osc.connect(env);
        osc2.connect(env2);
        env.connect(bassBus);
        env2.connect(bassBus);
        osc.start(time);
        osc.stop(time + dur + 0.1);
        osc2.start(time);
        osc2.stop(time + dur + 0.1);
    }

    // ▸ ARPEGGIATOR — Crystalline plucks
    function playArp(time, step, chord) {
        if (!ARP_PATTERN[step]) return;

        const noteIdx = chord[step % chord.length];
        const freq = SCALE.high[noteIdx % SCALE.high.length];
        const dur = stepDuration * 1.5;

        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        osc.detune.value = (Math.random() - 0.5) * 10;

        // Soft resonant filter for pluck character
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = freq * 2;
        filter.Q.value = 3;

        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(0.2, time + 0.005);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        osc.connect(filter);
        filter.connect(env);
        env.connect(arpBus);
        osc.start(time);
        osc.stop(time + dur + 0.1);

        // Ghost harmonic
        if (Math.random() < 0.3) {
            const ghost = ctx.createOscillator();
            ghost.type = 'sine';
            ghost.frequency.value = freq * 2;
            const gEnv = ctx.createGain();
            gEnv.gain.setValueAtTime(0, time + stepDuration * 0.5);
            gEnv.gain.linearRampToValueAtTime(0.04, time + stepDuration * 0.5 + 0.005);
            gEnv.gain.exponentialRampToValueAtTime(0.001, time + stepDuration * 0.5 + dur);
            ghost.connect(gEnv);
            gEnv.connect(arpBus);
            ghost.start(time + stepDuration * 0.5);
            ghost.stop(time + stepDuration * 0.5 + dur + 0.1);
        }
    }

    // ▸ LEAD SYNTH — Singing square wave with vibrato
    function playLead(time, step, chord) {
        // Play on beats 0, 4, 8, 12 with variation
        if (step !== 0 && step !== 4 && step !== 8 && step !== 12) return;
        if (Math.random() < 0.3) return; // occasional silence

        const noteIdx = pick(chord);
        const freq = SCALE.mid[noteIdx % SCALE.mid.length];
        const dur = stepDuration * (Math.random() < 0.5 ? 4 : 6);

        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = freq;

        // Vibrato via LFO
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 5;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 4; // subtle pitch wobble in Hz
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);

        // Aggressive low-pass to tame the square wave
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, time);
        filter.frequency.linearRampToValueAtTime(2200, time + dur * 0.3);
        filter.frequency.linearRampToValueAtTime(600, time + dur);
        filter.Q.value = 4;

        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(0.12, time + dur * 0.1);
        env.gain.linearRampToValueAtTime(0.08, time + dur * 0.5);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        osc.connect(filter);
        filter.connect(env);
        env.connect(leadBus);
        osc.start(time);
        osc.stop(time + dur + 0.1);
        lfo.start(time);
        lfo.stop(time + dur + 0.1);
    }

    // ▸ SHIMMER — Ethereal high-frequency sine pings
    function playShimmer(time, step) {
        if (Math.random() > 0.2) return; // sparse

        const freq = pick(SCALE.shimmer);
        const dur = 2 + Math.random() * 3;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.detune.value = (Math.random() - 0.5) * 20;

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

    // ▸ DRUMS ───

    function playKick(time, step) {
        if (!KICK_PATTERN[step]) return;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(35, time + 0.12);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.6, time);
        env.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

        // Click transient
        const click = ctx.createOscillator();
        click.type = 'square';
        click.frequency.value = 800;
        const clickEnv = ctx.createGain();
        clickEnv.gain.setValueAtTime(0.15, time);
        clickEnv.gain.exponentialRampToValueAtTime(0.001, time + 0.015);

        osc.connect(env);
        env.connect(drumBus);
        click.connect(clickEnv);
        clickEnv.connect(drumBus);

        osc.start(time);
        osc.stop(time + 0.5);
        click.start(time);
        click.stop(time + 0.02);
    }

    function playSnare(time, step) {
        if (!SNARE_PATTERN[step]) return;

        // Noise body
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        const nFilter = ctx.createBiquadFilter();
        nFilter.type = 'highpass';
        nFilter.frequency.value = 2000;
        const nEnv = ctx.createGain();
        nEnv.gain.setValueAtTime(0.2, time);
        nEnv.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

        // Tonal body
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = 200;
        const oEnv = ctx.createGain();
        oEnv.gain.setValueAtTime(0.2, time);
        oEnv.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

        noise.connect(nFilter);
        nFilter.connect(nEnv);
        nEnv.connect(drumBus);
        osc.connect(oEnv);
        oEnv.connect(drumBus);

        noise.start(time);
        noise.stop(time + 0.2);
        osc.start(time);
        osc.stop(time + 0.1);
    }

    function playHiHat(time, step) {
        const isOpen = HAT_OPEN[step];
        if (!HAT_PATTERN[step] && !isOpen) return;

        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 7000;

        const env = ctx.createGain();
        const dur = isOpen ? 0.12 : 0.04;
        const vol = isOpen ? 0.08 : 0.04;
        env.gain.setValueAtTime(vol, time);
        env.gain.exponentialRampToValueAtTime(0.001, time + dur);

        // Slight stereo variation
        const pan = ctx.createStereoPanner();
        pan.pan.value = (Math.random() - 0.5) * 0.4;

        noise.connect(filter);
        filter.connect(env);
        env.connect(pan);
        pan.connect(drumBus);

        noise.start(time);
        noise.stop(time + dur + 0.01);
    }

    // ─── SCHEDULER ───
    function getActiveSection() {
        let totalBars = 0;
        for (let i = 0; i < SONG_STRUCTURE.length; i++) {
            totalBars += SONG_STRUCTURE[i].bars;
            if (currentBar < totalBars) return i;
        }
        // Loop the whole song
        const totalSongBars = SONG_STRUCTURE.reduce((a, s) => a + s.bars, 0);
        currentBar = currentBar % totalSongBars;
        return getActiveSection();
    }

    function scheduleStep() {
        if (!isPlaying) return;

        const now = ctx.currentTime;
        const section = SONG_STRUCTURE[getActiveSection()];
        const chord = CHORD_PROG[currentChord];

        // Play active layers
        if (section.pad && currentStep === 0) {
            playPad(now, chord);
        }
        if (section.shimmer) {
            playShimmer(now, currentStep);
        }
        if (section.arp) {
            playArp(now, currentStep, chord);
        }
        if (section.bass) {
            playBass(now, currentStep, chord);
        }
        if (section.lead) {
            playLead(now, currentStep, chord);
        }
        if (section.drums) {
            playKick(now, currentStep);
            playSnare(now, currentStep);
            playHiHat(now, currentStep);
        }

        // Advance
        currentStep++;
        if (currentStep >= 16) {
            currentStep = 0;
            currentChord = (currentChord + 1) % CHORD_PROG.length;
            currentBar++;
        }

        schedulerTimer = setTimeout(scheduleStep, stepDuration * 1000);
    }

    // ─── CONTROLS ───
    function start() {
        if (isPlaying) return;
        init();
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

    // ─── BUILD FLOATING PLAY BUTTON ───
    function buildUI() {
        const btn = document.createElement('button');
        btn.id = 'materia-music-btn';
        btn.innerHTML = '♫';
        btn.title = 'Toggle Materia Soundtrack';
        document.body.appendChild(btn);

        const style = document.createElement('style');
        style.textContent = `
            #materia-music-btn {
                position: fixed;
                top: 18px;
                right: 18px;
                z-index: 99999;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                border: 1px solid rgba(180, 140, 255, 0.3);
                background: rgba(0, 0, 0, 0.25);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                color: rgba(255, 255, 255, 0.7);
                font-size: 16px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                box-shadow: 0 0 20px rgba(180, 140, 255, 0.08);
            }
            #materia-music-btn:hover {
                background: rgba(180, 140, 255, 0.15);
                border-color: rgba(180, 140, 255, 0.6);
                box-shadow: 0 0 30px rgba(180, 140, 255, 0.2);
                color: #fff;
                transform: scale(1.1);
            }
            #materia-music-btn.playing {
                animation: musicPulse 2s ease-in-out infinite;
                border-color: rgba(100, 220, 255, 0.5);
            }
            @keyframes musicPulse {
                0%, 100% { box-shadow: 0 0 15px rgba(100, 220, 255, 0.1); }
                50% { box-shadow: 0 0 30px rgba(100, 220, 255, 0.3); }
            }
        `;
        document.head.appendChild(style);

        let playing = false;
        btn.addEventListener('click', () => {
            if (!playing) {
                start();
                btn.classList.add('playing');
                btn.innerHTML = '⏸';
                playing = true;
            } else {
                stop();
                btn.classList.remove('playing');
                btn.innerHTML = '♫';
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
    window.MateriaMusic = { start, stop };

})();
