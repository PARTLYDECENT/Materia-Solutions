/**
 * Materia Drip v1.0 — SDF Fluid Text Effect
 * Renders hero banner text as animated metaball fluid.
 * Cycle: drip from top → form text → melt down → flow bottom → rise → repeat
 */

class MateriaDrip {
    constructor() {
        this.canvas = null;
        this.gl = null;
        this.program = null;
        this.textTex = null;
        this.startTime = 0;
        this.active = false;
        this.bannerEl = null;
        this.textEls = { tag: null, title: null, sub: null };
        this.animId = null;

        if (document.readyState === 'complete') {
            setTimeout(() => this.init(), 300);
        } else {
            window.addEventListener('load', () => setTimeout(() => this.init(), 300));
        }
    }

    init() {
        const h2 = document.querySelector('h2');
        if (!h2) return;

        const overlay = h2.closest('.absolute');
        if (!overlay) return;

        this.bannerEl = overlay.parentElement;
        this.textEls.tag   = overlay.querySelector('span');
        this.textEls.title = h2;
        this.textEls.sub   = h2.nextElementSibling;

        // Create WebGL canvas over the banner
        this.canvas = document.createElement('canvas');
        this.canvas.style.cssText = `
            position: absolute; top: 0; left: 0;
            width: 100%; height: 100%;
            z-index: 6; pointer-events: none;
            border-radius: inherit;
        `;
        this.bannerEl.appendChild(this.canvas);

        if (!this.setupWebGL()) {
            console.warn('💧 MateriaDrip: WebGL failed');
            this.canvas.remove();
            return;
        }

        // Hide original text (keep in DOM for animator compatibility)
        if (this.textEls.tag)   this.textEls.tag.style.opacity = '0';
        if (this.textEls.title) this.textEls.title.style.opacity = '0';
        if (this.textEls.sub)   this.textEls.sub.style.opacity = '0';
        // Also hide the tag's parent badge container
        if (this.textEls.tag) {
            const badge = this.textEls.tag.closest('.rounded-full');
            if (badge) badge.style.opacity = '0';
        }

        this.buildTextTexture();
        this.resize();

        // Watch for text mutations (cookie mode swaps)
        this.observer = new MutationObserver(() => {
            clearTimeout(this._rebuildTimer);
            this._rebuildTimer = setTimeout(() => this.buildTextTexture(), 200);
        });
        [this.textEls.tag, this.textEls.title, this.textEls.sub].forEach(el => {
            if (el) this.observer.observe(el, { childList: true, characterData: true, subtree: true });
        });

        window.addEventListener('resize', () => this.resize());

        this.active = true;
        this.startTime = performance.now();
        this.animate();
        console.log('💧 MateriaDrip: SDF Fluid Text Active');
    }

