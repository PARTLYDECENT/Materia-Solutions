// narrator.js
// Ethereal on-screen typing narrator with Web Audio API synth per character

(function () {
    const MESSAGE = "Welcome to Materia Solutions — the only place to find the sacred cookies and mini trucks you so desire. Enjoy, team.";
    const CHAR_DELAY = 55;       // ms between characters
    const START_DELAY = 1200;    // ms before narration begins
    const FADE_OUT_DELAY = 4000; // ms after typing finishes before fading away

    // ─── Build DOM Overlay ───
    const overlay = document.createElement('div');
    overlay.id = 'narrator-overlay';
    overlay.innerHTML = `
        <div id="narrator-box">
            <div id="narrator-text"><span id="narrator-cursor">▌</span></div>
        </div>
    `;
    document.body.appendChild(overlay);

    // ─── Inject Styles ───
    const style = document.createElement('style');
    style.textContent = `
        #narrator-overlay {
            position: fixed;
            bottom: 0; left: 0;
            width: 100%; height: auto;
            z-index: 9999;
            pointer-events: none;
            display: flex;
            justify-content: center;
            padding: 32px 24px;
            opacity: 0;
            transition: opacity 1.5s ease;
        }
        #narrator-overlay.visible {
            opacity: 1;
        }
        #narrator-overlay.fading {
            opacity: 0;
            transition: opacity 2.5s ease;
        }

        #narrator-box {
            max-width: 680px;
            width: 100%;
            padding: 20px 28px;
            background: rgba(0, 0, 0, 0.35);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            box-shadow:
                0 0 40px rgba(180, 140, 255, 0.06),
                0 0 80px rgba(100, 200, 255, 0.04),
                inset 0 0 30px rgba(255, 255, 255, 0.02);
        }

        #narrator-text {
            font-family: 'Noto Sans JP', 'Montserrat', sans-serif;
            font-weight: 300;
            font-size: 14px;
            letter-spacing: 0.12em;
            line-height: 1.8;
            color: rgba(255, 255, 255, 0.85);
            text-shadow: 0 0 12px rgba(180, 200, 255, 0.3);
            min-height: 1.8em;
        }

        #narrator-cursor {
            display: inline;
            animation: cursorBlink 0.6s steps(2) infinite;
            color: rgba(180, 200, 255, 0.7);
            font-weight: 200;
            margin-left: 1px;
        }

        @keyframes cursorBlink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    // ─── Web Audio Synth Engine ───
    let audioCtx = null;
    let masterGain = null;

    function initAudio() {
        if (audioCtx) return;
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0.12;

        // Soft reverb via delay feedback
        const delay = audioCtx.createDelay(0.5);
        delay.delayTime.value = 0.08;
        const feedback = audioCtx.createGain();
        feedback.gain.value = 0.15;
        const reverbFilter = audioCtx.createBiquadFilter();
        reverbFilter.type = 'lowpass';
        reverbFilter.frequency.value = 3000;

        masterGain.connect(audioCtx.destination);
        masterGain.connect(delay);
        delay.connect(feedback);
        feedback.connect(reverbFilter);
        reverbFilter.connect(delay);
        delay.connect(audioCtx.destination);
    }

    // Pentatonic + ethereal note pool (Hz)
    const NOTES = [
        261.63, 293.66, 329.63, 392.00, 440.00,  // C4 D4 E4 G4 A4
        523.25, 587.33, 659.25, 783.99, 880.00,  // C5 D5 E5 G5 A5
        1046.50, 1174.66                           // C6 D6
    ];

    // Special punctuation tones
    const PUNCT_LOW = [130.81, 164.81, 196.00];   // C3 E3 G3

    function playCharSound(char) {
        if (!audioCtx) return;
        const now = audioCtx.currentTime;

        if (char === ' ') return; // silence on space

        const isPunct = /[.,—!?;:]/.test(char);
        const isUpper = char === char.toUpperCase() && /[A-Z]/.test(char);

        // Pick note
        let freq;
        if (isPunct) {
            freq = PUNCT_LOW[Math.floor(Math.random() * PUNCT_LOW.length)];
        } else {
            freq = NOTES[Math.floor(Math.random() * NOTES.length)];
        }

        // Primary tone — triangle for soft ethereal feel
        const osc = audioCtx.createOscillator();
        osc.type = isPunct ? 'sine' : 'triangle';
        osc.frequency.value = freq;

        // Gentle detune for shimmer
        osc.detune.value = (Math.random() - 0.5) * 20;

        const env = audioCtx.createGain();
        env.gain.setValueAtTime(0, now);
        env.gain.linearRampToValueAtTime(isPunct ? 0.25 : 0.18, now + 0.01);
        env.gain.exponentialRampToValueAtTime(0.001, now + (isPunct ? 0.4 : 0.15));

        // Filter for warmth
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = isPunct ? 1200 : 2800;
        filter.Q.value = isPunct ? 2 : 1;

        osc.connect(filter);
        filter.connect(env);
        env.connect(masterGain);

        osc.start(now);
        osc.stop(now + 0.5);

        // Harmonic overtone layer on uppercase / start of words
        if (isUpper || Math.random() < 0.15) {
            const osc2 = audioCtx.createOscillator();
            osc2.type = 'sine';
            osc2.frequency.value = freq * 2; // octave up
            osc2.detune.value = (Math.random() - 0.5) * 30;

            const env2 = audioCtx.createGain();
            env2.gain.setValueAtTime(0, now);
            env2.gain.linearRampToValueAtTime(0.06, now + 0.02);
            env2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

            osc2.connect(env2);
            env2.connect(masterGain);
            osc2.start(now);
            osc2.stop(now + 0.3);
        }

        // Occasional low sub-bloom on random chars
        if (Math.random() < 0.08) {
            const sub = audioCtx.createOscillator();
            sub.type = 'sine';
            sub.frequency.value = freq * 0.25;

            const subEnv = audioCtx.createGain();
            subEnv.gain.setValueAtTime(0, now);
            subEnv.gain.linearRampToValueAtTime(0.1, now + 0.03);
            subEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

            sub.connect(subEnv);
            subEnv.connect(masterGain);
            sub.start(now);
            sub.stop(now + 0.7);
        }
    }

    // Completion chime — soft ascending arpeggio
    function playCompletionChime() {
        if (!audioCtx) return;
        const now = audioCtx.currentTime;
        const chimeNotes = [523.25, 659.25, 783.99, 1046.50, 1318.51];

        chimeNotes.forEach((freq, i) => {
            const t = now + i * 0.12;
            const osc = audioCtx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;

            const env = audioCtx.createGain();
            env.gain.setValueAtTime(0, t);
            env.gain.linearRampToValueAtTime(0.1, t + 0.03);
            env.gain.exponentialRampToValueAtTime(0.001, t + 1.5);

            osc.connect(env);
            env.connect(masterGain);
            osc.start(t);
            osc.stop(t + 1.6);
        });
    }

    // ─── Typing Engine ───
    function runNarration() {
        initAudio();

        const textEl = document.getElementById('narrator-text');
        const cursorEl = document.getElementById('narrator-cursor');

        // Show overlay
        setTimeout(() => {
            overlay.classList.add('visible');
        }, 100);

        let i = 0;

        function typeNext() {
            if (i >= MESSAGE.length) {
                // Done typing
                playCompletionChime();
                setTimeout(() => {
                    cursorEl.style.display = 'none';
                }, 800);
                setTimeout(() => {
                    overlay.classList.add('fading');
                }, FADE_OUT_DELAY);
                setTimeout(() => {
                    overlay.remove();
                }, FADE_OUT_DELAY + 3000);
                return;
            }

            const char = MESSAGE[i];

            // Insert character before cursor
            const span = document.createElement('span');
            span.textContent = char;
            span.style.opacity = '0';
            span.style.transition = 'opacity 0.3s ease';
            textEl.insertBefore(span, cursorEl);

            // Fade character in
            requestAnimationFrame(() => {
                span.style.opacity = '1';
            });

            // Play sound
            playCharSound(char);

            i++;

            // Variable timing for natural feel
            let delay = CHAR_DELAY;
            if (char === '.' || char === '—') delay = CHAR_DELAY * 6;
            else if (char === ',') delay = CHAR_DELAY * 3;
            else if (char === ' ') delay = CHAR_DELAY * 1.2;

            setTimeout(typeNext, delay);
        }

        setTimeout(typeNext, START_DELAY);
    }

    // ─── Start on first user interaction (audio policy) ───
    let started = false;
    function tryStart() {
        if (started) return;
        started = true;
        runNarration();
        document.removeEventListener('click', tryStart);
        document.removeEventListener('touchstart', tryStart);
        document.removeEventListener('mousemove', tryStart);
    }

    // Also auto-start if audio context doesn't require gesture
    if (document.readyState === 'complete') {
        setTimeout(tryStart, 500);
    } else {
        window.addEventListener('load', () => setTimeout(tryStart, 500));
    }
    document.addEventListener('click', tryStart);
    document.addEventListener('touchstart', tryStart, { passive: true });
    document.addEventListener('mousemove', tryStart, { once: true });

})();
