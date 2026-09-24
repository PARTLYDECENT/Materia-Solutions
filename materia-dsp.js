// materia-dsp.js
// ═══════════════════════════════════════════════════════════════
// MATERIA COOKIES — Client-side DSP Audio Shader Framework
// A highly optimized, sample-by-sample audio processing system
// acting as fragment shaders for sound. Operates within inline
// ScriptProcessorNodes to ensure bulletproof compatibility.
// ═══════════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ─── DSP HELPERS ───
    const MateriaDSP = {
        // ─── SHADER CREATOR ───
        // Creates a sample-level stereo shader node
        createAudioShaderNode: function (audioCtx, bufferSize, shaderCallback) {
            const node = audioCtx.createScriptProcessor(bufferSize, 2, 2);
            node.onaudioprocess = function (e) {
                const inputL = e.inputBuffer.getChannelData(0);
                const inputR = e.inputBuffer.getChannelData(1);
                const outputL = e.outputBuffer.getChannelData(0);
                const outputR = e.outputBuffer.getChannelData(1);
                const len = inputL.length;

                for (let i = 0; i < len; i++) {
                    const t = audioCtx.currentTime + (i / audioCtx.sampleRate);
                    // Pass sample, time, and index into the sample-shader
                    const out = shaderCallback(inputL[i], inputR[i], t, i);
                    outputL[i] = out[0];
                    outputR[i] = out[1];
                }
            };
            return node;
        },

        // ─── BUCHLA WAVEFOLDER SHADER ───
        // Folds waves back on themselves when exceeding thresholds
        wavefold: function (sample, drive, stages) {
            let x = sample * drive;
            // Bound inside typical limits and recursively apply folding math
            for (let s = 0; s < stages; s++) {
                x = Math.sin(x * Math.PI * 0.5);
            }
            return x;
        },

        // ─── QUANTUM DECIMATOR SHADER ───
        // Bitcrushes and downsamples the audio signal
        createDecimator: function () {
            let lastValL = 0;
            let lastValR = 0;
            let counter = 0;

            return function (sampleL, sampleR, bits, downsampleFactor) {
                counter++;
                if (counter >= downsampleFactor) {
                    counter = 0;
                    const bitDiv = Math.pow(2, bits);
                    lastValL = Math.round(sampleL * bitDiv) / bitDiv;
                    lastValR = Math.round(sampleR * bitDiv) / bitDiv;
                }
                return [lastValL, lastValR];
            };
        },

        // ─── CHAOTIC COMB TUBE RESONATOR SHADER ───
        // Creates organic acoustic body resonances using physical delay-lines
        createCombResonator: function (maxDelaySamples = 4096) {
            const bufferL = new Float32Array(maxDelaySamples);
            const bufferR = new Float32Array(maxDelaySamples);
            let writeIdx = 0;

            return function (sampleL, sampleR, delayTimeSamples, feedback) {
                // Ensure delay time doesn't exceed maximum bounds
                const delay = Math.max(1, Math.min(maxDelaySamples - 1, Math.floor(delayTimeSamples)));
                
                // Read from delay line
                let readIdx = writeIdx - delay;
                if (readIdx < 0) readIdx += maxDelaySamples;

                const prevL = bufferL[readIdx];
                const prevR = bufferR[readIdx];

                // Write into buffer with feedback coefficients
                const outL = sampleL + prevL * feedback;
                const outR = sampleR + prevR * feedback;

                bufferL[writeIdx] = outL;
                bufferR[writeIdx] = outR;

                writeIdx = (writeIdx + 1) % maxDelaySamples;

                return [outL, outR];
            };
        },

        // ─── DYNAMIC RING MODULATOR SHADER ───
        // Multiply by a sweepable carrier frequency to create robotic grit
        ringModulate: function (sample, carrierFreq, time) {
            const carrier = Math.sin(2 * Math.PI * carrierFreq * time);
            return sample * carrier;
        },

        // ─── STEREO DELAY NODE ───
        // Creates spatial ping-pong echo delay
        createStereoDelay: function (audioCtx, delayTime = 0.25, feedback = 0.4) {
            const delayL = audioCtx.createDelay(1.0);
            const delayR = audioCtx.createDelay(1.0);
            const feedbackGain = audioCtx.createGain();
            const merger = audioCtx.createChannelMerger(2);

            delayL.delayTime.value = delayTime;
            delayR.delayTime.value = delayTime * 1.5; // Ping-pong offset
            feedbackGain.gain.value = feedback;

            delayL.connect(feedbackGain);
            delayR.connect(feedbackGain);
            feedbackGain.connect(delayR);
            feedbackGain.connect(delayL);

            delayL.connect(merger, 0, 0);
            delayR.connect(merger, 0, 1);

            return {
                input: delayL,
                output: merger
            };
        },

        // ─── WARM ANALOG SATURATOR ───
        // Soft-clipping distortion curve for cinematic analog warmth
        createSaturator: function (audioCtx, drive = 2.0) {
            const waveShaper = audioCtx.createWaveShaper();
            const n_samples = 44100;
            const curve = new Float32Array(n_samples);
            const deg = Math.PI / 180;

            for (let i = 0; i < n_samples; ++i) {
                let x = (i * 2) / n_samples - 1;
                curve[i] = ((3 + drive) * x * 20 * deg) / (Math.PI + drive * Math.abs(x));
            }
            waveShaper.curve = curve;
            waveShaper.oversample = '4x';
            return waveShaper;
        }
    };

    // Expose library globally
    window.MateriaDSP = MateriaDSP;

})();
