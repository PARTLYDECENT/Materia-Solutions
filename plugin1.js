// plugin1.js
// ═══════════════════════════════════════════════════════════════
// MATERIA SOLUTIONS — Xenomorph Bio-Synthesis DSP Plugin
// Custom sound shader, physical models, and chaotic FM feedback
// engines designed to synthesize terrifying, organic alien textures.
// ═══════════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ─── NOISE CACHING ───
    let whiteNoiseBuffer = null;
    let pinkNoiseBuffer = null;

    function getWhiteNoise(ctx) {
        if (whiteNoiseBuffer) return whiteNoiseBuffer;
        const len = Math.floor(ctx.sampleRate * 2.0); // 2 seconds
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        whiteNoiseBuffer = buf;
        return buf;
    }

    function getPinkNoise(ctx) {
        if (pinkNoiseBuffer) return pinkNoiseBuffer;
        const len = Math.floor(ctx.sampleRate * 2.0);
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < len; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
            b6 = white * 0.115926;
        }
        pinkNoiseBuffer = buf;
        return buf;
    }

    const XenoDSP = {
        // ─── 1. WET ACID DRIP ───
        // Synthesizes the sizzle, hiss, and bubble of acidic saliva melting metal.
        createAcidDrip: function (ctx, time, dest) {
            const duration = 1.2;

            // Drip core: Sine sweep
            const dripOsc = ctx.createOscillator();
            dripOsc.type = 'sine';
            dripOsc.frequency.setValueAtTime(1400, time);
            dripOsc.frequency.exponentialRampToValueAtTime(180, time + 0.08);

            const dripEnv = ctx.createGain();
            dripEnv.gain.setValueAtTime(0.0, time);
            dripEnv.gain.linearRampToValueAtTime(0.18, time + 0.005);
            dripEnv.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

            // Comb resonator for wet splash effect
            const delay = ctx.createDelay(0.05);
            delay.delayTime.value = 0.003; // ~333 Hz resonance
            const feedback = ctx.createGain();
            feedback.gain.value = 0.82;

            dripOsc.connect(dripEnv);
            dripEnv.connect(delay);
            delay.connect(feedback);
            feedback.connect(delay); // loop

            // Hiss/Sizzle: Noise through highpass filter
            const noise = ctx.createBufferSource();
            noise.buffer = getWhiteNoise(ctx);

            const hp = ctx.createBiquadFilter();
            hp.type = 'highpass';
            hp.frequency.setValueAtTime(6000, time);
            hp.frequency.linearRampToValueAtTime(3500, time + duration);

            const sizzleEnv = ctx.createGain();
            sizzleEnv.gain.setValueAtTime(0.0, time);
            sizzleEnv.gain.linearRampToValueAtTime(0.06, time + 0.04);
            sizzleEnv.gain.exponentialRampToValueAtTime(0.015, time + 0.4);
            sizzleEnv.gain.linearRampToValueAtTime(0.0, time + duration);

            // Sizzle bubbling: AM modulation
            const bubbleLfo = ctx.createOscillator();
            bubbleLfo.type = 'sine';
            bubbleLfo.frequency.setValueAtTime(22, time);
            bubbleLfo.frequency.linearRampToValueAtTime(8, time + duration);
            const bubbleGain = ctx.createGain();
            bubbleGain.gain.setValueAtTime(0.7, time);

            bubbleLfo.connect(bubbleGain);
            bubbleGain.connect(sizzleEnv.gain);

            noise.connect(hp);
            hp.connect(sizzleEnv);

            // Stereo panning
            const pan = ctx.createStereoPanner();
            pan.pan.value = (Math.random() - 0.5) * 1.6;

            delay.connect(pan);
            sizzleEnv.connect(pan);
            pan.connect(dest);

            dripOsc.start(time);
            dripOsc.stop(time + 0.2);
            noise.start(time);
            noise.stop(time + duration + 0.05);
            bubbleLfo.start(time);
            bubbleLfo.stop(time + duration + 0.05);
        },

        // ─── 2. BIOLOGICAL HISS & BREATH ───
        // Emulates the tense, heavy respiration of the creature.
        createHissNode: function (ctx, time, duration, frequency, resonance, dest) {
            const noise = ctx.createBufferSource();
            noise.buffer = getPinkNoise(ctx);

            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.setValueAtTime(frequency, time);
            bp.frequency.exponentialRampToValueAtTime(frequency * 0.6, time + duration);
            bp.Q.setValueAtTime(resonance, time);

            const env = ctx.createGain();
            env.gain.setValueAtTime(0.0, time);
            env.gain.linearRampToValueAtTime(0.25, time + duration * 0.35); // Slow breath inhalation
            env.gain.exponentialRampToValueAtTime(0.001, time + duration);

            noise.connect(bp);
            bp.connect(env);

            const pan = ctx.createStereoPanner();
            pan.pan.setValueAtTime((Math.random() - 0.5) * 0.6, time);
            env.connect(pan);
            pan.connect(dest);

            noise.start(time);
            noise.stop(time + duration + 0.1);
        },

        // ─── 3. CLAW SCRAPE (PHYSICAL MODELING) ───
        // Comb-filtered physical resonator model representing claws scraping against metal.
        createClawScrape: function (ctx, time, freq, duration, dest) {
            // Exciter: short noise click
            const exciter = ctx.createBufferSource();
            exciter.buffer = getWhiteNoise(ctx);

            const excEnv = ctx.createGain();
            excEnv.gain.setValueAtTime(0.35, time);
            excEnv.gain.exponentialRampToValueAtTime(0.001, time + 0.015);

            // Comb resonator
            const delay = ctx.createDelay(0.1);
            const delayTime = 1 / freq;
            delay.delayTime.setValueAtTime(delayTime, time);
            
            // Screech pitch slide (unhinged slide bend)
            delay.delayTime.exponentialRampToValueAtTime(delayTime * 1.5, time + duration * 0.4);
            delay.delayTime.exponentialRampToValueAtTime(delayTime * 0.8, time + duration);

            const feedback = ctx.createGain();
            feedback.gain.setValueAtTime(0.994, time); // Long resonance decay
            feedback.gain.exponentialRampToValueAtTime(0.92, time + duration);

            // Scrape filter to simulate scraping body
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(3500, time);
            filter.frequency.exponentialRampToValueAtTime(1500, time + duration);

            const env = ctx.createGain();
            env.gain.setValueAtTime(0.0, time);
            env.gain.linearRampToValueAtTime(0.18, time + 0.02);
            env.gain.exponentialRampToValueAtTime(0.001, time + duration);

            const pan = ctx.createStereoPanner();
            pan.pan.setValueAtTime(Math.sin(time * 3) * 0.7, time); // Pan sweep

            exciter.connect(excEnv);
            excEnv.connect(delay);
            delay.connect(filter);
            filter.connect(feedback);
            feedback.connect(delay); // Loop
            delay.connect(env);
            env.connect(pan);
            pan.connect(dest);

            exciter.start(time);
            exciter.stop(time + 0.1);
        },

        // ─── 4. CHAOTIC ALIEN FM VOICE (UNHINGED SCREAMER) ───
        // Stacked operator FM with direct frequency cross-feedback for screaming, biological distortion.
        createAlienFMVoice: function (ctx, time, freq, intensity, duration, dest) {
            const carrier = ctx.createOscillator();
            carrier.type = 'sawtooth';
            carrier.frequency.setValueAtTime(freq, time);

            // Op 2: Metallic modulator
            const op2 = ctx.createOscillator();
            op2.type = 'sine';
            op2.frequency.setValueAtTime(freq * 3.141, time); // Inharmonic metallic ratio
            const op2Gain = ctx.createGain();
            const op2Depth = 400 + 1800 * intensity;
            op2Gain.gain.setValueAtTime(op2Depth, time);
            op2Gain.gain.exponentialRampToValueAtTime(10, time + duration);

            // Op 3: Slow screech modulator
            const op3 = ctx.createOscillator();
            op3.type = 'triangle';
            op3.frequency.setValueAtTime(freq * 0.618, time);
            const op3Gain = ctx.createGain();
            op3Gain.gain.setValueAtTime(op2Depth * 0.5, time);

            // FM Chain: Op3 ➔ Op2.frequency, Op2 ➔ Carrier.frequency
            op3.connect(op3Gain);
            op3Gain.connect(op2.frequency);
            op2.connect(op2Gain);
            op2Gain.connect(carrier.frequency);

            // Chaotic Feedback: Connect carrier back into modulator frequency!
            const fbGain = ctx.createGain();
            fbGain.gain.setValueAtTime(120 * intensity, time);
            carrier.connect(fbGain);
            fbGain.connect(op2.frequency);

            // Resonant Filter
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(freq * 2, time);
            filter.frequency.exponentialRampToValueAtTime(250, time + duration);
            filter.Q.setValueAtTime(lerp(2, 8, intensity), time);

            // Amplitude envelope
            const env = ctx.createGain();
            env.gain.setValueAtTime(0.0, time);
            env.gain.linearRampToValueAtTime(0.20, time + 0.015);
            env.gain.setValueAtTime(0.15, time + duration * 0.4);
            env.gain.exponentialRampToValueAtTime(0.001, time + duration);

            carrier.connect(filter);
            filter.connect(env);
            env.connect(dest);

            const allOscs = [carrier, op2, op3];
            allOscs.forEach(o => { o.start(time); o.stop(time + duration + 0.1); });
        },

        // ─── 5. DOUBLE HEARTBEAT ───
        // Heavy, organic double sub-bass thump representing the monster's core pulse.
        createHeartbeat: function (ctx, time, intensity, dest) {
            const beatDur = 0.18;
            const bounceOffset = 0.22;

            // Helper for single beat
            function triggerBeat(t, pitch, vol) {
                const osc = ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(pitch, t);
                osc.frequency.exponentialRampToValueAtTime(24, t + beatDur);

                // Wave folder / Saturation for organic sub rumble
                const shaper = ctx.createWaveShaper();
                shaper.curve = makeSoftClipCurve(2048);

                const env = ctx.createGain();
                env.gain.setValueAtTime(0, t);
                env.gain.linearRampToValueAtTime(vol * 0.9, t + 0.01);
                env.gain.exponentialRampToValueAtTime(0.001, t + beatDur);

                osc.connect(shaper);
                shaper.connect(env);
                env.connect(dest);

                osc.start(t);
                osc.stop(t + beatDur + 0.05);
            }

            // Trigger double beat (lub-dub)
            triggerBeat(time, lerp(75, 95, intensity), 0.72);
            triggerBeat(time + bounceOffset, lerp(60, 75, intensity), 0.48);
        },

        // ─── 6. FORMANT MORPHER (ALIEN VOWEL SCREAMS) ───
        // Parallel bandpass filter bank morphing between vocal formants ("U" ➔ "A" ➔ "I" screech).
        createFormantMorpher: function (ctx, sourceNode, time, duration, dest) {
            const vowels = {
                u: { f1: 350, f2: 600, f3: 2400 },
                a: { f1: 800, f2: 1200, f3: 2800 },
                i: { f1: 270, f2: 2300, f3: 3000 }
            };

            const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.Q.value = 14;
            const f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.Q.value = 14;
            const f3 = ctx.createBiquadFilter(); f3.type = 'bandpass'; f3.Q.value = 14;

            const merger = ctx.createGain();
            merger.gain.value = 0.45;

            // Connect source to all formant filters
            sourceNode.connect(f1);
            sourceNode.connect(f2);
            sourceNode.connect(f3);

            f1.connect(merger);
            f2.connect(merger);
            f3.connect(merger);

            merger.connect(dest);

            // Morph frequencies: U ➔ A (at 30%) ➔ I (at 100%)
            const tA = time + duration * 0.3;
            const tEnd = time + duration;

            f1.frequency.setValueAtTime(vowels.u.f1, time);
            f1.frequency.linearRampToValueAtTime(vowels.a.f1, tA);
            f1.frequency.linearRampToValueAtTime(vowels.i.f1, tEnd);

            f2.frequency.setValueAtTime(vowels.u.f2, time);
            f2.frequency.linearRampToValueAtTime(vowels.a.f2, tA);
            f2.frequency.linearRampToValueAtTime(vowels.i.f2, tEnd);

            f3.frequency.setValueAtTime(vowels.u.f3, time);
            f3.frequency.linearRampToValueAtTime(vowels.a.f3, tA);
            f3.frequency.linearRampToValueAtTime(vowels.i.f3, tEnd);
        }
    };

    // ─── HELPERS ───
    function lerp(a, b, t) { return a + (b - a) * Math.max(0, Math.min(1, t)); }

    function makeSoftClipCurve(n) {
        const curve = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            const x = (i * 2) / n - 1;
            curve[i] = (3 * x) / (2 + Math.abs(x * 2.2));
        }
        return curve;
    }

    // Expose plugin globally
    window.XenoDSP = XenoDSP;

})();
