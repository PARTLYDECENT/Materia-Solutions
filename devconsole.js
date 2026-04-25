/**
 * devconsole.js
 * ═══════════════════════════════════════════════════════════════
 * MATERIA SOLUTIONS — Developer & Explorer Console
 * A premium, user-friendly interface to control the project's
 * generative systems and explore the hidden layers of Materia.
 * ═══════════════════════════════════════════════════════════════
 */

(function () {
    'use strict';

    // --- State & Config ---
    let isOpen = false;
    let activeTab = 'audio';

    const CONFIG = {
        primaryColor: 'rgba(0, 255, 255, 0.8)',
        secondaryColor: 'rgba(255, 0, 255, 0.8)',
        glassBg: 'rgba(10, 10, 15, 0.85)',
        glassBorder: 'rgba(255, 255, 255, 0.15)',
        font: "'Montserrat', sans-serif"
    };

    // --- UI Creation ---
    function createUI() {
        // Main Container
        const container = document.createElement('div');
        container.id = 'materia-dev-console';
        container.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.9);
            width: 90%;
            max-width: 800px;
            height: 80%;
            max-height: 600px;
            background: ${CONFIG.glassBg};
            backdrop-filter: blur(25px);
            -webkit-backdrop-filter: blur(25px);
            border: 1px solid ${CONFIG.glassBorder};
            border-radius: 20px;
            z-index: 100000;
            display: none;
            flex-direction: column;
            overflow: hidden;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 100px rgba(0, 255, 255, 0.1);
            color: #fff;
            font-family: ${CONFIG.font};
            transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            opacity: 0;
        `;

        // Toggle Button (Launcher)
        const launcher = document.createElement('button');
        launcher.id = 'materia-dev-launcher';
        launcher.innerHTML = 'DEV';
        launcher.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 8px 15px;
            background: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 5px;
            color: rgba(255, 255, 255, 0.5);
            font-family: ${CONFIG.font};
            font-size: 10px;
            font-weight: 900;
            letter-spacing: 2px;
            cursor: pointer;
            z-index: 99999;
            transition: all 0.3s ease;
        `;
        launcher.addEventListener('mouseenter', () => {
            launcher.style.color = '#fff';
            launcher.style.borderColor = CONFIG.primaryColor;
            launcher.style.boxShadow = `0 0 15px ${CONFIG.primaryColor}`;
        });
        launcher.addEventListener('mouseleave', () => {
            launcher.style.color = 'rgba(255, 255, 255, 0.5)';
            launcher.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            launcher.style.boxShadow = 'none';
        });

        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 25px 30px;
            border-bottom: 1px solid ${CONFIG.glassBorder};
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(255, 255, 255, 0.03);
        `;
        header.innerHTML = `
            <div>
                <h1 style="margin:0; font-size: 1.2rem; font-weight: 900; letter-spacing: 4px; color: ${CONFIG.primaryColor}">DEVCONSOLE</h1>
                <p style="margin:5px 0 0; font-size: 0.7rem; opacity: 0.5; text-transform: uppercase; letter-spacing: 2px">Materia Solutions | v2.4.0</p>
            </div>
        `;

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.style.cssText = `
            background: transparent;
            border: none;
            color: #fff;
            font-size: 1.5rem;
            cursor: pointer;
            opacity: 0.5;
            transition: opacity 0.3s ease;
        `;
        closeBtn.addEventListener('mouseenter', () => closeBtn.style.opacity = 1);
        closeBtn.addEventListener('mouseleave', () => closeBtn.style.opacity = 0.5);
        closeBtn.addEventListener('click', toggleConsole);
        header.appendChild(closeBtn);

        // Sidebar / Tabs
        const contentArea = document.createElement('div');
        contentArea.style.cssText = `
            display: flex;
            flex: 1;
            overflow: hidden;
        `;

        const sidebar = document.createElement('div');
        sidebar.style.cssText = `
            width: 180px;
            border-right: 1px solid ${CONFIG.glassBorder};
            padding: 20px 0;
            background: rgba(0, 0, 0, 0.1);
        `;

        const tabs = [
            { id: 'audio', label: 'AUDIO', icon: '🔊' },
            { id: 'entity', label: 'ENTITY', icon: '👁' },
            { id: 'scenes', label: 'SCENES', icon: '🌌' },
            { id: 'help', label: 'HELP', icon: '?' }
        ];

        tabs.forEach(tab => {
            const tabBtn = document.createElement('button');
            tabBtn.className = 'console-tab-btn';
            tabBtn.dataset.tab = tab.id;
            tabBtn.style.cssText = `
                width: 100%;
                padding: 15px 25px;
                background: transparent;
                border: none;
                color: #fff;
                text-align: left;
                font-family: ${CONFIG.font};
                font-size: 0.8rem;
                font-weight: 200;
                letter-spacing: 2px;
                cursor: pointer;
                transition: all 0.3s ease;
                opacity: 0.4;
                display: flex;
                align-items: center;
                gap: 12px;
            `;
            tabBtn.innerHTML = `<span style="font-size: 1.1rem">${tab.icon}</span> ${tab.label}`;
            
            tabBtn.addEventListener('click', () => switchTab(tab.id));
            sidebar.appendChild(tabBtn);
        });

        // Main View
        const view = document.createElement('div');
        view.id = 'console-view';
        view.style.cssText = `
            flex: 1;
            padding: 40px;
            overflow-y: auto;
            background: radial-gradient(circle at top right, rgba(0, 255, 255, 0.05), transparent 40%);
        `;

        contentArea.appendChild(sidebar);
        contentArea.appendChild(view);
        container.appendChild(header);
        container.appendChild(contentArea);
        document.body.appendChild(container);
        document.body.appendChild(launcher);

        launcher.addEventListener('click', toggleConsole);
    }

    function toggleConsole() {
        const container = document.getElementById('materia-dev-console');
        if (!isOpen) {
            container.style.display = 'flex';
            setTimeout(() => {
                container.style.transform = 'translate(-50%, -50%) scale(1)';
                container.style.opacity = '1';
            }, 10);
            switchTab(activeTab);
        } else {
            container.style.transform = 'translate(-50%, -50%) scale(0.9)';
            container.style.opacity = '0';
            setTimeout(() => container.style.display = 'none', 400);
        }
        isOpen = !isOpen;
    }

    function switchTab(tabId) {
        activeTab = tabId;
        const view = document.getElementById('console-view');
        const buttons = document.querySelectorAll('.console-tab-btn');
        
        buttons.forEach(btn => {
            if (btn.dataset.tab === tabId) {
                btn.style.opacity = '1';
                btn.style.background = 'rgba(255, 255, 255, 0.05)';
                btn.style.borderLeft = `3px solid ${CONFIG.primaryColor}`;
            } else {
                btn.style.opacity = '0.4';
                btn.style.background = 'transparent';
                btn.style.borderLeft = '3px solid transparent';
            }
        });

        renderView(tabId);
    }

    function renderView(tabId) {
        const view = document.getElementById('console-view');
        view.innerHTML = '';

        if (tabId === 'audio') {
            view.innerHTML = `
                <h2 style="margin-top:0; font-weight: 200; letter-spacing: 2px">SOUNDTRACK ENGINES</h2>
                <p style="opacity: 0.6; font-size: 0.8rem; margin-bottom: 30px">Select a generative engine to drive the ambient landscape.</p>
                
                <div style="display: grid; gap: 20px">
                    ${createAudioRow('Materia I', 'Original cinematic ambient engine. Warm and grounded.', 'MateriaMusic')}
                    ${createAudioRow('Materia II', 'Dark industrial generator. Stochastic and menacing.', 'MateriaMusic2')}
                    ${createAudioRow('Materia III', 'Luminous ethereal engine. Bright and celestial.', 'MateriaMusic3')}
                </div>

                <div style="margin-top: 50px; padding: 20px; background: rgba(255,255,255,0.05); border-radius: 10px; border-left: 2px solid ${CONFIG.primaryColor}">
                    <h3 style="margin-top:0; font-size: 0.8rem; letter-spacing: 1px">EASY INSTRUCTIONS</h3>
                    <ul style="font-size: 0.75rem; opacity: 0.7; padding-left: 20px; line-height: 1.6">
                        <li>Each engine is "generative" — the music is composed by math in real-time.</li>
                        <li>Only one engine can play at a time. Starting one will stop the others.</li>
                        <li>Engines take 2-4 seconds to "fade in" their master volume.</li>
                    </ul>
                </div>
            `;
            attachAudioEvents();
        } else if (tabId === 'entity') {
            const hasEntity = !!window.MateriaEntity;
            view.innerHTML = `
                <h2 style="margin-top:0; font-weight: 200; letter-spacing: 2px">THE ENTITY</h2>
                <p style="opacity: 0.6; font-size: 0.8rem; margin-bottom: 30px">Direct the autonomous SDF nightmare creature lurking in the void.</p>
                
                ${hasEntity ? `
                    <div style="background: rgba(0,0,0,0.3); padding: 25px; border-radius: 15px; border: 1px solid rgba(255,255,255,0.1)">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px">
                            <div>
                                <span style="font-size: 0.6rem; opacity: 0.5; text-transform: uppercase">Current Form</span>
                                <div id="entity-state" style="font-size: 1.2rem; font-weight: 900; color: ${CONFIG.secondaryColor}">${window.MateriaEntity.getState()}</div>
                            </div>
                            <button id="btn-force-evolve" style="padding: 10px 20px; background: ${CONFIG.secondaryColor}; border: none; border-radius: 5px; color: #fff; font-weight: 900; cursor: pointer; font-size: 0.7rem; letter-spacing: 1px">FORCE EVOLUTION</button>
                        </div>

                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px">
                            <button class="entity-cmd" data-cmd="forceEmerge">MATERIALIZE</button>
                            <button class="entity-cmd" data-cmd="forceHide">DISSOLVE</button>
                            <button class="entity-cmd" data-cmd="forceWatch">WATCH USER</button>
                            <button class="entity-cmd" data-cmd="forceFlee">FLEE VOID</button>
                        </div>
                    </div>

                    <div style="margin-top: 50px; padding: 20px; background: rgba(255,255,255,0.05); border-radius: 10px; border-left: 2px solid ${CONFIG.secondaryColor}">
                        <h3 style="margin-top:0; font-size: 0.8rem; letter-spacing: 1px">EASY INSTRUCTIONS</h3>
                        <ul style="font-size: 0.75rem; opacity: 0.7; padding-left: 20px; line-height: 1.6">
                            <li>The Entity is a "Signed Distance Function" volume. It has no 3D mesh.</li>
                            <li><strong>Evolution</strong>: Forces the creature to morph into its next nightmare shape.</li>
                            <li><strong>Materialize/Dissolve</strong>: Controls the creature's visibility in the background.</li>
                        </ul>
                    </div>
                ` : `
                    <div style="padding: 40px; text-align: center; background: rgba(255,0,0,0.05); border: 1px dashed rgba(255,0,0,0.2); border-radius: 10px">
                        <p style="color: #ff5555; margin:0">ENTITY ENGINE NOT DETECTED IN THIS SCENE</p>
                    </div>
                `}
            `;
            if (hasEntity) attachEntityEvents();
        } else if (tabId === 'scenes') {
            view.innerHTML = `
                <h2 style="margin-top:0; font-weight: 200; letter-spacing: 2px">SCENE NAVIGATOR</h2>
                <p style="opacity: 0.6; font-size: 0.8rem; margin-bottom: 30px">Jump between the different architectural layers of Materia Solutions.</p>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px">
                    <button class="scene-jump" onclick="window.location.href='index.html'">
                        <div class="scene-preview" style="background: #111; height: 80px; border-radius: 8px; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-size: 0.6rem; opacity: 0.5">CINEMATIC INTRO</div>
                        <div style="font-size: 0.8rem; font-weight: 900; letter-spacing: 1px">LANDING PHASE</div>
                    </button>
                    <button class="scene-jump" onclick="window.location.href='STORE.HTML'">
                         <div class="scene-preview" style="background: #111; height: 80px; border-radius: 8px; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-size: 0.6rem; opacity: 0.5">ELEMENTAL STORE</div>
                        <div style="font-size: 0.8rem; font-weight: 900; letter-spacing: 1px">EXHIBITION HALL</div>
                    </button>
                </div>

                <style>
                    .scene-jump {
                        background: rgba(255,255,255,0.03);
                        border: 1px solid rgba(255,255,255,0.1);
                        padding: 15px;
                        border-radius: 12px;
                        color: #fff;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        text-align: left;
                    }
                    .scene-jump:hover {
                        background: rgba(255,255,255,0.08);
                        border-color: ${CONFIG.primaryColor};
                        transform: translateY(-5px);
                    }
                </style>
            `;
        } else if (tabId === 'help') {
            view.innerHTML = `
                <h2 style="margin-top:0; font-weight: 200; letter-spacing: 2px">HELP & CONTROLS</h2>
                <div style="font-size: 0.85rem; line-height: 1.8; opacity: 0.8">
                    <p>Welcome to the Materia Solutions Development Console. This tool is designed to let you interact with the underlying procedural engines that power this experience.</p>
                    
                    <h3 style="color: ${CONFIG.primaryColor}; margin-top: 30px">KEYBOARD SHORTCUTS</h3>
                    <ul style="list-style: none; padding: 0">
                        <li><code style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-family: monospace">~</code> (Tilde) : Toggle this console</li>
                        <li><code style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-family: monospace">ESC</code> : Close console</li>
                    </ul>

                    <h3 style="color: ${CONFIG.primaryColor}; margin-top: 30px">TECH OVERVIEW</h3>
                    <p>Materia uses <strong>pure math</strong> for its visuals and audio. The music is generated step-by-step by the Web Audio API (no MP3 files), and the 3D shapes are rendered using raymarched distance fields (no 3D models).</p>
                </div>
            `;
        }
    }

    // --- Helper Components ---
    function createAudioRow(name, desc, globalName) {
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; background: rgba(255,255,255,0.03); border-radius: 10px; border: 1px solid rgba(255,255,255,0.05)">
                <div>
                    <div style="font-size: 0.9rem; font-weight: 900; letter-spacing: 1px">${name}</div>
                    <div style="font-size: 0.7rem; opacity: 0.5">${desc}</div>
                </div>
                <div style="display: flex; gap: 10px">
                    <button class="audio-toggle start" data-engine="${globalName}" style="padding: 8px 15px; background: rgba(0,255,255,0.1); border: 1px solid ${CONFIG.primaryColor}; border-radius: 4px; color: ${CONFIG.primaryColor}; font-size: 0.6rem; font-weight: 900; cursor: pointer; transition: all 0.2s">START</button>
                    <button class="audio-toggle stop" data-engine="${globalName}" style="padding: 8px 15px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; color: #fff; font-size: 0.6rem; font-weight: 900; cursor: pointer; transition: all 0.2s">STOP</button>
                </div>
            </div>
        `;
    }

    // --- Event Handlers ---
    function attachAudioEvents() {
        document.querySelectorAll('.audio-toggle.start').forEach(btn => {
            btn.addEventListener('click', () => {
                const engineName = btn.dataset.engine;
                if (window[engineName] && window[engineName].start) {
                    // Try to stop others (though engines usually handle this internally, we want to be sure)
                    ['MateriaMusic', 'MateriaMusic2', 'MateriaMusic3'].forEach(name => {
                        if (name !== engineName && window[name] && window[name].stop) {
                            try { window[name].stop(); } catch(e) {}
                        }
                    });
                    window[engineName].start();
                    btn.innerText = 'PLAYING...';
                    setTimeout(() => btn.innerText = 'START', 2000);
                }
            });
        });

        document.querySelectorAll('.audio-toggle.stop').forEach(btn => {
            btn.addEventListener('click', () => {
                const engineName = btn.dataset.engine;
                if (window[engineName] && window[engineName].stop) {
                    window[engineName].stop();
                }
            });
        });
    }

    function attachEntityEvents() {
        document.getElementById('btn-force-evolve').addEventListener('click', () => {
            window.MateriaEntity.forceEvolve();
            setTimeout(() => {
                const stateEl = document.getElementById('entity-state');
                if (stateEl) stateEl.innerText = window.MateriaEntity.getState();
            }, 500);
        });

        document.querySelectorAll('.entity-cmd').forEach(btn => {
            btn.style.cssText = `
                padding: 10px;
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 4px;
                color: #fff;
                font-family: ${CONFIG.font};
                font-size: 0.65rem;
                font-weight: 900;
                letter-spacing: 1px;
                cursor: pointer;
                transition: all 0.2s;
            `;
            btn.addEventListener('click', () => {
                const cmd = btn.dataset.cmd;
                if (window.MateriaEntity[cmd]) {
                    window.MateriaEntity[cmd]();
                }
            });
            btn.addEventListener('mouseenter', () => btn.style.background = 'rgba(255,255,255,0.1)');
            btn.addEventListener('mouseleave', () => btn.style.background = 'rgba(255,255,255,0.05)');
        });
    }

    // --- Global Listeners ---
    window.addEventListener('keydown', (e) => {
        if (e.key === '`') {
            toggleConsole();
        }
        if (e.key === 'Escape' && isOpen) {
            toggleConsole();
        }
    });

    // --- Initialization ---
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        createUI();
    } else {
        window.addEventListener('DOMContentLoaded', createUI);
    }

})();
