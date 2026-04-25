/**
 * effects.js
 * ═══════════════════════════════════════════════════════════════
 * MATERIA SOLUTIONS — Reality Modifiers & Visual Phenomena
 * A collection of high-fidelity interactive effects triggered by
 * a minimalist dot-button HUD. 
 * ═══════════════════════════════════════════════════════════════
 */

(function () {
    'use strict';

    const CONFIG = {
        primaryColor: 'rgba(0, 255, 255, 0.8)',
        secondaryColor: 'rgba(255, 0, 255, 0.8)',
        whiteColor: 'rgba(255, 255, 255, 0.9)'
    };

    // --- State ---
    let isGlitching = false;

    // --- UI Creation ---
    function createHUD() {
        const hud = document.createElement('div');
        hud.id = 'materia-effects-hud';
        hud.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 15px;
            z-index: 99998;
            pointer-events: auto;
            background: rgba(0,0,0,0.2);
            padding: 10px 20px;
            border-radius: 20px;
            backdrop-filter: blur(5px);
            border: 1px solid rgba(255,255,255,0.05);
        `;

        const effects = [
            { name: 'Glitch', color: CONFIG.secondaryColor, action: triggerGlitch },
            { name: 'Warp', color: CONFIG.primaryColor, action: triggerWarp },
            { name: 'Pulse', color: CONFIG.whiteColor, action: triggerPulse },
            { name: 'Rain', color: CONFIG.primaryColor, action: triggerRain },
            { name: 'Invert', color: '#ffcc00', action: triggerInvert },
            { name: 'Kaleido', color: '#00ff88', action: triggerKaleido },
            { name: 'Vortex', color: '#ff3366', action: triggerVortex },
            { name: 'Pixel', color: '#99ff33', action: triggerPixelate },
            { name: 'Ghost', color: '#3366ff', action: triggerGhosting },
            { name: 'Void', color: '#000000', action: triggerVoidHole }
        ];

        effects.forEach(eff => {
            const dot = document.createElement('button');
            dot.className = 'effect-dot';
            dot.title = eff.name;
            dot.style.cssText = `
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background: ${eff.color};
                border: 1px solid rgba(255,255,255,0.2);
                cursor: pointer;
                box-shadow: 0 0 8px ${eff.color};
                transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                padding: 0;
            `;

            dot.addEventListener('mouseenter', () => {
                dot.style.transform = 'scale(2.2)';
                dot.style.boxShadow = `0 0 15px ${eff.color}, 0 0 30px ${eff.color}`;
            });
            dot.addEventListener('mouseleave', () => {
                dot.style.transform = 'scale(1)';
                dot.style.boxShadow = `0 0 8px ${eff.color}`;
            });
            dot.addEventListener('click', () => {
                eff.action();
                dot.style.transform = 'scale(0.8)';
                setTimeout(() => dot.style.transform = 'scale(2.2)', 100);
            });

            hud.appendChild(dot);
        });

        document.body.appendChild(hud);

        // Add CSS for Effects
        const style = document.createElement('style');
        style.textContent = `
            @keyframes materia-glitch-anim {
                0% { transform: translate(0); }
                20% { transform: translate(-5px, 5px) skew(2deg); filter: hue-rotate(90deg); }
                40% { transform: translate(5px, -5px) skew(-2deg); filter: hue-rotate(180deg); }
                60% { transform: translate(-5px, -5px) skew(1deg); filter: hue-rotate(270deg); }
                80% { transform: translate(5px, 5px) skew(-1deg); filter: hue-rotate(360deg); }
                100% { transform: translate(0); }
            }
            .materia-glitch-active {
                animation: materia-glitch-anim 0.2s infinite;
            }
            .pulse-overlay {
                position: fixed;
                top: 0; left: 0; width: 100vw; height: 100vh;
                background: radial-gradient(circle at center, #fff 0%, transparent 70%);
                pointer-events: none;
                z-index: 100001;
                opacity: 0;
                mix-blend-mode: overlay;
            }
            #rain-canvas {
                position: fixed;
                top: 0; left: 0; width: 100vw; height: 100vh;
                z-index: 99997;
                pointer-events: none;
                opacity: 0;
                transition: opacity 1s ease;
            }
            .materia-kaleido {
                display: grid !important;
                grid-template-columns: 1fr 1fr;
                grid-template-rows: 1fr 1fr;
                transform: scale(0.5);
                transform-origin: top left;
                width: 200vw !important;
                height: 200vh !important;
            }
            .materia-pixelate {
                filter: blur(2px) contrast(200%) brightness(150%);
                image-rendering: pixelated;
                transform: scale(0.1);
                transform-origin: center center;
                transition: transform 0.5s steps(4);
            }
        `;
        document.head.appendChild(style);
    }

    // --- Effect Logic ---

    function getTargets() {
        return [
            document.getElementById('canvas-container'),
            document.getElementById('webgl-container'),
            document.querySelector('.relative.z-10'),
            document.getElementById('materiaCanvas')
        ].filter(el => el !== null);
    }

    function triggerGlitch() {
        if (isGlitching) return;
        isGlitching = true;
        const targets = getTargets();
        targets.forEach(t => t.classList.add('materia-glitch-active'));
        const strobe = document.createElement('div');
        strobe.style.cssText = `position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(255, 255, 255, 0.1); z-index: 100002; pointer-events: none;`;
        document.body.appendChild(strobe);
        setTimeout(() => {
            targets.forEach(t => t.classList.remove('materia-glitch-active'));
            strobe.remove();
            isGlitching = false;
        }, 1200);
    }

    function triggerWarp() {
        const targets = getTargets();
        targets.forEach(t => {
            t.style.transition = 'transform 0.8s cubic-bezier(0.19, 1, 0.22, 1), filter 0.8s ease';
            t.style.transform = 'scale(1.4) rotate(5deg)';
            t.style.filter = 'blur(15px) contrast(200%) brightness(120%)';
        });
        setTimeout(() => {
            targets.forEach(t => {
                t.style.transform = 'scale(1) rotate(0deg)';
                t.style.filter = 'blur(0px) contrast(100%) brightness(100%)';
            });
        }, 800);
    }

    function triggerPulse() {
        const pulse = document.createElement('div');
        pulse.className = 'pulse-overlay';
        document.body.appendChild(pulse);
        const mouseX = window.lastMouseX || window.innerWidth / 2;
        const mouseY = window.lastMouseY || window.innerHeight / 2;
        pulse.style.background = `radial-gradient(circle at ${mouseX}px ${mouseY}px, #fff 0%, transparent 70%)`;
        requestAnimationFrame(() => {
            pulse.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
            pulse.style.opacity = '1';
            pulse.style.transform = 'scale(3)';
        });
        setTimeout(() => {
            pulse.style.opacity = '0';
            setTimeout(() => pulse.remove(), 600);
        }, 100);
    }

    function triggerRain() {
        let canvas = document.getElementById('rain-canvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'rain-canvas';
            document.body.appendChild(canvas);
        }
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth; canvas.height = window.innerHeight;
        canvas.style.opacity = '1';
        const dots = [];
        for (let i = 0; i < 150; i++) {
            dots.push({ x: Math.random() * canvas.width, y: Math.random() * -canvas.height, v: 8 + Math.random() * 12, l: 15 + Math.random() * 25 });
        }
        let frame = 0;
        function draw() {
            if (canvas.style.opacity === '0') return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = CONFIG.primaryColor;
            dots.forEach(d => { ctx.fillRect(d.x, d.y, 2, d.l); d.y += d.v; if (d.y > canvas.height) d.y = -d.l; });
            frame++;
            if (frame < 300) requestAnimationFrame(draw);
            else canvas.style.opacity = '0';
        }
        draw();
    }

    function triggerInvert() {
        document.documentElement.style.transition = 'filter 0.5s cubic-bezier(0.19, 1, 0.22, 1)';
        document.documentElement.style.filter = 'invert(1) hue-rotate(180deg)';
        setTimeout(() => {
            document.documentElement.style.filter = 'invert(0) hue-rotate(0deg)';
        }, 1000);
    }

    function triggerKaleido() {
        const targets = getTargets();
        targets.forEach(t => t.classList.add('materia-kaleido'));
        setTimeout(() => {
            targets.forEach(t => t.classList.remove('materia-kaleido'));
        }, 2000);
    }

    function triggerVortex() {
        const targets = getTargets();
        targets.forEach(t => {
            t.style.transition = 'transform 2s cubic-bezier(0.16, 1, 0.3, 1), filter 2s ease';
            t.style.transform = 'rotate(1080deg) scale(0)';
            t.style.filter = 'blur(20px)';
        });
        setTimeout(() => {
            targets.forEach(t => {
                t.style.transform = 'rotate(0deg) scale(1)';
                t.style.filter = 'blur(0px)';
            });
        }, 2200);
    }

    function triggerPixelate() {
        const targets = getTargets();
        targets.forEach(t => {
            t.style.transition = 'none';
            t.style.imageRendering = 'pixelated';
            t.style.transform = 'scale(0.05)';
        });
        setTimeout(() => {
            targets.forEach(t => {
                t.style.transition = 'transform 0.5s ease-out';
                t.style.transform = 'scale(1)';
            });
            setTimeout(() => {
                targets.forEach(t => t.style.imageRendering = 'auto');
            }, 500);
        }, 1000);
    }

    function triggerGhosting() {
        const targets = getTargets();
        targets.forEach(t => {
            t.style.transition = 'opacity 0.2s ease';
            t.style.opacity = '0.4';
        });
        
        let count = 0;
        const interval = setInterval(() => {
            targets.forEach(t => t.style.opacity = count % 2 === 0 ? '0.4' : '0.8');
            count++;
            if (count > 10) {
                clearInterval(interval);
                targets.forEach(t => t.style.opacity = '1');
            }
        }, 100);
    }

    function triggerVoidHole() {
        const hole = document.createElement('div');
        hole.style.cssText = `
            position: fixed; top: 50%; left: 50%; width: 0; height: 0;
            background: #000; border-radius: 50%; transform: translate(-50%, -50%);
            z-index: 100005; pointer-events: none; box-shadow: 0 0 100px #000;
            transition: all 1s cubic-bezier(0.16, 1, 0.3, 1);
        `;
        document.body.appendChild(hole);
        
        requestAnimationFrame(() => {
            hole.style.width = '150vw';
            hole.style.height = '150vh';
        });

        setTimeout(() => {
            hole.style.opacity = '0';
            setTimeout(() => hole.remove(), 1000);
        }, 1500);
    }

    // --- Global Helpers ---
    window.addEventListener('mousemove', (e) => {
        window.lastMouseX = e.clientX;
        window.lastMouseY = e.clientY;
    });

    // --- Initialization ---
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        createHUD();
    } else {
        window.addEventListener('DOMContentLoaded', createHUD);
    }

})();
