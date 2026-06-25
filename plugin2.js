// plugin2.js
// ═══════════════════════════════════════════════════════════════
// MATERIA SOLUTIONS — Jovian Cryo-Synthesis & Sub-Aquatic DSP
// Custom physical modeling, fluid resonators, and sweeping LFOs
// simulating the frozen surface and warm subsurface ocean of Europa.
// ═══════════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ─── NOISE BUFFER CACHING ───
    let whiteNoise = null;
    let pinkNoise = null;

    function getWhiteNoise(ctx) {
        if (whiteNoise) return whiteNoise;
        const len = Math.floor(ctx.sampleRate * 2.0);
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        whiteNoise = buf;
        return buf;
    }

    function getPinkNoise(ctx) {
        if (pinkNoise) return pinkNoise;
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
        pinkNoise = buf;
        return buf;
    }

    const EuropaDSP = {
        // ─── 1. ICE CRACK (FRACTURING SHELL) ───
        // Synthesizes the sudden, sharp snapping and fracturing of ice sheets under pressure.
        createIceCrack: function (ctx, time, dest) {
            const duration = 0.6;
            const burstCount = Math.floor(3 + Math.random() * 5); // Staggered micro-fractures

            for (let i = 0; i < burstCount; i++) {
                const triggerTime = time + i * lerp(0.01, 0.04, Math.random());
                const clickDur = lerp(0.005, 0.025, Math.random());

                // Exciter
                const exciter = ctx.createBufferSource();
                exciter.buffer = getWhiteNoise(ctx);

                const filter = ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(lerp(2500, 6000, Math.random()), triggerTime);
                filter.Q.setValueAtTime(8, triggerTime);

                const env = ctx.createGain();
                env.gain.setValueAtTime(0, triggerTime);
                env.gain.linearRampToValueAtTime(0.24 / burstCount, triggerTime + 0.001);
                env.gain.exponentialRampToValueAtTime(0.001, triggerTime + clickDur);

                // Small comb filter for icy crystalline ring
                const delay = ctx.createDelay(0.02);
                delay.delayTime.value = lerp(0.001, 0.006, Math.random());
                const fb = ctx.createGain();
                fb.gain.value = 0.88;

                exciter.connect(filter);
                filter.connect(env);
                env.connect(delay);
                delay.connect(fb);
                fb.connect(delay); // comb loop

                const pan = ctx.createStereoPanner();
                pan.pan.setValueAtTime((Math.random() - 0.5) * 1.8, triggerTime);

                delay.connect(pan);
                pan.connect(dest);

                exciter.start(triggerTime);
                exciter.stop(triggerTime + clickDur + 0.05);
            }
        },

        // ─── 2. SUB-AQUATIC SONAR REFLECTION ───
        // Deep sonar ping echoing off abyssal trenches, with watery comb dispersion.
        createSubAquaticSonar: function (ctx, time, freq, dest) {
            const duration = 4.5;

            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.96, time + 0.5);

            const env = ctx.createGain();
            env.gain.setValueAtTime(0.0, time);
            env.gain.linearRampToValueAtTime(0.38, time + 0.008); // Sharp strike
            env.gain.exponentialRampToValueAtTime(0.001, time + duration);

            // Watery delay line
            const delay = ctx.createDelay(2.5);
            delay.delayTime.setValueAtTime(0.65, time); // Echo time
            const fb = ctx.createGain();
            fb.gain.value = 0.58;

            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.setValueAtTime(freq * 1.2, time);
            bp.Q.setValueAtTime(4.0, time);

            // Modulate delay time very slightly to simulate thermal current fluctuations
            const lfo = ctx.createOscillator();
            lfo.type = 'sine';
            lfo.frequency.setValueAtTime(0.18, time);
            const lfoGain = ctx.createGain();
            lfoGain.gain.setValueAtTime(0.003, time);

            lfo.connect(lfoGain);
            lfoGain.connect(delay.delayTime);

            osc.connect(env);
            env.connect(delay);
            delay.connect(bp);
            bp.connect(fb);
            fb.connect(delay); // Echo feedback loop

            const pan = ctx.createStereoPanner();
            pan.pan.setValueAtTime(0.65, time);

            osc.connect(env); // Connect dry directly to dest
            env.connect(dest);

            delay.connect(pan);
            pan.connect(dest);

            osc.start(time);
            osc.stop(time + duration + 0.1);
            lfo.start(time);
            lfo.stop(time + duration + 0.1);
        },

        // ─── 3. HYDROTHERMAL WATER BUBBLES ───
        // High-pitched liquid bubble sounds from warm vents rising and popping.
        createWaterBubble: function (ctx, time, dest) {
            const dur = lerp(0.06, 0.12, Math.random());
            const startFreq = lerp(200, 380, Math.random());
            const endFreq = startFreq * lerp(3.5, 6.0, Math.random()); // Rapid rising pitch

            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(startFreq, time);
            osc.frequency.linearRampToValueAtTime(endFreq, time + dur);

            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.setValueAtTime(endFreq * 0.9, time);
            bp.Q.value = 6;

            const env = ctx.createGain();
            env.gain.setValueAtTime(0.0, time);
            env.gain.linearRampToValueAtTime(0.16, time + 0.002);
            env.gain.exponentialRampToValueAtTime(0.001, time + dur);

            const pan = ctx.createStereoPanner();
            pan.pan.setValueAtTime((Math.random() - 0.5) * 1.5, time);

            osc.connect(bp);
            bp.connect(env);
            env.connect(pan);
            pan.connect(dest);

            osc.start(time);
            osc.stop(time + dur + 0.05);
        },

        // ─── 4. CRYOGENIC JOVIAN WINDS ───
        // Sweeping pink-noise winds modulated by dual low-frequency oscillators.
        createCryoWind: function (ctx, time, duration, dest) {
            const noise = ctx.createBufferSource();
            noise.buffer = getPinkNoise(ctx);

            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.setValueAtTime(600, time);
            bp.Q.setValueAtTime(3.5, time);

            const env = ctx.createGain();
            env.gain.setValueAtTime(0.0, time);
            env.gain.linearRampToValueAtTime(0.24, time + duration * 0.4);
            env.gain.setValueAtTime(0.18, time + duration * 0.75);
            env.gain.linearRampToValueAtTime(0.0, time + duration);

            // Dual LFO modulators for natural atmospheric wind gusts
            const lfo1 = ctx.createOscillator();
            lfo1.type = 'sine';
            lfo1.frequency.value = 0.08;
            const lfo1Gain = ctx.createGain();
            lfo1Gain.gain.value = 250;

            const lfo2 = ctx.createOscillator();
            lfo2.type = 'sine';
            lfo2.frequency.value = 0.03;
            const lfo2Gain = ctx.createGain();
            lfo2Gain.gain.value = 140;

            lfo1.connect(lfo1Gain);
            lfo1Gain.connect(bp.frequency);
            lfo2.connect(lfo2Gain);
            lfo2Gain.connect(bp.frequency);

            noise.connect(bp);
            bp.connect(env);

            const pan = ctx.createStereoPanner();
            const panLfo = ctx.createOscillator();
            panLfo.type = 'sine';
            panLfo.frequency.value = 0.05;
            panLfo.connect(pan.pan);

            env.connect(pan);
            pan.connect(dest);

            noise.start(time);
            noise.stop(time + duration + 0.1);
            lfo1.start(time);
            lfo1.stop(time + duration + 0.1);
            lfo2.start(time);
            lfo2.stop(time + duration + 0.1);
            panLfo.start(time);
            panLfo.stop(time + duration + 0.1);
        },

        // ─── 5. SHIMMERING EUROPA FM CHORUS ───
        // 3-operator FM stack routed through a 3-tap modulated chorus delay line.
        createEuropaFMChorus: function (ctx, time, freq, intensity, duration, dest) {
            const carrier = ctx.createOscillator();
            carrier.type = 'triangle';
            carrier.frequency.setValueAtTime(freq, time);

            const mod = ctx.createOscillator();
            mod.type = 'sine';
            mod.frequency.setValueAtTime(freq * 1.5, time); // Fifth ratio
            const modGain = ctx.createGain();
            const modDepth = 150 + 600 * intensity;
            modGain.gain.setValueAtTime(modDepth, time);
            modGain.gain.exponentialRampToValueAtTime(10, time + duration);

            mod.connect(modGain);
            modGain.connect(carrier.frequency);

            const env = ctx.createGain();
            env.gain.setValueAtTime(0.0, time);
            env.gain.linearRampToValueAtTime(0.22, time + 0.12); // Soft pad-like strike
            env.gain.setValueAtTime(0.18, time + duration * 0.5);
            env.gain.exponentialRampToValueAtTime(0.001, time + duration);

            // Shimmering 3-tap chorus
            const chorusIn = ctx.createGain();
            const chorusOut = ctx.createGain();
            chorusIn.connect(chorusOut); // dry line

            const tapRates = [0.28, 0.42, 0.55];
            const tapDelays = [0.012, 0.018, 0.024];
            const tapDepths = [0.003, 0.004, 0.005];

            tapRates.forEach((rate, i) => {
                const delay = ctx.createDelay(0.1);
                delay.delayTime.value = tapDelays[i];

                const lfo = ctx.createOscillator();
                lfo.type = 'sine';
                lfo.frequency.setValueAtTime(rate, time);

                const lg = ctx.createGain();
                lg.gain.setValueAtTime(tapDepths[i], time);

                lfo.connect(lg);
                lg.connect(delay.delayTime);

                const pan = ctx.createStereoPanner();
                pan.pan.setValueAtTime((i - 1) * 0.7, time);

                chorusIn.connect(delay);
                delay.connect(pan);
                pan.connect(chorusOut);

                lfo.start(time);
                lfo.stop(time + duration + 0.1);
            });

            carrier.connect(env);
            env.connect(chorusIn);
            chorusOut.connect(dest);

            carrier.start(time);
            mod.start(time);
            carrier.stop(time + duration + 0.05);
            mod.stop(time + duration + 0.05);
        },

        // ─── 6. ICE SHELL PRESSURE THUMP (KICK) ───
        // Saturated low-frequency thud representing the ice sheet adjusting.
        createSubPressureThump: function (ctx, time, dest) {
            const duration = 0.45;
            const fundamental = 36.71; // D1 range sub

            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(90, time);
            osc.frequency.exponentialRampToValueAtTime(fundamental, time + 0.06);

            // Tanh soft clip saturation for deep magnetic thump
            const shaper = ctx.createWaveShaper();
            shaper.curve = makeTanhCurve(2.8);

            const env = ctx.createGain();
            env.gain.setValueAtTime(0.0, time);
            env.gain.linearRampToValueAtTime(0.85, time + 0.005);
            env.gain.exponentialRampToValueAtTime(0.001, time + duration);

            osc.connect(shaper);
            shaper.connect(env);
            env.connect(dest);

            osc.start(time);
            osc.stop(time + duration + 0.05);
        }
    };

    // ─── HELPERS ───
    function lerp(a, b, t) { return a + (b - a) * Math.max(0, Math.min(1, t)); }

    function makeTanhCurve(k) {
        const n = 1024, c = new Float32Array(n);
        const norm = Math.tanh(k);
        for (let i = 0; i < n; i++) {
            const x = (i * 2) / n - 1;
            c[i] = Math.tanh(k * x) / norm;
        }
        return c;
    }

    // Expose plugin globally
    window.EuropaDSP = EuropaDSP;

})();
