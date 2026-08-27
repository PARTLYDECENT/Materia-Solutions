// manipulation.js
// ═══════════════════════════════════════════════════════════════════════════
// MATERIA COOKIES — Entity Card Corruption & Tentacle Arm Manipulation
// The living background entity reaches out, grabs cards, drags them behind
// into the dark void layer, corrupts their data, and wraps its limbs around
// the storefront layout as if hanging onto them.
// ═══════════════════════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ─── CORRUPTION DICTIONARY ───
    const CORRUPT_VARIANTS = {
        'Scarlet Spice': { name: 'VOID SPICE 👾', pill: '🔮 Abyssal Cacao', badge: 'CORRUPTED', glow: 'rgba(168, 85, 247, 0.6)' },
        'Cyber Mint':    { name: 'GLITCH MINT 🧬', pill: '⚡ Neural Crisp', badge: 'MALFUNCTION', glow: 'rgba(0, 255, 200, 0.6)' },
        'Void Cocoa':    { name: 'SINGULARITY 💀', pill: '🌌 Event Horizon', badge: 'BLACK HOLE', glow: 'rgba(128, 0, 255, 0.7)' },
        'Aero Lemon':    { name: 'HYPER AERO 🌀', pill: '💥 Vacuum Burst', badge: 'UNSTABLE', glow: 'rgba(100, 200, 255, 0.6)' },
        'Prism Sugar':   { name: 'DARK PRISM 🔮', pill: '👁️ Void Reflection', badge: 'CORRUPTED', glow: 'rgba(236, 72, 153, 0.6)' },
        'Ghost Frost':   { name: 'CRYO PHANTOM ❄️', pill: '💀 Absolute Zero', badge: 'STASIS LOCK', glow: 'rgba(56, 189, 248, 0.6)' },
        'Gravity Fudge': { name: 'MASS COLLAPSE 🪐', pill: '🕳️ Core Density', badge: 'CRUSHED', glow: 'rgba(100, 100, 140, 0.7)' },
        'Neural Berry':  { name: 'SYNAPTIC SHOCK 🧠', pill: '⚡ Overload Pulse', badge: 'CORRUPTED', glow: 'rgba(244, 63, 94, 0.6)' },
        'Plasma Toffee': { name: 'DARK PLASMA 💥', pill: '🔥 Solar Flare', badge: 'HAZARD', glow: 'rgba(245, 158, 11, 0.6)' },
        'Quantum Matcha':{ name: 'ENTANGLED MATCHA 🌀', pill: '🍵 Quantum Decay', badge: 'SHIFTED', glow: 'rgba(16, 185, 129, 0.6)' },
        'Magma Cinnamon':{ name: 'CORRUPTED MAGMA 🌋', pill: '🔥 Volcanic Ash', badge: 'SUPERHEATED', glow: 'rgba(239, 68, 68, 0.6)' },
        'Diamond Shortbread': { name: 'FRACTURED GOLD 💎', pill: '✨ Broken Crystal', badge: 'SHATTERED', glow: 'rgba(6, 182, 212, 0.6)' },
        'Chrono Vanilla':{ name: 'CHRONO DECAY ⏳', pill: '🔮 Time Warp', badge: 'TIMELOCK', glow: 'rgba(234, 179, 8, 0.6)' },
        'Bio Horizon':   { name: 'MUTANT HORIZON 🧬', pill: '☣️ Gene Rupture', badge: 'MUTATED', glow: 'rgba(20, 184, 166, 0.6)' },
        'Solar Macadamia':{ name: 'SOLAR ECLIPSE 🌑', pill: '☀️ Dark Photon', badge: 'BURNT', glow: 'rgba(249, 115, 22, 0.6)' },
        'Dark Matter':   { name: 'ABYSS REAPER 💀', pill: '🌌 Singularity', badge: 'CONSUMED', glow: 'rgba(147, 51, 234, 0.8)' }
    };

    // ─── TENTACLE CANVAS SYSTEM ───
    let canvas, ctx;
    let tentacles = [];
    let isEmbracing = false;
    let embraceProgress = 0;

    function initCanvas() {
        canvas = document.createElement('canvas');
        canvas.id = 'manipulation-canvas';
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100vw';
        canvas.style.height = '100vh';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '5'; // Sitting just behind UI elements & cards
        document.body.appendChild(canvas);

        ctx = canvas.getContext('2d');
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }

    function resizeCanvas() {
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    // ─── PROCEDURAL TENTACLE ARM CLASS ───
    class TentacleArm {
        constructor(startX, startY, targetX, targetY, thickness, segments) {
            this.startX = startX;
            this.startY = startY;
            this.targetX = targetX;
            this.targetY = targetY;
            this.thickness = thickness;
            this.numSegments = segments || 18;
            this.phase = Math.random() * Math.PI * 2;
            this.speed = 0.03 + Math.random() * 0.02;
            this.curl = (Math.random() - 0.5) * 1.5;
            this.life = 0; // 0 to 1
            this.targetLife = 1;
        }

        update() {
            this.phase += this.speed;
            this.life += (this.targetLife - this.life) * 0.05;
        }

        draw(ctx) {
            if (this.life <= 0.01) return;

            const currentLengthX = (this.targetX - this.startX) * this.life;
            const currentLengthY = (this.targetY - this.startY) * this.life;

            ctx.save();
            ctx.beginPath();

            let currX = this.startX;
            let currY = this.startY;
            ctx.moveTo(currX, currY);

            const points = [];
            for (let i = 0; i <= this.numSegments; i++) {
                const t = i / this.numSegments;
                const wave = Math.sin(this.phase + t * 4) * (25 * (1 - t));
                const wave2 = Math.cos(this.phase * 0.8 + t * 3) * (15 * (1 - t));

                const px = this.startX + currentLengthX * t + wave + Math.sin(t * Math.PI) * 40 * this.curl;
                const py = this.startY + currentLengthY * t + wave2;

                points.push({ x: px, y: py, r: this.thickness * (1 - t * 0.7) });
            }

            // Draw tapered organic tentacle outline
            for (let i = 0; i < points.length - 1; i++) {
                const p1 = points[i];
                const p2 = points[i + 1];
                const xc = (p1.x + p2.x) / 2;
                const yc = (p1.y + p2.y) / 2;
                ctx.quadraticCurveTo(p1.x, p1.y, xc, yc);
            }

            ctx.lineWidth = this.thickness * this.life;
            ctx.lineCap = 'round';
            ctx.strokeStyle = 'rgba(8, 6, 15, 0.92)';
            ctx.shadowColor = 'rgba(168, 85, 247, 0.4)';
            ctx.shadowBlur = 16;
            ctx.stroke();

            // Inner dark core
            ctx.lineWidth = (this.thickness * 0.5) * this.life;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
            ctx.shadowBlur = 0;
            ctx.stroke();

            // Suction cup details along tentacle
            for (let i = 2; i < points.length - 2; i += 3) {
                const p = points[i];
                ctx.beginPath();
                ctx.arc(p.x, p.y, Math.max(1, p.r * 0.4), 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(168, 85, 247, 0.35)';
                ctx.fill();
            }

            ctx.restore();
        }
    }

    // ─── CARD ABDUCTION & CORRUPTION ENGINE ───
    let isAbducting = false;

    function corruptRandomCard() {
        if (isAbducting) return;
        const cards = Array.from(document.querySelectorAll('.flower-card:not(.is-corrupt-animating)'));
        if (!cards.length) return;

        const card = cards[Math.floor(Math.random() * cards.length)];
        const cardNameEl = card.querySelector('.text-3xl, .text-4xl');
        const originalName = cardNameEl ? cardNameEl.textContent.trim() : '';

        // Match original full specimen name
        const originalKey = Object.keys(CORRUPT_VARIANTS).find(k => k.toLowerCase().includes(originalName.toLowerCase())) || 'Scarlet Spice';
        const corruptData = CORRUPT_VARIANTS[originalKey] || { name: 'CORRUPTED 👾', pill: '🔮 Void Core', badge: 'CORRUPTED', glow: 'rgba(168, 85, 247, 0.7)' };

        isAbducting = true;
        card.classList.add('is-corrupt-animating');

        // Create Abduction Tentacle reaching for this specific card
        const rect = card.getBoundingClientRect();
        const cardCenterX = rect.left + rect.width / 2;
        const cardCenterY = rect.top + rect.height / 2;

        const grabArm = new TentacleArm(
            window.innerWidth / 2 + (Math.random() - 0.5) * 400,
            window.innerHeight + 100,
            cardCenterX,
            cardCenterY,
            24,
            22
        );
        tentacles.push(grabArm);

        // Phase 1: Arm reaches & pulls card into the background void
        card.style.transition = 'all 0.8s cubic-bezier(0.6, -0.28, 0.735, 0.045)';
        card.style.transform = 'perspective(1000px) translateZ(-220px) scale(0.7) rotateY(180deg) rotateX(15deg)';
        card.style.opacity = '0.35';
        card.style.filter = 'brightness(0.2) hue-rotate(180deg) blur(4px)';

        // Flash screen glitch filter
        triggerScreenGlitch();

        // Phase 2: Card is corrupted in the background (1.2s delay)
        setTimeout(() => {
            // Apply Corrupted Data
            if (cardNameEl) cardNameEl.textContent = corruptData.name.split(' ')[0];
            const subTitleEl = card.querySelector('.text-xs.tracking-widest');
            if (subTitleEl && corruptData.name.split(' ')[1]) {
                subTitleEl.textContent = corruptData.name.split(' ').slice(1).join(' ');
            }

            const pillEl = card.querySelector('.flavor-pill');
            if (pillEl) pillEl.textContent = corruptData.pill;

            const badgeEl = card.querySelector('.mt-auto');
            if (badgeEl) {
                badgeEl.textContent = corruptData.badge;
                badgeEl.style.borderColor = corruptData.glow;
                badgeEl.style.color = '#c084fc';
                badgeEl.style.background = 'rgba(168, 85, 247, 0.15)';
            }

            card.style.boxShadow = `0 0 45px ${corruptData.glow}, inset 0 0 20px ${corruptData.glow}`;
            card.classList.add('card-corrupted');

            // Retract Grab Arm
            grabArm.targetLife = 0;
        }, 1200);

        // Phase 3: Card returns to grid corrupted and glitching
        setTimeout(() => {
            card.style.transition = 'all 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            card.style.transform = 'perspective(1000px) translateZ(0px) scale(1) rotateY(0deg) rotateX(0deg)';
            card.style.opacity = '1';
            card.style.filter = 'none';

            // Remove animation lock
            setTimeout(() => {
                card.classList.remove('is-corrupt-animating');
                isAbducting = false;
                tentacles = tentacles.filter(t => t !== grabArm);
            }, 800);
        }, 2200);
    }

    // ─── SCREEN GLITCH EFFECT ───
    function triggerScreenGlitch() {
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.background = 'rgba(168, 85, 247, 0.06)';
        overlay.style.backdropFilter = 'contrast(1.4) hue-rotate(90deg)';
        overlay.style.zIndex = '999999';
        overlay.style.pointerEvents = 'none';
        document.body.appendChild(overlay);

        setTimeout(() => {
            overlay.remove();
        }, 150);
    }

    // ─── MULTI-ARM EMBRACE ENGINE ("Hanging onto cards") ───
    function triggerArmEmbrace() {
        if (isEmbracing) return;
        isEmbracing = true;

        const mainGrid = document.querySelector('main');
        if (!mainGrid) return;
        const rect = mainGrid.getBoundingClientRect();

        tentacles = [];

        // Spawn 8 tentacles creeping from edges of the grid
        const spawnPoints = [
            { x: rect.left - 50, y: rect.top + 50, tx: rect.left + 250, ty: rect.top + 150 },
            { x: rect.right + 50, y: rect.top + 80, tx: rect.right - 250, ty: rect.top + 180 },
            { x: rect.left - 50, y: rect.bottom - 50, tx: rect.left + 300, ty: rect.bottom - 200 },
            { x: rect.right + 50, y: rect.bottom - 80, tx: rect.right - 300, ty: rect.bottom - 220 },
            { x: rect.left + rect.width / 2, y: rect.top - 60, tx: rect.left + rect.width / 2, ty: rect.top + 300 },
            { x: rect.left + rect.width / 2, y: rect.bottom + 60, tx: rect.left + rect.width / 2, ty: rect.bottom - 300 },
            { x: rect.left - 60, y: rect.top + rect.height / 2, tx: rect.left + 350, ty: rect.top + rect.height / 2 },
            { x: rect.right + 60, y: rect.top + rect.height / 2, tx: rect.right - 350, ty: rect.top + rect.height / 2 },
        ];

        spawnPoints.forEach(pt => {
            const arm = new TentacleArm(pt.x, pt.y, pt.tx, pt.ty, 28, 24);
            tentacles.push(arm);
        });

        // Hold embrace for 4.5 seconds then retract
        setTimeout(() => {
            tentacles.forEach(arm => arm.targetLife = 0);
            setTimeout(() => {
                tentacles = [];
                isEmbracing = false;
            }, 1500);
        }, 4500);
    }

    // ─── RENDER LOOP ───
    function renderLoop() {
        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            tentacles.forEach(t => {
                t.update();
                t.draw(ctx);
            });
        }
        requestAnimationFrame(renderLoop);
    }

    // ─── AUTOMATIC BACKGROUND TIMERS ───
    function startAutoSchedule() {
        // Random abduction every 16 - 32 seconds
        setInterval(() => {
            if (Math.random() < 0.75) {
                corruptRandomCard();
            }
        }, 22000);

        // Random multi-arm embrace every 25 - 45 seconds
        setInterval(() => {
            if (Math.random() < 0.6) {
                triggerArmEmbrace();
            }
        }, 32000);
    }

    // ─── INIT & PUBLIC API ───
    function init() {
        initCanvas();
        startAutoSchedule();
        requestAnimationFrame(renderLoop);

        // Public API
        window.CardManipulation = {
            corruptRandomCard: corruptRandomCard,
            triggerArmEmbrace: triggerArmEmbrace,
            CORRUPT_VARIANTS: CORRUPT_VARIANTS
        };
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        init();
    } else {
        window.addEventListener('DOMContentLoaded', init);
    }
})();
