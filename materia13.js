// materia13.js
// ═══════════════════════════════════════════════════════════════
// MATERIA SOLUTIONS — I Got Europa (High-Fidelity Synthwave)
// ═══════════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ─── SCALES (semitone intervals from root) ───
    const SCALES = {
        aeolian:       [0, 2, 3, 5, 7, 8, 10],
        dorian:        [0, 2, 3, 5, 7, 9, 10],
        phrygian:      [0, 1, 3, 5, 7, 8, 10],
        harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
        mixolydian:    [0, 2, 4, 5, 7, 9, 10],
    };

    const ROOT = 65.41; // C2

    // Build a 7th chord from a root semitone offset within a given scale.
    // Stacks thirds: root → scale[deg+2] → scale[deg+4] → scale[deg+6]
    // Returns absolute semitone offsets from C.
    function buildChord(scale, rootSemi) {
        const norm = ((rootSemi % 12) + 12) % 12;
        let deg = -1;
        for (let i = 0; i < 7; i++) { if (scale[i] === norm) { deg = i; break; } }

        // Root not in scale → power chord fallback
        if (deg === -1) return [rootSemi, rootSemi + 7, rootSemi + 12];

        const intervals = [0];
        for (let k = 2; k <= 6; k += 2) {
            let iv = scale[(deg + k) % 7] - norm;
            if (iv <= 0) iv += 12;
            intervals.push(iv);
        }
        return intervals.map(iv => rootSemi + iv);
    }

    // Voice leading: find the closest octave for each note to minimize motion
    function voiceLead(prev, notes) {
        if (!prev) return notes;
        return notes.map((n, i) => {
            const p = prev[i] || n;
            let best = n, bestD = Infinity;
            for (let o = -2; o <= 2; o++) {
                const c = n + o * 12, d = Math.abs(c - p);
                if (d < bestD) { bestD = d; best = c; }
            }
            return best;
        });
    }

    // ─── PROGRESSIONS ───
    // Semitone offsets from root — FIXED regardless of scale.
    // The scale only changes chord voicing (3rd/7th quality), not the bass line.
    const PROGRESSIONS = [
        [0, 8, 10, 0],   // i – bVI – bVII – i      (THE progression)
        [0, 5, 10, 3],   // i – iv – bVII – bIII
        [0, 8, 5, 10],   // i – bVI – iv – bVII
        [0, 3, 8, 10],   // i – bIII – bVI – bVII
        [0, 1, 8, 10],   // i – bII – bVI – bVII     (Phrygian darkness)
        [0, 8, 7, 5],    // i – bVI – v – iv          (descending bass)
    ];

    // Weighted transition: exponential decay by distance in progression list
    function nextProg(idx) {
        const n = PROGRESSIONS.length;
        const w = PROGRESSIONS.map((_, i) => {
            const d = Math.min(Math.abs(i - idx), n - Math.abs(i - idx));
            return Math.pow(0.5, d);
        });
        const t = w.reduce((a, b) => a + b, 0);
        let r = Math.random() * t;
        for (let i = 0; i < n; i++) { r -= w[i]; if (r <= 0) return i; }
        return idx;
    }

    // ─── PHRASE DYNAMICS ───
    // 8-bar phrases: build → peak → release, with long-form arc over minutes
    function phraseIntensity(bar) {
        const len = 8, pos = bar % len, num = Math.floor(bar / len);
        const long = Math.min(1, num / 5) * 0.25;
        let arc;
        if (pos < 3) arc = 0.25 + 0.55 * (pos / 3);
        else if (pos < 6) arc = 0.8 + 0.2 * ((pos - 3) / 3);
        else arc = 1.0 - 0.45 * ((pos - 6) / 2);
        return clamp(arc * 0.75 + long, 0, 1);
    }

    function scaleFor(i) {
        if (i < 0.30) return SCALES.aeolian;
        if (i < 0.50) return SCALES.dorian;
        if (i < 0.70) return SCALES.mixolydian;
        if (i < 0.85) return SCALES.harmonicMinor;
        return SCALES.phrygian;
    }

    // ─── SATURATION CURVES ───
    // Tape: tanh models magnetic head compression naturally
    function tapeCurve(k) {
        const n = 65536, c = new Float32Array(n), norm = Math.tanh(k);
        for (let i = 0; i < n; i++) c[i] = Math.tanh(k * (i * 2 / n - 1)) / norm;
        return c;
    }
    // Soft clip: cubic with smooth knee
    function softCurve(d) {
        const n = 8192, c = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            const x = i * 2 / n - 1;
            c[i] = Math.abs(x) < 1 / d ? x * d
                 : (x > 0 ? 1 : -1) * (1 - 1 / (3 * d * d * x * x));
        }
        return c;
    }

    // ─── HALL REVERB IR ───
    // Pre-delay → early reflections (positioned in stereo) → RT60-shaped tail → air absorption
    function hallIR(actx, dur, preMs, rt60) {
        const sr = actx.sampleRate, pre = Math.floor(sr * preMs / 1000);
        const len = sr * dur, buf = actx.createBuffer(2, len, sr);
        const refs = [
            { ms: 11, g: .80, p: -.3 }, { ms: 19, g: .68, p: .4 },
            { ms: 23, g: .60, p: -.5 }, { ms: 29, g: .52, p: .2 },
            { ms: 37, g: .45, p: -.1 }, { ms: 41, g: .38, p: .6 },
            { ms: 48, g: .30, p: -.4 }, { ms: 53, g: .25, p: 0 },
        ];
        for (let ch = 0; ch < 2; ch++) {
            const d = buf.getChannelData(ch);
            for (const r of refs) {
                const idx = pre + Math.floor(r.ms * sr / 1000);
                const pg = ch === 0 ? Math.cos((r.p + 1) * .785) : Math.sin((r.p + 1) * .785);
                if (idx < len) d[idx] += (Math.random() * 2 - 1) * r.g * pg;
            }
            const ts = pre + Math.floor(.06 * sr);
            for (let i = ts; i < len; i++)
                d[i] += (Math.random() * 2 - 1) * Math.exp(-6.91 * ((i - ts) / sr) / rt60) * .45;
            // Air absorption: gentle lowpass that increases with distance
            let pv = 0;
            for (let i = ts; i < len; i++) {
                pv += .00015 * (d[i] - pv);
                d[i] = pv + (d[i] - pv) * Math.exp(-.0003 * (i - ts));
            }
        }
        return buf;
    }

    // ─── ENGINE STATE ───
    let ctx, master, comp, conv, revSend;
    let dlyNode, dlyFB, dlyFilt;
    let scComp; // sidechain
    let playing = false;
    const BPM = 110;
    let sd; // step duration
    let noiseBuf, engStart = 0;
    let padBus, bassBus, chimeBus, pluckBus, leadBus, drumBus, shimBus;
    let seq, nextS = 0, tid = null;
    let pIdx = 0, prevV = null, curV = null, lastLF = 0;

    // ─── INIT ───
    function init() {
        if (ctx) return;
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        sd = 60 / BPM / 4;

        // Master: comp → tape sat → air shelf → sub cut → analyser → gain → out
        comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -14; comp.knee.value = 12;
        comp.ratio.value = 3.5; comp.attack.value = .003; comp.release.value = .18;

        const mSat = ctx.createWaveShaper();
        mSat.curve = tapeCurve(1.8); mSat.oversample = '4x';

        const mAir = ctx.createBiquadFilter();
        mAir.type = 'highshelf'; mAir.frequency.value = 8000; mAir.gain.value = 1.5;

        const mSub = ctx.createBiquadFilter();
        mSub.type = 'highpass'; mSub.frequency.value = 28; mSub.Q.value = .7;

        master = ctx.createGain();
        master.gain.setValueAtTime(0, ctx.currentTime);
        master.gain.linearRampToValueAtTime(.35, ctx.currentTime + 4);

        const ana = ctx.createAnalyser();
        ana.fftSize = 512; ana.smoothingTimeConstant = .8;
        window.MateriaAnalyser = ana;

        comp.connect(mSat).connect(mAir).connect(mSub)
           .connect(ana).connect(master).connect(ctx.destination);

        // ── SIDECHAIN — pads/bass/lead duck on kick ──
        scComp = ctx.createDynamicsCompressor();
        scComp.threshold.value = -30; scComp.knee.value = 6;
        scComp.ratio.value = 8; scComp.attack.value = .001; scComp.release.value = .25;
        scComp.connect(comp);

        // ── REVERB ──
        revSend = ctx.createGain(); revSend.gain.value = .35;
        conv = ctx.createConvolver();
        conv.buffer = hallIR(ctx, 5.5, 25, 2.8);
        const rRet = ctx.createGain(); rRet.gain.value = .40;
        const rHP = ctx.createBiquadFilter(); rHP.type = 'highpass'; rHP.frequency.value = 300;
        const rLP = ctx.createBiquadFilter(); rLP.type = 'lowpass'; rLP.frequency.value = 6000; rLP.Q.value = .5;
        revSend.connect(conv).connect(rHP).connect(rLP).connect(rRet).connect(comp);

        // ── PING-PONG DELAY (dotted 8th) ──
        dlyNode = ctx.createDelay(2);
        dlyNode.delayTime.value = (60 / BPM) * .75;
        dlyFB = ctx.createGain(); dlyFB.gain.value = .38;
        dlyFilt = ctx.createBiquadFilter();
        dlyFilt.type = 'lowpass'; dlyFilt.frequency.value = 2800; dlyFilt.Q.value = .7;
        dlyNode.connect(dlyFB).connect(dlyFilt).connect(dlyNode);
        const dpL = ctx.createStereoPanner(); dpL.pan.value = -.6;
        const dpR = ctx.createStereoPanner(); dpR.pan.value = .6;
        dlyNode.connect(dpL).connect(comp);
        dlyNode.connect(dpR).connect(revSend);

        // ── SATURATION BUSES ──
        const drSat = ctx.createWaveShaper();
        drSat.curve = softCurve(2.5); drSat.oversample = '4x'; drSat.connect(comp);

        const bSat = ctx.createWaveShaper();
        bSat.curve = tapeCurve(3.0); bSat.oversample = '4x';
        const bLP = ctx.createBiquadFilter(); bLP.type = 'lowpass'; bLP.frequency.value = 200;
        bSat.connect(bLP).connect(comp);

        // ── AUDIO BUSES ──
        // Sidechained: pad, pluck, lead (duck on kick)
        padBus   = mkBus(.22, true, scComp);
        pluckBus = mkBus(.14, true, scComp, true);
        leadBus  = mkBus(.15, true, scComp, true);
        // Bass through tape sat
        bassBus  = mkBus(.40, false, bSat);
        // Drums through soft clip, also TRIGGER sidechain
        drumBus  = mkBus(.38, true, drSat);
        drumBus.connect(scComp);
        // Atmospheric bypass sidechain
        chimeBus = mkBus(.10, true, comp, true);
        shimBus  = mkBus(.06, true, comp);

        noiseBuf = mkNoise(2);
        engStart = ctx.currentTime;
    }

    function mkBus(v, rev, dest, dly) {
        const g = ctx.createGain(); g.gain.value = v;
        g.connect(dest || comp);
        if (rev) g.connect(revSend);
        if (dly) g.connect(dlyNode);
        return g;
    }

    function mkNoise(s) {
        const l = ctx.sampleRate * s, b = ctx.createBuffer(1, l, ctx.sampleRate);
        const d = b.getChannelData(0);
        for (let i = 0; i < l; i++) d[i] = Math.random() * 2 - 1;
        return b;
    }

    const pick = a => a[~~(Math.random() * a.length)];
    const lerp = (a, b, t) => a + (b - a) * t;
    const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;

    // ═══════════════════════════════════════════════════════════════
    // INSTRUMENTS
    // ═══════════════════════════════════════════════════════════════

    // ── 3-tap modulated chorus (for pads) ──
    function mkChorus(t, dur) {
        const inp = ctx.createGain(), out = ctx.createGain();
        inp.connect(out); // dry thru
        [[.40, .008, .003], [.60, .012, .004], [.35, .006, .0025]].forEach(([r, d, dp]) => {
            const dl = ctx.createDelay(.05); dl.delayTime.value = d;
            const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = r;
            const lg = ctx.createGain(); lg.gain.value = dp;
            const tg = ctx.createGain(); tg.gain.value = .5;
            lfo.connect(lg).connect(dl.delayTime);
            inp.connect(dl).connect(tg).connect(out);
            lfo.start(t); lfo.stop(t + dur + .5);
        });
        return { in: inp, out };
    }

    // ▸ PAD — Voiced 7th chords + chorus + filter ADSR + stereo LFO
    function playPad(t, scale, voicing, inten) {
        const dur = sd * 16, ch = mkChorus(t, dur);
        voicing.forEach((semi, ni) => {
            const freq = ROOT * Math.pow(2, semi / 12);
            [-7, 7].forEach(det => {
                const o = ctx.createOscillator();
                o.type = 'sawtooth'; o.frequency.value = freq;
                o.detune.value = det + (Math.random() - .5) * 3;

                // Filter with proper ADSR shape
                const f = ctx.createBiquadFilter(); f.type = 'lowpass';
                const atk = lerp(600, 1800, inten), sus = lerp(400, 1200, inten);
                f.frequency.setValueAtTime(atk * .3, t);
                f.frequency.exponentialRampToValueAtTime(atk, t + dur * .15);
                f.frequency.exponentialRampToValueAtTime(sus, t + dur * .5);
                f.frequency.exponentialRampToValueAtTime(sus * .6, t + dur);
                f.Q.value = lerp(.8, 2.5, inten);

                const e = ctx.createGain();
                const v = .045 / voicing.length;
                e.gain.setValueAtTime(0, t);
                e.gain.linearRampToValueAtTime(v, t + dur * .2);
                e.gain.setValueAtTime(v * .85, t + dur * .5);
                e.gain.linearRampToValueAtTime(0, t + dur);

                const p = ctx.createStereoPanner();
                const pl = ctx.createOscillator(); pl.type = 'sine';
                pl.frequency.value = .06 + ni * .025 + (det > 0 ? .015 : 0);
                const pg = ctx.createGain(); pg.gain.value = .7;
                pl.connect(pg).connect(p.pan);

                o.connect(f).connect(e).connect(p).connect(ch.in);
                pl.start(t); pl.stop(t + dur + .2);
                o.start(t); o.stop(t + dur + .2);
            });
        });
        ch.out.connect(padBus);
    }

    // ▸ SUB BASS — 808-style: 2-octave pitch sweep + click transient
    function playBass(t, rootSemi, inten) {
        const rf = ROOT * Math.pow(2, rootSemi / 12) * .5, dur = sd * 1.2;

        const sub = ctx.createOscillator(); sub.type = 'sine';
        sub.frequency.setValueAtTime(rf * 4, t);
        sub.frequency.exponentialRampToValueAtTime(rf, t + .06);
        const se = ctx.createGain();
        se.gain.setValueAtTime(0, t);
        se.gain.linearRampToValueAtTime(.65, t + .008);
        se.gain.exponentialRampToValueAtTime(.001, t + dur);

        // Click: short sine burst with saturation for edge
        const ck = ctx.createOscillator(); ck.type = 'sine';
        ck.frequency.setValueAtTime(rf * 8, t);
        ck.frequency.exponentialRampToValueAtTime(rf * 2, t + .008);
        const ce = ctx.createGain();
        ce.gain.setValueAtTime(.5, t);
        ce.gain.exponentialRampToValueAtTime(.001, t + .015);
        const cs = ctx.createWaveShaper(); cs.curve = softCurve(4); cs.oversample = '2x';

        sub.connect(se).connect(bassBus);
        ck.connect(ce).connect(cs).connect(bassBus);
        sub.start(t); sub.stop(t + dur + .05);
        ck.start(t); ck.stop(t + .02);
    }

    // ▸ FM BELLS — Chaigne & Askenfelt inharmonic partial model
    // Real bell partials: hum(1.0) prime(2.0) tierce(3.0) quint(4.2) nominal(5.4) super(6.8)
    // Each partial has its own decay rate (higher = faster) and amplitude (higher = quieter)
    function playBell(t, scale, rootSemi) {
        const rf = ROOT * Math.pow(2, rootSemi / 12);
        const notes = scale.map(s => rf * Math.pow(2, (s + 60) / 12));
        const base = pick(notes), dur = 3 + Math.random() * 2;

        const ratios = [1.0, 2.0, 3.0, 4.2, 5.4, 6.8];
        const decays = [dur, dur * .7, dur * .5, dur * .35, dur * .25, dur * .18];
        const amps   = [1.0, .60, .35, .20, .12, .08];

        const mg = ctx.createGain(); mg.gain.value = .15;
        ratios.forEach((r, i) => {
            const o = ctx.createOscillator(); o.type = 'sine';
            o.frequency.value = base * r;
            o.detune.value = (Math.random() - .5) * 4; // slight per-partial wander
            const e = ctx.createGain();
            e.gain.setValueAtTime(0, t);
            e.gain.linearRampToValueAtTime(amps[i], t + .003);
            e.gain.exponentialRampToValueAtTime(.001, t + decays[i]);
            o.connect(e).connect(mg);
            o.start(t); o.stop(t + decays[i] + .05);
        });
        const p = ctx.createStereoPanner(); p.pan.value = (Math.random() - .5) * 1.4;
        mg.connect(p).connect(chimeBus);
    }

    // ▸ ARP PLUCK — Sawtooth through resonant lowpass with punchy filter envelope
    function playPluck(t, scale, rootSemi, step, inten) {
        const rf = ROOT * Math.pow(2, rootSemi / 12);
        const sf = scale.map(s => rf * Math.pow(2, (s + 36) / 12));
        const oct = step % 8 >= 4 ? 2 : 0;
        const freq = sf[step % sf.length] * Math.pow(2, oct / 12);
        const dur = sd * 1.5;

        const o = ctx.createOscillator(); o.type = 'sawtooth';
        o.frequency.value = freq; o.detune.value = (Math.random() - .5) * 5;

        // Punchy filter envelope: instant open → fast close
        const f = ctx.createBiquadFilter(); f.type = 'lowpass';
        const pk = lerp(3000, 6000, inten);
        f.frequency.setValueAtTime(pk, t);
        f.frequency.exponentialRampToValueAtTime(pk * .15, t + dur * .7);
        f.Q.value = lerp(2, 5, inten);

        const e = ctx.createGain();
        e.gain.setValueAtTime(0, t);
        e.gain.linearRampToValueAtTime(.18, t + .003);
        e.gain.exponentialRampToValueAtTime(.001, t + dur);

        const p = ctx.createStereoPanner(); p.pan.value = Math.sin(step * .8) * .8;
        o.connect(f).connect(e).connect(p).connect(pluckBus);
        o.start(t); o.stop(t + dur + .05);
    }

    // ▸ LEAD — Interval-dependent portamento + delayed vibrato + filter envelope
    function playLead(t, scale, rootSemi, inten) {
        const rf = ROOT * Math.pow(2, rootSemi / 12);
        const sf = scale.map(s => rf * Math.pow(2, (s + 48) / 12));

        // Prefer stepwise motion (60% chance) for melodic coherence
        let freq;
        if (lastLF > 0 && Math.random() < .6) {
            let best = sf[0], bd = Infinity;
            for (const f of sf) { const d = Math.abs(f - lastLF); if (d < bd && d > 10) { bd = d; best = f; } }
            freq = best;
        } else freq = pick(sf);

        const dur = sd * (4 + Math.random() * 4);
        const o = ctx.createOscillator(); o.type = 'sawtooth';

        // Glide time proportional to interval — octave jump glides slower than a step
        if (lastLF > 0) {
            const iv = Math.abs(Math.log2(freq / lastLF));
            const gl = clamp(iv * .15, .02, .25);
            o.frequency.setValueAtTime(lastLF, t);
            o.frequency.exponentialRampToValueAtTime(freq, t + gl);
        } else o.frequency.setValueAtTime(freq, t);
        lastLF = freq;

        // Vibrato with 200ms onset fade (human players don't vibrate instantly)
        const vl = ctx.createOscillator(); vl.type = 'sine'; vl.frequency.value = 5.5;
        const vg = ctx.createGain();
        vg.gain.setValueAtTime(0, t);
        vg.gain.linearRampToValueAtTime(6, t + .2);
        vg.gain.setValueAtTime(6, t + dur * .7);
        vg.gain.linearRampToValueAtTime(0, t + dur);
        vl.connect(vg).connect(o.frequency);

        // Filter envelope: punchy attack → slow release
        const f = ctx.createBiquadFilter(); f.type = 'lowpass';
        f.frequency.setValueAtTime(800, t);
        f.frequency.exponentialRampToValueAtTime(lerp(2500, 4500, inten), t + .04);
        f.frequency.exponentialRampToValueAtTime(lerp(1200, 2000, inten), t + dur * .5);
        f.frequency.exponentialRampToValueAtTime(600, t + dur);
        f.Q.value = 3;

        const e = ctx.createGain();
        e.gain.setValueAtTime(0, t);
        e.gain.linearRampToValueAtTime(.10, t + .02);
        e.gain.setValueAtTime(.08, t + dur * .6);
        e.gain.exponentialRampToValueAtTime(.001, t + dur);

        const p = ctx.createStereoPanner(); p.pan.value = (Math.random() - .5) * .5;
        o.connect(f).connect(e).connect(p).connect(leadBus);
        o.start(t); vl.start(t);
        o.stop(t + dur + .1); vl.stop(t + dur + .1);
    }

    // ▸ SHIMMER — Multi-octave staggered sine cluster with detuned copies
    function playShimmer(t, scale, rootSemi) {
        const rf = ROOT * Math.pow(2, rootSemi / 12);
        const sf = scale.map(s => rf * Math.pow(2, (s + 72) / 12));
        const base = pick(sf), dur = 4 + Math.random() * 3;

        const octs = [1, 1.003, 2, 2.002, .5];
        const amps = [.40, .25, .20, .10, .15];
        const mg = ctx.createGain(); mg.gain.value = .04;

        octs.forEach((oct, i) => {
            const o = ctx.createOscillator(); o.type = 'sine';
            o.frequency.value = base * oct;
            const e = ctx.createGain();
            const nd = dur * (.5 + Math.random() * .5);
            e.gain.setValueAtTime(0, t + i * .3); // staggered onset
            e.gain.linearRampToValueAtTime(amps[i], t + i * .3 + 1);
            e.gain.exponentialRampToValueAtTime(.001, t + i * .3 + nd);
            o.connect(e).connect(mg);
            o.start(t + i * .3); o.stop(t + i * .3 + nd + .05);
        });
        const p = ctx.createStereoPanner(); p.pan.value = (Math.random() - .5) * 1.6;
        mg.connect(p).connect(shimBus);
    }

    // ═══════════════════════════════════════════════════════════════
    // PHYSICALLY-MODELED DRUMS
    // ═══════════════════════════════════════════════════════════════

    // ▸ KICK — Transient/sustain split + noise texture layer
    function playKick(t) {
        // Transient: sine sweep from 150→45Hz (the "thwack")
        const tr = ctx.createOscillator(); tr.type = 'sine';
        tr.frequency.setValueAtTime(150, t);
        tr.frequency.exponentialRampToValueAtTime(45, t + .08);
        const te = ctx.createGain();
        te.gain.setValueAtTime(.9, t);
        te.gain.exponentialRampToValueAtTime(.001, t + .12);

        // Sub sustain: pure sine that rings at fundamental
        const su = ctx.createOscillator(); su.type = 'sine';
        su.frequency.setValueAtTime(56, t);
        su.frequency.exponentialRampToValueAtTime(42, t + .05);
        const se = ctx.createGain();
        se.gain.setValueAtTime(0, t);
        se.gain.linearRampToValueAtTime(.7, t + .005);
        se.gain.exponentialRampToValueAtTime(.001, t + .35);

        // Noise texture: short burst of filtered noise for attack grit
        const n = ctx.createBufferSource(); n.buffer = noiseBuf;
        const nf = ctx.createBiquadFilter(); nf.type = 'lowpass';
        nf.frequency.setValueAtTime(4000, t);
        nf.frequency.exponentialRampToValueAtTime(200, t + .03);
        const ne = ctx.createGain();
        ne.gain.setValueAtTime(.15, t);
        ne.gain.exponentialRampToValueAtTime(.001, t + .025);

        tr.connect(te).connect(drumBus);
        su.connect(se).connect(drumBus);
        n.connect(nf).connect(ne).connect(drumBus);
        tr.start(t); tr.stop(t + .15);
        su.start(t); su.stop(t + .4);
        n.start(t); n.stop(t + .03);
    }

    // ▸ SNARE — Noise body + multi-mode shell resonances + comb-filter snare wire buzz
    function playSnare(t) {
        // Noise body (the "crack")
        const n = ctx.createBufferSource(); n.buffer = noiseBuf;
        const nf = ctx.createBiquadFilter(); nf.type = 'bandpass';
        nf.frequency.value = 4000; nf.Q.value = .8;
        const ne = ctx.createGain();
        ne.gain.setValueAtTime(.28, t);
        ne.gain.exponentialRampToValueAtTime(.001, t + .18);
        n.connect(nf).connect(ne).connect(drumBus);

        // Shell resonances — a real snare shell has multiple distinct modes
        // (fundamental, 2nd mode, 3rd mode at different frequencies and decay rates)
        [{ f: 200, a: .18, d: .08 }, { f: 380, a: .10, d: .06 }, { f: 570, a: .06, d: .04 }]
            .forEach(m => {
                const o = ctx.createOscillator(); o.type = 'sine';
                o.frequency.value = m.f + (Math.random() - .5) * 10;
                const e = ctx.createGain();
                e.gain.setValueAtTime(m.a, t);
                e.gain.exponentialRampToValueAtTime(.001, t + m.d);
                o.connect(e).connect(drumBus);
                o.start(t); o.stop(t + m.d + .01);
            });

        // Snare wire buzz — comb-filtered noise simulates the strands
        // vibrating against the bottom head (creates periodic buzz at ~220Hz)
        const wn = ctx.createBufferSource(); wn.buffer = noiseBuf;
        const cd = ctx.createDelay(.01); cd.delayTime.value = 1 / 220;
        const cf = ctx.createGain(); cf.gain.value = .7;
        const cb = ctx.createBiquadFilter(); cb.type = 'bandpass';
        cb.frequency.value = 220; cb.Q.value = 3;
        const we = ctx.createGain();
        we.gain.setValueAtTime(.12, t);
        we.gain.exponentialRampToValueAtTime(.001, t + .12);
        wn.connect(cb).connect(cd).connect(cf).connect(cd); // feedback loop
        cd.connect(we).connect(drumBus);
        n.start(t); n.stop(t + .2);
        wn.start(t); wn.stop(t + .15);
    }

    // ▸ HI-HAT — Metallic comb-filtered noise (not just highpass)
    // Real hi-hats are metal cymbals: inharmonic partials created by
    // standing waves in a disc. Simulated with parallel comb filters
    // at non-harmonic frequencies.
    function playHat(t, open) {
        const n = ctx.createBufferSource(); n.buffer = noiseBuf;
        const mg = ctx.createGain();

        // 5 inharmonic metal partials via comb filters
        [820, 1340, 2460, 3800, 5600].forEach(pf => {
            const cd = ctx.createDelay(.005); cd.delayTime.value = 1 / pf;
            const cf = ctx.createGain(); cf.gain.value = open ? .50 : .35;
            const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
            bp.frequency.value = pf; bp.Q.value = 5;
            const tg = ctx.createGain(); tg.gain.value = .03;
            n.connect(bp).connect(cd).connect(cf).connect(cd); // comb loop
            cd.connect(tg).connect(mg);
        });

        const dur = open ? lerp(.12, .20, Math.random()) : lerp(.03, .06, Math.random());
        const vel = (open ? .08 : .05) * (.8 + Math.random() * .4);
        const e = ctx.createGain();
        e.gain.setValueAtTime(vel, t);
        e.gain.exponentialRampToValueAtTime(.001, t + dur);
        const p = ctx.createStereoPanner(); p.pan.value = (Math.random() - .5) * .5;
        mg.connect(e).connect(p).connect(drumBus);
        n.start(t); n.stop(t + dur + .01);
    }

    // ▸ FILL — Toms descending into rapid snare hits (phrase endings)
    function playFill(t) {
        [120, 95].forEach((tf, i) => {
            const ft = t + i * sd;
            const o = ctx.createOscillator(); o.type = 'sine';
            o.frequency.setValueAtTime(tf * 2, ft);
            o.frequency.exponentialRampToValueAtTime(tf, ft + .05);
            const e = ctx.createGain();
            e.gain.setValueAtTime(.5, ft);
            e.gain.exponentialRampToValueAtTime(.001, ft + .2);
            o.connect(e).connect(drumBus);
            o.start(ft); o.stop(ft + .25);
        });
        playSnare(t + 2 * sd);
        playSnare(t + 3 * sd);
    }

    // ═══════════════════════════════════════════════════════════════
    // SEQUENCER
    // ═══════════════════════════════════════════════════════════════

    function* runSeq() {
        let step = 0, bar = 0;
        while (true) {
            const inten = phraseIntensity(bar);
            const scale = scaleFor(inten);

            // Change progression every 4 bars
            if (step === 0 && bar % 4 === 0) pIdx = nextProg(pIdx);

            // Build chord voicing every bar (voice-led from previous)
            if (step === 0) {
                const prog = PROGRESSIONS[pIdx];
                const root = prog[bar % prog.length];
                const raw = buildChord(scale, root);
                prevV = curV;
                curV = voiceLead(prevV, raw);
            }

            const chordRoot = PROGRESSIONS[pIdx][bar % PROGRESSIONS[pIdx].length];
            const isFill = bar % 8 === 7;
            const inFill = isFill && step >= 12;

            const L = {
                pad:   inten > .00,
                bass:  inten > .10,
                pluck: inten > .22,
                drum:  inten > .28,
                bell:  inten > .45,
                lead:  inten > .60,
                shim:  inten > .30,
            };

            // ── Rhythmic patterns ──
            const kick = L.drum && !inFill &&
                (step === 0 || step === 8 || step === 10 || (step === 15 && Math.random() < .3));
            const snare = L.drum && !inFill && (step === 4 || step === 12);
            const hat = L.drum && !inFill &&
                (step % 2 === 0 || (step % 4 === 1 && Math.random() < .35));
            const hatOpen = hat && (step === 2 || step === 6 || step === 10 || step === 14);

            // Bass: 3 cycling 16th-note patterns
            const bPats = [
                [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,1,0,0],
                [1,0,0,1, 0,1,0,1, 1,0,0,1, 0,1,0,0],
                [1,1,0,1, 1,0,1,1, 1,1,0,1, 1,0,1,0],
            ];
            const bass = L.bass && !inFill && bPats[bar % 3][step];

            // Plucks: syncopated 16ths (avoid downbeat for groove)
            const pluck = L.pluck && !inFill && (step % 4 !== 0 || Math.random() < .4);

            // Atmospheric: stochastic
            const bell = L.bell && Math.random() < .12;
            const shim = L.shim && Math.random() < .10;

            // Lead: strong beats with some randomness
            const lead = L.lead && !inFill &&
                (step === 0 || step === 6 || step === 12) && Math.random() < .65;

            const fill = isFill && step === 12;

            yield { step, bar, inten, scale, chordRoot, curV, L,
                    kick, snare, hat, hatOpen, bass, pluck, bell, shim, lead, fill };

            step = (step + 1) % 16;
            if (step === 0) bar++;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // PRECISION SCHEDULER
    // ═══════════════════════════════════════════════════════════════

    function schedule() {
        // Recover from tab throttling
        if (nextS < ctx.currentTime - .12) nextS = ctx.currentTime + .05;
        while (nextS < ctx.currentTime + .12) {
            const s = seq.next().value;
            const t = Math.max(nextS, ctx.currentTime);

            if (s.L.pad && s.step === 0 && s.bar % 2 === 0)
                playPad(t, s.scale, s.curV, s.inten);
            if (s.bass)  playBass(t, s.chordRoot, s.inten);
            if (s.pluck) playPluck(t, s.scale, s.chordRoot, s.step, s.inten);
            if (s.lead)  playLead(t, s.scale, s.chordRoot, s.inten);
            if (s.bell)  playBell(t, s.scale, s.chordRoot);
            if (s.shim)  playShimmer(t, s.scale, s.chordRoot);
            if (s.kick)  playKick(t);
            if (s.snare) playSnare(t);
            if (s.hat)   playHat(t, s.hatOpen);
            if (s.fill)  playFill(t);

            nextS += sd;
        }
    }

    function loop() { schedule(); tid = setTimeout(loop, 25); }

    // ─── PUBLIC API (drop-in compatible) ───
    function start() {
        if (playing) return;
        init();
        if (ctx.state === 'suspended') ctx.resume();
        playing = true;
        pIdx = 0; prevV = null; curV = null; lastLF = 0;
        engStart = ctx.currentTime; nextS = ctx.currentTime;
        seq = runSeq();
        loop();
    }

    function stop() {
        playing = false;
        if (tid) clearTimeout(tid);
        tid = null;
        if (master) master.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.5);
    }

    window.MateriaMusic13 = { start, stop };
})();
