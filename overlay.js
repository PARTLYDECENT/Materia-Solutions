/**
 * Materia Overlay System v1.1 - Robust Edition
 * Features: SDF-based Lava Lamp Metaballs, Procedural Oozing, 
 * WebGL Accelerated Rendering with 2D Fallback.
 */

class MateriaOverlay {
    constructor() {
        this.active = false;
        this.container = null;
        this.canvas = null;
        this.gl = null;
        this.program = null;
        this.startTime = 0;
        this.mouse = { x: 0.5, y: 0.5 };
        this.useWebGL = true;
        
        console.log("✨ Materia Overlay System Initializing...");
        this.init();
    }

    init() {
        // Create Overlay Container
        this.container = document.createElement('div');
        this.container.id = 'materia-cookie-overlay';
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: 9999999;
            display: none;
            opacity: 0;
            transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1);
            pointer-events: none;
            background: rgba(0,0,0,0.4);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
        `;

        this.canvas = document.createElement('canvas');
        this.canvas.style.display = 'block';
        this.container.appendChild(this.canvas);
        
        // Add UI Content
        this.ui = document.createElement('div');
        this.ui.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 90%;
            max-width: 500px;
            text-align: center;
            color: white;
            z-index: 10;
            padding: 40px;
            font-family: 'Montserrat', sans-serif;
            pointer-events: auto;
            pointer-events: all;
        `;
        
        this.ui.innerHTML = `
            <div id="materia-overlay-content" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); padding: 40px; border-radius: 30px; backdrop-filter: blur(5px); filter: url(#materia-drip-filter);">
                <h1 id="materia-overlay-title" style="font-weight: 900; letter-spacing: 0.5em; margin-bottom: 20px; font-size: 0.8rem; color: #ff3366">MATERIA KERNEL</h1>
                <p id="materia-overlay-body" style="font-weight: 200; font-size: 0.7rem; line-height: 1.8; letter-spacing: 0.2em; opacity: 0.7; margin-bottom: 40px">
                    WE USE PROCEDURAL TRACKERS TO ENHANCE YOUR BOTANICAL IMMERSION. BY CONTINUING, YOU MERGE WITH THE MATERIA DATASTREAM.
                </p>
                <div style="display: flex; gap: 20px; justify-content: center; flex-wrap: wrap">
                    <button id="cookie-accept" style="background: white; color: black; border: none; padding: 15px 35px; font-size: 0.6rem; letter-spacing: 0.3em; cursor: pointer; transition: all 0.3s ease; font-weight: 900">RETURN</button>
                </div>
            </div>
        `;
        
        // Add Drip Filter
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.style.display = 'none';
        svg.innerHTML = `
            <defs>
                <filter id="materia-drip-filter">
                    <feTurbulence type="fractalNoise" baseFrequency="0.01 0.02" numOctaves="1" result="warp">
                        <animate attributeName="baseFrequency" values="0.01 0.02; 0.01 0.04; 0.01 0.02" dur="8s" repeatCount="indefinite" />
                    </feTurbulence>
                    <feGaussianBlur in="warp" stdDeviation="2" result="smoothWarp" />
                    <feDisplacementMap xChannelSelector="R" yChannelSelector="G" scale="15" in="SourceGraphic" in2="smoothWarp" />
                </filter>
            </defs>
        `;
        document.body.appendChild(svg);
        
        this.container.appendChild(this.ui);
        document.body.appendChild(this.container);

        if (!this.setupWebGL()) {
            console.warn("⚠️ WebGL Overlay failed, falling back to 2D Canvas.");
            this.useWebGL = false;
        }
        
