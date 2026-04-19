// switcher.js
// ═══════════════════════════════════════════════════════════════
// MATERIA SOLUTIONS — Polarity Switcher
// Randomly polarizes the Omen (white→black) and Entity
// (black→white) by inverting their render layers. The light
// komorebi background flips to a dark void and vice versa.
// Each switch fires with a brief luminous flash and smooth
// CSS filter transitions. Fully autonomous, fully unsettling.
// ═══════════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ─── CONFIGURATION ───
    const MIN_INTERVAL   = 10000;  // min ms between polarity switches
    const MAX_INTERVAL   = 30000;  // max ms between polarity switches
    const TRANSITION_MS  = 2200;   // smooth inversion transition duration
    const FLASH_DURATION = 200;    // brief flash overlay duration
    const GLITCH_FRAMES  = 4;      // number of rapid micro-flickers before settling
    const GLITCH_MS      = 60;     // ms per micro-flicker frame
    const BOOT_DELAY     = 6000;   // ms after load before first possible switch

    // ─── STATE ───
    let isPolarized = false;
    let switchTimer = null;
    let isTransitioning = false;

    // ─── INIT ───
    function init() {
        injectStyles();
        scheduleSwitch();
    }

    // ─── INJECT CSS ───
    function injectStyles() {
        const s = document.createElement('style');
        s.textContent = `
            /* ── Polarity transition on WebGL layers ── */
            #webgl-container canvas {
                transition: filter ${TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1),
                            opacity 0.3s ease;
            }
            #entity-canvas {
                transition: filter ${TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1),
                            opacity 0.3s ease;
            }

            /* Polarized state — full color inversion */
            #webgl-container canvas.polarized {
                filter: invert(1) hue-rotate(180deg);
            }
            #entity-canvas.polarized {
                filter: invert(1) hue-rotate(180deg);
            }

            /* ── Micro-glitch flicker class ── */
            #webgl-container canvas.glitch-flicker {
                filter: invert(1) contrast(1.5) brightness(1.3);
                transition: none !important;
            }
            #entity-canvas.glitch-flicker {
                filter: invert(1) contrast(1.5) brightness(1.3);
                transition: none !important;
            }

            /* ── Flash overlay during polarity switch ── */
            .polarity-flash {
                position: fixed;
                top: 0; left: 0;
                width: 100vw;
                height: 100vh;
                z-index: 2;
                pointer-events: none;
                opacity: 0;
            }
            .polarity-flash.to-dark {
                background: radial-gradient(circle at 50% 50%,
                    rgba(0, 0, 0, 0.8),
                    rgba(20, 0, 40, 0.4) 50%,
                    transparent 80%
                );
                animation: flashToDark ${FLASH_DURATION * 2.5}ms ease-out forwards;
            }
            .polarity-flash.to-light {
                background: radial-gradient(circle at 50% 50%,
                    rgba(255, 255, 255, 0.9),
                    rgba(255, 240, 220, 0.4) 50%,
                    transparent 80%
                );
                animation: flashToLight ${FLASH_DURATION * 2.5}ms ease-out forwards;
            }

            @keyframes flashToDark {
                0%   { opacity: 0; transform: scale(0.8); }
                25%  { opacity: 1; transform: scale(1.0); }
                100% { opacity: 0; transform: scale(1.3); }
            }
            @keyframes flashToLight {
                0%   { opacity: 0; transform: scale(0.8); }
                25%  { opacity: 1; transform: scale(1.0); }
                100% { opacity: 0; transform: scale(1.3); }
            }

            /* ── Scanline sweep during switch ── */
            .polarity-scan {
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 4px;
                z-index: 3;
                pointer-events: none;
                animation: polarScanSweep 1.2s ease-in-out forwards;
                filter: blur(1px);
            }
            .polarity-scan.to-dark {
                background: linear-gradient(90deg,
                    transparent 0%,
                    rgba(80, 0, 160, 0.7) 30%,
                    rgba(0, 0, 0, 0.9) 50%,
                    rgba(80, 0, 160, 0.7) 70%,
                    transparent 100%
                );
                box-shadow: 0 0 20px rgba(80, 0, 160, 0.5);
            }
            .polarity-scan.to-light {
                background: linear-gradient(90deg,
                    transparent 0%,
                    rgba(255, 220, 180, 0.6) 30%,
                    rgba(255, 255, 255, 0.9) 50%,
                    rgba(255, 220, 180, 0.6) 70%,
                    transparent 100%
                );
                box-shadow: 0 0 20px rgba(255, 200, 140, 0.4);
            }
            @keyframes polarScanSweep {
                0%   { top: -4px; opacity: 0; }
                10%  { opacity: 1; }
                85%  { opacity: 0.7; }
                100% { top: calc(100vh + 4px); opacity: 0; }
            }
        `;
        document.head.appendChild(s);
    }

    // ─── GET CANVAS ELEMENTS ───
    function getCanvases() {
        const omenCanvas = document.querySelector('#webgl-container canvas');
        const entityCanvas = document.getElementById('entity-canvas');
        return { omenCanvas, entityCanvas };
    }

    // ─── MICRO-GLITCH FLICKER ───
    // Rapid flicker before the smooth transition settles
    function microGlitch(callback) {
        const { omenCanvas, entityCanvas } = getCanvases();
        let frame = 0;

        function flicker() {
            if (frame >= GLITCH_FRAMES) {
                // Remove glitch class, let normal transition take over
                if (omenCanvas) omenCanvas.classList.remove('glitch-flicker');
                if (entityCanvas) entityCanvas.classList.remove('glitch-flicker');
                if (callback) callback();
                return;
            }

            const on = frame % 2 === 0;
            if (omenCanvas) omenCanvas.classList.toggle('glitch-flicker', on);
            if (entityCanvas) entityCanvas.classList.toggle('glitch-flicker', on);

            frame++;
            setTimeout(flicker, GLITCH_MS + Math.random() * GLITCH_MS * 0.5);
        }

        flicker();
    }

    // ─── FIRE FLASH OVERLAY ───
    function fireFlash(goingDark) {
        const flash = document.createElement('div');
        flash.className = `polarity-flash ${goingDark ? 'to-dark' : 'to-light'}`;
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), FLASH_DURATION * 3);
    }

    // ─── FIRE SCANLINE ───
    function fireScanline(goingDark) {
        const scan = document.createElement('div');
        scan.className = `polarity-scan ${goingDark ? 'to-dark' : 'to-light'}`;
        document.body.appendChild(scan);
        setTimeout(() => scan.remove(), 1500);
    }

    // ─── POLARIZE ───
    function polarize() {
        if (isTransitioning) return;
        isTransitioning = true;

        const goingDark = !isPolarized;
        const { omenCanvas, entityCanvas } = getCanvases();

        // Phase 1: Micro-glitch flicker
        microGlitch(() => {
            // Phase 2: Fire visual effects
            fireFlash(goingDark);
            fireScanline(goingDark);

            // Phase 3: Apply smooth polarity transition
            if (omenCanvas) omenCanvas.classList.toggle('polarized', goingDark);
            if (entityCanvas) entityCanvas.classList.toggle('polarized', goingDark);

            isPolarized = goingDark;

            // Unlock after transition completes
            setTimeout(() => {
                isTransitioning = false;
            }, TRANSITION_MS + 200);
        });

        // Schedule the next switch
        scheduleSwitch();
    }

    // ─── SCHEDULE ───
    function scheduleSwitch() {
        if (switchTimer) clearTimeout(switchTimer);
        const delay = MIN_INTERVAL + Math.random() * (MAX_INTERVAL - MIN_INTERVAL);
        switchTimer = setTimeout(polarize, delay);
    }

    // ─── BOOT ───
    function boot() {
        // Wait for both canvases to exist
        const check = setInterval(() => {
            const { omenCanvas } = getCanvases();
            if (omenCanvas) {
                clearInterval(check);
                init();
            }
        }, 500);

        // Safety timeout — initialize anyway after BOOT_DELAY
        setTimeout(() => {
            clearInterval(check);
            init();
        }, BOOT_DELAY);
    }

    if (document.readyState === 'complete') {
        setTimeout(boot, 1000);
    } else {
        window.addEventListener('load', () => setTimeout(boot, 1000));
    }

    // ─── PUBLIC API ───
    window.MateriaSwitcher = {
        toggle:       polarize,
        isPolarized:  () => isPolarized,
        setInterval:  (minMs, maxMs) => {
            MIN_INTERVAL = minMs;
            MAX_INTERVAL = maxMs;
            scheduleSwitch();
        },
    };

})();
