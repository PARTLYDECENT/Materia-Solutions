/**
 * komorebi.js
 * ═══════════════════════════════════════════════════════════════
 * MATERIA SOLUTIONS — Advanced Atmospheric Engine
 * "Sunlight filtering through leaves" (木漏れ日)
 * High-fidelity volumetric background simulation using GLSL.
 * ═══════════════════════════════════════════════════════════════
 */

(function () {
    'use strict';

    const VERTEX_SHADER = `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

    const FRAGMENT_SHADER = `
        uniform float u_time;
        uniform vec2 u_resolution;
        uniform vec2 u_mouse;
        varying vec2 vUv;

        // Optimized Random/Noise
        float random(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }

        float noise(vec2 st) {
            vec2 i = floor(st);
            vec2 f = fract(st);
            float a = random(i);
            float b = random(i + vec2(1.0, 0.0));
            float c = random(i + vec2(0.0, 1.0));
            float d = random(i + vec2(1.0, 1.0));
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }

        float fbm(vec2 st) {
            float v = 0.0;
            float a = 0.5;
            for (int i = 0; i < 5; i++) {
                v += a * noise(st);
                st *= 2.1;
                a *= 0.5;
            }
            return v;
        }

        void main() {
            vec2 uv = gl_FragCoord.xy / u_resolution.xy;
            float aspect = u_resolution.x / u_resolution.y;
            vec2 p = uv;
            p.x *= aspect;

            // --- VOLUMETRIC LIGHT SHAFTS (God Rays) ---
            vec2 sunPos = vec2(0.8 * aspect, 0.9);
            sunPos += u_mouse * 0.1; // Subtle mouse follow
            
            vec2 rayDir = p - sunPos;
            float rayLength = length(rayDir);
            float ray = 0.0;
            
            // Faked rayleigh scattering
            ray = exp(-rayLength * 1.5);
            
            // --- CANOPY SHADOWS (Layered Noise) ---
            // Layer 1: Slow, large branches
            vec2 st1 = p * 1.5 + vec2(u_time * 0.015, -u_time * 0.01);
            float canopy1 = fbm(st1 + fbm(st1 * 0.5));
            
            // Layer 2: Faster, smaller leaves
            vec2 st2 = p * 3.5 + vec2(u_time * 0.04, u_time * 0.02);
            float canopy2 = fbm(st2);
            
            // Layer 3: High-frequency jitter
            vec2 st3 = p * 8.0 + vec2(u_time * 0.1, -u_time * 0.05);
            float canopy3 = noise(st3);

            float canopy = mix(canopy1, canopy2, 0.5) * (0.8 + 0.2 * canopy3);
            
            // Threshold for light patches
            float light = smoothstep(0.35, 0.65, canopy);
            
            // Combine ray with canopy
            float finalLight = light * ray;
            finalLight += ray * 0.25; // Base ambient light from sun
            
            // --- DUST MOTES (Sparkle) ---
            float mote = random(p + floor(u_time * 8.0) * 0.01);
            mote *= step(0.995, random(p * 20.0 + u_time * 0.05));
            finalLight += mote * light * 0.8;

            // --- COLOR GRADING ---
            // Deep forest green shadows
            vec3 shadowCol = vec3(0.08, 0.12, 0.1); 
            // Warm, bright incandescent sunlight
            vec3 sunCol = vec3(1.0, 0.95, 0.85);
            // Incandescent glow on edges (Subsurface Scattering)
            vec3 edgeCol = vec3(0.9, 0.5, 0.2); 
            
            float edge = smoothstep(0.4, 0.5, canopy) * (1.0 - smoothstep(0.5, 0.6, canopy));
            
            vec3 color = mix(shadowCol, sunCol, finalLight);
            color += edge * edgeCol * ray * 0.4;
            
            // Vignette
            color *= 1.0 - smoothstep(0.4, 1.2, length(uv - 0.5));

            gl_FragColor = vec4(color, 1.0);
        }
    `;

    class KomorebiEngine {
        constructor() {
            this.container = null;
            this.scene = null;
            this.camera = null;
            this.renderer = null;
            this.uniforms = null;
            this.initialized = false;
        }

        init(containerId = 'webgl-container') {
            if (this.initialized) return;
            
            this.container = document.getElementById(containerId);
            if (!this.container) {
                this.container = document.createElement('div');
                this.container.id = containerId;
                this.container.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:-1; pointer-events:none;';
                document.body.prepend(this.container);
            }

            this.scene = new THREE.Scene();
            this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
            this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
            this.container.appendChild(this.renderer.domElement);

            this.uniforms = {
                u_time: { value: 0.0 },
                u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                u_mouse: { value: new THREE.Vector2(0, 0) }
            };

            const geometry = new THREE.PlaneGeometry(2, 2);
            const material = new THREE.ShaderMaterial({
                vertexShader: VERTEX_SHADER,
                fragmentShader: FRAGMENT_SHADER,
                uniforms: this.uniforms,
                depthWrite: false,
                depthTest: false
            });

            const mesh = new THREE.Mesh(geometry, material);
            this.scene.add(mesh);

            window.addEventListener('resize', () => this.onResize());
            window.addEventListener('mousemove', (e) => this.onMouseMove(e));

            this.initialized = true;
            this.animate();
            console.log('✨ Komorebi Engine Initialized');
        }

        onResize() {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
        }

        onMouseMove(e) {
            const x = (e.clientX / window.innerWidth) * 2 - 1;
            const y = -(e.clientY / window.innerHeight) * 2 + 1;
            this.uniforms.u_mouse.value.set(x, y);
        }

        animate() {
            requestAnimationFrame(() => this.animate());
            this.uniforms.u_time.value += 0.016;
            this.renderer.render(this.scene, this.camera);
        }
    }

    // Expose globally
    window.Komorebi = new KomorebiEngine();

    // Auto-init if container exists
    if (document.readyState === 'complete') {
        window.Komorebi.init();
    } else {
        window.addEventListener('load', () => window.Komorebi.init());
    }

})();