        this.addEvents();
    }

    setupWebGL() {
        this.gl = this.canvas.getContext('webgl', { alpha: true });
        if (!this.gl) return false;

        const vsSource = `
            attribute vec2 position;
            void main() {
                gl_Position = vec4(position, 0.0, 1.0);
            }
        `;

        const fsSource = `
            precision highp float;
            uniform float u_time;
            uniform vec2 u_resolution;
            uniform vec2 u_mouse;

            float sdCircle(vec2 p, float r) {
                return length(p) - r;
            }

            float smin(float a, float b, float k) {
                float h = clamp(0.5 + 0.5*(b-a)/k, 0.0, 1.0);
                return mix(b, a, h) - k*h*(1.0-h);
            }

            void main() {
                vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.y, u_resolution.x);
                float d = 1e10;
                
                // Animated Blobs
                for(int i=0; i<5; i++) {
                    float fi = float(i);
                    float t = u_time * 0.4 + fi * 2.3;
                    vec2 pos = vec2(
                        sin(t * 0.7 + fi) * 0.45,
                        cos(t * 1.1 + fi * 1.5) * 0.45
                    );
                    d = smin(d, sdCircle(uv - pos, 0.18 + sin(t*0.5)*0.05), 0.2);
                }

                // Interactive Mouse Blob
                vec2 mPos = (u_mouse - 0.5) * vec2(u_resolution.x/u_resolution.y, 1.0);
                d = smin(d, sdCircle(uv - mPos, 0.2), 0.2);

                // Central Window Blob
                d = smin(d, sdCircle(uv, 0.4), 0.25);

                vec3 color = vec3(0.0);
                float glow = 0.006 / max(0.001, abs(d));
                color += glow * vec3(1.0, 0.2, 0.4);

                if (d < 0.0) {
                    color = mix(vec3(0.02, 0.02, 0.04), vec3(1.0, 0.2, 0.4) * 0.2, clamp(-d * 4.0, 0.0, 1.0));
                    color += 0.03 * sin(uv.x * 30.0 + u_time) * sin(uv.y * 30.0 - u_time);
                }

                float border = smoothstep(0.015, 0.0, abs(d));
                color = mix(color, vec3(1.0, 0.2, 0.4), border);

                gl_FragColor = vec4(color, clamp(glow + (d < 0.0 ? 0.9 : 0.0), 0.0, 1.0));
            }
        `;

        const createShader = (gl, type, source) => {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error("Shader Error:", gl.getShaderInfoLog(shader));
                return null;
            }
            return shader;
        };

        const vShader = createShader(this.gl, this.gl.VERTEX_SHADER, vsSource);
        const fShader = createShader(this.gl, this.gl.FRAGMENT_SHADER, fsSource);
        if (!vShader || !fShader) return false;

        this.program = this.gl.createProgram();
        this.gl.attachShader(this.program, vShader);
        this.gl.attachShader(this.program, fShader);
        this.gl.linkProgram(this.program);
        if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
            console.error("Program Error:", this.gl.getProgramInfoLog(this.program));
            return false;
        }

        const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
        const buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

        const posAttrib = this.gl.getAttribLocation(this.program, 'position');
        this.gl.enableVertexAttribArray(posAttrib);
        this.gl.vertexAttribPointer(posAttrib, 2, this.gl.FLOAT, false, 0, 0);

        this.resize();
        return true;
    }

    addEvents() {
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX / window.innerWidth;
            this.mouse.y = 1.0 - (e.clientY / window.innerHeight);
        });

        document.getElementById('cookie-accept').addEventListener('click', (e) => {
            e.stopPropagation();
            this.hide();
        });
    }

    resize() {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        if (this.gl) this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    show(title, body) {
        if (title) document.getElementById('materia-overlay-title').innerText = title;
        if (body) document.getElementById('materia-overlay-body').innerHTML = body;
        
        console.log("🚀 Showing Materia Overlay...");
        this.active = true;
        this.container.style.display = 'block';
        // Force reflow
        this.container.offsetHeight;
        this.container.style.opacity = '1';
        this.container.style.pointerEvents = 'auto';
        this.startTime = performance.now();
        this.animate();
    }

    hide() {
        console.log("🌑 Hiding Materia Overlay...");
        this.container.style.opacity = '0';
        this.container.style.pointerEvents = 'none';
        setTimeout(() => {
            this.container.style.display = 'none';
            this.active = false;
        }, 800);
    }

    animate() {
        if (!this.active) return;

        if (this.useWebGL) {
            const time = (performance.now() - this.startTime) / 1000;
            this.gl.useProgram(this.program);
            
            const timeLoc = this.gl.getUniformLocation(this.program, 'u_time');
            const resLoc = this.gl.getUniformLocation(this.program, 'u_resolution');
            const mouseLoc = this.gl.getUniformLocation(this.program, 'u_mouse');
            
            this.gl.uniform1f(timeLoc, time);
            this.gl.uniform2f(resLoc, this.canvas.width, this.canvas.height);
            this.gl.uniform2f(mouseLoc, this.mouse.x, this.mouse.y);
            
            this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
        } else {
            // Very simple 2D fallback just in case
            const ctx = this.canvas.getContext('2d');
            ctx.clearRect(0,0,this.canvas.width, this.canvas.height);
            ctx.fillStyle = "rgba(255, 51, 102, 0.1)";
            ctx.beginPath();
            ctx.arc(this.canvas.width/2, this.canvas.height/2, 200, 0, Math.PI*2);
            ctx.fill();
        }
        
        requestAnimationFrame(() => this.animate());
    }
}

// Global exposure
window.MateriaOverlay = new MateriaOverlay();
console.log("✅ Materia Overlay System Loaded.");
