// cookie-window.js
// Standalone Matrix Grid Window for Cookie Options

class CookieMatrixWindow {
    constructor() {
        this.active = false;
        this.container = null;
        this.webglContainer = null;
        this.uiContainer = null;
        
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.buttonController = null;
        this.animationId = null;
        this.clock = null;
        
        this.initDOM();
    }

    initDOM() {
        // Inject Styles
        const styleSheet = document.createElement("style");
        styleSheet.textContent = `
            #cookie-matrix-overlay {
                position: fixed;
                top: 0; left: 0;
                width: 100vw; height: 100vh;
                z-index: 9999999;
                display: none;
                opacity: 0;
                transition: opacity 0.5s ease;
                background: rgba(0, 5, 10, 0.9);
                font-family: 'Montserrat', sans-serif;
                overflow: hidden;
            }

            /* Wireframe Grid Background */
            #cookie-matrix-overlay::before {
                content: '';
                position: absolute;
                inset: 0;
                background-image: 
                    linear-gradient(rgba(0, 200, 255, 0.05) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(0, 200, 255, 0.05) 1px, transparent 1px);
                background-size: 40px 40px;
                pointer-events: none;
                z-index: 1;
            }

            #cookie-webgl-container {
                position: absolute;
                top: 0; left: 0;
                width: 100%; height: 100%;
                z-index: 2;
                pointer-events: none; /* Let clicks pass through to UI */
            }

            #cookie-ui-container {
                position: absolute;
                top: 50%; left: 50%;
                transform: translate(-50%, -50%);
                width: 90%;
                max-width: 800px;
                z-index: 10;
                display: flex;
                flex-direction: column;
                align-items: center;
            }

            .cookie-header {
                text-align: center;
                margin-bottom: 60px;
                border-bottom: 1px solid rgba(0, 200, 255, 0.3);
                padding-bottom: 20px;
                width: 100%;
            }

            .cookie-title {
                color: #00c8ff;
                font-size: 1.2rem;
                font-weight: 900;
                letter-spacing: 0.8em;
                text-transform: uppercase;
                margin-bottom: 15px;
            }

            .cookie-desc {
                color: rgba(255, 255, 255, 0.6);
                font-size: 0.7rem;
                letter-spacing: 0.3em;
                line-height: 1.8;
                font-weight: 200;
            }

            /* Square Cards Grid */
            .cookie-cards-grid {
                display: flex;
                gap: 40px;
                justify-content: center;
                flex-wrap: wrap;
                width: 100%;
            }

            .cookie-card {
                position: relative;
                width: 200px;
                height: 200px;
                background: rgba(0, 20, 30, 0.4);
                border: 1px solid rgba(0, 200, 255, 0.2);
                backdrop-filter: blur(10px);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.3s ease;
                /* Important: Disable pointer events on children so the card gets the hover/click events */
            }

            .cookie-card:hover {
                border-color: rgba(0, 200, 255, 0.8);
                box-shadow: 0 0 30px rgba(0, 200, 255, 0.1);
                background: rgba(0, 30, 45, 0.6);
            }

            /* Square Card Inner Wireframes */
            .cookie-card::before {
                content: '';
                position: absolute;
                inset: 5px;
                border: 1px dashed rgba(255, 255, 255, 0.1);
                pointer-events: none;
                transition: all 0.3s ease;
            }

            .cookie-card:hover::before {
                inset: 10px;
                border-color: rgba(0, 200, 255, 0.4);
            }

            .card-label {
                color: white;
                font-weight: 900;
                font-size: 0.8rem;
                letter-spacing: 0.4em;
                margin-top: 20px;
                text-transform: uppercase;
                pointer-events: none;
            }

            .card-icon {
                font-size: 1.5rem;
                color: #00c8ff;
                pointer-events: none;
                opacity: 0.8;
            }
        `;
        document.head.appendChild(styleSheet);

        // Build HTML
        this.container = document.createElement('div');
        this.container.id = 'cookie-matrix-overlay';

        this.webglContainer = document.createElement('div');
        this.webglContainer.id = 'cookie-webgl-container';
        this.container.appendChild(this.webglContainer);

        this.uiContainer = document.createElement('div');
        this.uiContainer.id = 'cookie-ui-container';
        this.uiContainer.innerHTML = `
            <div class="cookie-header">
                <div class="cookie-title">DATASTREAM INTEGRATION</div>
                <div class="cookie-desc">SYNCHRONIZE YOUR BIO-METRICS WITH THE MATERIA GRID.<br>CHOOSE YOUR CONNECTION PARADIGM.</div>
            </div>
            <div class="cookie-cards-grid">
                <!-- Data indices match MatrixButton elements: 1=Cyber, 2=Void, 3=Aero -->
                <div class="cookie-card" data-matrix-index="1" id="cookie-btn-merge">
                    <canvas class="card-border-canvas" style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 20;"></canvas>
                    <div class="card-icon">⚡</div>
                    <div class="card-label">MERGE</div>
                </div>
                <div class="cookie-card" data-matrix-index="2" id="cookie-btn-abort">
                    <canvas class="card-border-canvas" style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 20;"></canvas>
                    <div class="card-icon">✕</div>
                    <div class="card-label">ABORT</div>
                </div>
                <div class="cookie-card" data-matrix-index="3" id="cookie-btn-config">
                    <canvas class="card-border-canvas" style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 20;"></canvas>
                    <div class="card-icon">⎈</div>
                    <div class="card-label">CONFIG</div>
                </div>
            </div>
        `;
        this.container.appendChild(this.uiContainer);
        document.body.appendChild(this.container);

        // Bind UI events
        this.uiContainer.querySelector('#cookie-btn-merge').addEventListener('click', (e) => this.handleAction(e, 'merge'));
        this.uiContainer.querySelector('#cookie-btn-abort').addEventListener('click', (e) => this.handleAction(e, 'abort'));
        this.uiContainer.querySelector('#cookie-btn-config').addEventListener('click', (e) => this.handleAction(e, 'config'));

        // Handle window resize
        window.addEventListener('resize', () => {
            if (this.active && this.renderer) {
                this.renderer.setSize(window.innerWidth, window.innerHeight);
                // No need to update orthographic camera as it uses normalized coordinates mapping
            }
        });
    }

