// animator.js
// ═══════════════════════════════════════════════════════════════
// MATERIA SOLUTIONS — Procedural Store Animator
// Periodically scrambles card names to cookies, shuffles their
// positions with FLIP animations, mutates the hero banner,
// and injects random micro-glitch distortions between cycles.
// ═══════════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ─── CONFIGURATION ───
    const HOLD_NORMAL    = 16000;  // ms in normal state before transition
    const HOLD_ALT       = 11000;  // ms in cookie state before transition back
    const SCRAMBLE_MS    = 1800;   // ms for full text decode animation
    const CASCADE_MS     = 120;    // stagger delay between each card's scramble
    const FLIP_MS        = 900;    // card position animation duration
    const FLIP_DELAY     = 500;    // ms into transition before shuffle triggers
    const MICRO_MIN_MS   = 2800;   // min ms between micro-glitches
    const MICRO_MAX_MS   = 6500;   // max ms between micro-glitches
    const MICRO_HOLD_MS  = 120;    // how long a micro-glitch distortion holds

    // Decode cipher characters (mix of Latin, Katakana, symbols)
    const CIPHER = 'ABCDEFGHJKLMNPRSTUVWXYZアイウエオカキクケコサシスセソ0123456789#%&@ξΣΩ';

    // ─── ALTERNATE NAME SETS ───
    const COOKIE_SET = [
        { main: 'SNICKER',  sub: 'DOODLE',  badge: 'FRESH' },
        { main: 'CHOCO',    sub: 'CHIP',     badge: 'HOT' },
        { main: 'RED',      sub: 'VELVET',   badge: 'WARM' },
        { main: 'MACARON',  sub: 'ROYALE',   badge: 'CRISPY' },
        { main: 'SUGAR',    sub: 'COOKIE',   badge: 'CHEWY' },
        { main: 'BROWNIE',  sub: 'BITE',     badge: 'GLAZED' },
    ];

    const HERO_ALT = {
        tag:   'Freshly Baked',
        title: 'MEGA COOKIE',
        sub:   "GRANDMA'S RECIPE | BATCH-42",
    };

    const HEADER_ALT = 'Cookie Division';

    // ─── ENGINE STATE ───
    let cards       = [];      // DOM card elements
    let origData    = [];      // { mainEl, subEl, badgeEl, main, sub, badge }
    let heroEls     = {};      // { tagEl, titleEl, subEl }
    let heroOrig    = {};      // { tag, title, sub }
    let headerSubEl = null;
    let headerOrig  = '';
    let isAlt       = false;
    let busy        = false;
    let microTimer  = null;
    let cycleTimer  = null;

    // ─── UTILITY ───
    function randChar() {
        return CIPHER[Math.floor(Math.random() * CIPHER.length)];
    }

    function randRange(min, max) {
        return min + Math.random() * (max - min);
    }

    // ─── TEXT SCRAMBLE / DECODE ───
    // Each character "locks in" from left to right with random cipher
    // characters cycling in the unlocked positions.
    function scrambleText(el, target, duration) {
        return new Promise(resolve => {
            if (!el) { resolve(); return; }
            const t0     = performance.now();
            const source = el.textContent.trim();
            const len    = Math.max(source.length, target.length);

            function tick() {
                const t = Math.min((performance.now() - t0) / duration, 1);
                let out = '';
                for (let i = 0; i < len; i++) {
                    // Staggered unlock: earlier chars resolve first
                    const unlock = (t - (i / len) * 0.55) / 0.45;
                    if (unlock >= 1) {
                        out += target[i] || '';
                    } else if (unlock > 0) {
                        out += randChar();
                    } else {
                        out += source[i] || ' ';
                    }
                }
                el.textContent = out;
                if (t < 1) {
                    requestAnimationFrame(tick);
                } else {
                    el.textContent = target;
                    resolve();
                }
            }
            requestAnimationFrame(tick);
        });
    }

    // ─── FLIP POSITION SHUFFLE ───
    // Uses the FLIP technique (First, Last, Invert, Play) with CSS
    // grid `order` property to smoothly animate cards to new positions.
    function flipShuffle(doShuffle) {
        if (cards.length === 0) return;
        const parent = cards[0].parentElement;

        // FIRST — record current positions
        const firsts = cards.map(c => c.getBoundingClientRect());

        if (doShuffle) {
            // Fisher-Yates shuffle for order indices
            const indices = cards.map((_, i) => i);
            for (let i = indices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [indices[i], indices[j]] = [indices[j], indices[i]];
            }
            indices.forEach((origIdx, pos) => {
                cards[origIdx].style.order = pos;
            });
        } else {
            // Reset to document order
            cards.forEach(c => { c.style.order = ''; });
        }

        // Force synchronous reflow so new positions are calculated
        void parent.offsetHeight;

        // LAST — record new positions
        const lasts = cards.map(c => c.getBoundingClientRect());

        // INVERT + PLAY
        cards.forEach((card, i) => {
            const dx = firsts[i].left - lasts[i].left;
            const dy = firsts[i].top  - lasts[i].top;

            if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

            // Snap to old position instantly
            card.style.transition = 'none';
            card.style.transform  = `translate(${dx}px, ${dy}px)`;

            // Double rAF to ensure the browser paints the inverted state
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    // Animate to natural position with overshoot bounce
                    card.style.transition = `transform ${FLIP_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
                    card.style.transform  = '';
                });
            });
        });

        // Cleanup inline styles after animation settles
        setTimeout(() => {
            cards.forEach(card => {
                card.style.transition = '';
                card.style.transform  = '';
            });
        }, FLIP_MS + 100);
    }

    // ─── SCAN LINE SWEEP ───
    // A thin luminous bar sweeps top-to-bottom during transitions.
    function fireScanLine() {
        const line = document.createElement('div');
        line.className = 'anim-scanline';
        document.body.appendChild(line);
        setTimeout(() => line.remove(), 2200);
    }

    // ─── EDGE FLASH ───
    // Brief colored border flash on all cards during transition.
    function pulseCards(entering) {
        cards.forEach((card, i) => {
            setTimeout(() => {
                card.classList.add('anim-pulse');
                setTimeout(() => card.classList.remove('anim-pulse'), 600);
            }, i * 60);
        });
    }

    // ─── MICRO-GLITCH SYSTEM ───
    // Random brief distortions on individual cards between main cycles.
    function startMicroGlitches() {
        function doGlitch() {
            if (busy) { scheduleMicro(); return; }

            const idx  = Math.floor(Math.random() * cards.length);
            const card = cards[idx];
            const data = origData[idx];
            if (!card || !data) { scheduleMicro(); return; }

            // Save current text
            const savedMain = data.mainEl.textContent;

            // Apply random visual distortion
            card.style.transition = 'none';
            const fx = [
                `skewX(${(Math.random() - 0.5) * 8}deg)`,
                `scale(${0.93 + Math.random() * 0.12})`,
                `translateX(${(Math.random() - 0.5) * 12}px)`,
                `rotate(${(Math.random() - 0.5) * 3}deg)`,
            ];
            card.style.transform = fx[Math.floor(Math.random() * fx.length)];

            // Brief text scramble on main name
            let glitched = '';
            for (const ch of savedMain) {
                glitched += Math.random() < 0.35 ? randChar() : ch;
            }
            data.mainEl.textContent = glitched;

            // Snap back after brief hold
            setTimeout(() => {
                card.style.transition = 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)';
                card.style.transform  = '';
                data.mainEl.textContent = savedMain;
                setTimeout(() => { card.style.transition = ''; }, 300);
            }, MICRO_HOLD_MS + Math.random() * 80);

            scheduleMicro();
        }

        function scheduleMicro() {
            microTimer = setTimeout(doGlitch, randRange(MICRO_MIN_MS, MICRO_MAX_MS));
        }

        scheduleMicro();
    }

    // ─── MAIN TRANSITION ───
    async function transitionTo(goAlt) {
        if (busy) return;
        busy = true;

        // Fire visual FX
        fireScanLine();
        pulseCards(goAlt);

        // Determine target names
        const nameSet = goAlt
            ? COOKIE_SET
            : origData.map(d => ({ main: d.main, sub: d.sub, badge: d.badge }));

        // Cascade text scramble across cards
        const cardPromises = origData.map((data, i) => {
            return new Promise(resolve => {
                setTimeout(async () => {
                    await Promise.all([
                        scrambleText(data.mainEl,  nameSet[i].main,  SCRAMBLE_MS),
                        scrambleText(data.subEl,   nameSet[i].sub,   SCRAMBLE_MS * 0.65),
                        scrambleText(data.badgeEl, nameSet[i].badge, SCRAMBLE_MS * 0.45),
                    ]);
                    resolve();
                }, i * CASCADE_MS);
            });
        });

        // Scramble hero banner
        if (heroEls.titleEl) {
            const hTarget = goAlt ? HERO_ALT : heroOrig;
            scrambleText(heroEls.tagEl,   hTarget.tag,   SCRAMBLE_MS * 0.6);
            scrambleText(heroEls.titleEl, hTarget.title, SCRAMBLE_MS);
            scrambleText(heroEls.subEl,   hTarget.sub,   SCRAMBLE_MS * 0.8);
        }

        // Scramble header subtitle
        if (headerSubEl) {
            scrambleText(headerSubEl, goAlt ? HEADER_ALT : headerOrig, SCRAMBLE_MS * 0.5);
        }

        // Trigger FLIP shuffle partway through the text decode
        setTimeout(() => flipShuffle(goAlt), FLIP_DELAY);

        await Promise.all(cardPromises);

        isAlt = goAlt;
        busy  = false;
    }

    // ─── CYCLE LOOP ───
    function runCycle() {
        cycleTimer = setTimeout(async () => {
            await transitionTo(true);           // → cookie mode

            cycleTimer = setTimeout(async () => {
                await transitionTo(false);      // → normal mode
                runCycle();                      // loop
            }, HOLD_ALT);

        }, HOLD_NORMAL);
    }

    // ─── INJECT CSS ───
    function injectStyles() {
        const s = document.createElement('style');
        s.textContent = `
            /* ── Scan Line Sweep ── */
            .anim-scanline {
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 3px;
                background: linear-gradient(90deg,
                    transparent 0%,
                    rgba(180, 140, 255, 0.6) 30%,
                    rgba(100, 220, 255, 0.5) 50%,
                    rgba(255, 200, 150, 0.4) 70%,
                    transparent 100%
                );
                z-index: 99998;
                pointer-events: none;
                animation: animScanSweep 1.8s ease-in-out forwards;
                filter: blur(1px);
                box-shadow:
                    0 0 15px rgba(180, 140, 255, 0.4),
                    0 0 40px rgba(100, 220, 255, 0.15);
            }
            @keyframes animScanSweep {
                0%   { top: -4px; opacity: 0; }
                8%   { opacity: 1; }
                85%  { opacity: 0.8; }
                100% { top: calc(100vh + 4px); opacity: 0; }
            }

            /* ── Card Pulse on Transition ── */
            .anim-pulse {
                animation: animCardPulse 0.6s ease-out forwards !important;
            }
            @keyframes animCardPulse {
                0%   { box-shadow: 0 0 0 0 rgba(180, 140, 255, 0.5); }
                50%  { box-shadow: 0 0 25px 4px rgba(100, 220, 255, 0.3); }
                100% { box-shadow: 0 8px 32px rgba(0, 0, 0, 0.03); }
            }

            /* ── Ensure FLIP transforms don't fight CSS hover ── */
            .flower-card {
                will-change: transform, box-shadow;
            }
        `;
        document.head.appendChild(s);
    }

    // ─── DISCOVER DOM ELEMENTS ───
    function discoverElements() {
        cards = Array.from(document.querySelectorAll('.flower-card'));
        if (cards.length === 0) return false;

        // Card children: [0] main name, [1] subtitle, [2] status badge
        cards.forEach(card => {
            const ch = card.children;
            origData.push({
                mainEl:  ch[0] || null,
                subEl:   ch[1] || null,
                badgeEl: ch[2] || null,
                main:    ch[0]?.textContent.trim() || '',
                sub:     ch[1]?.textContent.trim() || '',
                badge:   ch[2]?.textContent.trim() || '',
            });
        });

        // Hero banner elements
        const h2 = document.querySelector('h2');
        if (h2) {
            const heroContainer = h2.closest('.absolute');
            heroEls.titleEl = h2;
            heroEls.subEl   = h2.nextElementSibling;
            // The "Limited Availability" span tag
            heroEls.tagEl   = heroContainer?.querySelector('span');

            heroOrig.title = h2.textContent.trim();
            heroOrig.sub   = heroEls.subEl?.textContent.trim() || '';
            heroOrig.tag   = heroEls.tagEl?.textContent.trim() || '';
        }

        // Header subtitle ("Advanced Flora Division")
        const headerDivs = document.querySelectorAll('header .tracking-widest');
        headerSubEl = headerDivs[headerDivs.length - 1] || null;
        headerOrig  = headerSubEl?.textContent.trim() || '';

        return true;
    }

    // ─── BOOT ───
    function boot() {
        if (!discoverElements()) return;
        injectStyles();
        startMicroGlitches();
        runCycle();
    }

    // Wait for page to be fully ready (fonts, layout, WebGL init)
    if (document.readyState === 'complete') {
        setTimeout(boot, 1500);
    } else {
        window.addEventListener('load', () => setTimeout(boot, 1500));
    }

    // Expose for debug / external control
    window.MateriaAnimator = {
        toCookies: () => transitionTo(true),
        toNormal:  () => transitionTo(false),
        isActive:  () => !busy,
    };

})();