    /* ─── WebGL Setup ─── */
    setupWebGL() {
        this.gl = this.canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false });
        if (!this.gl) return false;
        const gl = this.gl;

        const vs = `
            attribute vec2 position;
            void main() { gl_Position = vec4(position, 0.0, 1.0); }
        `;

        const fs = `
            precision highp float;
            uniform float u_time;
            uniform vec2  u_resolution;
            uniform sampler2D u_textTex;

            float hash(float n) { return fract(sin(n) * 43758.5453); }

            float smin(float a, float b, float k) {
                float h = clamp(0.5 + 0.5*(b-a)/k, 0.0, 1.0);
                return mix(b,a,h) - k*h*(1.0-h);
            }

            float sdCapsule(vec2 p, vec2 a, vec2 b, float r) {
                vec2 pa = p - a, ba = b - a;
                float h = clamp(dot(pa,ba)/dot(ba,ba), 0.0, 1.0);
                return length(pa - ba*h) - r;
            }

            void main() {
                vec2 uv = gl_FragCoord.xy / u_resolution;
                uv.y = 1.0 - uv.y; // y=0 is top
                
                float aspect = u_resolution.x / u_resolution.y;
                vec2 p = vec2(uv.x * aspect, uv.y);

                float t_tex = texture2D(u_textTex, uv).r;
                // Soft SDF approximation
                float textDist = (0.5 - t_tex) * 0.15; 

                float CYCLE = 12.0;
                float t = mod(u_time, CYCLE);
                
                float phaseDrip  = 2.0;
                float phaseHold  = 5.5; 
                float phaseMelt  = 8.0;
                float phasePool  = 9.5;
                float phasePipe  = 12.0;

                float d = 1e10;

                // 1. TEXT FILL LOGIC
                float fillTop = 0.0;
                float fillBot = 0.0;

                if (t < phaseDrip) {
                    float prog = t / phaseDrip;
                    prog = pow(prog, 1.5); // Fast start
                    fillBot = prog;
                } else if (t < phaseHold) {
                    fillBot = 1.0;
                } else if (t < phaseMelt) {
                    float prog = (t - phaseHold) / (phaseMelt - phaseHold);
                    prog = prog * prog * prog; // Accelerating melt
                    fillTop = prog;
                    fillBot = 1.0;
                } else {
                    fillTop = 1.0;
                    fillBot = 1.0;
                }

                float inFill = step(fillTop, uv.y) * step(uv.y, fillBot);
                float currentTextDist = textDist;
                
                if (inFill == 0.0) {
                    currentTextDist = 1e10; 
                } else {
                    float edgeDistTop = uv.y - fillTop;
                    float edgeDistBot = fillBot - uv.y;
                    float edgeDist = min(edgeDistTop, edgeDistBot);
                    if (edgeDist < 0.05) {
                        // Turbulence on the melt/fill line
                        float turb = sin(p.x * 25.0 + u_time * 8.0) * 0.005;
                        currentTextDist = max(currentTextDist, (0.05 - edgeDist + turb) * 0.6);
                    }
                }
                d = smin(d, currentTextDist, 0.025);

                // 2. INTENSE DRIPS (Drip Phase)
                if (t < phaseDrip) {
                    for(int i=0; i<40; i++) {
                        float fi = float(i);
                        float x0 = hash(fi * 1.37) * aspect;
                        float probe = texture2D(u_textTex, vec2(x0/aspect, fillBot)).r;
                        if (probe < 0.05 && hash(fi*7.13) > 0.3) continue;

                        float delay = hash(fi * 2.71) * 0.3 * phaseDrip;
                        float speed = 0.8 + hash(fi * 3.14) * 1.5;
                        
                        float dt = t - delay;
                        if (dt > 0.0 && dt < (phaseDrip - delay)) {
                            float y0 = 1.5 * dt * dt + speed * dt;
                            x0 += sin(u_time * 6.0 + fi) * 0.005;
                            
                            if (y0 < fillBot + 0.08) {
                                float stretch = 0.03 + dt * 0.2;
                                float r = 0.003 + hash(fi)*0.007;
                                float dropD = sdCapsule(p, vec2(x0, y0), vec2(x0, y0 - stretch), r);
                                d = smin(d, dropD, 0.02);
                            }
                        }
                    }
                }

                // 3. AGGRESSIVE MELTING (Melt Phase)
                if (t > phaseHold && t < phasePool) {
                    float prog = (t - phaseHold) / (phasePool - phaseHold);
                    for(int i=0; i<45; i++) {
                        float fi = float(i);
                        float x0 = hash(fi * 4.39) * aspect;
                        float tprobe = texture2D(u_textTex, vec2(x0/aspect, fillTop - 0.1)).r;
                        if (tprobe < 0.15) continue;

                        float speed = 0.7 + hash(fi * 7.19) * 1.2;
                        float y0 = fillTop + prog * prog * speed * 2.5;
                        
                        if (y0 < 1.0) { 
                            float stretch = 0.04 + prog * 0.15;
                            float r = 0.002 + hash(fi)*0.008;
                            float dropD = sdCapsule(p, vec2(x0, y0), vec2(x0, y0 - stretch), r);
                            d = smin(d, dropD, 0.02);
                        }
                    }
                }

                // 4. BOTTOM POOL
                float poolThickness = 0.0;
                if (t > phaseHold && t < phasePipe) {
                    float prog;
                    if (t < phaseMelt) {
                        prog = (t - phaseHold) / (phaseMelt - phaseHold);
                        poolThickness = prog * prog * 0.05;
                    } else if (t < phasePool) {
                        poolThickness = 0.05;
                    } else {
                        prog = (t - phasePool) / (phasePipe - phasePool);
                        poolThickness = (1.0 - prog) * 0.05; 
                    }
                    
                    if (poolThickness > 0.0) {
                        float wave = sin(p.x * 20.0 + u_time * 6.0) * 0.008 * (poolThickness / 0.05);
                        float poolDist = (1.0 - uv.y) - (poolThickness + wave);
                        d = smin(d, -poolDist, 0.04);
                    }
                }

                // 5. BOILING PIPELINE
                if (t > phasePool && t < phasePipe) {
                    float prog = (t - phasePool) / (phasePipe - phasePool);
                    float leftDist = p.x;
                    float rightDist = aspect - p.x;
                    float wallDist = min(leftDist, rightDist);
                    
                    float pipeThick = 0.03 * sin(prog * 3.1415);
                    float wave = sin(uv.y * 20.0 - u_time * 15.0) * 0.006;
                    
                    float vertProg = clamp(prog * 2.0, 0.0, 1.0); 
                    if (uv.y > (1.0 - vertProg)) {
                        d = smin(d, wallDist - pipeThick - wave, 0.025);
                    }
                    
                    if (prog > 0.4) {
                        float horizProg = clamp((prog - 0.4) * 1.66, 0.0, 1.0); 
                        float topDist = uv.y;
                        float targetX = 0.5 * aspect;
                        float currentDistFromEdge = horizProg * targetX;
                        if (leftDist < currentDistFromEdge || rightDist < currentDistFromEdge) {
                             float horizWave = sin(p.x * 25.0 - u_time * 20.0 * sign(aspect/2.0 - p.x)) * 0.006;
                             d = smin(d, topDist - pipeThick - horizWave, 0.025);
                        }
                    }
                }

                // Reservoir
                d = smin(d, uv.y - 0.01, 0.02);

                // FIREY RENDERING
                vec3 col = vec3(0.0);
                vec3 fireRed    = vec3(1.0, 0.1, 0.0);
                vec3 fireOrange = vec3(1.0, 0.4, 0.0);
                vec3 fireYellow = vec3(1.0, 0.8, 0.2);
                
                vec3 fluidColor = mix(fireRed, fireOrange, 0.5 + 0.5 * sin(u_time * 2.0 + p.x * 5.0));
                
                float glow = 0.008 / max(0.001, abs(d));
                col += glow * mix(fireRed, fireOrange, abs(sin(u_time * 1.5)));

                if (d < 0.0) {
                    float interior = clamp(-d * 30.0, 0.0, 1.0);
                    // Magma core logic
                    vec3 magma = mix(fireRed * 0.4, fireYellow, pow(interior, 1.5));
                    
                    // Heat noise / bubbling
                    float bubble = sin(p.x * 80.0 + u_time * 10.0) * cos(p.y * 60.0 - u_time * 8.0);
                    magma += bubble * 0.15 * fireOrange;
                    
                    col = magma;

                    // Intense Specular highlight
                    float spec = smoothstep(0.012, 0.0, d + 0.006);
                    col += spec * fireYellow * 0.7;
                }

                // Sharp Outer Rim
                float rim = smoothstep(0.007, 0.0, abs(d));
                col = mix(col, fireYellow, rim);

                float alpha = clamp(glow * 0.9 + (d < 0.0 ? 1.0 : 0.0) + rim, 0.0, 1.0);
                gl_FragColor = vec4(col, alpha);
            }
        `;

        // Compile
        const compile = (type, src) => {
            const s = gl.createShader(type);
            gl.shaderSource(s, src);
            gl.compileShader(s);
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
                console.error('MateriaDrip shader:', gl.getShaderInfoLog(s));
                return null;
            }
            return s;
        };

        const vsh = compile(gl.VERTEX_SHADER, vs);
        const fsh = compile(gl.FRAGMENT_SHADER, fs);
        if (!vsh || !fsh) return false;

        this.program = gl.createProgram();
        gl.attachShader(this.program, vsh);
        gl.attachShader(this.program, fsh);
        gl.linkProgram(this.program);
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error('MateriaDrip link:', gl.getProgramInfoLog(this.program));
            return false;
        }

        // Fullscreen quad
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
        const pos = gl.getAttribLocation(this.program, 'position');
        gl.enableVertexAttribArray(pos);
        gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        return true;
    }

    /* ─── Text Texture ─── */
    buildTextTexture() {
        const gl = this.gl;
        if (!gl) return;

        const rect = this.bannerEl.getBoundingClientRect();
        const w = Math.max(256, Math.floor(rect.width * 0.5));
        const h = Math.max(128, Math.floor(rect.height * 0.5));

        const tc = document.createElement('canvas');
        tc.width = w;
        tc.height = h;
        const ctx = tc.getContext('2d');

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);
        ctx.textBaseline = 'middle';

        // Read current text from DOM
        const tag   = this.textEls.tag   ? this.textEls.tag.textContent.trim()   : '';
        const title = this.textEls.title ? this.textEls.title.textContent.trim() : '';
        const sub   = this.textEls.sub   ? this.textEls.sub.textContent.trim()   : '';

        const drawText = (blur, color) => {
            ctx.shadowColor = color;
            ctx.shadowBlur = blur;
            ctx.fillStyle = color;
            
            // Layout: left-aligned to match banner positioning
            const padX = w * 0.08;
            const centerY = h * 0.5;

            // Tag (small)
            const tagSize = Math.max(8, Math.floor(h * 0.08));
            ctx.font = `500 ${tagSize}px 'Montserrat', sans-serif`;
            ctx.letterSpacing = '3px';
            if (tag) ctx.fillText(tag.toUpperCase(), padX, centerY - h * 0.22);

            // Title (large)
            const titleSize = Math.max(16, Math.floor(h * 0.28));
            ctx.font = `300 ${titleSize}px 'Montserrat', sans-serif`;
            ctx.letterSpacing = '5px';
            if (title) ctx.fillText(title, padX, centerY + h * 0.02);

            // Subtitle (small)
            const subSize = Math.max(8, Math.floor(h * 0.07));
            ctx.font = `300 ${subSize}px 'Montserrat', sans-serif`;
            ctx.letterSpacing = '4px';
            if (sub) ctx.fillText(sub.toUpperCase(), padX, centerY + h * 0.24);
        };

        // Draw soft distance field gradient (blur)
        drawText(Math.max(6, Math.floor(h * 0.06)), '#fff');
        // Draw solid core
        drawText(0, '#fff');

        // Upload texture
        if (this.textTex) gl.deleteTexture(this.textTex);
        this.textTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.textTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tc);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    /* ─── Resize ─── */
    resize() {
        if (!this.canvas || !this.gl) return;
        const rect = this.bannerEl.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.canvas.width  = Math.floor(rect.width * dpr);
        this.canvas.height = Math.floor(rect.height * dpr);
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.buildTextTexture();
    }

    /* ─── Animation Loop ─── */
    animate() {
        if (!this.active) return;

        const gl = this.gl;
        const time = (performance.now() - this.startTime) / 1000;

        gl.useProgram(this.program);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.uniform1f(gl.getUniformLocation(this.program, 'u_time'), time);
        gl.uniform2f(gl.getUniformLocation(this.program, 'u_resolution'), this.canvas.width, this.canvas.height);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textTex);
        gl.uniform1i(gl.getUniformLocation(this.program, 'u_textTex'), 0);

        gl.drawArrays(gl.TRIANGLES, 0, 6);

        this.animId = requestAnimationFrame(() => this.animate());
    }
}

// Boot
window.MateriaDrip = new MateriaDrip();
console.log('✅ MateriaDrip System Loaded.');