    handleAction(e, action) {
        e.stopPropagation();
        if (action === 'config') {
            const el = e.currentTarget;
            el.style.borderColor = 'red';
            setTimeout(() => el.style.borderColor = '', 300);
            return;
        }
        this.hide();
    }

    setupWebGL() {
        // Clean up old context if it exists
        if (this.renderer) {
            this.webglContainer.innerHTML = '';
            this.renderer.dispose();
        }

        // Initialize Three.js scene
        this.scene = new THREE.Scene();
        // Orthographic camera mapping exactly to normalized device coordinates [-1, 1]
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        this.camera.position.z = 5;

        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.webglContainer.appendChild(this.renderer.domElement);

        this.clock = new THREE.Clock();

        // Initialize MatrixButtonController
        if (typeof MatrixButtonController !== 'undefined') {
            this.buttonController = new MatrixButtonController(this.scene, this.camera);
            
            const cards = this.uiContainer.querySelectorAll('.cookie-card');
            cards.forEach(card => {
                const index = parseInt(card.getAttribute('data-matrix-index')) || 0;
                this.buttonController.register(card, index);
            });
        } else {
            console.warn("MatrixButtonController not found! 3D effects disabled.");
        }
        
        this.borderStates = [];
    }

    drawCardBorders(time) {
        const cards = this.uiContainer.querySelectorAll('.cookie-card');
        if (this.borderStates.length !== cards.length) {
            this.borderStates = Array.from(cards).map(() => ({
                pattern: Math.floor(Math.random() * 5),
                nextSwitch: time + 1 + Math.random() * 2,
                offset: Math.random() * 1000
            }));
        }

        cards.forEach((card, i) => {
            const canvas = card.querySelector('.card-border-canvas');
            if (!canvas) return;

            const rect = card.getBoundingClientRect();
            if (canvas.width !== rect.width || canvas.height !== rect.height) {
                canvas.width = rect.width;
                canvas.height = rect.height;
            }

            const state = this.borderStates[i];
            if (time > state.nextSwitch) {
                state.pattern = Math.floor(Math.random() * 5);
                state.nextSwitch = time + 1 + Math.random() * 3;
            }

            const ctx = canvas.getContext('2d');
            const w = canvas.width;
            const h = canvas.height;
            
            ctx.clearRect(0, 0, w, h);
            
            const perimeter = (w + h) * 2;
            const speed = 100 + (i * 20); // slightly different speeds
            const drawOffset = (time * speed + state.offset) % perimeter;

            ctx.save();
            
            // Base border to outline the card
            ctx.strokeStyle = 'rgba(0, 200, 255, 0.15)';
            ctx.lineWidth = 1;
            ctx.strokeRect(0, 0, w, h);

            // Active animated border pattern
            ctx.beginPath();
            ctx.rect(0, 0, w, h);

            const p = state.pattern;
            if (p === 0) {
                // Pattern 0: Long snake
                ctx.setLineDash([perimeter * 0.15, perimeter * 0.85]);
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#00c8ff';
            } else if (p === 1) {
                // Pattern 1: Tech dashes
                ctx.setLineDash([15, 10, 5, 10]);
                ctx.lineWidth = 1.5;
                ctx.strokeStyle = '#00ffcc';
            } else if (p === 2) {
                // Pattern 2: Morse code
                ctx.setLineDash([20, 10, 5, 10, 5, 10, 10, 15]);
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#ffbb00';
            } else if (p === 3) {
                // Pattern 3: Thick scanning blocks
                ctx.setLineDash([40, perimeter * 0.5, 20, perimeter * 0.5 - 60]);
                ctx.lineWidth = 4;
                ctx.strokeStyle = 'rgba(0, 200, 255, 0.8)';
            } else if (p === 4) {
                // Pattern 4: Fast micro-dashes
                ctx.setLineDash([2, 6]);
                ctx.lineWidth = 2;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            }

            // Outer glow for the building line
            ctx.shadowColor = ctx.strokeStyle;
            ctx.shadowBlur = 8;

            ctx.lineDashOffset = -drawOffset;
            ctx.stroke();
            
            ctx.restore();
        });
    }

    animate = () => {
        if (!this.active) return;
        
        this.animationId = requestAnimationFrame(this.animate);
        
        const time = this.clock.getElapsedTime();
        if (this.buttonController) {
            this.buttonController.update(time);
        }
        
        this.drawCardBorders(time);

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    show() {
        if (this.active) return;
        
        // Setup fresh WebGL context when showing
        this.setupWebGL();
        
        this.active = true;
        this.container.style.display = 'block';
        // Force reflow
        this.container.offsetHeight;
        this.container.style.opacity = '1';
        
        this.clock.start();
        this.animate();
    }

    hide() {
        if (!this.active) return;
        
        this.container.style.opacity = '0';
        setTimeout(() => {
            this.active = false;
            this.container.style.display = 'none';
            
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
            
            // Clean up WebGL to save memory
            if (this.renderer) {
                this.webglContainer.innerHTML = '';
                this.renderer.dispose();
                this.renderer = null;
                this.scene = null;
                this.camera = null;
                this.buttonController = null;
            }
        }, 500);
    }
}

// Global exposure
window.showCookieWindow = () => {
    if (!window.cookieMatrixWindow) {
        window.cookieMatrixWindow = new CookieMatrixWindow();
    }
    window.cookieMatrixWindow.show();
};
